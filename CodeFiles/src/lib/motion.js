// Calm motion: the site-wide switch (html[data-motion]). It defaults to the OS "reduce motion" setting and the
// visitor can override it from the menu, so every component reads this instead of the media query.
export const calm = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'calm';
