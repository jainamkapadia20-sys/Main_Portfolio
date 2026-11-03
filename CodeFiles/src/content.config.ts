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
      // The case study, result first (src/pages/work/[slug].astro). Every part is optional: a section shows only when it has content.
      // Impact: what came out of it, measured against the goals (one short line each), and big numbers that count up
      results: z.array(z.string()).default([]),
      stats: z.array(z.object({ value: z.number(), suffix: z.string().default(''), label: z.string() })).default([]),
      deliverables: z.array(z.string()).default([]),
      // The challenge: the problem in up to three sentences, goals on two tracks, the limits worked within
      challenge: z.object({ problem: z.string(), userGoals: z.array(z.string()).default([]), systemGoals: z.array(z.string()).default([]),
        constraints: z.array(z.string()).default([]) }).optional(),
      // Discovery: why it was researched, what was found, and the maps (flows, IA) drawn before any screen
      research: z.object({ intent: z.string().optional(), insights: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
        media: z.array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]) }).optional(),
      // Ideation, in order: each stage's pictures with one line on its logic
      exploration: z.array(z.object({ label: z.string(), caption: z.string(), images: z.array(z.object({ src: image(), alt: z.string() })).min(1) })).default([]),
      // Decisions and pivots: what it was, what it became, and why
      decisions: z.array(z.object({ title: z.string(), before: z.string(), after: z.string(), why: z.string().optional(),
        images: z.array(z.object({ src: image(), alt: z.string() })).default([]) })).default([]),
      // Edge cases: how the design behaves when it matters most
      edgeCases: z.array(z.object({ title: z.string(), text: z.string(), src: image(), alt: z.string() })).default([]),
      retro: z.object({ well: z.array(z.string()).default([]), hurdles: z.array(z.string()).default([]), next: z.array(z.string()).default([]) }).optional(),
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
