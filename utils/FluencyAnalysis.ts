/**
 * FluencyAnalysis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Audio-based speaking fluency analysis for Fluent Edge.
 *
 * Implements:
 *   1. Words Per Minute (WPM) calculation
 *   2. Pause duration analysis via WebRTC VAD proxy
 *   3. Filler word frequency scoring
 *   4. Pitch variation estimation (fundamental frequency via zero-crossing rate)
 *   5. EMA smoothing for real-time WPM tracking
 *   6. Composite fluency score
 *
 * Note on pitch estimation:
 *   True F0 extraction requires audio buffer analysis. We use a zero-crossing
 *   rate (ZCR) heuristic on live microphone samples via the Web Audio API —
 *   this provides a qualitative indicator of pitch variation, NOT an absolute
 *   Hz measurement. We therefore label it "pitch variation index" and do not
 *   interpret it as a measure of confidence.
 *
 * All results are estimates. No server calls are made.
 */

// ─── EMA Smoother ─────────────────────────────────────────────────────────────

/**
 * Exponential Moving Average smoother.
 * alpha = 0.3 gives smooth results at 5-fps processing.
 */
export class EMASmoother {
  private value: number | null = null;
  constructor(private alpha: number = 0.3) {}

  update(raw: number): number {
    if (this.value === null) {
      this.value = raw;
    } else {
      this.value = this.alpha * raw + (1 - this.alpha) * this.value;
    }
    return Math.round(this.value * 100) / 100;
  }

  get current(): number {
    return this.value ?? 0;
  }

  reset(): void {
    this.value = null;
  }
}

// ─── WPM Tracker ─────────────────────────────────────────────────────────────

export interface WPMSnapshot {
  wpm: number;
  totalWords: number;
  durationSeconds: number;
  smoothedWPM: number;
}

export class WPMTracker {
  private smoother = new EMASmoother(0.25);
  private startTime: number | null = null;
  private wordCount = 0;

  start(): void {
    this.startTime = Date.now();
    this.wordCount = 0;
    this.smoother.reset();
  }

  addWords(text: string): void {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    this.wordCount += words;
  }

  snapshot(): WPMSnapshot {
    const durationSeconds = this.startTime
      ? (Date.now() - this.startTime) / 1000
      : 0;
    const durationMinutes = Math.max(0.016, durationSeconds / 60); // min 1 second
    const rawWPM = Math.round(this.wordCount / durationMinutes);
    const smoothedWPM = this.smoother.update(rawWPM);
    return {
      wpm: rawWPM,
      totalWords: this.wordCount,
      durationSeconds: Math.round(durationSeconds),
      smoothedWPM: Math.round(smoothedWPM),
    };
  }

  reset(): void {
    this.startTime = null;
    this.wordCount = 0;
    this.smoother.reset();
  }
}

// ─── Pause Analyser ───────────────────────────────────────────────────────────

export interface PauseAnalysisResult {
  pauseCount: number;
  avgPauseDurationMs: number;
  longestPauseMs: number;
  hesitationPauses: number;   // pauses > 1.5 s
  score: number;              // 0–100 (higher = fewer/shorter pauses)
  feedback: string;
}

/**
 * Analyses pause data collected from voice activity detection.
 * Input: array of silence interval durations in milliseconds.
 */
export function analysePauses(silenceIntervalsMs: number[]): PauseAnalysisResult {
  if (!silenceIntervalsMs || silenceIntervalsMs.length === 0) {
    return {
      pauseCount: 0, avgPauseDurationMs: 0, longestPauseMs: 0,
      hesitationPauses: 0, score: 80,
      feedback: 'No pause data recorded. Speak for longer to enable pause analysis.',
    };
  }

  // Filter out very short gaps (< 300 ms) — these are natural breath pauses
  const measuredPauses = silenceIntervalsMs.filter(d => d >= 300);
  const hesitationPauses = measuredPauses.filter(d => d >= 1500).length;

  const avgPause = measuredPauses.length > 0
    ? measuredPauses.reduce((a, b) => a + b, 0) / measuredPauses.length
    : 0;
  const longestPause = measuredPauses.length > 0
    ? Math.max(...measuredPauses)
    : 0;

  // Score: penalise long hesitation pauses
  let score = 100;
  score -= hesitationPauses * 8;              // -8 per hesitation pause
  score -= Math.min(20, (avgPause / 100));    // -1 per 100ms avg pause (max -20)
  score = Math.max(0, Math.min(100, Math.round(score)));

  let feedback: string;
  if (hesitationPauses === 0 && avgPause < 600) {
    feedback = 'Smooth speech flow with natural brief pauses. Very fluent delivery.';
  } else if (hesitationPauses <= 2) {
    feedback = `${hesitationPauses} extended pause(s) detected. Use brief pauses intentionally rather than trailing off.`;
  } else {
    feedback = `${hesitationPauses} hesitation pauses (> 1.5 s) detected. Practice speaking in complete thoughts to reduce gaps.`;
  }

  return {
    pauseCount: measuredPauses.length,
    avgPauseDurationMs: Math.round(avgPause),
    longestPauseMs: Math.round(longestPause),
    hesitationPauses,
    score,
    feedback,
  };
}

// ─── Pitch Variation Analyser (Web Audio API) ─────────────────────────────────

export interface PitchVariationResult {
  variationIndex: number;    // 0–100 (0 = monotone, 100 = very varied)
  label: 'Monotone' | 'Low Variation' | 'Moderate' | 'Expressive' | 'Erratic';
  feedback: string;
}

export class PitchVariationAnalyser {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private zcrHistory: number[] = [];
  private smoother = new EMASmoother(0.2);
  private rafId: number | null = null;
  private isRunning = false;

  async start(stream: MediaStream): Promise<void> {
    if (typeof window === 'undefined' || !window.AudioContext && !(window as any).webkitAudioContext) {
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AC();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.isRunning = true;
      this.loop();
    } catch (err) {
      console.warn('[PitchVariation] Web Audio setup failed:', err);
    }
  }

  private loop(): void {
    if (!this.isRunning || !this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // Zero-Crossing Rate as a pitch variation proxy
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i - 1] >= 0) !== (buffer[i] >= 0)) crossings++;
    }
    const zcr = crossings / buffer.length;
    const smoothed = this.smoother.update(zcr * 1000); // scale to 0-~50 range

    this.zcrHistory.push(smoothed);
    if (this.zcrHistory.length > 60) this.zcrHistory.shift();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.source) try { this.source.disconnect(); } catch (_) {}
    if (this.audioCtx) try { this.audioCtx.close(); } catch (_) {}
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
  }

  getResult(): PitchVariationResult {
    if (this.zcrHistory.length < 10) {
      return {
        variationIndex: 50,
        label: 'Moderate',
        feedback: 'Insufficient audio data for pitch analysis.',
      };
    }

    // Standard deviation of ZCR history → variation measure
    const mean = this.zcrHistory.reduce((a, b) => a + b, 0) / this.zcrHistory.length;
    const variance = this.zcrHistory.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / this.zcrHistory.length;
    const stdDev = Math.sqrt(variance);

    // Map stdDev (typical range 0–8) to 0–100 variation index
    const variationIndex = Math.min(100, Math.round((stdDev / 8) * 100));

    let label: PitchVariationResult['label'];
    let feedback: string;

    if (variationIndex < 10) {
      label = 'Monotone';
      feedback = 'Speech sounds flat with very little pitch change. Vary your tone to emphasise key points.';
    } else if (variationIndex < 25) {
      label = 'Low Variation';
      feedback = 'Some pitch variation present but speech is still relatively flat. Add more emphasis to important words.';
    } else if (variationIndex < 55) {
      label = 'Moderate';
      feedback = 'Good pitch variation. Speech sounds natural and reasonably engaging.';
    } else if (variationIndex < 80) {
      label = 'Expressive';
      feedback = 'Expressive vocal range. Very engaging and dynamic delivery.';
    } else {
      label = 'Erratic';
      feedback = 'Pitch changes are very frequent. Try to moderate vocal variation for a more authoritative tone.';
    }

    return { variationIndex, label, feedback };
  }
}

// ─── Voice Activity Detection (VAD) Proxy ─────────────────────────────────────

/**
 * Browser-based Voice Activity Detection.
 * Uses audio energy (RMS) thresholding — approximate but effective for GD pauses.
 */
export class VoiceActivityDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private isSpeaking = false;
  private silenceStart: number | null = null;
  private silenceIntervals: number[] = [];
  private isRunning = false;
  private readonly SILENCE_THRESHOLD = 0.015; // RMS energy level
  private readonly MIN_SILENCE_MS = 300;

  async start(stream: MediaStream): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AC();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.isRunning = true;
      this.loop();
    } catch (err) {
      console.warn('[VAD] Web Audio setup failed:', err);
    }
  }

  private loop(): void {
    if (!this.isRunning || !this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // RMS energy
    const rms = Math.sqrt(buffer.reduce((acc, v) => acc + v * v, 0) / buffer.length);
    const speaking = rms > this.SILENCE_THRESHOLD;
    const now = Date.now();

    if (!speaking && this.isSpeaking) {
      // Speech just ended — start counting silence
      this.silenceStart = now;
    } else if (speaking && !this.isSpeaking && this.silenceStart !== null) {
      // Speech resumed — record pause length
      const pauseMs = now - this.silenceStart;
      if (pauseMs >= this.MIN_SILENCE_MS) {
        this.silenceIntervals.push(pauseMs);
      }
      this.silenceStart = null;
    }

    this.isSpeaking = speaking;
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.source) try { this.source.disconnect(); } catch (_) {}
    if (this.audioCtx) try { this.audioCtx.close(); } catch (_) {}
  }

  getSilenceIntervals(): number[] {
    return [...this.silenceIntervals];
  }

  reset(): void {
    this.silenceIntervals = [];
    this.silenceStart = null;
    this.isSpeaking = false;
  }
}

// ─── Composite Fluency Scorer ─────────────────────────────────────────────────

export interface FluencyScore {
  wpm: number;
  wpmLabel: string;
  pauseScore: number;
  pitchVariation: PitchVariationResult;
  fillerCount: number;
  compositeScore: number;    // 0–100
  level: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
  detailedFeedback: string[];
}

/**
 * Calculates a composite fluency score from all available signals.
 * Absent signals are excluded from the weighted average (not scored as 0).
 */
export function computeFluencyScore(params: {
  wpm: number;
  silenceIntervalsMs: number[];
  pitchResult?: PitchVariationResult;
  fillerCount: number;
  totalWords: number;
}): FluencyScore {
  const { wpm, silenceIntervalsMs, pitchResult, fillerCount, totalWords } = params;
  const feedback: string[] = [];
  const weights: { score: number; weight: number }[] = [];

  // 1. WPM score (20% if available)
  let wpmScore = 70;
  let wpmLabel = 'Moderate';
  if (totalWords > 10) {
    if (wpm >= 115 && wpm <= 155) {
      wpmScore = 95; wpmLabel = 'Optimal (115–155 WPM)';
      feedback.push(`Speaking pace is excellent at ${wpm} WPM.`);
    } else if ((wpm >= 90 && wpm < 115) || (wpm > 155 && wpm <= 175)) {
      wpmScore = 78; wpmLabel = 'Acceptable';
      feedback.push(`Pace (${wpm} WPM) is acceptable — slight adjustment recommended.`);
    } else if (wpm < 90) {
      wpmScore = 50; wpmLabel = 'Too Slow';
      feedback.push(`Pace is slow (${wpm} WPM). Aim for 115–145 WPM for confident delivery.`);
    } else {
      wpmScore = 52; wpmLabel = 'Too Fast';
      feedback.push(`Pace is fast (${wpm} WPM). Slow down slightly for listener clarity.`);
    }
    weights.push({ score: wpmScore, weight: 0.30 });
  }

  // 2. Pause score (25% if available)
  const pauseResult = analysePauses(silenceIntervalsMs);
  if (silenceIntervalsMs.length > 0) {
    if (pauseResult.score < 60) feedback.push(pauseResult.feedback);
    weights.push({ score: pauseResult.score, weight: 0.30 });
  }

  // 3. Pitch variation (15% if available)
  if (pitchResult && totalWords > 20) {
    if (pitchResult.label === 'Monotone' || pitchResult.label === 'Low Variation') {
      feedback.push(pitchResult.feedback);
    }
    const pitchScore =
      pitchResult.variationIndex < 10 ? 40 :
      pitchResult.variationIndex < 25 ? 60 :
      pitchResult.variationIndex < 55 ? 85 :
      pitchResult.variationIndex < 80 ? 95 : 65;
    weights.push({ score: pitchScore, weight: 0.15 });
  }

  // 4. Filler word score (25%)
  if (totalWords > 10) {
    const fillerDensity = (fillerCount / totalWords) * 100;
    const fillerScore =
      fillerDensity === 0 ? 100 :
      fillerDensity < 1   ? 88 :
      fillerDensity < 2   ? 70 :
      fillerDensity < 4   ? 50 : 30;
    if (fillerCount > 2) {
      feedback.push(`${fillerCount} filler words detected. Practice replacing them with intentional pauses.`);
    }
    weights.push({ score: fillerScore, weight: 0.25 });
  }

  // Weighted composite
  const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
  const compositeScore = totalWeight > 0
    ? Math.round(weights.reduce((acc, w) => acc + w.score * w.weight, 0) / totalWeight)
    : 65;

  if (feedback.length === 0) {
    feedback.push('Excellent overall fluency. Speech is clear, well-paced, and confident.');
  }

  const level =
    compositeScore >= 85 ? 'Excellent' :
    compositeScore >= 70 ? 'Good' :
    compositeScore >= 55 ? 'Fair' : 'Needs Work';

  return {
    wpm,
    wpmLabel,
    pauseScore: pauseResult.score,
    pitchVariation: pitchResult ?? { variationIndex: 50, label: 'Moderate', feedback: '' },
    fillerCount,
    compositeScore,
    level,
    detailedFeedback: feedback,
  };
}
