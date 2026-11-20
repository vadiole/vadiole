const root = document.documentElement;
const dark = matchMedia('(prefers-color-scheme: dark)');
const still = matchMedia('(prefers-reduced-motion: reduce)');
let loaded = false;

function update() {
    const scheme = root.style.colorScheme;
    if (scheme) root.dataset.theme = scheme;
    if (loaded || !(scheme ? scheme === 'dark' : dark.matches)) return;
    loaded = true;
    import('./photos-light.js');
    if (!still.matches) import('./photos-dust.js');
}

dark.addEventListener('change', update);
document.addEventListener('themechange', update);
update();
