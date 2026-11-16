'use client';

import { useId, useState } from 'react';

export default function FilmAccordion({ film }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <article className={'story-film-row story-film-accordion' + (open ? ' is-open' : '')}>
      <h4 className="story-film-trigger-heading">
        <button
          type="button"
          className="story-film-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(previous => !previous)}
        >
          <span className="story-film-row-title">{film.title}</span>
          <span className="story-film-row-year">{film.year}</span>
          <span className="story-film-row-plus" aria-hidden="true">+</span>
        </button>
      </h4>
      <div className="story-film-panel" id={id} aria-hidden={!open}>
        <div className="story-film-panel-inner">
          <div className="story-film-row-detail">
            <p className="story-film-director">Directed by {film.maker}</p>
            <p>{film.thought}</p>
            <p className="story-film-reflection">{film.reflection || 'This is the kind of storytelling that makes me want to understand the choices behind a scene.'}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
