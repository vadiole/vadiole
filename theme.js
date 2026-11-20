const prefersDark = matchMedia("(prefers-color-scheme: dark)");
window.colorScheme = () => document.documentElement.style.colorScheme || (prefersDark.matches ? "dark" : "light");

document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() !== "t" || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.isComposing || e.defaultPrevented) return;
    if (e.target.isContentEditable || e.target.closest?.('input:not([type="range"]), textarea, select, [role=textbox]')) return;
    const root = document.documentElement;
    root.style.colorScheme = colorScheme() === "dark" ? "light" : "dark";
    const color = root.style.colorScheme === "dark" ? "#1b1a18" : "#fdfdfc";
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = color;
    document.dispatchEvent(new Event("themechange"));
});
