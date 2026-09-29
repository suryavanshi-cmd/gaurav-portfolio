/* A clamped linear ramp, for mapping scroll progress to opacity.
 *
 * It exists because of what motion does with the obvious version.
 * `useTransform(scrollYProgress, [0.5, 0.8], [0, 1])` on an opacity gets
 * handed to the browser as a native ViewTimeline animation — and that
 * animation runs over the timeline's default range, from the element entering
 * the viewport to it leaving, not over the `offset` given to useScroll. The
 * fade then happens at the wrong scroll position entirely: a headline that
 * should be fully visible at the end of a sticky section measured 0.3%
 * opacity. A function transform cannot be compiled to keyframes, so it stays
 * on the JavaScript path, where the offsets are honoured. */
export function ramp(from: number, to: number, start: number, end: number) {
  return (value: number) => {
    const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
    return start + (end - start) * t;
  };
}
