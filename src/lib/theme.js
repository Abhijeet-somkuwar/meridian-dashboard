/**
 * Two themes, one stored choice.
 *
 * The tokens live in index.css as CSS variables on `:root` (dark, the default)
 * and `html.light`. Everything in Tailwind reads those variables, so flipping
 * one class restyles the whole app. The choice is per-browser, remembered in
 * localStorage; the public pages (landing, sign-in) always render dark - they
 * are the poster, not the workbench - and restore the stored choice on exit.
 */

const KEY = 'meridian-theme';

export const storedTheme = () => {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme !== 'light');
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
};

export const setTheme = (theme) => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode - the choice just won't survive a reload */
  }
  applyTheme(theme);
};

export const currentTheme = () =>
  document.documentElement.classList.contains('light') ? 'light' : 'dark';
