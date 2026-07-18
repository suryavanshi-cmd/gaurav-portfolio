'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './LLMWhiteboard.module.css';

const PROMPT = 'Artificial intelligence will';
const STAGES = [
  'Input Prompt',
  'Tokenization',
  'Token IDs',
  'Embeddings',
  'Positional Information',
  'Transformer Processing',
  'Self-Attention',
  'Logits',
  'Softmax Probabilities',
  'Next-Token Selection',
  'Generated Token',
  'Repeat for the Next Token',
];

const TOKEN_ROUNDS = [
  [{ token: 'change', logit: 3.8 }, { token: 'grow', logit: 2.6 }, { token: 'improve', logit: 2.1 }, { token: 'stop', logit: 0.7 }],
  [{ token: 'the', logit: 3.5 }, { token: 'rapidly', logit: 2.3 }, { token: 'how', logit: 1.8 }, { token: 'society', logit: 1.2 }],
  [{ token: 'world', logit: 3.7 }, { token: 'future', logit: 2.5 }, { token: 'way', logit: 1.7 }, { token: 'industries', logit: 1.1 }],
];

const CONCEPTS = [
  ['Context window', 'The amount of tokenized information available to the model during one prediction step.'],
  ['Prompt vs generated tokens', 'Prompt tokens are supplied by the user. Generated tokens are appended during inference.'],
  ['Attention heads', 'Parallel attention mechanisms that can focus on different relationships between tokens.'],
  ['Transformer layers', 'Repeated attention and feed-forward blocks that refine contextual representations.'],
  ['Training vs inference', 'Training updates model weights. Inference uses fixed weights to predict new tokens.'],
  ['Hallucination', 'A fluent response that is incorrect, unsupported, or invented.'],
  ['Temperature', 'Lower values sharpen probabilities; higher values spread probability across more candidates.'],
  ['Top-k and top-p', 'Sampling controls that restrict which candidate tokens remain eligible for selection.'],
  ['Stop tokens', 'Special tokens or configured sequences that end generation.'],
];

const tokenize = (text) => text.trim().split(/\s+/).filter(Boolean);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function tokenId(token, index) {
  let hash = 173 + index * 97;
  for (const character of token) hash = (hash * 31 + character.charCodeAt(0)) % 9000;
  return 1000 + hash;
}

function embeddingFor(token, index) {
  const seed = [...token].reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 41;
  return Array.from({ length: 4 }, (_, vectorIndex) => Number((Math.sin(seed * (vectorIndex + 1) * 0.017) * 0.88).toFixed(2)));
}

function positionFor(index) {
  return [
    Number(Math.sin(index + 1).toFixed(2)),
    Number(Math.cos(index + 1).toFixed(2)),
    Number(Math.sin((index + 1) / 2).toFixed(2)),
    Number(Math.cos((index + 1) / 2).toFixed(2)),
  ];
}

const formatVector = (vector) => `[${vector.map((value) => value.toFixed(2)).join(', ')}]`;

function calculateDistribution(candidates, temperature, topK, topP) {
  const scaled = candidates
    .map((candidate) => ({ ...candidate, scaled: candidate.logit / Math.max(temperature, 0.1) }))
    .sort((a, b) => b.scaled - a.scaled);
  const maxLogit = Math.max(...scaled.map((candidate) => candidate.scaled));
  const exponentials = scaled.map((candidate) => ({ ...candidate, exp: Math.exp(candidate.scaled - maxLogit) }));
  const total = exponentials.reduce((sum, candidate) => sum + candidate.exp, 0);
  const normalized = exponentials.map((candidate) => ({ ...candidate, probability: candidate.exp / total }));
  const limitedByK = normalized.slice(0, clamp(topK, 1, normalized.length));
  let cumulative = 0;
  const limitedByP = limitedByK.filter((candidate, index) => {
    if (index === 0) {
      cumulative += candidate.probability;
      return true;
    }
    if (cumulative >= topP) return false;
    cumulative += candidate.probability;
    return true;
  });
  const filteredTotal = limitedByP.reduce((sum, candidate) => sum + candidate.probability, 0);
  return normalized.map((candidate) => {
    const included = limitedByP.some((item) => item.token === candidate.token);
    return { ...candidate, included, probability: included ? candidate.probability / filteredTotal : 0 };
  });
}

function stageState(currentStage, requiredStage) {
  if (currentStage === requiredStage) return styles.activePanel;
  if (currentStage > requiredStage) return styles.completePanel;
  return '';
}

function Pipeline({ currentStage }) {
  return (
    <div className={styles.pipeline} aria-label="LLM next-token processing stages">
      {STAGES.map((stage, index) => {
        const status = index < currentStage ? styles.stageComplete : index === currentStage ? styles.stageActive : '';
        return (
          <div className={`${styles.stageWrap} ${status}`} key={stage}>
            <div className={styles.stageNode}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{stage}</strong>
              {index === currentStage ? <i className={styles.stageParticle} /> : null}
            </div>
            {index < STAGES.length - 1 ? <div className={styles.connector}><i /></div> : null}
          </div>
        );
      })}
    </div>
  );
}

function AttentionMap({ tokens, active }) {
  const visibleTokens = tokens.slice(0, 4);
  const links = [{ from: 0, to: 1, weight: 4 }, { from: 1, to: 2, weight: 6 }, { from: 2, to: 1, weight: 3 }, { from: 2, to: 3, weight: 5 }]
    .filter((link) => link.from < visibleTokens.length && link.to < visibleTokens.length);
  const xFor = (index) => 70 + index * 150;
  return (
    <div className={`${styles.attentionMap} ${active ? styles.isAnimating : ''}`}>
      <svg viewBox="0 0 600 170" aria-hidden="true">
        {links.map((link, index) => {
          const startX = xFor(link.from);
          const endX = xFor(link.to);
          return <path key={`${link.from}-${link.to}`} d={`M ${startX} 130 Q ${(startX + endX) / 2} ${38 + index * 12} ${endX} 130`} className={styles.attentionPath} style={{ strokeWidth: link.weight }} />;
        })}
      </svg>
      <div className={styles.attentionTokens}>{visibleTokens.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}</div>
    </div>
  );
}

function LossCurve() {
  const points = [86, 70, 61, 50, 42, 34, 29, 24, 20, 17].map((value, index) => `${index * 11.1},${value}`).join(' ');
  return (
    <svg className={styles.lossChart} viewBox="0 0 100 100" role="img" aria-label="Simulated loss decreasing over training steps">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="0" x2="100" y1="92" y2="92" stroke="currentColor" strokeOpacity=".2" />
    </svg>
  );
}

export default function LLMWhiteboard({ onClose }) {
  const [currentStage, setCurrentStage] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [generatedTokens, setGeneratedTokens] = useState([]);
  const [round, setRound] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [topK, setTopK] = useState(4);
  const [topP, setTopP] = useState(0.95);
  const [statusMessage, setStatusMessage] = useState('Preparing the guided LLM flow…');
  const wasPlayingRef = useRef(false);

  const allTokens = useMemo(() => [...tokenize(PROMPT), ...generatedTokens], [generatedTokens]);
  const tokenRows = useMemo(() => allTokens.map((token, index) => ({ token, id: tokenId(token, index), embedding: embeddingFor(token, index), position: positionFor(index) })), [allTokens]);
  const candidates = TOKEN_ROUNDS[Math.min(round, TOKEN_ROUNDS.length - 1)];
  const distribution = useMemo(() => calculateDistribution(candidates, temperature, topK, topP), [candidates, temperature, topK, topP]);
  const selectedToken = distribution.find((candidate) => candidate.included)?.token || candidates[0].token;
  const progress = currentStage < 0 ? 0 : ((currentStage + 1) / STAGES.length) * 100;
  const displaySentence = [PROMPT, ...generatedTokens].join(' ');

  const startAutoPlay = useCallback(() => {
    setGeneratedTokens([]);
    setRound(0);
    setCurrentStage(0);
    setCompleted(false);
    setManualMode(false);
    setShowExplore(false);
    setPlaying(true);
    setStatusMessage('The model is processing the prompt automatically.');
  }, []);

  const advance = useCallback(() => {
    if (currentStage < 0) {
      setCurrentStage(0);
      return;
    }

    if (currentStage === 9) {
      setGeneratedTokens((tokens) => [...tokens, selectedToken]);
      setCurrentStage(10);
      setStatusMessage(`Selected “${selectedToken}” and appended it to the sentence.`);
      return;
    }

    if (currentStage === STAGES.length - 1) {
      if (round >= TOKEN_ROUNDS.length - 1) {
        setPlaying(false);
        setCompleted(true);
        setStatusMessage('Guided flow complete. Replay it or explore the concepts in more detail.');
        return;
      }
      setRound((value) => value + 1);
      setCurrentStage(1);
      setStatusMessage('The updated sentence returns to tokenization for another prediction.');
      return;
    }

    setCurrentStage((stage) => Math.min(stage + 1, STAGES.length - 1));
  }, [currentStage, round, selectedToken]);

  const previous = useCallback(() => {
    setPlaying(false);
    setManualMode(true);
    if (currentStage === 10) setGeneratedTokens((tokens) => tokens.slice(0, -1));
    setCurrentStage((stage) => Math.max(0, stage - 1));
    setStatusMessage('Manual step mode enabled.');
  }, [currentStage]);

  const startStepMode = useCallback(() => {
    setGeneratedTokens([]);
    setRound(0);
    setCurrentStage(0);
    setPlaying(false);
    setCompleted(false);
    setManualMode(true);
    setShowExplore(true);
    setStatusMessage('Step-through mode enabled. Use Previous and Next to inspect the flow.');
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setGeneratedTokens(['change', 'the', 'world']);
      setRound(2);
      setCurrentStage(STAGES.length - 1);
      setCompleted(true);
      setStatusMessage('Animation skipped because reduced motion is enabled.');
      return undefined;
    }

    const timer = window.setTimeout(startAutoPlay, 420);
    return () => window.clearTimeout(timer);
  }, [startAutoPlay]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(advance, 720);
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
          <div>
            <p className={styles.kicker}>Interactive learnings</p>
            <h2 id="llm-whiteboard-title">How an LLM Generates the Next Token</h2>
            <p>One click starts a guided, simplified walkthrough from prompt to generated response.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close LLM learning experience">×</button>
        </header>

        <div className={styles.disclaimer}><span aria-hidden="true">ⓘ</span>This is an educational simulation. Token IDs, vectors, attention values, logits, probabilities, losses, and metrics are simulated.</div>

        <div className={styles.commandBar}>
          <div className={styles.promptField}>
            <span>Demo prompt</span>
            <div className={styles.generatedSentence}><span>{PROMPT}</span>{generatedTokens.map((token, index) => <strong key={`${token}-${index}`}>{token}</strong>)}</div>
          </div>
          <div className={styles.progressBlock}>
            <div><span>{currentStage < 0 ? 'Starting…' : STAGES[currentStage]}</span><strong>{Math.round(progress)}%</strong></div>
            <div className={styles.progressTrack}><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
          </div>
        </div>

        <div className={styles.canvas}>
          <Pipeline currentStage={currentStage} />
          <div className={styles.annotation}>prompt → tokens → context → probability → generated token ↻</div>

          <div className={styles.visualGrid}>
            <article className={`${styles.boardCard} ${stageState(currentStage, 1)}`}>
              <div className={styles.cardHeading}><span>01</span><div><small>Tokenizer</small><h3>Text becomes token chips</h3></div></div>
              <div className={styles.metricsRow}><span>{PROMPT.length} characters</span><span>{tokenize(PROMPT).length} words</span><span>≈ {Math.ceil(PROMPT.length / 4)} tokens</span></div>
              <div className={styles.tokenRail}>{tokenRows.map((row, index) => <span className={`${styles.tokenChip} ${currentStage === 1 && index === tokenRows.length - 1 ? styles.tokenHighlight : ''}`} key={`${row.token}-${index}`}>{row.token}</span>)}</div>
              <div className={`${styles.idStrip} ${currentStage >= 2 ? styles.revealed : ''}`}>[{tokenRows.map((row) => row.id).join(', ')}]</div>
              <p className={styles.microcopy}>Token IDs are simulated for this educational visualization.</p>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 3)}`}>
              <div className={styles.cardHeading}><span>02</span><div><small>Embeddings</small><h3>Tokens become numerical vectors</h3></div></div>
              <div className={styles.vectorList}>{tokenRows.slice(0, 5).map((row, index) => <div className={styles.vectorRow} key={`${row.token}-vector`}><span className={styles.tokenChip}>{row.token}</span><i>→</i><code>{formatVector(row.embedding)}</code><div className={styles.matrixCells} aria-hidden="true">{row.embedding.map((value, valueIndex) => <span key={`${index}-${valueIndex}`} style={{ opacity: 0.25 + Math.abs(value) * 0.7 }} />)}</div></div>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 4)}`}>
              <div className={styles.cardHeading}><span>03</span><div><small>Position</small><h3>Order is added to meaning</h3></div></div>
              <div className={styles.equation}><span>Token Embedding</span><b>+</b><span className={styles.positionValue}>Position</span><b>=</b><strong>Context-Aware Input</strong></div>
              <div className={styles.positionRows}>{tokenRows.slice(0, 4).map((row) => <div key={`${row.token}-position`}><span>{row.token}</span><code>{formatVector(row.embedding)}</code><b>+</b><code className={styles.positionCode}>{formatVector(row.position)}</code></div>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 5)}`}>
              <div className={styles.cardHeading}><span>04</span><div><small>Transformer</small><h3>Context is refined layer by layer</h3></div></div>
              <div className={`${styles.transformerStack} ${currentStage === 5 ? styles.isAnimating : ''}`}>{[1, 2, 3].map((layer) => <div className={styles.transformerLayer} key={layer}><strong>Transformer block {layer}</strong><span>Attention</span><i>→</i><span>Normalize</span><i>→</i><span>Feed-Forward</span><b className={styles.flowDot} /></div>)}</div>
              <div className={`${styles.tokenShuttle} ${currentStage === 5 ? styles.isAnimating : ''}`}>{allTokens.slice(0, 5).map((token, index) => <span key={`${token}-shuttle-${index}`}>{token}</span>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 6)}`}>
              <div className={styles.cardHeading}><span>05</span><div><small>Self-attention</small><h3>Tokens exchange contextual signals</h3></div></div>
              <div className={styles.formula}>Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V</div>
              <AttentionMap tokens={allTokens} active={currentStage === 6} />
            </article>

            <article className={`${styles.boardCard} ${styles.probabilityCard} ${currentStage >= 7 ? styles.completePanel : ''} ${currentStage === 8 || currentStage === 9 ? styles.activePanel : ''}`}>
              <div className={styles.cardHeading}><span>06</span><div><small>Logits → Softmax</small><h3>Candidate scores become probabilities</h3></div></div>
              <div className={styles.probabilityRows}>{distribution.map((candidate) => <div className={`${styles.probabilityRow} ${candidate.token === selectedToken ? styles.selectedProbability : ''}`} key={candidate.token}><span>{candidate.token}</span><code>{candidate.logit.toFixed(1)}</code><div><i style={{ transform: `scaleX(${candidate.probability})` }} /></div><strong>{Math.round(candidate.probability * 100)}%</strong></div>)}</div>
              <div className={styles.decodingNote}>The highest remaining probability is selected so the guided animation stays understandable and repeatable.</div>
            </article>

            <article className={`${styles.boardCard} ${styles.outputCard} ${currentStage >= 10 ? styles.activePanel : ''}`}>
              <div className={styles.cardHeading}><span>07</span><div><small>Generated output</small><h3>Predict one token, append it, repeat</h3></div></div>
              <div className={styles.generatedSentence}><span>{PROMPT}</span>{generatedTokens.map((token, index) => <strong key={`${token}-${index}`}>{token}</strong>)}{currentStage === 9 ? <em>{selectedToken}</em> : null}</div>
              <div className={styles.loopDiagram}><span>Predict</span><i>→</i><span>Append</span><i>→</i><span>Process again</span><b>↻</b></div>
              <p>Current sequence: <strong>{displaySentence}</strong></p>
            </article>
          </div>
        </div>

        {(completed || manualMode) ? (
          <section className={styles.learningPanel}>
            <button type="button" className={styles.learningPanelToggle} onClick={() => setShowExplore((value) => !value)} aria-expanded={showExplore}>
              <span><small>Animation complete</small>Explore Further</span><b>{showExplore ? '−' : '+'}</b>
            </button>
            {showExplore ? (
              <div className={styles.learningPanelBody}>
                <div className={styles.transportControls} aria-label="Learning controls">
                  <button type="button" onClick={startAutoPlay}>Replay automatically</button>
                  <button type="button" onClick={startStepMode}>Start step-through</button>
                  {manualMode ? <><button type="button" onClick={previous}>← Previous</button><button type="button" onClick={advance}>Next →</button></> : null}
                </div>

                <div className={styles.samplingControls}>
                  <label><span>Temperature <b>{temperature.toFixed(1)}</b></span><input type="range" min=".2" max="1.8" step=".1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
                  <label><span>Top-k <b>{topK}</b></span><input type="range" min="1" max="4" step="1" value={topK} onChange={(event) => setTopK(Number(event.target.value))} /></label>
                  <label><span>Top-p <b>{topP.toFixed(2)}</b></span><input type="range" min=".5" max="1" step=".05" value={topP} onChange={(event) => setTopP(Number(event.target.value))} /></label>
                </div>

                <button type="button" className={styles.learningPanelToggle} onClick={() => setShowLearning((value) => !value)} aria-expanded={showLearning}>
                  <span><small>Optional</small>How the Model Learns</span><b>{showLearning ? '−' : '+'}</b>
                </button>
                {showLearning ? <div className={styles.lossGrid}><div><h3>Simulated loss curve</h3><LossCurve /></div><div className={styles.lossExplanation}><small>Cross-entropy example</small><p>Expected token: <strong>“change”</strong></p><p>Predicted probability: <strong>0.72</strong></p><code>Loss = -log(0.72) ≈ 0.33</code><p>Lower loss generally means the model assigned a higher probability to the correct token.</p></div></div> : null}

                <div className={styles.conceptGrid}>{CONCEPTS.map(([title, explanation]) => <details key={title}><summary>{title}<span>+</span></summary><p>{explanation}</p></details>)}</div>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className={styles.statusBar}>
          <span className={playing ? styles.liveStatus : ''}><i /> {playing ? 'Auto-playing' : completed ? 'Complete' : 'Ready'}</span>
          <p aria-live="polite">{statusMessage}</p>
          <button type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}
