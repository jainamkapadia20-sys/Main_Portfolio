import { getCollection } from 'astro:content';

/** Projects in display order (the `order` field). */
export const sortedProjects = async () => (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
