/**
 * Inline theme bootstrap script.
 *
 * Runs before React hydration to prevent theme flash (FOUC).
 * Must stay in sync with THEME_STORAGE_KEY and DEFAULT_THEME.
 */

export const themeInitScript = `(function(){try{var k="roicard_theme";var t=localStorage.getItem(k);var d=t==="light"?"light":"dark";document.documentElement.setAttribute("data-theme",d);document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
