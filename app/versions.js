/*
  The registry every version-aware surface reads from: the switcher in each
  header, and the /versions index. Add an entry here and the new version shows
  up in both places automatically.

  `href` values are navigated with plain <a> (never next/link) so each version
  loads as a fresh document. That matters: every version ships its own global
  stylesheet, and a client-side transition would leave the previous version's
  CSS attached to the document and blend the two designs together.
*/
export const versions = [
  {
    key: 'v1',
    label: 'V1',
    name: 'Terminal',
    href: '/v1',
    year: '2025',
    tagline: 'Neon-on-black, four weather themes, and a hidden overdrive mode.',
    description:
      'The original build. A dark "engineering console" aesthetic with a green-teal accent, animated gradient headlines, display type (Anton and Chakra Petch), Dark / Cold / Summer / Rainy themes, and an OVERDRIVE mode hidden behind the Konami code.',
  },
  {
    key: 'v2',
    label: 'V2',
    name: 'Editorial',
    href: '/v2',
    year: '2026',
    tagline: 'Monochrome, large-radius, and built to be read by a recruiter.',
    description:
      'The current build. Black-and-white only, Manrope and Inter, 64px radii and hairline borders, with the content reorganised around what a hiring manager actually looks for: an about section, an at-a-glance card, case studies, the full résumé, and an FAQ.',
  },
];

/* The version `/` serves, and the one the switcher marks as current. */
export const latestVersionKey = 'v2';

export const latestVersion = versions.find((v) => v.key === latestVersionKey);
