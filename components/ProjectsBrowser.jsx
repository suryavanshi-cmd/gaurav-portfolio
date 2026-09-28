'use client';

import { useMemo, useState } from 'react';
import { KINDS } from './format';
import { ProjectCard } from './cards';
import { Segmented, SpotlightGroup } from './ui';

const ORDER = ['work', 'built', 'design'];

export default function ProjectsBrowser({ projects }) {
  const [kind, setKind] = useState('all');

  const counts = useMemo(() => {
    const out = { all: projects.length };
    ORDER.forEach((key) => { out[key] = projects.filter((p) => p.kind === key).length; });
    return out;
  }, [projects]);

  const options = [
    { value: 'all', label: 'All', count: counts.all },
    ...ORDER.map((key) => ({ value: key, label: key === 'design' ? 'Designs' : KINDS[key].label, count: counts[key] })),
  ];

  /* "All" is grouped by kind with a heading each, so work, own builds and paper
     designs never blur together. A single kind is one grid. */
  const groups = kind === 'all'
    ? ORDER.map((key) => ({ key, items: projects.filter((p) => p.kind === key) }))
    : [{ key: kind, items: projects.filter((p) => p.kind === kind) }];

  return (
    <>
      <div className="browse-bar">
        <Segmented label="Filter projects" options={options} value={kind} onChange={setKind} />
        <span className="browse-count" aria-live="polite">
          {groups.reduce((n, g) => n + g.items.length, 0)} projects
        </span>
      </div>

      <SpotlightGroup>
        {groups.map((group) => (
          <section key={`${kind}-${group.key}`} aria-labelledby={`group-${group.key}`}>
            <div className="group-title">
              <h2 id={`group-${group.key}`}>{group.key === 'design' ? 'Designs' : KINDS[group.key].label}</h2>
              <p>{KINDS[group.key].blurb}</p>
            </div>
            {/* Keyed on the filter so the cards replay their entrance on change. */}
            <div key={kind} className="grid grid-3 is-swapping">
              {group.items.map((project) => <ProjectCard key={project.slug} project={project} />)}
            </div>
          </section>
        ))}
      </SpotlightGroup>
    </>
  );
}
