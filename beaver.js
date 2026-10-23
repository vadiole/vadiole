export function setupBeaver(locationButton, consumeAppearance) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const hover = matchMedia('(hover: hover) and (pointer: fine)');
    let pointerInside = hover.matches && locationButton.matches(':hover');
    const poland = locationButton.querySelector('.poland');
    const baseline = document.createElement('span');
    baseline.className = 'location-baseline';
    baseline.setAttribute('aria-hidden', 'true');
    poland.append(baseline);
    const mask = document.createElement('span');
    mask.className = 'beaver-mask';
    mask.setAttribute('aria-hidden', 'true');
    const beaver = document.createElement('span');
    beaver.className = 'beaver';
    beaver.textContent = '🦫';
    mask.append(beaver);
    poland.append(mask);

    const contourCanvas = document.createElement('canvas');
    const metricsContext = contourCanvas.getContext('2d', { willReadFrequently: true });
    const maskCanvas = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    function positionBeaver() {
        if (!mask.offsetWidth) return;
        const letters = document.createRange();
        letters.setStart(poland.firstChild, 3);
        letters.setEnd(poland.firstChild, 5);
        const bounds = letters.getBoundingClientRect();
        const wordBounds = poland.getBoundingClientRect();
        const style = getComputedStyle(poland);
        const fontSize = parseFloat(style.fontSize);
        metricsContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = metricsContext.measureText('an');
        const size = parseFloat(getComputedStyle(beaver).fontSize);
        const left = (bounds.left + bounds.right) / 2 - wordBounds.left + size * 0.18;
        const baselineY = baseline.getBoundingClientRect().top - wordBounds.top;
        const top = baselineY - metrics.actualBoundingBoxAscent - size;
        const maskStyle = getComputedStyle(mask);
        const width = parseFloat(maskStyle.width);
        const height = baselineY - top;
        mask.style.height = `${height}px`;
        beaver.style.setProperty('--hide-distance', `${height}px`);
        mask.style.left = `${left}px`;
        mask.style.top = `${top}px`;

        const scale = Math.max(4, Math.ceil(devicePixelRatio));
        const font = metricsContext.font;
        const canvasBaseline = Math.ceil(fontSize * 2 * scale);
        contourCanvas.width = Math.ceil(wordBounds.width * scale);
        contourCanvas.height = canvasBaseline + scale;
        metricsContext.font = font;
        metricsContext.textBaseline = 'alphabetic';
        metricsContext.scale(scale, scale);
        if ('letterSpacing' in metricsContext) metricsContext.letterSpacing = style.letterSpacing;
        if ('fontKerning' in metricsContext) metricsContext.fontKerning = style.fontKerning;
        metricsContext.fillText(poland.firstChild.textContent, 0, canvasBaseline / scale);
        const pixels = metricsContext.getImageData(0, 0, contourCanvas.width, contourCanvas.height);
        const contour = new Array(contourCanvas.width).fill(null);
        for (let x = 0; x < contour.length; x++) {
            for (let y = 0; y < contourCanvas.height; y++) {
                if (pixels.data[(y * contourCanvas.width + x) * 4 + 3] < 128) continue;
                const edge = (y - canvasBaseline) / scale + baselineY - top;
                contour[x] = edge;
                break;
            }
        }
        const shoulder = size + fontSize * 0.08;
        let previous = -1;
        for (let x = 0; x < contour.length; x++) {
            if (contour[x] === null) continue;
            let start = previous;
            let end = x;
            if (previous >= 0 && x > previous + 1) {
                while (start > 0 && contour[start] > shoulder && contour[start - 1] !== null
                    && contour[start - 1] <= contour[start]) start--;
                while (end + 1 < contour.length && contour[end] > shoulder && contour[end + 1] !== null
                    && contour[end + 1] <= contour[end]) end++;
            }
            const startEdge = start < 0 ? contour[end] : contour[start];
            const endEdge = contour[end];
            for (let gap = start + 1; gap < end; gap++) {
                contour[gap] = startEdge + (endEdge - startEdge) * (gap - start) / (end - start);
            }
            previous = x;
        }
        for (let x = previous + 1; x < contour.length; x++) {
            contour[x] = previous < 0 ? size : contour[previous];
        }

        maskCanvas.width = Math.ceil(width * scale);
        maskCanvas.height = Math.ceil(height * scale);
        const image = maskContext.createImageData(maskCanvas.width, maskCanvas.height);
        const start = left - width / 2;
        for (let x = 0; x < maskCanvas.width; x++) {
            const wordX = Math.round(start * scale + x);
            const edge = contour[Math.max(0, Math.min(contour.length - 1, wordX))];
            for (let y = 0; y < maskCanvas.height; y++) {
                image.data[(y * maskCanvas.width + x) * 4 + 3] =
                    Math.round(255 * Math.max(0, Math.min(1, (edge - (y + 0.5) / scale + 0.2) / 0.4)));
            }
        }
        maskContext.putImageData(image, 0, 0);
        mask.style.maskImage = `url(${maskCanvas.toDataURL()})`;
    }
    new ResizeObserver(positionBeaver).observe(locationButton);

    let phase = 'hidden';
    const timers = new Set();
    let automatic = false;

    function isMouseHover(event) {
        return event.pointerType === 'mouse' && hover.matches;
    }

    function appearAutomatically() {
        if (phase !== 'hidden' || pointerInside || document.hidden || reducedMotion.matches) return;
        consumeAppearance();
        automatic = true;
        phase = 'waiting';
        beaver.dataset.state = 'peek';
        later(() => {
            revealBeaver();
            later(hideBeaver, 2000 + Math.random() * 2000);
        }, 5000 + Math.random() * 5000);
    }

    function later(callback, delay) {
        const timer = setTimeout(() => {
            timers.delete(timer);
            callback();
        }, delay);
        timers.add(timer);
    }

    function waitForReveal() {
        if (Math.random() < 0.2) {
            hideBeaver();
            return;
        }
        phase = 'waiting';
        later(revealBeaver, Math.random() < 0.75 ? 1000 : 3000);
    }

    function revealBeaver() {
        phase = 'visible';
        beaver.dataset.state = 'visible';
        locationButton.dispatchEvent(new CustomEvent('beaver:rise', { detail: { automatic } }));
    }

    function hideBeaver() {
        const quiet = automatic;
        automatic = false;
        timers.forEach(clearTimeout);
        timers.clear();
        phase = 'cooldown';
        beaver.dataset.state = 'hidden';
        locationButton.dispatchEvent(new CustomEvent('beaver:hide', { detail: { automatic: quiet } }));
        later(() => {
            phase = 'hidden';
            if (pointerInside && hover.matches && !document.hidden) activateLocation();
        }, 1000);
    }

    function activateLocation(skipLeave = false) {
        consumeAppearance();
        if (automatic) {
            hideBeaver();
            return;
        }
        if (phase === 'hidden') {
            phase = 'peeking';
            beaver.dataset.state = 'peek';
            locationButton.dispatchEvent(new Event('beaver:peek'));
            later(() => {
                phase = 'peeked';
                if (skipLeave || !pointerInside) waitForReveal();
            }, parseFloat(getComputedStyle(beaver).transitionDuration) * 1000);
        } else if (phase === 'waiting' || phase === 'visible') {
            hideBeaver();
        }
    }

    function start(click) {
        if (document.hidden) return;
        if (click) activateLocation(!isMouseHover(click));
        else if (pointerInside) activateLocation();
    }

    beaver.dataset.state = 'hidden';
    locationButton.addEventListener('click', event => {
        activateLocation(!isMouseHover(event));
    });
    locationButton.addEventListener('pointerenter', event => {
        if (!isMouseHover(event)) return;
        pointerInside = true;
        activateLocation();
    });
    locationButton.addEventListener('pointerleave', event => {
        if (!isMouseHover(event)) return;
        pointerInside = false;
        if (phase === 'peeked') waitForReveal();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && phase !== 'hidden') hideBeaver();
    });
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches && automatic) hideBeaver();
    });
    return { start, appearAutomatically };
}
