/* Artwork for a farm that has not uploaded photographs yet.

   A marketplace page with a grey box on it looks broken; a page with a stock
   photo of someone else's farm is worse than broken. So each listing gets a
   drawing generated from its own slug and its own landscape — coast, orchard,
   vineyard, hills, river or plateau — which is stable across reloads, weighs
   nothing, needs no network, and is replaced the moment the host uploads a real
   photo through the shetkari portal. */

interface Palette {
  sky: [string, string];
  far: string;
  mid: string;
  near: string;
  accent: string;
  sun: string;
}

const PALETTES: Record<string, Palette> = {
  coast: { sky: ['#bfe4f2', '#fde3c8'], far: '#7fb4c4', mid: '#3f7f8c', near: '#1f5560', accent: '#f5c98a', sun: '#ffd9a0' },
  orchard: { sky: ['#d6ecd2', '#fdf3d4'], far: '#a8c98e', mid: '#5f9457', near: '#2f5f3c', accent: '#e8a33d', sun: '#ffe6ac' },
  vineyard: { sky: ['#e2dcf6', '#fbe0e6'], far: '#b2a4d8', mid: '#7a6bb0', near: '#463c72', accent: '#c79ad6', sun: '#ffd6e2' },
  hills: { sky: ['#cfe3ef', '#e9f0d8'], far: '#9db7ab', mid: '#5b8570', near: '#2c4f45', accent: '#8fc0a0', sun: '#f2f7d9' },
  river: { sky: ['#d3e9e6', '#f6efd6'], far: '#9dc6bd', mid: '#4f8d84', near: '#28524f', accent: '#7fc8bd', sun: '#ffeec2' },
  plateau: { sky: ['#f0e2cd', '#f8f0dd'], far: '#d1b894', mid: '#a08356', near: '#5c4a2e', accent: '#e0b062', sun: '#ffe3a8' },
};

/* Same slug, same drawing, on the server and in the browser. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return () => {
    h = (Math.imul(h, 48271) + 11) >>> 0;
    return h / 4294967296;
  };
}

function ridge(rand: () => number, baseline: number, amplitude: number, steps = 6): string {
  const width = 800;
  const points: string[] = [`M0 ${baseline + (rand() - 0.5) * amplitude}`];
  for (let i = 1; i <= steps; i += 1) {
    const x = (width / steps) * i;
    const y = baseline + (rand() - 0.5) * amplitude * 2;
    const cx = x - width / steps / 2;
    points.push(`Q${cx.toFixed(0)} ${(y - amplitude * (0.4 + rand() * 0.8)).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`);
  }
  points.push('L800 500 L0 500 Z');
  return points.join(' ');
}

export function Scene({
  scene = 'orchard',
  seed = 'ctn',
  className,
  night = false,
}: {
  scene?: string;
  seed?: string;
  className?: string;
  night?: boolean;
}) {
  const palette = PALETTES[scene] ?? PALETTES.orchard;
  const rand = seeded(seed);
  const gradientId = `sky-${seed.replace(/[^a-z0-9]/gi, '')}`;
  const sunX = 120 + rand() * 560;
  const sunY = 90 + rand() * 60;

  const far = ridge(rand, 250, 26);
  const mid = ridge(rand, 320, 34);
  const near = ridge(rand, 400, 22);

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={night ? '#101a2b' : palette.sky[0]} />
          <stop offset="100%" stopColor={night ? '#26304a' : palette.sky[1]} />
        </linearGradient>
      </defs>

      <rect width="800" height="500" fill={`url(#${gradientId})`} />
      <circle cx={sunX} cy={sunY} r={night ? 26 : 42} fill={night ? '#e8ecf7' : palette.sun} opacity={night ? 0.9 : 0.85} />

      <path d={far} fill={palette.far} opacity="0.75" />
      <path d={mid} fill={palette.mid} opacity="0.9" />

      {scene === 'coast' && (
        <>
          <rect y="330" width="800" height="170" fill={palette.mid} opacity="0.55" />
          {[0, 1, 2, 3].map((row) => (
            <path
              key={row}
              d={`M0 ${360 + row * 32} q ${60 + rand() * 40} ${-12 - rand() * 8} ${140} 0 t ${140} 0 t ${140} 0 t ${140} 0 t ${140} 0`}
              stroke={palette.accent}
              strokeWidth="2"
              fill="none"
              opacity={0.5 - row * 0.08}
            />
          ))}
        </>
      )}

      {scene === 'river' && (
        <path
          d="M340 250 C 300 320, 460 340, 400 420 C 360 470, 420 480, 430 500 L280 500 C300 440, 240 380, 300 320 Z"
          fill={palette.accent}
          opacity="0.55"
        />
      )}

      <path d={near} fill={palette.near} />

      {(scene === 'orchard' || scene === 'hills') &&
        Array.from({ length: 14 }).map((_, index) => {
          const x = 30 + index * 56 + (rand() - 0.5) * 18;
          const y = 415 + (rand() - 0.5) * 26;
          const size = 20 + rand() * 16;
          return (
            <g key={index} opacity="0.92">
              <rect x={x - 1.6} y={y} width="3.2" height={size * 0.6} fill="#2b2118" opacity="0.55" />
              <circle cx={x} cy={y - size * 0.25} r={size * 0.72} fill={palette.near} />
              <circle cx={x - size * 0.28} cy={y - size * 0.1} r={size * 0.5} fill={palette.mid} opacity="0.85" />
            </g>
          );
        })}

      {scene === 'vineyard' &&
        Array.from({ length: 7 }).map((_, index) => {
          const y = 380 + index * 18;
          return (
            <g key={index}>
              <line x1="0" y1={y} x2="800" y2={y + (rand() - 0.5) * 14} stroke={palette.accent} strokeWidth="3" opacity={0.35 + index * 0.07} />
              {Array.from({ length: 10 }).map((__, dot) => (
                <circle key={dot} cx={40 + dot * 80 + (rand() - 0.5) * 20} cy={y - 4} r="4.5" fill={palette.near} opacity="0.8" />
              ))}
            </g>
          );
        })}

      {scene === 'plateau' &&
        Array.from({ length: 5 }).map((_, index) => (
          <rect
            key={index}
            x="0"
            y={390 + index * 22}
            width="800"
            height="10"
            fill={index % 2 === 0 ? palette.accent : palette.near}
            opacity={0.25 + index * 0.1}
          />
        ))}

      {night &&
        Array.from({ length: 40 }).map((_, index) => (
          <circle
            key={index}
            cx={rand() * 800}
            cy={rand() * 240}
            r={rand() * 1.4 + 0.4}
            fill="#ffffff"
            opacity={0.3 + rand() * 0.6}
          />
        ))}
    </svg>
  );
}
