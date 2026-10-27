// Calm motion (html[data-motion]): set before first paint from the OS "reduce motion" setting. Every component
// reads this instead of the media query.
export const calm = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'calm';
