const root = document.documentElement;
const coarse = matchMedia('(pointer: coarse)').matches;
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dpr = Math.min(devicePixelRatio, 1.5);

const params = {
    dust: true, dustCount: 173, dustNear: 0.8, dustFar: 0.4, dustAlpha: 0.49,
    dustSigma: 0.6, dustDamp: 0.985, dustSettle: 1.2, dustWind: 2, dustPeriod: 7,
    dustGlint: 8, dustGlintRate: 0.5, dustSpread: true,
};

const canvas = document.createElement('canvas');
canvas.className = 'dust';
canvas.setAttribute('aria-hidden', 'true');
const ctx = canvas.getContext('2d');

let active = null, raf = 0, last = 0, born = 0, parts = [], beam = null, sprite = null, w = 0, h = 0;

const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.63;

function enabled() {
    return params.dust && active?.light?.beam && css('--is-dark') === '1' && !still.matches && !document.hidden;
}

function makeSprite() {
    const probe = document.createElement('div');
    probe.style.color = css('--lamp');
    document.body.append(probe);
    const lamp = getComputedStyle(probe).color;
    probe.remove();
    const size = 64, s = document.createElement('canvas');
    s.width = s.height = size;
    const c = s.getContext('2d', { willReadFrequently: true });
    c.fillStyle = lamp;
    c.fillRect(0, 0, 1, 1);
    const [r, g0, b] = c.getImageData(0, 0, 1, 1).data;
    c.clearRect(0, 0, 1, 1);
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgb(${r} ${g0} ${b})`);
    g.addColorStop(0.25, `rgb(${r} ${g0} ${b} / 0.6)`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return s;
}

function spawn(p, fresh) {
    p.x = Math.random() * w;
    p.y = Math.random() * h;
    p.z = Math.random();
    p.vx = gauss() * 2;
    p.vy = gauss() * 2;
    p.w = (0.4 + Math.random()) * params.dustGlintRate;
    p.phase = Math.random() * Math.PI * 2;
    p.age = fresh ? 0 : 10;
    return p;
}

function layout() {
    const light = active.light;
    if (!light) return;
    const { box, shape } = light;
    w = box.w;
    h = box.h;
    Object.assign(canvas.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${w}px`, height: `${h}px` });
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pts = shape.map(([x, y]) => [x - box.x, y - box.y]);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const edges = pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        let nx = q[1] - p[1], ny = p[0] - q[0];
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        if ((cx - p[0]) * nx + (cy - p[1]) * ny < 0) { nx = -nx; ny = -ny; }
        return [p[0], p[1], nx, ny];
    });
    const sx = light.s[0] - box.x, sy = light.s[1] - box.y;
    const ax = light.near[0] - box.x - sx, ay = light.near[1] - box.y - sy;
    beam = { edges, sx, sy, ax, ay, len2: ax * ax + ay * ay || 1, soft: light.soft, fade: light.fade };
    sprite = makeSprite();
    const count = Math.round(params.dustCount * (coarse ? 0.5 : 1));
    parts = Array.from({ length: count }, (_, i) => parts[i] ?? spawn({}, false));
    parts.forEach((p) => spawn(p, false));
}

function smooth(e0, e1, x) {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}

function intensity(x, y) {
    let d = Infinity;
    for (const [px, py, nx, ny] of beam.edges) d = Math.min(d, (x - px) * nx + (y - py) * ny);
    const across = smooth(-beam.soft / 2, beam.soft / 2, d);
    const t = Math.min(1, Math.max(0, ((x - beam.sx) * beam.ax + (y - beam.sy) * beam.ay) / beam.len2));
    const along = beam.fade + (1 - beam.fade) * t;
    return params.dustSpread ? along * across : along * (0.25 + 0.75 * across);
}

function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(t - last, 50) / 1000;
    last = t;
    const fade = Math.min(1, (t - born) / 1500);
    const step = dt * 60;
    const damp = Math.pow(params.dustDamp, step);
    const wind = params.dustWind * Math.sin(t / 1000 / params.dustPeriod * Math.PI * 2);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
        p.vx = p.vx * damp + gauss() * params.dustSigma * Math.sqrt(step) + wind * 0.02 * step;
        p.vy = p.vy * damp + gauss() * params.dustSigma * Math.sqrt(step) + params.dustSettle * 0.02 * step;
        const speed = 0.5 + p.z;
        p.x += p.vx * dt * speed;
        p.y += p.vy * dt * speed;
        p.age += dt;
        if (p.x < -8 || p.x > w + 8 || p.y < -8 || p.y > h + 8) spawn(p, true);
        const light = intensity(p.x, p.y);
        if (light <= 0.01) continue;
        const glint = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(t / 1000 * p.w + p.phase)), params.dustGlint);
        const focus = 1 - Math.abs(p.z - 0.5) * 1.2;
        const alpha = params.dustAlpha * light * glint * focus * fade * Math.min(1, p.age / 1.5);
        if (alpha <= 0.003) continue;
        const size = (params.dustFar + (params.dustNear - params.dustFar) * p.z) * 4;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    }
}

function start() {
    if (raf || !active || !enabled()) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
}

function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
}

function attach(print) {
    if (print === active) return start();
    stop();
    active = print;
    print.append(canvas);
    born = performance.now();
    canvas.hidden = !enabled();
    if (enabled()) layout();
    start();
}

function refresh() {
    stop();
    canvas.hidden = !enabled();
    if (active && enabled()) {
        layout();
        start();
    }
}

const visible = new Map();
const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.set(e.target, e.intersectionRatio) : visible.delete(e.target);
    const best = [...visible].sort((a, b) => b[1] - a[1])[0];
    if (best) attach(best[0]);
    else stop();
}, { threshold: [0, 0.25, 0.5, 0.75, 1] });

document.querySelectorAll('.print').forEach((print) => watcher.observe(print));
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
still.addEventListener('change', refresh);
addEventListener('lightchange', refresh);
