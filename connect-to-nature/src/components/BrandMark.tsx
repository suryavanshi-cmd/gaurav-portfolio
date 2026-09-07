export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ctn-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-leaf)" />
          <stop offset="100%" stopColor="var(--color-sun)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#ctn-mark)" opacity="0.16" />
      {/* A hill, a field line, and the sun over both. */}
      <path d="M4 22c4-7 7-10 9-10s3 2 5 5 3 5 6 5H4z" fill="var(--color-leaf)" />
      <circle cx="22" cy="10.5" r="3.6" fill="var(--color-sun)" />
      <path d="M4 25.5h24" stroke="var(--color-leaf)" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
