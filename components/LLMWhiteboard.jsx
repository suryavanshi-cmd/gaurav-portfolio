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

/* Two to three sentences of narration per stage, shown under the visual so the
   walkthrough reads as an explanation rather than an animation. */
const NARRATION = {
  prompt: [
    'Everything starts with plain text. The model cannot read letters directly, so the prompt is first prepared for numerical processing.',
    'Nothing has been predicted yet — this is only the input the model will condition on.',
    'The same prompt will be re-processed after every new token is appended.',
  ],
  tokens: [
    'The tokenizer splits the text into sub-word pieces called tokens, and common words usually stay whole.',
    'Real tokenizers break rare or compound words into several pieces — this demo simplifies by splitting on whole words.',
    'Each token maps to a fixed integer ID from the model vocabulary.',
  ],
  vectors: [
    'Every token ID is looked up in an embedding table and becomes a vector of numbers.',
    'Those numbers are learned during training, so tokens used in similar contexts end up close together in that space.',
    'Position information is added too, so the model knows word order and not just which words appeared.',
  ],
  attention: [
    'Self-attention lets each token look at every other token and decide which ones matter for predicting what comes next.',
    'Queries and keys produce a score for each pair, and the softmax of those scores becomes the attention weight.',
    'Thicker lines here represent stronger simulated attention between two tokens.',
  ],
  transformer: [
    'Each transformer layer runs attention, adds the result back to its input, normalizes it, then passes it through a feed-forward network.',
    'Stacking many of these layers lets the model build up from surface patterns to more abstract structure.',
    'Production models stack dozens to hundreds of layers; three are shown here to keep the demo light.',
  ],
  logits: [
    'The final layer projects the representation onto the whole vocabulary, producing one raw score — a logit — per candidate token.',
    'Logits are unbounded and unnormalized: a higher score just means the model finds that token more plausible.',
    'Only the top candidates are shown; a real vocabulary holds tens of thousands of entries.',
  ],
  softmax: [
    'Softmax exponentiates each logit and divides by the total, turning arbitrary scores into probabilities that sum to 100%.',
    'Temperature is applied here: lower values sharpen the distribution, higher values flatten it and make output more varied.',
    'This distribution is what sampling strategies like top-k and top-p actually operate on.',
  ],
  selection: [
    'One token is chosen from the distribution and appended to the sequence.',
    'The extended sequence is then fed back in from the beginning, and the whole cycle repeats for the next token.',
    'That loop — predict one token, append, re-read — is all that text generation is.',
  ],
};

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
          <span>{[PROMPT, ...generatedTokens].join(' ').length} characters</span>
          <span>{tokens.length} tokens shown</span>
        </div>
        <small>This demo splits on words; real tokenizers use sub-word pieces, so counts differ.</small>
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
      <div className={styles.attentionWrap}>
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
    if (completed) {
      // Completing appended the final token; undo it so stepping forward
      // re-runs the prediction instead of appending a duplicate.
      setCompleted(false);
      setGeneratedTokens((current) => current.slice(0, -1));
      return;
    }
    setCurrentStage((stage) => Math.max(0, stage - 1));
  }, [completed]);

  const next = useCallback(() => {
    setPlaying(false);
    if (completed) {
      setCompleted(false);
      setCurrentStage(0);
      setRound(0);
      setGeneratedTokens([]);
      return;
    }
    advance();
  }, [advance, completed]);

  const togglePlay = useCallback(() => {
    if (completed) {
      replay();
      return;
    }
    setPlaying((value) => !value);
  }, [completed, replay]);

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

  const lastStage = STAGES.length - 1;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.whiteboard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="llm-whiteboard-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.mark}>
            <span aria-hidden="true">✦</span>
            <div>
              <strong id="llm-whiteboard-title">My notes on next-token prediction</strong>
              <small>Working out what actually happens between a prompt and a word</small>
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className={styles.progressArea}>
          <div className={styles.progressMeta}>
            <span>
              {String(activeStage + 1).padStart(2, '0')} / {String(STAGES.length).padStart(2, '0')}
              {' · '}{STAGES[activeStage].label}
            </span>
            <strong>word {Math.min(round + 1, ROUNDS.length)} of {ROUNDS.length}</strong>
          </div>
          <div className={styles.progressTrack}>
            <i style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <div className={styles.dots} aria-hidden="true">
            {STAGES.map((stage, index) => (
              <i
                key={stage.key}
                className={
                  index < activeStage || completed ? styles.dotDone
                    : index === activeStage ? styles.dotNow : ''
                }
              />
            ))}
          </div>
        </div>

        {/* The only flexible row. Everything else is sized by its content, so
            this is what absorbs a short viewport. */}
        <main className={styles.stage} aria-live="polite">
          <StageVisual
            stage={activeStage}
            tokens={tokens}
            rows={rows}
            distribution={distribution}
            selectedToken={selectedToken}
            generatedTokens={generatedTokens}
          />
        </main>

        <p className={styles.caption}>
          {(NARRATION[STAGES[activeStage].key] || [])[0]}
        </p>

        <p className={styles.output}>
          <span>{PROMPT}</span>
          {generatedTokens.map((token, index) => <strong key={`${token}-${index}`}> {token}</strong>)}
          {playing && activeStage === lastStage ? <em> {selectedToken}</em> : null}
        </p>

        <div className={styles.controls}>
          <button type="button" className={styles.controlPill} onClick={replay} aria-label="Restart from the first step">
            <span aria-hidden="true">⟲</span><em>Restart</em>
          </button>

          <button
            type="button"
            className={styles.controlPill}
            onClick={previous}
            disabled={activeStage === 0 && !completed}
            aria-label="Previous step"
          >
            <span aria-hidden="true">‹</span><em>Back</em>
          </button>

          <button
            type="button"
            className={`${styles.controlPill} ${styles.controlPrimary}`}
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
            <em>{playing ? 'Pause' : completed ? 'Replay' : 'Play'}</em>
          </button>

          <button type="button" className={styles.controlPill} onClick={next} aria-label="Next step">
            <span aria-hidden="true">›</span><em>Next</em>
          </button>
        </div>
      </section>
    </div>
  );
}
