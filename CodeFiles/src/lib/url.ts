// Root-absolute paths for public/ files and pages, prefixed with the deploy base (GitHub Pages serves under /<repo>).
// Needed for anything handed to a React island: island props are JSON, which scripts/rebase.mjs does not rewrite.
export const withBase = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;
