// @ts-check
import { defineConfig } from 'astro/config';

// SITE / BASE come from the GitHub Pages workflow (https://<user>.github.io/<repo>); locally the site lives at the root.
export default defineConfig({
  site: process.env.SITE || 'https://jainamkapadia.com', // placeholder until the domain is chosen; used for canonical/OG URLs
  base: process.env.BASE || undefined,
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' }, // ~3 KB of CSS: inlining beats a render-blocking request
});
