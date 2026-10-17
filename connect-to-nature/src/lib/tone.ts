/* What the page looks like under a horizontal line `line` pixels from the top
 * of the viewport: the tone of the last [data-tone] section whose top has
 * passed it, and the id of the last one with an id worth linking to.
 *
 * Both bars on the front page float over sections that are black or white,
 * and each of them is legible over only one of the two. Reading the section
 * beneath them lets them change with it, instead of carrying a dark strip
 * across a white page or a white one across the dark story. */
export function toneAt(line: number, linkable?: readonly string[]) {
  let tone: 'dark' | 'light' = 'dark';
  let id: string | null = null;
  document.querySelectorAll<HTMLElement>('main [data-tone]').forEach((section) => {
    if (section.getBoundingClientRect().top <= line) {
      tone = section.dataset.tone === 'light' ? 'light' : 'dark';
      if (section.id && (!linkable || linkable.includes(section.id))) id = section.id;
    }
  });
  return { tone, id };
}
