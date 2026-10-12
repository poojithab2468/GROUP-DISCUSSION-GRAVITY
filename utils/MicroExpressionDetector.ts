/**
 * MicroExpressionDetector Utility
 * Tracks rapid facial landmark changes to detect hidden emotions/stress.
 */

export interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

export interface MicroExpressionMetrics {
    stabilityScore: number;     // 0-100
    stressLevel: 'Low' | 'Medium' | 'High';
    nervousnessScore: number;  // 0-100
    eventCount: number;
    lastSignal: string | null;
}

const HISTORY_LIMIT = 5; // ~1 second @ 5fps
let landmarkHistory: FaceLandmark[][] = [];
let blinkCount = 0;
let lastBlinkTime = 0;
let totalEvents = 0;

/**
 * Calculates Euclidean distance between two points
 */
const dist = (p1: FaceLandmark, p2: FaceLandmark) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Analyzes micro-movements between current and previous frames
 */
export const detectMicroExpressions = (landmarks: FaceLandmark[]): MicroExpressionMetrics => {
    if (!landmarks || landmarks.length < 468) {
        return { stabilityScore: 100, stressLevel: 'Low', nervousnessScore: 0, eventCount: totalEvents, lastSignal: null };
    }

    landmarkHistory.unshift(landmarks);
    if (landmarkHistory.length > HISTORY_LIMIT) landmarkHistory.pop();

    if (landmarkHistory.length < 2) {
        return { stabilityScore: 100, stressLevel: 'Low', nervousnessScore: 0, eventCount: totalEvents, lastSignal: null };
    }

    const prev = landmarkHistory[1];
    const curr = landmarks;

    let signals: string[] = [];
    let motionMagnitude = 0;

    // 1. Eyebrow Raise (Left: 105, Right: 334)
    const leftBrowMove = Math.abs(curr[105].y - prev[105].y);
    const rightBrowMove = Math.abs(curr[334].y - prev[334].y);
    if (leftBrowMove > 0.01 || rightBrowMove > 0.01) {
        signals.push("Eyebrow Twitch");
        motionMagnitude += 15;
    }

    // 2. Lip Tightening (Outer corners: 61, 291)
    const lipWidthPrev = dist(prev[61], prev[291]);
    const lipWidthCurr = dist(curr[61], curr[291]);
    if (Math.abs(lipWidthCurr - lipWidthPrev) > 0.008) {
        signals.push("Lip Tension");
        motionMagnitude += 20;
    }

    // 3. Blink Detection (L: 159, 145 | R: 386, 374)
    const leftEyeOpen = dist(curr[159], curr[145]);
    const rightEyeOpen = dist(curr[386], curr[374]);
    const isBlinking = leftEyeOpen < 0.005 && rightEyeOpen < 0.005;

    const now = Date.now();
    if (isBlinking && (now - lastBlinkTime > 300)) {
        blinkCount++;
        lastBlinkTime = now;
        if (now - lastBlinkTime < 1000) { // Rapid blinking check
            signals.push("Rapid Blinking");
            motionMagnitude += 10;
        }
    }

    // 4. Jaw Tension (Bottom: 152)
    const jawMove = Math.abs(curr[152].y - prev[152].y);
    if (jawMove > 0.015) {
        signals.push("Jaw Tension");
        motionMagnitude += 15;
    }

    if (signals.length > 0) totalEvents++;

    // Stability Score calculation
    const stability = Math.max(0, 100 - (motionMagnitude * 2));

    // Nervousness Score (Cumulative impact of signals)
    const nervousness = Math.min(100, (signals.length * 25) + (motionMagnitude));

    let stress: 'Low' | 'Medium' | 'High' = 'Low';
    if (nervousness > 70) stress = 'High';
    else if (nervousness > 35) stress = 'Medium';

    return {
        stabilityScore: Math.round(stability),
        stressLevel: stress,
        nervousnessScore: Math.round(nervousness),
        eventCount: totalEvents,
        lastSignal: signals.length > 0 ? signals[0] : null
    };
};

export const resetMicroHistory = () => {
    landmarkHistory = [];
    totalEvents = 0;
    blinkCount = 0;
};
