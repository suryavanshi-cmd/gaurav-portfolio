'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './LLMWhiteboard.module.css';

const STAGES = [
  'Input Prompt', 'Tokenization', 'Token IDs', 'Embeddings', 'Positional Information',
  'Transformer Processing', 'Self-Attention', 'Logits', 'Softmax Probabilities',
  'Next-Token Selection', 'Generated Token', 'Repeat for the Next Token',
];

const TOKEN_ROUNDS = [
  [{ token: 'change', logit: 3.8 }, { token: 'grow', logit: 2.6 }, { token: 'improve', logit: 2.1 }, { token: 'stop', logit: 0.7 }],
  [{ token: 'the', logit: 3.5 }, { token: 'rapidly', logit: 2.3 }, { token: 'how', logit: 1.8 }, { token: 'society', logit: 1.2 }],
  [{ token: 'world', logit: 3.7 }, { token: 'future', logit: 2.5 }, { token: 'way', logit: 1.7 }, { token: 'industries', logit: 1.1 }],
];

const CONCEPTS = [
  ['Context window', 'The maximum amount of tokenized context available to the model for one generation step.'],
  ['Prompt vs generated tokens', 'Prompt tokens are supplied by the user. Generated tokens are appended by the model during inference.'],
  ['Attention heads', 'Parallel attention mechanisms that can focus on different token relationships.'],
  ['Hidden dimensions', 'The internal vector width used to represent and transform token information.'],
  ['Transformer layers', 'Repeated attention and feed-forward blocks that refine contextual representations.'],
  ['Parameters', 'Learned numerical weights adjusted during training.'],
  ['Inference', 'Using learned parameters to predict tokens without updating model weights.'],
  ['Training vs inference', 'Training updates weights from examples; inference uses fixed weights to generate an output.'],
  ['Hallucination', 'A fluent output that is unsupported, incorrect, or invented.'],
  ['Temperature', 'Rescales logits: lower values sharpen the distribution; higher values make it flatter.'],
  ['Top-k sampling', 'Limits selection to the k most probable candidate tokens.'],
  ['Top-p sampling', 'Keeps the smallest candidate set whose cumulative probability reaches p.'],
  ['Stop tokens', 'Special tokens or configured strings that end generation.'],
  ['Repetition penalty', 'A decoding adjustment that discourages repeatedly selecting the same tokens.'],
  ['Context limitations', 'Information outside the active context window cannot directly influence the next prediction.'],
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const tokenize = (text) => text.trim().split(/\s+/).filter(Boolean);

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
    Number(Math.sin(index + 1).toFixed(2)), Number(Math.cos(index + 1).toFixed(2)),
    Number(Math.sin((index + 1) / 2).toFixed(2)), Number(Math.cos((index + 1) / 2).toFixed(2)),
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
    if (index === 0) { cumulative += candidate.probability; return true; }
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

function ConceptTooltip({ label, text }) {
  return <button type="button" className={styles.tooltip} data-tip={text} aria-label={`${label}: ${text}`}>{label}</button>;
}

function LossCurve() {
  const points = [86, 70, 61, 50, 42, 34, 29, 24, 20, 17].map((value, index) => `${index * 11.1},${value}`).join(' ');
  return (
    <svg className={styles.lossChart} viewBox="0 0 100 100" role="img" aria-label="Simulated loss decreasing over training steps">
      <defs><linearGradient id="loss-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".28" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <path d="M0 86 L11 70 L22 61 L33 50 L44 42 L56 34 L67 29 L78 24 L89 20 L100 17 L100 100 L0 100 Z" fill="url(#loss-fill)" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="0" x2="100" y1="92" y2="92" stroke="currentColor" strokeOpacity=".2" />
    </svg>
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
          const startX = xFor(link.from); const endX = xFor(link.to);
          return <path key={`${link.from}-${link.to}`} d={`M ${startX} 130 Q ${(startX + endX) / 2} ${38 + index * 12} ${endX} 130`} className={styles.attentionPath} style={{ strokeWidth: link.weight }} />;
        })}
      </svg>
      <div className={styles.attentionTokens}>{visibleTokens.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}</div>
    </div>
  );
}

function Pipeline({ currentStage }) {
  return (
    <div className={styles.pipeline} aria-label="LLM next-token processing stages">
      {STAGES.map((stage, index) => {
        const status = index < currentStage ? styles.stageComplete : index === currentStage ? styles.stageActive : '';
        return (
          <div className={`${styles.stageWrap} ${status}`} key={stage}>
            <div className={styles.stageNode}><span>{String(index + 1).padStart(2, '0')}</span><strong>{stage}</strong>{index === currentStage ? <i className={styles.stageParticle} /> : null}</div>
            {index < STAGES.length - 1 ? <div className={styles.connector}><i /></div> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function LLMWhiteboard({ onClose }) {
  const [prompt, setPrompt] = useState('Artificial intelligence will');
  const [currentStage, setCurrentStage] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [generatedTokens, setGeneratedTokens] = useState([]);
  const [round, setRound] = useState(0);
  const [maxGeneratedTokens, setMaxGeneratedTokens] = useState(3);
  const [temperature, setTemperature] = useState(0.8);
  const [topK, setTopK] = useState(4);
  const [topP, setTopP] = useState(0.95);
  const [showLearning, setShowLearning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Enter a prompt and run the educational simulation.');
  const wasPlayingRef = useRef(false);

  const allTokens = useMemo(() => [...tokenize(prompt), ...generatedTokens], [prompt, generatedTokens]);
  const tokenRows = useMemo(() => allTokens.map((token, index) => ({ token, id: tokenId(token, index), embedding: embeddingFor(token, index), position: positionFor(index) })), [allTokens]);
  const candidates = TOKEN_ROUNDS[Math.min(round, TOKEN_ROUNDS.length - 1)];
  const distribution = useMemo(() => calculateDistribution(candidates, temperature, topK, topP), [candidates, temperature, topK, topP]);
  const selectedToken = distribution.find((candidate) => candidate.included)?.token || candidates[0].token;
  const displaySentence = [prompt.trim(), ...generatedTokens].filter(Boolean).join(' ');
  const progress = currentStage < 0 ? 0 : ((currentStage + 1) / STAGES.length) * 100;

  const reset = useCallback(() => {
    setPlaying(false); setCurrentStage(-1); setGeneratedTokens([]); setRound(0);
    setStatusMessage('Simulation reset. Change the prompt or run it again.');
  }, []);

  const advance = useCallback(() => {
    if (currentStage < 0) { setCurrentStage(0); return; }
    if (currentStage === 9) {
      setGeneratedTokens((tokens) => tokens.length >= maxGeneratedTokens ? tokens : [...tokens, selectedToken]);
      setCurrentStage(10);
      setStatusMessage(`Selected “${selectedToken}” and appended it to the generated response.`);
      return;
    }
    if (currentStage === STAGES.length - 1) {
      const nextRound = round + 1;
      if (nextRound >= maxGeneratedTokens) {
        setPlaying(false);
        setStatusMessage('Autoregressive demo complete. Replay or step backward to inspect the flow.');
        return;
      }
      setRound(nextRound); setCurrentStage(1);
      setStatusMessage('The updated sentence returns to tokenization for the next prediction.');
      return;
    }
    setCurrentStage(Math.min(currentStage + 1, STAGES.length - 1));
  }, [currentStage, maxGeneratedTokens, round, selectedToken]);

  const previous = useCallback(() => {
    setPlaying(false);
    if (currentStage === 10) setGeneratedTokens((tokens) => tokens.slice(0, -1));
    setCurrentStage((stage) => Math.max(-1, stage - 1));
    setStatusMessage('Manual step mode enabled.');
  }, [currentStage]);

  const replay = useCallback(() => {
    setGeneratedTokens([]); setRound(0); setCurrentStage(0); setPlaying(autoPlay);
    setStatusMessage('Replaying the LLM flow from the input prompt.');
  }, [autoPlay]);

  const run = useCallback(() => {
    if (!prompt.trim()) { setStatusMessage('Add a short prompt before starting the simulation.'); return; }
    setGeneratedTokens([]); setRound(0); setCurrentStage(0); setPlaying(autoPlay);
    setStatusMessage(autoPlay ? 'Auto-play started.' : 'Flow ready. Use Next step to continue.');
  }, [autoPlay, prompt]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(advance, 820);
    return () => window.clearTimeout(timer);
  }, [advance, playing]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) { wasPlayingRef.current = playing; setPlaying(false); }
      else if (wasPlayingRef.current) { setPlaying(true); wasPlayingRef.current = false; }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playing]);

  const stageLabel = currentStage < 0 ? 'Ready' : STAGES[currentStage];

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section className={styles.whiteboard} role="dialog" aria-modal="true" aria-labelledby="llm-whiteboard-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div><p className={styles.kicker}>Interactive learning lab</p><h2 id="llm-whiteboard-title">How an LLM Generates the Next Token</h2><p>Follow a simplified prompt through tokenization, vectors, transformer processing, probabilities, selection, and autoregressive repetition.</p></div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close LLM learning experience">×</button>
        </header>

        <div className={styles.disclaimer}><span aria-hidden="true">ⓘ</span>This interactive demo simplifies LLM internals for educational visualization. Token IDs, vectors, attention values, logits, probabilities, losses, and training metrics may be simulated.</div>

        <div className={styles.commandBar}>
          <label className={styles.promptField}><span>Input prompt</span><input value={prompt} maxLength={90} onChange={(event) => { setPrompt(event.target.value); reset(); }} placeholder="Artificial intelligence will" /></label>
          <button type="button" className={styles.runButton} onClick={run}>Run LLM Flow</button>
        </div>

        <div className={styles.controlDeck}>
          <div className={styles.transportControls} aria-label="Animation controls">
            <button type="button" onClick={previous} disabled={currentStage < 0}>← Previous</button>
            <button type="button" onClick={() => setPlaying((value) => !value)} disabled={currentStage < 0}>{playing ? 'Pause' : 'Play'}</button>
            <button type="button" onClick={advance} disabled={currentStage === STAGES.length - 1 && round + 1 >= maxGeneratedTokens}>Next →</button>
            <button type="button" onClick={replay}>Replay</button><button type="button" onClick={reset}>Reset</button>
          </div>
          <label className={styles.toggle}><input type="checkbox" checked={autoPlay} onChange={(event) => setAutoPlay(event.target.checked)} /><span>Auto-play</span></label>
          <div className={styles.progressBlock}><div><span>{stageLabel}</span><strong>{Math.round(progress)}%</strong></div><div className={styles.progressTrack}><i style={{ transform: `scaleX(${progress / 100})` }} /></div></div>
        </div>

        <div className={styles.canvas}>
          <Pipeline currentStage={currentStage} />
          <div className={styles.annotation}>prompt → numbers → context → probability → token ↻</div>
          <div className={styles.visualGrid}>
            <article className={`${styles.boardCard} ${stageState(currentStage, 1)}`}>
              <div className={styles.cardHeading}><span>01</span><div><small>Tokenizer</small><h3>Text becomes token chips</h3></div></div>
              <div className={styles.metricsRow}><span>{prompt.length} characters</span><span>{tokenize(prompt).length} words</span><span>≈ {Math.max(1, Math.ceil(prompt.length / 4))} estimated tokens</span></div>
              <div className={styles.tokenRail}>{tokenRows.map((row, index) => <span className={`${styles.tokenChip} ${currentStage === 1 && index === 0 ? styles.tokenHighlight : ''}`} key={`${row.token}-${index}`}>{row.token}</span>)}</div>
              <div className={`${styles.idStrip} ${currentStage >= 2 ? styles.revealed : ''}`}>[{tokenRows.map((row) => row.id).join(', ')}]</div>
              <p className={styles.microcopy}>Token IDs are deterministic simulated values for this educational demo, not IDs returned by a production tokenizer.</p>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 3)}`}>
              <div className={styles.cardHeading}><span>02</span><div><small>Embeddings</small><h3>Token chips become vectors</h3></div></div>
              <p>Embeddings convert discrete tokens into numerical representations that a neural network can process.</p>
              <div className={styles.vectorList}>{tokenRows.slice(0, 5).map((row, index) => <div className={styles.vectorRow} key={`${row.token}-vector`}><span className={styles.tokenChip}>{row.token}</span><i aria-hidden="true">→</i><code>{formatVector(row.embedding)}</code><div className={styles.matrixCells} aria-hidden="true">{row.embedding.map((value, valueIndex) => <span key={`${index}-${valueIndex}`} style={{ opacity: 0.25 + Math.abs(value) * 0.7 }} />)}</div></div>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 4)}`}>
              <div className={styles.cardHeading}><span>03</span><div><small>Position</small><h3>Order is added to meaning</h3></div></div>
              <div className={styles.equation}><span>Token Embedding</span><b>+</b><span className={styles.positionValue}>Position Information</span><b>=</b><strong>Context-Aware Input</strong></div>
              <div className={styles.positionRows}>{tokenRows.slice(0, 4).map((row) => <div key={`${row.token}-position`}><span>{row.token}</span><code>{formatVector(row.embedding)}</code><b>+</b><code className={styles.positionCode}>{formatVector(row.position)}</code></div>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 5)}`}>
              <div className={styles.cardHeading}><span>04</span><div><small>Transformer</small><h3>Context is refined layer by layer</h3></div></div>
              <div className={`${styles.transformerStack} ${currentStage === 5 ? styles.isAnimating : ''}`}>{[1, 2, 3].map((layer) => <div className={styles.transformerLayer} key={layer}><strong>Transformer block {layer}</strong><span>Multi-Head Attention</span><i>→</i><span>Add & Normalize</span><i>→</i><span>Feed-Forward</span><i>→</i><span>Add & Normalize</span><b className={styles.flowDot} /></div>)}</div>
              <div className={`${styles.tokenShuttle} ${currentStage === 5 ? styles.isAnimating : ''}`}>{allTokens.slice(0, 5).map((token, index) => <span key={`${token}-shuttle-${index}`}>{token}</span>)}</div>
            </article>

            <article className={`${styles.boardCard} ${stageState(currentStage, 6)}`}>
              <div className={styles.cardHeading}><span>05</span><div><small>Self-attention</small><h3>Tokens exchange contextual signals</h3></div></div>
              <div className={styles.formula}>Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V</div>
              <div className={styles.tooltipRow}><ConceptTooltip label="Query" text="What this token is looking for." /><ConceptTooltip label="Key" text="What information a token offers for matching." /><ConceptTooltip label="Value" text="The content combined after attention weights are calculated." /><ConceptTooltip label="Attention score" text="A simulated relevance weight between two tokens." /><ConceptTooltip label="Context vector" text="The weighted representation passed to the next operation." /></div>
              <AttentionMap tokens={allTokens.length ? allTokens : ['Artificial', 'intelligence', 'will']} active={currentStage === 6} />
              <div className={styles.attentionMatrix}>{tokenRows.slice(0, 4).map((row, rowIndex) => <div key={`${row.token}-matrix-row`}>{tokenRows.slice(0, 4).map((column, columnIndex) => { const score = Number((0.18 + (((rowIndex + 2) * (columnIndex + 3)) % 7) / 10).toFixed(2)); return <span key={`${row.token}-${column.token}`} style={{ opacity: 0.32 + score * 0.68 }}>{score}</span>; })}</div>)}</div>
            </article>

            <article className={`${styles.boardCard} ${styles.probabilityCard} ${currentStage >= 7 ? styles.completePanel : ''} ${currentStage === 8 || currentStage === 9 ? styles.activePanel : ''}`}>
              <div className={styles.cardHeading}><span>06</span><div><small>Logits → Softmax</small><h3>Candidate scores become probabilities</h3></div></div>
              <div className={styles.samplingControls}>
                <label><span>Temperature <b>{temperature.toFixed(1)}</b></span><input type="range" min=".2" max="1.8" step=".1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
                <label><span>Top-k <b>{topK}</b></span><input type="range" min="1" max="4" step="1" value={topK} onChange={(event) => setTopK(Number(event.target.value))} /></label>
                <label><span>Top-p <b>{topP.toFixed(2)}</b></span><input type="range" min=".5" max="1" step=".05" value={topP} onChange={(event) => setTopP(Number(event.target.value))} /></label>
              </div>
              <div className={styles.probabilityRows}>{distribution.map((candidate) => <div className={`${styles.probabilityRow} ${candidate.token === selectedToken ? styles.selectedProbability : ''}`} key={candidate.token}><span>{candidate.token}</span><code>{candidate.logit.toFixed(1)}</code><div><i style={{ transform: `scaleX(${candidate.probability})` }} /></div><strong>{Math.round(candidate.probability * 100)}%</strong></div>)}</div>
              <div className={styles.decodingNote}>Selection can use greedy decoding, temperature, top-k, or top-p. This demo chooses the highest remaining probability to stay repeatable.</div>
            </article>

            <article className={`${styles.boardCard} ${styles.outputCard} ${currentStage >= 10 ? styles.activePanel : ''}`}>
              <div className={styles.cardHeading}><span>07</span><div><small>Autoregressive output</small><h3>Predict one token, append it, repeat</h3></div></div>
              <div className={styles.generatedSentence}><span>{prompt.trim()}</span>{generatedTokens.map((token, index) => <strong key={`${token}-${index}`}>{token}</strong>)}{currentStage === 9 ? <em>{selectedToken}</em> : null}</div>
              <div className={styles.loopDiagram}><span>Predict one token</span><i>→</i><span>Append it</span><i>→</i><span>Process again</span><i>→</i><span>Predict the next token</span><b>↻</b></div>
              <label className={styles.outputLimit}>Generated-token limit<select value={maxGeneratedTokens} onChange={(event) => { setMaxGeneratedTokens(Number(event.target.value)); reset(); }}><option value="2">2 tokens</option><option value="3">3 tokens</option></select></label>
              <p>Current sequence: <strong>{displaySentence || '—'}</strong></p>
            </article>
          </div>
        </div>

        <section className={styles.learningPanel}>
          <button type="button" className={styles.learningPanelToggle} onClick={() => setShowLearning((value) => !value)} aria-expanded={showLearning}><span><small>Optional training view</small>How the Model Learns</span><b>{showLearning ? '−' : '+'}</b></button>
          {showLearning ? <div className={styles.learningPanelBody}>
            <div className={styles.metricCards}><div><small>Training loss</small><strong>0.328</strong><span>simulated</span></div><div><small>Validation loss</small><strong>0.391</strong><span>simulated</span></div><div><small>Next-token accuracy</small><strong>84.6%</strong><span>simulated</span></div><div><small>Perplexity</small><strong>1.48</strong><span>simulated</span></div><div><small>Learning rate</small><strong>2e-5</strong><span>simulated</span></div><div><small>Epoch / tokens</small><strong>4 / 2.8B</strong><span>simulated</span></div></div>
            <div className={styles.lossGrid}><div><h3>Simulated loss curve</h3><LossCurve /></div><div className={styles.lossExplanation}><small>Cross-entropy example</small><p>Expected token: <strong>“change”</strong></p><p>Predicted probability: <strong>0.72</strong></p><code>Loss = -log(0.72) ≈ 0.33</code><p>Lower loss generally means the model assigned a higher probability to the correct next token.</p></div></div>
          </div> : null}
        </section>

        <section className={styles.concepts}>
          <div className={styles.conceptsHeading}><div><small>Expandable glossary</small><h3>Additional LLM concepts</h3></div><p>Concise explanations for recruiters, engineers, and curious readers.</p></div>
          <div className={styles.conceptGrid}>{CONCEPTS.map(([title, explanation]) => <details key={title}><summary>{title}<span>+</span></summary><p>{explanation}</p></details>)}</div>
        </section>

        <footer className={styles.statusBar}><span className={playing ? styles.liveStatus : ''}><i /> {playing ? 'Animation running' : 'Animation paused'}</span><p aria-live="polite">{statusMessage}</p><button type="button" onClick={onClose}>Close learning lab</button></footer>
      </section>
    </div>
  );
}
