/*
  Where a citation goes.

  A citation that only prints a title is decoration. This takes the visitor to
  the passage's origin: the section of the page it came from, an article, a
  project write-up, or the mail client for the contact card.

  The site is several pages and the assistant can be open on any of them, so a
  destination is a path with an optional fragment rather than a bare anchor. If
  the path is the page already open, this scrolls to the fragment and marks it
  briefly — scrolling somewhere without saying what to look at leaves the
  visitor to find the sentence themselves. Otherwise it navigates, and the
  browser lands on the fragment itself.
*/

const MARK_MS = 2200;

export function goToSource(source) {
  const href = source?.href;
  if (!href) return;

  /* Anything not rooted in this site — mailto:, an external write-up — is
     handed to the browser as it stands. */
  if (!href.startsWith('/') && !href.startsWith('#')) {
    window.location.href = href;
    return;
  }

  const [path, fragment] = splitHref(href);
  const here = window.location.pathname.replace(/\/$/, '') || '/';

  if (path !== here) {
    window.location.href = href;
    return;
  }

  if (!fragment) {
    window.scrollTo({ top: 0, behavior: motion() });
    return;
  }

  const target = document.getElementById(fragment);
  if (!target) {
    window.location.hash = fragment;
    return;
  }

  target.scrollIntoView({ behavior: motion(), block: 'start' });
  mark(target);
}

function splitHref(href) {
  const hash = href.indexOf('#');
  if (hash < 0) return [href.replace(/\/$/, '') || '/', ''];
  const path = href.slice(0, hash).replace(/\/$/, '') || '/';
  return [path, href.slice(hash + 1)];
}

function motion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/* The section a citation points at is usually a heading, and a heading alone
   is easy to lose among the ones above and below it. Marking the section it
   titles is what a reader is actually looking for. */
function mark(target) {
  const section = target.closest('section') || target;
  section.classList.remove('is-sourced');
  /* Forces a reflow so the class re-applies and the animation restarts when
     the same citation is clicked twice. */
  void section.offsetWidth;
  section.classList.add('is-sourced');
  window.setTimeout(() => section.classList.remove('is-sourced'), MARK_MS);
}
