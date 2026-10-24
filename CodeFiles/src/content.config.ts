// Content model (brief §7). Adding a project = copying one file in src/content/projects/ and filling it in.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: ({ image }) => {
    // One picture: an image file, or nothing (a labelled placeholder at `ratio` is shown instead).
    const media = { src: image().optional(), alt: z.string().default(''), ratio: z.string().default('16 / 9'), caption: z.string().optional() };
    // `after` is the heading of the body section the block follows (e.g. "Process"); without it, the block goes at the end.
    const after = { after: z.string().optional() };
    const block = z.discriminatedUnion('type', [
      z.object({ type: z.literal('full'), ...after, ...media }),
      z.object({ type: z.literal('two'), ...after, items: z.array(z.object(media)).length(2) }),
      z.object({ type: z.literal('text-image'), ...after, ...media, text: z.string(), flip: z.boolean().default(false) }),
      z.object({ type: z.literal('quote'), ...after, text: z.string(), cite: z.string().optional() }),
      z.object({ type: z.literal('video'), ...after, src: z.string().optional(), poster: image().optional(), alt: z.string().default(''),
        ratio: z.string().default('16 / 9'), caption: z.string().optional() }),   // src: a file in public/ (e.g. /video/x.mp4) or a URL
      // interactive cluster: one screen at a time, grouped into modes; each step says what the sensors do and what the driver sees
      z.object({ type: z.literal('cluster'), ...after, ratio: z.string().default('2 / 1'), modes: z.array(z.object({ name: z.string(),
        steps: z.array(z.object({ src: image(), alt: z.string(), title: z.string(), sensors: z.string().optional(), screen: z.string() })).min(1) })).min(1) }),
    ]);
    return z.object({
      title: z.string(),
      year: z.number().int(),
      type: z.string(),                                   // e.g. "HMI concept"
      role: z.array(z.string()).min(1),
      tools: z.array(z.string()).min(1),
      duration: z.string(),
      summary: z.string().max(160),
      category: z.enum(['UI/UX', 'Graphic', 'Service', 'HMI', 'Sketches']),
      cover: image().optional(),                          // falls back to a placeholder at coverRatio
      preview: z.string().optional(),                     // muted loop in public/ shown instead of the cover (home card, case header)
      coverAlt: z.string().default(''),
      coverRatio: z.string().default('4 / 3'),
      blocks: z.array(block).default([]),
      // the case study's hook: what came out of it, one short line each
      results: z.array(z.string()).default([]),
      // the process as steps: a phase word, a title, two to four short points, and the picture the stage shows
      process: z.array(z.object({ phase: z.string(), title: z.string(), points: z.array(z.string()).min(1).max(5),
        media: image().optional(), alt: z.string().default(''), caption: z.string().optional(),
        gallery: z.array(z.object({ src: image(), alt: z.string() })).optional() })).default([]),
      featured: z.boolean().default(false),
      order: z.number().int(),
      placeholder: z.boolean().default(false),
    }).superRefine((d, ctx) => {
      // a real image needs real alt text (placeholders are labelled by the component)
      if (d.cover && !d.coverAlt.trim()) ctx.addIssue({ code: 'custom', path: ['coverAlt'], message: 'Add coverAlt: describe the cover image.' });
      d.blocks.forEach((b, i) => {
        const pics = b.type === 'two' ? b.items : b.type === 'cluster' ? b.modes.flatMap((m) => m.steps) : b.type === 'quote' ? [] : [b];
        pics.forEach((m) => {
          if (m.src && !m.alt.trim()) ctx.addIssue({ code: 'custom', path: ['blocks', i], message: `Add alt text for the ${b.type} block's image.` });
        });
      });
    });
  },
});

const car = defineCollection({
  loader: glob({ base: './src/content/car', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      make: z.string(),
      model: z.string(),
      year: z.number().int(),
      variant: z.string(),
      colour: z.string(),
      engine: z.string(),
      power: z.string(),
      torque: z.string(),
      transmission: z.string(),
      dimensions: z.string(),
      mods: z.array(z.object({ name: z.string(), note: z.string() })),
      model3d: z.object({ stock: z.string(), modified: z.string() }),
      poster: image(),
      posterAlt: z.string(),
      photos: z.array(z.object({ src: image(), alt: z.string() })),
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { projects, car };
