/* Index-driven delay for a grid of revealing cards, capped so the last card in
   a long list does not arrive a second after the first.

   It lives outside the Reveal component because server components lay out those
   grids too, and a function exported from a 'use client' module cannot be
   called on the server. */
export function revealDelay(index: number, step = 0.06, cap = 0.36): number {
  return Math.min(index * step, cap);
}
