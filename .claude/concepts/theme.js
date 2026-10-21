// Theme toggle: system preference by default, the visitor's choice remembered.
const root = document.documentElement;
const btn = document.querySelector('.theme');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
const label = () => { btn.textContent = isDark() ? 'Light' : 'Dark'; btn.setAttribute('aria-label', `Switch to ${btn.textContent.toLowerCase()} theme`); };
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch {}
label();
btn.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  label();
});
