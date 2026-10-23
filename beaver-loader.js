(() => {
    const triggers = ['pointerenter', 'focus', 'click'];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let button;
    let loading;
    let pendingClick;
    let appearance = 0;
    let visit;
    try {
        visit = sessionStorage.getItem('beaver-visit');
        if (!visit) {
            visit = Math.random() < 0.5 ? 'eligible' : 'skip';
            sessionStorage.setItem('beaver-visit', visit);
        }
    } catch {
        visit = Math.random() < 0.5 ? 'eligible' : 'skip';
    }

    function consumeAppearance() {
        appearance++;
        visit = 'done';
        try {
            sessionStorage.setItem('beaver-visit', visit);
        } catch {}
    }

    function loadBeaver() {
        loading ??= Promise.all([
            import('./beaver.js'),
            import('./beaver-sound.js').catch(error => {
                console.error('Beaver sound could not load', error);
            })
        ]).then(([{ setupBeaver }, sound]) => {
            triggers.forEach(type => button.removeEventListener(type, onTrigger));
            const beaver = setupBeaver(button, consumeAppearance);
            sound?.setupBeaverSound(button);
            beaver.start(pendingClick);
            return beaver;
        }).catch(error => {
            console.error('Beaver could not load', error);
        });
        return loading;
    }

    function onTrigger(event) {
        if (event.type === 'click') {
            pendingClick = event;
            consumeAppearance();
        }
        loadBeaver();
    }

    function scheduleAppearance() {
        const request = ++appearance;
        if (visit !== 'eligible' || document.hidden || reducedMotion.matches) return;
        setTimeout(async () => {
            if (request !== appearance) return;
            const beaver = await loadBeaver();
            setTimeout(() => {
                if (request === appearance) beaver?.appearAutomatically();
            }, 1000);
        }, 14000 + Math.random() * 15000);
    }

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'beaver.css';
    style.onload = () => {
        const label = document.querySelector('.location');
        button = document.createElement('button');
        button.className = 'location';
        button.type = 'button';
        button.append(...label.childNodes);
        label.replaceWith(button);
        triggers.forEach(type => button.addEventListener(type, onTrigger));
        document.addEventListener('visibilitychange', scheduleAppearance);
        reducedMotion.addEventListener('change', scheduleAppearance);
        scheduleAppearance();
    };
    document.head.append(style);
})();
