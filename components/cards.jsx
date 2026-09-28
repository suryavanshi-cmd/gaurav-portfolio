import Link from 'next/link';
import { KINDS } from './format';
import { formatDate } from './format';

/* The small looping preview on each live-demo card. CSS only: the card is
   alive without a canvas or a script per card. */
export function DemoArt({ art }) {
  switch (art) {
    case 'flow':
      return <div className="demo-art demo-art-flow" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>;
    case 'bars':
      return (
        <div className="demo-art demo-art-bars" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => <b key={i} />)}
        </div>
      );
    case 'gauge':
      return <div className="demo-art demo-art-gauge" aria-hidden="true" />;
    case 'json':
      return (
        <div className="demo-art demo-art-json" aria-hidden="true">
          {'{ "'}<b>claimId</b>{'": '}<em>"CLM-2291"</em>{' }'}<br />
          {'POST /claims/'}<b>{'${claimId}'}</b>{'/settle'}<br />
          {'→ '}<em>200 APPROVED</em>
        </div>
      );
    case 'game':
      return <div className="demo-art demo-art-game" aria-hidden="true"><i /><i /><i /><i /></div>;
    case 'notes':
      return (
        <div className="demo-art demo-art-notes" aria-hidden="true">
          <span>AI</span><span>will</span><span>change</span><span>the</span>
        </div>
      );
    case 'lanes':
      return (
        <div className="demo-art demo-art-lanes" aria-hidden="true">
          <span><b /><b /><b className="is-bad" /><b /></span>
          <span><b /><b /><b /></span>
          <span><b /><b className="is-bad" /><b /><b /></span>
        </div>
      );
    case 'gate':
      return (
        <div className="demo-art demo-art-gate" aria-hidden="true">
          <span>structure <b>✓</b></span>
          <span>facts <b>✓</b></span>
          <span>meaning <b className="is-bad">✗</b></span>
          <em>Blocked</em>
        </div>
      );
    case 'breaker':
      return <div className="demo-art demo-art-breaker" aria-hidden="true"><i /><i /><i /><i /><i /><u /></div>;
    case 'chat':
      return <div className="demo-art demo-art-chat" aria-hidden="true"><b /><b /><b /></div>;
    default:
      return null;
  }
}

export function DemoCard({ tool }) {
  return (
    <Link href={`/lab/${tool.slug}`} className="card demo-card">
      <DemoArt art={tool.art} />
      <div className="card-kicker">
        <span className="badge badge-live"><span className="live-dot" aria-hidden="true" />Live</span>
        <span>{tool.tags.join(' · ')}</span>
      </div>
      <h3>{tool.title}</h3>
      <p>{tool.note}</p>
      <div className="card-foot">
        <span className="more-link">Try it <span aria-hidden="true">›</span></span>
      </div>
    </Link>
  );
}

export function ProjectCard({ project }) {
  const kind = KINDS[project.kind];
  return (
    <Link href={`/projects/${project.slug}`} className="card project-card">
      <div className="card-kicker">
        <span className={`badge ${kind.badge}`}>{kind.label}</span>
        {project.live ? (
          <span className="badge badge-live"><span className="live-dot" aria-hidden="true" />Live demo</span>
        ) : null}
        <span>{project.category}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.note}</p>
      <div className="tags">
        {project.stack.slice(0, 4).map((item) => <span key={item} className="tag">{item}</span>)}
      </div>
      <div className="card-foot">
        <span className="more-link">Read more <span aria-hidden="true">›</span></span>
      </div>
    </Link>
  );
}

export function PostCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="card">
      <div className="card-kicker">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span aria-hidden="true">·</span>
        <span>{post.readingMinutes} min read</span>
      </div>
      <h3>{post.title}</h3>
      <p>{post.summary}</p>
      <div className="card-foot">
        <span className="more-link">Read <span aria-hidden="true">›</span></span>
      </div>
    </Link>
  );
}

/* Simple line icons for the "What I do" cards. */
export function Icon({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'test':
      return <svg {...common}><path d="M9 3h6" /><path d="M10 3v6.5L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9.5V3" /><path d="M7.5 15h9" /></svg>;
    case 'server':
      return <svg {...common}><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>;
    case 'spark':
      return <svg {...common}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
    case 'layers':
      return <svg {...common}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>;
    default:
      return null;
  }
}
