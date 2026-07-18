'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import styles from './LLMWhiteboard.module.css';

const LLMWhiteboard = dynamic(() => import('./LLMWhiteboard'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingCard} role="status">
      <span className={styles.loadingPulse} />
      Preparing the interactive LLM whiteboard…
    </div>
  ),
});

export default function LearningsLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.learningTab}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">✦</span>
        <span>
          <small>Interactive</small>
          Learnings
        </span>
      </button>

      {open ? <LLMWhiteboard onClose={() => setOpen(false)} /> : null}
    </>
  );
}
