/*
  Where a citation goes.

  A citation that only prints a title is decoration. This takes the visitor to
  the passage's origin: the section of the page it came from, an article, or
  the mail client for the contact card. The section is highlighted briefly on
  arrival, because scrolling somewhere without saying what to look at leaves
  the visitor to find the sentence themselves.
*/

export function goToSource(source, { samePage = true } = {}) {
  if (!source) return;

  /* External and cross-page destinations win over the anchor: an article
     passage belongs to the article, not to the list that links to it. */
  if (source.href && !source.href.startsWith('#')) {
    window.location.href = source.href;
    return;
  }

  const anchor = source.anchor || source.href;
  if (!anchor) return;

  if (!samePage) {
    window.location.href = `/${anchor}`;
    return;
  }

  const target = document.querySelector(anchor);
  if (!target) {
    window.location.hash = anchor;
    return;
  }

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  target.classList.remove('is-sourced');
  /* Forces a reflow so the class re-applies and the animation restarts when
     the same citation is clicked twice. */
  void target.offsetWidth;
  target.classList.add('is-sourced');
  window.setTimeout(() => target.classList.remove('is-sourced'), 2200);
}
