import { ImageResponse } from 'next/og';
import { PERSON } from './site';

/* One card design for every social preview: the home page and each post.
   Uses next/og's built-in font, so no font file has to ship with it. */
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, title, footer }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #000 0%, #0b1a2e 55%, #0a2a4f 100%)',
          color: '#f5f5f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#2997ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            GS
          </div>
          <div style={{ fontSize: 28, color: '#a1a1a6' }}>{eyebrow}</div>
        </div>
        <div style={{ fontSize: title.length > 48 ? 64 : 76, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#a1a1a6' }}>
          <span>{PERSON.name} · {PERSON.shortRole}, {PERSON.city}</span>
          <span style={{ color: '#2997ff' }}>{footer}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
