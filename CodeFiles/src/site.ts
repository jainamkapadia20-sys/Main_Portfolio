// One place for the facts that appear across pages (nav, footer, meta).
export const site = {
  name: 'Jainam Kapadia',
  role: 'Designer',
  disciplines: ['UI/UX', 'Graphic', 'Service', 'HMI', 'Sketches'],
  status: 'Student, open to internships',
  email: 'jainamkapadia20@gmail.com',
  instagram: 'https://instagram.com/jainam05',
  linkedin: 'https://www.linkedin.com/in/jainamkapadia2432/',
  description:
    'Jainam Kapadia, a design student working across UI/UX, graphic, service and HMI design, with a sketchbook always open.',
  nav: [
    { href: '/work', label: 'Work' },
    { href: '/about', label: 'About' },
    { href: '#contact', label: 'Contact' },
  ],
  // Sample playlist until Jainam picks his own (any Spotify track, album or playlist URI works here)
  spotify: { uri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', label: 'the playlist' },
} as const;
