/**
 * ProfessionalismScore.ts  (Upgraded)
 * ─────────────────────────────────────────────────────────────────────────────
 * Combines multiple behavioural metrics into a unified non-verbal score.
 *
 * Improvements over v1:
 *   • EMA-smoothed per-metric values to reduce frame-level noise.
 *   • Normalised weighting: unavailable measurements are excluded and remaining
 *     weights are redistributed so absent camera never inflates the score.
 *   • Explicit "data available" flags for each sub-metric.
 *   • Richer feedback strings.
 *
 * Weight allocation (non-verbal 10% of total rubric):
 *   Eye contact         35%
 *   Posture             25%
 *   Facial stability    20%
 *   Gesture quality     20%
 */

import { EMASmoother } from './FluencyAnalysis';

export interface BehavioralInputs {
  posture: 'Straight' | 'Slouching' | 'Unknown';
  eyeContact: boolean;
  gestureScore: number;      // 0–100 (0 if hands not visible)
  emotion: string;
  emotionConfidence: number;
  attentionScore: number;    // 0–100
  stabilityScore: number;    // 0–100
  // Optional availability flags
  cameraActive?: boolean;
  gestureDataAvailable?: boolean;
  stabilityDataAvailable?: boolean;
}

export type ProfessionalismRating = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';

// ─── EMA Smoothers for real-time metric stabilisation ─────────────────────────
// Singleton smoothers — shared across frames within a session
const _eyeContactSmoother   = new EMASmoother(0.25);
const _postureSmoother      = new EMASmoother(0.20);
const _stabilitySmoother    = new EMASmoother(0.20);
const _gestureSmoother      = new EMASmoother(0.30);

/** Resets all smoothers — call at session start */
export function resetProfessionalismSmoothers(): void {
  _eyeContactSmoother.reset();
  _postureSmoother.reset();
  _stabilitySmoother.reset();
  _gestureSmoother.reset();
}

// ─── Main Scorer ──────────────────────────────────────────────────────────────

export const calculateProfessionalismScore = (inputs: BehavioralInputs): number => {
  const cameraActive = inputs.cameraActive !== false; // default: assume active

  if (!cameraActive) return 0; // Camera off → no non-verbal score

  // Define sub-scores (0–100) and availability
  interface SubMetric { score: number; weight: number; available: boolean }

  const eyeRaw     = inputs.eyeContact ? 100 : 0;
  const eyeSmooth  = _eyeContactSmoother.update(eyeRaw);

  const postureRaw = inputs.posture === 'Straight' ? 100 : inputs.posture === 'Slouching' ? 20 : -1;
  const postureAvailable = postureRaw >= 0;
  const postureSmooth = postureAvailable ? _postureSmoother.update(postureRaw) : 50;

  const stabilityAvailable = inputs.stabilityDataAvailable !== false && inputs.stabilityScore > 0;
  const stabilitySmooth = stabilityAvailable
    ? _stabilitySmoother.update(inputs.stabilityScore)
    : 0;

  const gestureAvailable = inputs.gestureDataAvailable !== false && inputs.gestureScore > 0;
  const gestureSmooth = gestureAvailable
    ? _gestureSmoother.update(inputs.gestureScore)
    : 0;

  const metrics: SubMetric[] = [
    { score: eyeSmooth,      weight: 0.35, available: true },
    { score: postureSmooth,  weight: 0.25, available: postureAvailable },
    { score: stabilitySmooth,weight: 0.20, available: stabilityAvailable },
    { score: gestureSmooth,  weight: 0.20, available: gestureAvailable },
  ];

  const available = metrics.filter(m => m.available);
  if (available.length === 0) return 50; // No data at all — neutral

  // Normalise weights for available metrics
  const totalWeight = available.reduce((acc, m) => acc + m.weight, 0);
  const score = available.reduce((acc, m) => acc + (m.score * m.weight) / totalWeight, 0);

  return Math.min(100, Math.max(0, Math.round(score)));
};

export const getProfessionalismRating = (score: number): ProfessionalismRating => {
  if (score >= 88) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'Needs Improvement';
};

export const getProfessionalismFeedback = (inputs: BehavioralInputs): string[] => {
  const feedback: string[] = [];

  if (inputs.posture === 'Slouching') {
    feedback.push('Maintain an upright posture — slouching signals low confidence to interviewers.');
  } else if (inputs.posture === 'Unknown') {
    feedback.push('Position yourself so your upper body is fully visible in frame.');
  }

  if (!inputs.eyeContact) {
    feedback.push('Look directly at the camera to simulate eye contact with evaluators.');
  }

  if (inputs.gestureDataAvailable && inputs.gestureScore > 0) {
    if (inputs.gestureScore < 50) {
      feedback.push('Use natural hand gestures to emphasise key points and show engagement.');
    } else if (inputs.gestureScore > 85) {
      feedback.push('Hand movement is very frequent — keep gestures controlled and purposeful.');
    }
  }

  if (inputs.stabilityDataAvailable && inputs.stabilityScore < 60) {
    feedback.push('Facial micro-movements detected. Take a breath and try to maintain a calm expression.');
  }

  if (inputs.attentionScore < 50) {
    feedback.push('Maintain active attention — brief lapses are noticed in live GD evaluations.');
  }

  return feedback;
};
