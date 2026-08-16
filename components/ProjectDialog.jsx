'use client';

import { useCallback, useEffect, useRef } from 'react';
import RedTeamArena from './RedTeamArena';
import { projectCategories } from './projects';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function ProjectDialog({ project, onClose }) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  /* Remember whichever row opened the dialog so focus can go back to it. */
  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    return () => {
      const target = restoreFocusRef.current;
      if (target && typeof target.focus === 'function') target.focus();
    };
  }, []);

  /* Escape closes; Tab is trapped inside the panel. Without the trap the dialog
     is modal only visually, and keyboard users tab straight out into a page
     they cannot see. */
  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? []).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!project) return null;

  const isGame = Boolean(project.game);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={onKeyDown}
      >
        <div className="dialog-head">
          <div>
            <span className="dialog-key">{projectCategories[project.key] ?? project.key}</span>
            <h2 id="dialog-title">{project.title}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="dialog-body">
          <p className="dialog-lead">{project.problem}</p>

          {project.flow ? (
            <section className="dialog-section">
              <h3>Flow</h3>
              <ol className="dialog-flow">
                {project.flow.map((step, position) => (
                  <li key={step}>
                    <span className="dialog-flow-index">{String(position + 1).padStart(2, '0')}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {isGame ? (
            <section className="dialog-section">
              <h3>Play a round</h3>
              <RedTeamArena />
            </section>
          ) : null}

          {project.challenges ? (
            <section className="dialog-section">
              <h3>What made it hard</h3>
              <ul className="dialog-list">
                {project.challenges.map((entry) => <li key={entry}>{entry}</li>)}
              </ul>
            </section>
          ) : null}

          {project.outcome ? (
            <section className="dialog-section">
              <h3>Where it landed</h3>
              <p className="dialog-outcome">{project.outcome}</p>
            </section>
          ) : null}

          <div className="dialog-columns">
            {project.stack ? (
              <section className="dialog-section">
                <h3>Built with</h3>
                <ul className="dialog-tags">
                  {project.stack.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </section>
            ) : null}

            {project.next ? (
              <section className="dialog-section">
                <h3>Next</h3>
                <ul className="dialog-list dialog-list-tight">
                  {project.next.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
