// Sitemap without an integration: the public pages plus one entry per project. /system and /404 stay out.
import type { APIRoute } from 'astro';
import { sortedProjects } from '../lib/projects';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', '/work', '/about', '/contact', '/car', ...(await sortedProjects()).map((p) => `/work/${p.id}`)];
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const urls = paths.map((p) => `<url><loc>${new URL(base + p, site)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } });
};
