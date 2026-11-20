const dark = matchMedia('(prefers-color-scheme: dark)');
const still = matchMedia('(prefers-reduced-motion: reduce)');

function load() {
    import('./photos-light.js');
    if (!still.matches) import('./photos-dust.js');
}

if (dark.matches) load();
else dark.addEventListener('change', load, { once: true });
