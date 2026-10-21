// After a build with BASE set (GitHub Pages serves the site under /<repo>/), prefix the root-absolute links that are
// written by hand in the source (nav, project links, fonts, videos, models). Astro already prefixes its own assets.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.BASE || '').replace(/\/$/, '');
if (!base) process.exit(0);
const fix = (u) => (u.startsWith('//') || u === base || u.startsWith(base + '/') ? u : base + u);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

let n = 0;
for (const f of walk('dist').filter((f) => /\.(html|css|xml)$/.test(f))) {
  const s0 = readFileSync(f, 'utf8');
  const s = s0
    .replace(/\b(href|src|poster|action|data-[\w-]+)="(\/[^"]*)"/g, (m, a, u) => `${a}="${fix(u)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)(\/[^\s,]+)/g, (x, p, u) => p + fix(u))}"`)
    .replace(/url\((["']?)(\/[^)"']*)\1\)/g, (m, q, u) => `url(${q}${fix(u)}${q})`);
  if (s !== s0) { writeFileSync(f, s); n++; }
}

// self-check: no root-absolute href/src/poster left outside the base
const bad = [];
for (const f of walk('dist').filter((f) => f.endsWith('.html')))
  for (const [, u] of readFileSync(f, 'utf8').matchAll(/\b(?:href|src|poster)="(\/[^"]*)"/g)) if (fix(u) !== u) bad.push(`${f}: ${u}`);
if (bad.length) { console.error('rebase: unprefixed links\n' + bad.slice(0, 10).join('\n')); process.exit(1); }
console.log(`rebase: ${n} files prefixed with ${base}`);
