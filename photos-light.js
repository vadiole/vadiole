const root = document.documentElement;
const svgNS = 'http://www.w3.org/2000/svg';
const phone = matchMedia('(max-width: 512px)');
const darkScheme = matchMedia('(prefers-color-scheme: dark)');

const params = {
    side: 'alternate', lightX: 559, lightY: -0.19, lightXM: 24, lightYM: -0.19,
    margin: 2, soft: 3, wallLit: 0.35, falloff: 0,
    beams: true, beam: 2.9, beamFade: 1,
    rampFrom: 0.1, rampTo: 0.5, rise: 90, loadRise: 900, waitImage: true,
    focus: true, settleSpeed: 80, settleTime: 700, focusAt: 0.6, dimTo: 0.5, fadeOut: 4500,
    flicker: 0.25, flickerDepth: 0.18, flickerDur: 1400,
};

const prints = [...document.querySelectorAll('.print')];
const photos = new Map(prints.map((print) => [print, print.querySelector('a')]));

const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
let dark = false;

function lampRGB() {
    const probe = document.createElement('i');
    probe.style.color = css('--lamp');
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    c.fillStyle = color;
    c.fillRect(0, 0, 1, 1);
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
    return `rgb(${r} ${g} ${b})`;
}

function hull(points) {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) {
        while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
        lower.push(q);
    }
    for (const q of p.reverse()) {
        while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
        upper.push(q);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function el(tag, attrs, ...children) {
    const node = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    node.append(...children);
    return node;
}

function sign(i) {
    if (params.side === 'left') return -1;
    if (params.side === 'right') return 1;
    return i % 2 ? 1 : -1;
}

function draw(print, i, lamp, gap) {
    const photo = photos.get(print);
    const w = photo.offsetWidth, h = photo.offsetHeight;
    const fx = phone.matches ? params.lightXM : params.lightX;
    const fy = phone.matches ? params.lightYM : params.lightY;
    const area = print.parentElement.getBoundingClientRect(), own = print.getBoundingClientRect();
    const s = [sign(i) < 0 ? area.left - own.left - fx : area.right - own.left + fx, fy * h];
    const m = params.margin, soft = params.soft;
    const rect = [[-m, -m], [w + m, -m], [w + m, h + m], [-m, h + m]];
    const shape = hull([s, ...rect]);
    const pad = soft * 1.5;
    const top = -gap / 2;
    const bottom = print.offsetHeight + gap / 2;
    const xs = shape.map((p) => p[0]), ys = shape.map((p) => p[1]);
    const box = {
        x: Math.min(...xs) - pad, y: Math.max(top, Math.min(...ys) - pad),
        r: Math.max(...xs) + pad, b: Math.min(bottom, Math.max(...ys) + pad),
    };
    box.w = box.r - box.x;
    box.h = box.b - box.y;
    const fade = Math.min(gap / 6, 32);
    const clipTop = box.y <= top + 0.5, clipBottom = box.b >= bottom - 0.5;
    const center = [w / 2, h / 2];
    const lit = (k) => lamp.replace(/\d+ \d+ \d+/, (rgb) => rgb.split(' ').map((c) => Math.round(Math.min(255, c * params.wallLit * k))).join(' '));
    const beam = params.beams ? params.beam / 100 : 0;
    const id = `l${i}`;
    const t = (p) => `${p[0] - box.x},${p[1] - box.y}`;
    const dir = [center[0] - s[0], center[1] - s[1]];
    const len = Math.hypot(...dir) || 1;
    const u = [dir[0] / len, dir[1] / len];
    const near = [center[0] - u[0] * (w / 2 + m), center[1] - u[1] * (h / 2 + m)];
    const far = [center[0] + u[0] * (w / 2 + m), center[1] + u[1] * (h / 2 + m)];

    const svg = el('svg', { class: 'light', 'aria-hidden': 'true', width: box.w, height: box.h, viewBox: `0 0 ${box.w} ${box.h}` },
        el('defs', {},
            el('filter', { id: `${id}f`, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: box.w, height: box.h, 'color-interpolation-filters': 'sRGB' },
                el('feGaussianBlur', { stdDeviation: soft / 2 })),
            el('linearGradient', { id: `${id}myg`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: box.h },
                el('stop', { offset: 0, 'stop-color': clipTop ? '#000' : '#fff' }),
                el('stop', { offset: fade / box.h, 'stop-color': '#fff' }),
                el('stop', { offset: 1 - fade / box.h, 'stop-color': '#fff' }),
                el('stop', { offset: 1, 'stop-color': clipBottom ? '#000' : '#fff' })),
            el('mask', { id: `${id}my`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: box.w, height: box.h },
                el('rect', { width: box.w, height: box.h, fill: `url(#${id}myg)` })),
            el('linearGradient', { id: `${id}b`, gradientUnits: 'userSpaceOnUse', x1: s[0] - box.x, y1: s[1] - box.y, x2: near[0] - box.x, y2: near[1] - box.y },
                el('stop', { offset: 0, 'stop-color': lamp, 'stop-opacity': beam * params.beamFade }),
                el('stop', { offset: 1, 'stop-color': lamp, 'stop-opacity': beam })),
            el('linearGradient', { id: `${id}p`, gradientUnits: 'userSpaceOnUse', x1: near[0] - box.x, y1: near[1] - box.y, x2: far[0] - box.x, y2: far[1] - box.y },
                el('stop', { offset: 0, 'stop-color': lit(1 + params.falloff) }),
                el('stop', { offset: 1, 'stop-color': lit(1 - params.falloff) }))),
        el('g', { mask: `url(#${id}my)` }, el('g', { filter: `url(#${id}f)` },
            el('polygon', { points: shape.map(t).join(' '), fill: `url(#${id}b)` }),
            el('rect', { x: -m - box.x, y: -m - box.y, width: w + 2 * m, height: h + 2 * m, fill: `url(#${id}p)` }))));
    Object.assign(svg.style, { left: `${box.x}px`, top: `${box.y}px` });
    print.querySelector('.light')?.remove();
    print.prepend(svg);
    print.light = { box, shape, s, near, soft, fade: params.beamFade, beam: beam > 0 };
}

function refresh() {
    dark = css('--is-dark') === '1';
    if (dark) {
        const lamp = lampRGB();
        const gap = parseFloat(getComputedStyle(prints[0].parentElement).rowGap) || 0;
        prints.forEach((print, i) => draw(print, i, lamp, gap));
        kick();
    } else {
        for (const print of prints) {
            print.querySelector('.light')?.remove();
            print.light = null;
        }
    }
    dispatchEvent(new Event('lightchange'));
}

const still = matchMedia('(prefers-reduced-motion: reduce)');
let lastScroll = -1e9, lastY = scrollY, velocity = 0, calmSince = performance.now(), raf = 0, idle = 0, last = performance.now();
const seen = new Map();

function visible(print) {
    const r = photos.get(print).getBoundingClientRect();
    return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / Math.min(r.height, innerHeight);
}

function smooth(e0, e1, x) {
    const t = Math.min(1, Math.max(0, (x - e0) / Math.max(0.001, e1 - e0)));
    return t * t * (3 - 2 * t);
}

function loaded(print) {
    const img = print.querySelector('img');
    if (!params.waitImage || img.complete) return true;
    if (!img.waiting) {
        img.waiting = true;
        img.addEventListener('load', kick, { once: true });
    }
    return false;
}

function flick(print, t) {
    const f = print.flick;
    if (!f) return 1;
    const p = (t - f.start) / params.flickerDur;
    if (p >= 1) {
        print.flick = null;
        return 1;
    }
    let dip = 0;
    for (const [at, depth, width] of f.dips) dip = Math.max(dip, depth * Math.exp(-(((p - at) / width) ** 2)));
    return 1 - dip;
}

function frame(t) {
    raf = 0;
    if (!dark) return;
    const elapsed = Math.min(2000, t - last);
    const dt = Math.min(100, elapsed);
    last = t;
    const moving = t - lastScroll < 120 && Math.abs(velocity) > params.settleSpeed;
    if (moving) calmSince = t;
    const settled = params.focus && t - calmSince > params.settleTime;
    for (const print of seen.keys()) seen.set(print, visible(print));
    let focus = null;
    if (settled) {
        let best = 0;
        for (const [print, v] of seen) if (v > best) [best, focus] = [v, print];
        if (best < params.focusAt) focus = null;
    }
    let busy = false;
    for (const print of prints) {
        const v = seen.get(print) ?? 0;
        const ready = loaded(print);
        const pos = ready ? smooth(params.rampFrom, params.rampTo, v) : 0;
        let level = print.level ?? 0;
        let target = Math.max(level, pos);
        let tau = print.everLit ? params.rise : params.loadRise;
        if (focus && print !== focus) {
            target = v > 0 ? Math.min(level, params.dimTo) : 0;
            tau = params.fadeOut / 3;
        } else if (focus === print) {
            target = Math.max(pos, level, ready ? 1 : 0);
        }
        if (!seen.has(print) && settled) {
            target = 0;
            tau = params.fadeOut / 3;
        }
        if (target > level) level = Math.min(target, level + dt / Math.max(1, tau));
        else level += (target - level) * (1 - Math.exp(-dt / Math.max(1, tau)));
        if (Math.abs(target - level) < 0.002) level = target;
        else busy = true;
        if (level === target && level > 0) print.everLit = true;
        print.level = level;
        if (!print.flick && level > 0.9 && !still.matches && params.flicker > 0 && Math.random() < params.flicker / 60 * elapsed / 1000) {
            const count = 1 + Math.floor(Math.random() * 3);
            print.flick = { start: t, dips: Array.from({ length: count }, () => [Math.random() * 0.8 + 0.1, params.flickerDepth * (0.4 + Math.random() * 0.6), 0.03 + Math.random() * 0.08]) };
        }
        const shown = level * flick(print, t);
        if (print.flick) busy = true;
        const value = shown.toFixed(4);
        if (print.shown !== value) {
            print.shown = value;
            print.style.setProperty('--lvl', value);
        }
    }
    if (busy || !settled && t - calmSince < params.settleTime + 50) kick();
    else if (params.flicker > 0) idle ||= setTimeout(() => {
        idle = 0;
        kick();
    }, 1000);
}

function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
}

addEventListener('scroll', () => {
    const t = performance.now();
    const dt = Math.max(1, t - lastScroll);
    const instant = (scrollY - lastY) / dt * 1000;
    velocity = dt > 150 ? instant : velocity * 0.6 + instant * 0.4;
    lastY = scrollY;
    lastScroll = t;
    kick();
}, { passive: true });

const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) {
        e.isIntersecting ? seen.set(e.target, 0) : seen.delete(e.target);
        e.target.classList.toggle('near', e.isIntersecting);
    }
    kick();
});
prints.forEach((print) => watcher.observe(print));

let queued = 0;
const schedule = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(refresh);
};

new ResizeObserver(schedule).observe(prints[0].parentElement);
phone.addEventListener('change', schedule);
darkScheme.addEventListener('change', schedule);
document.addEventListener('themechange', schedule);
refresh();
