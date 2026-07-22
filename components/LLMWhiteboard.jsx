'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './LLMWhiteboard.module.css';

const PROMPT = 'Artificial intelligence will';
const STAGES = [
  { key: 'prompt', label: 'Input', caption: 'Read the prompt' },
  { key: 'tokens', label: 'Tokens', caption: 'Split text into pieces' },
  { key: 'vectors', label: 'Embeddings', caption: 'Turn tokens into numbers' },
  { key: 'attention', label: 'Attention', caption: 'Connect useful context' },
  { key: 'transformer', label: 'Transformer', caption: 'Refine the representation' },
  { key: 'logits', label: 'Logits', caption: 'Score possible next tokens' },
  { key: 'softmax', label: 'Softmax', caption: 'Convert scores to probabilities' },
  { key: 'selection', label: 'Prediction', caption: 'Choose and append one token' },
];

const ROUNDS = [
  [{ token: 'change', logit: 3.8 }, { token: 'grow', logit: 2.6 }, { token: 'improve', logit: 2.1 }, { token: 'stop', logit: 0.7 }],
  [{ token: 'the', logit: 3.5 }, { token: 'rapidly', logit: 2.3 }, { token: 'how', logit: 1.8 }, { token: 'society', logit: 1.2 }],
  [{ token: 'world', logit: 3.7 }, { token: 'future', logit: 2.5 }, { token: 'way', logit: 1.7 }, { token: 'industries', logit: 1.1 }],
];

const EXPLORE_CARDS = [
  ['Tokenizer', 'Text is split into reusable token pieces before the neural network processes it.'],
  ['Embeddings', 'Each token becomes a compact numerical vector that represents learned features.'],
  ['Self-attention', 'Tokens exchange information so each token can use the most relevant surrounding context.'],
  ['Softmax', 'Raw model scores are normalized into a probability distribution over candidate tokens.'],
  ['Training', 'During training, cross-entropy loss compares the expected token with the predicted probability.'],
  ['Inference', 'During inference, model weights stay fixed while the model predicts and appends one token at a time.'],
];

const tokenize = (text) => text.trim().split(/\s+/).filter(Boolean);

function tokenId(token, index) {
  let hash = 211 + index * 89;
  for (const character of token) hash = (hash * 31 + character.charCodeAt(0)) % 9000;
  return 1000 + hash;
}

function embeddingFor(token, index) {
  const seed = [...token].reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37;
  return Array.from({ length: 4 }, (_, vectorIndex) => Number((Math.sin(seed * (vectorIndex + 1) * 0.018) * 0.86).toFixed(2)));
}

function softmax(candidates) {
  const maxLogit = Math.max(...candidates.map((candidate) => candidate.logit));
  const exponentials = candidates.map((candidate) => ({ ...candidate, exp: Math.exp(candidate.logit - maxLogit) }));
  const total = exponentials.reduce((sum, candidate) => sum + candidate.exp, 0);
  return exponentials.map((candidate) => ({ ...candidate, probability: candidate.exp / total }));
}

function AttentionPreview({ tokens, active }) {
  const visible = tokens.slice(0, 4);
  const x = (index) => 80 + index * 145;
  const links = [
    { from: 0, to: 1, weight: 3 },
    { from: 1, to: 2, weight: 6 },
    { from: 2, to: 1, weight: 4 },
    { from: 2, to: 3, weight: 2 },
  ].filter((link) => link.from < visible.length && link.to < visible.length);

  return (
    <div className={`${styles.attentionPreview} ${active ? styles.animateAttention : ''}`}>
      <svg viewBox="0 0 600 190" aria-hidden="true">
        {links.map((link, index) => {
          const start = x(link.from);
          const end = x(link.to);
          return (
            <path
              key={`${link.from}-${link.to}`}
              d={`M ${start} 145 Q ${(start + end) / 2} ${42 + index * 13} ${end} 145`}
              style={{ strokeWidth: link.weight }}
            />
          );
        })}
      </svg>
      <div className={styles.attentionTokens}>
        {visible.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}
      </div>
    </div>
  );
}

function StageVisual({ stage, tokens, rows, distribution, selectedToken, generatedTokens }) {
  if (stage === 0) {
    return (
      <div className={styles.promptVisual}>
        <span>Prompt</span>
        <p>“{PROMPT}”</p>
        <small>The model receives text and prepares it for numerical processing.</small>
      </div>
    );
  }

  if (stage === 1) {
    return (
      <div className={styles.tokenVisual}>
        <div className={styles.tokenRow}>{tokens.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}</div>
        <div className={styles.tokenStats}>
          <span>{PROMPT.length} characters</span>
          <span>{tokenize(PROMPT).length} words</span>
          <span>≈ {Math.ceil(PROMPT.length / 4)} tokens</span>
        </div>
        <small>Simulated tokenization for educational visualization.</small>
      </div>
    );
  }

  if (stage === 2) {
    return (
      <div className={styles.vectorVisual}>
        {rows.slice(0, 5).map((row) => (
          <div key={`${row.token}-vector`}>
            <span>{row.token}</span>
            <b>#{row.id}</b>
            <code>[{row.embedding.map((value) => value.toFixed(2)).join(', ')}]</code>
          </div>
        ))}
        <small>Token IDs and vectors are simulated and do not come from a production model.</small>
      </div>
    );
  }

  if (stage === 3) {
    return (
      <div>
        <div className={styles.formula}>Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V</div>
        <AttentionPreview tokens={tokens} active />
        <small className={styles.helperText}>Thicker lines represent stronger simulated attention between tokens.</small>
      </div>
    );
  }

  if (stage === 4) {
    return (
      <div className={styles.transformerVisual}>
        {[1, 2, 3].map((layer) => (
          <div key={layer}>
            <span>Layer {layer}</span>
            <strong>Attention</strong><i>→</i><strong>Add & Normalize</strong><i>→</i><strong>Feed Forward</strong>
            <b />
          </div>
        ))}
        <small>Three representative layers are shown to keep the demo lightweight.</small>
      </div>
    );
  }

  if (stage === 5) {
    return (
      <div className={styles.logitVisual}>
        {distribution.map((candidate) => (
          <div key={candidate.token}><span>{candidate.token}</span><strong>{candidate.logit.toFixed(1)}</strong></div>
        ))}
        <small>Logits are unnormalized scores for possible next tokens.</small>
      </div>
    );
  }

  if (stage === 6) {
    return (
      <div className={styles.probabilityVisual}>
        {distribution.map((candidate) => (
          <div key={candidate.token} className={candidate.token === selectedToken ? styles.selectedProbability : ''}>
            <span>{candidate.token}</span>
            <div><i style={{ transform: `scaleX(${candidate.probability})` }} /></div>
            <strong>{Math.round(candidate.probability * 100)}%</strong>
          </div>
        ))}
        <small>Softmax converts logits into probabilities that add up to 100%.</small>
      </div>
    );
  }

  return (
    <div className={styles.selectionVisual}>
      <div className={styles.selectedToken}>{selectedToken}</div>
      <span>highest simulated probability</span>
      <div className={styles.outputSentence}>
        <span>{PROMPT}</span>
        {generatedTokens.map((token, index) => <strong key={`${token}-${index}`}>{token}</strong>)}
        <em>{selectedToken}</em>
      </div>
      <small>Predict one token → append it → process the updated sentence again.</small>
    </div>
  );
}

export default function LLMWhiteboard({ onClose }) {
  const [currentStage, setCurrentStage] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [generatedTokens, setGeneratedTokens] = useState([]);
  const [round, setRound] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [expandedConcept, setExpandedConcept] = useState(null);
  const wasPlayingRef = useRef(false);

  const tokens = useMemo(() => [...tokenize(PROMPT), ...generatedTokens], [generatedTokens]);
  const rows = useMemo(() => tokens.map((token, index) => ({ token, id: tokenId(token, index), embedding: embeddingFor(token, index) })), [tokens]);
  const distribution = useMemo(() => softmax(ROUNDS[Math.min(round, ROUNDS.length - 1)]), [round]);
  const selectedToken = distribution[0].token;
  const activeStage = currentStage < 0 ? 0 : currentStage;
  const progress = completed ? 100 : ((activeStage + 1) / STAGES.length) * 100;

  const replay = useCallback(() => {
    setGeneratedTokens([]);
    setRound(0);
    setCurrentStage(0);
    setCompleted(false);
    setManualMode(false);
    setExpandedConcept(null);
    setPlaying(true);
  }, []);

  const advance = useCallback(() => {
    if (currentStage < STAGES.length - 1) {
      setCurrentStage((stage) => stage + 1);
      return;
    }

    setGeneratedTokens((current) => [...current, selectedToken]);
    if (round >= ROUNDS.length - 1) {
      setPlaying(false);
      setCompleted(true);
      return;
    }

    setRound((value) => value + 1);
    setCurrentStage(1);
  }, [currentStage, round, selectedToken]);

  const previous = useCallback(() => {
    setPlaying(false);
    setManualMode(true);
    setCompleted(false);
    setCurrentStage((stage) => Math.max(0, stage - 1));
  }, []);

  const next = useCallback(() => {
    setPlaying(false);
    setManualMode(true);
    advance();
  }, [advance]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setGeneratedTokens(['change', 'the', 'world']);
      setRound(2);
      setCurrentStage(STAGES.length - 1);
      setCompleted(true);
      return undefined;
    }

    const timer = window.setTimeout(replay, 380);
    return () => window.clearTimeout(timer);
  }, [replay]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(advance, 760);
    return () => window.clearTimeout(timer);
  }, [advance, playing]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        wasPlayingRef.current = playing;
        setPlaying(false);
      } else if (wasPlayingRef.current) {
        setPlaying(true);
        wasPlayingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playing]);

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section className={styles.whiteboard} role="dialog" aria-modal="true" aria-labelledby="llm-whiteboard-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.productMark}><span>G</span><div><strong>LLM Learning Lab</strong><small>Interactive educational preview</small></div></div>
          <div className={styles.headerActions}>
            <span className={playing ? styles.liveBadge : styles.readyBadge}>{playing ? 'Running' : completed ? 'Complete' : 'Paused'}</span>
            <button type="button" onClick={onClose} aria-label="Close learning experience">×</button>
          </div>
        </header>

        <div className={styles.heroCopy}>
          <p>INTERACTIVE LEARNINGS</p>
          <h2 id="llm-whiteboard-title">See how an LLM predicts the next token.</h2>
          <span>A simple, automatic walkthrough from prompt to probability to generated text.</span>
        </div>

        <div className={styles.progressArea}>
          <div className={styles.progressMeta}><span>{STAGES[activeStage].label}</span><strong>{Math.round(progress)}%</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
        </div>

        <main className={styles.labGrid}>
          <aside className={styles.stageRail} aria-label="LLM processing steps">
            {STAGES.map((stage, index) => {
              const state = index < activeStage || completed ? styles.stageDone : index === activeStage ? styles.stageCurrent : '';
              return (
                <div className={`${styles.stageItem} ${state}`} key={stage.key}>
                  <span>{index < activeStage || completed ? '✓' : index + 1}</span>
                  <div><strong>{stage.label}</strong><small>{stage.caption}</small></div>
                </div>
              );
            })}
          </aside>

          <section className={styles.focusCard} aria-live="polite">
            <div className={styles.focusHeading}>
              <div><small>STEP {String(activeStage + 1).padStart(2, '0')}</small><h3>{STAGES[activeStage].label}</h3></div>
              <span>{round + 1} / {ROUNDS.length} prediction</span>
            </div>
            <StageVisual
              stage={activeStage}
              tokens={tokens}
              rows={rows}
              distribution={distribution}
              selectedToken={selectedToken}
              generatedTokens={generatedTokens}
            />
          </section>

          <aside className={styles.outputCard}>
            <small>GENERATED OUTPUT</small>
            <p><span>{PROMPT}</span>{generatedTokens.map((token, index) => <strong key={`${token}-${index}`}> {token}</strong>)}{playing && activeStage === 7 ? <em> {selectedToken}</em> : null}<i /></p>
            <div className={styles.roundStatus}>
              <span>Prompt tokens</span><strong>{tokenize(PROMPT).length}</strong>
              <span>Generated tokens</span><strong>{generatedTokens.length}</strong>
              <span>Current prediction</span><strong>{selectedToken}</strong>
            </div>
            <p className={styles.simulationNote}>Educational simulation. Token IDs, vectors, attention, logits, probabilities, and metrics are simulated.</p>
          </aside>
        </main>

        <div className={styles.controls}>
          {completed ? (
            <>
              <button type="button" className={styles.primaryButton} onClick={replay}>Replay animation</button>
              <button type="button" onClick={() => { setManualMode(true); setCompleted(false); setPlaying(false); setCurrentStage(0); setRound(0); setGeneratedTokens([]); }}>Step through</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Continue'}</button>
              {manualMode ? <button type="button" onClick={previous}>Previous</button> : null}
              {manualMode ? <button type="button" onClick={next}>Next</button> : null}
            </>
          )}
        </div>

        {completed ? (
          <section className={styles.exploreSection}>
            <div className={styles.exploreHeading}><div><small>EXPLORE FURTHER</small><h3>Understand the ideas behind the animation.</h3></div><p>Select a concept for a concise technical explanation.</p></div>
            <div className={styles.exploreGrid}>
              {EXPLORE_CARDS.map(([title, explanation], index) => (
                <button type="button" key={title} className={expandedConcept === index ? styles.exploreActive : ''} onClick={() => setExpandedConcept(expandedConcept === index ? null : index)}>
                  <span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><i>↗</i>
                  {expandedConcept === index ? <p>{explanation}</p> : null}
                </button>
              ))}
            </div>
            <div className={styles.trainingStrip}>
              <div><small>SIMULATED TRAINING LOSS</small><strong>0.33</strong></div>
              <div className={styles.lossLine}><i /><i /><i /><i /><i /><i /></div>
              <p>Expected token: <strong>“change”</strong> · Predicted probability: <strong>0.72</strong> · Loss = -log(0.72)</p>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
