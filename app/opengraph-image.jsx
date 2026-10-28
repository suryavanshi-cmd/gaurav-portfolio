import { ImageResponse } from 'next/og';

export const alt = 'Gaurav Suryavanshi — A little curious. Always creating.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#fffefa', color: '#292722',
        padding: '67px 80px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, border: '2px solid #292722', borderRadius: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 25, fontWeight: 800, letterSpacing: -1,
          }}>g.</div>
          <div style={{ fontSize: 21, fontWeight: 650, letterSpacing: -0.5 }}>Gaurav Suryavanshi</div>
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ fontSize: 17, letterSpacing: 2, color: '#8e8a7f' }}>A PERSONAL CORNER OF THE INTERNET</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ fontSize: 88, lineHeight: 1.08, fontWeight: 700, letterSpacing: -5 }}>A little curious.</div>
          <div style={{ fontSize: 88, lineHeight: 1.08, fontWeight: 700, letterSpacing: -5, display: 'flex' }}>
            Always creating<span style={{ color: '#b6a15a' }}>.</span>
          </div>
          <div style={{
            position: 'absolute', right: 48, bottom: -75, width: 115, height: 115,
            borderRadius: 60, background: '#eee8ba', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)',
            fontSize: 17, textAlign: 'center', fontWeight: 650, color: '#554a2b'
          }}>STAY CURIOUS ✳</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e4e1d8', paddingTop: 22, fontSize: 20, color: '#7f7c74' }}>
          <span>Software. Stories. Small experiments.</span>
          <span>gauravspace.com ↗</span>
        </div>
      </div>
    ),
    size,
  );
}
