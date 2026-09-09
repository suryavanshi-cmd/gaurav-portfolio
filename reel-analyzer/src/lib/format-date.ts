/** "3 minutes ago" without pulling in a date library for one call site. */
export function formatDistanceToNowStrict(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
  ];

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  let previous = 1;
  for (const [limit, unit] of units) {
    if (seconds < limit) return formatter.format(-Math.floor(seconds / previous), unit);
    previous = limit;
  }
  return formatter.format(-Math.floor(seconds / 31557600), 'year');
}
