/**
 * ProfessionalismScore Utility
 * Combines multiple behavioral metrics into a unified professionalism rating.
 */

export interface BehavioralInputs {
    posture: 'Straight' | 'Slouching' | 'Unknown';
    eyeContact: boolean;
    gestureScore: number;
    emotion: string;
    emotionConfidence: number;
    attentionScore: number; // 0-100
    stabilityScore: number; // 0-100 (Micro-Expression control)
}

export type ProfessionalismRating = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';

export const calculateProfessionalismScore = (inputs: BehavioralInputs): number => {
    let score = 0;

    // 1. Posture (15 points)
    if (inputs.posture === 'Straight') score += 15;
    else if (inputs.posture === 'Slouching') score += 5;

    // 2. Eye Contact (15 points)
    if (inputs.eyeContact) score += 15;

    // 3. Gestures (15 points) - only evaluated if hands were visible
    const gesturesEvaluated = inputs.gestureScore > 0;
    if (gesturesEvaluated) {
        score += (inputs.gestureScore / 100) * 15;
    }

    // 4. Facial Composure (20 points)
    const professionalEmotions = ['neutral', 'happy', 'surprised'];
    if (professionalEmotions.includes(inputs.emotion) && inputs.emotionConfidence > 0.5) {
        score += 20;
    } else {
        score += 10;
    }

    // 5. Attention Level (15 points)
    score += (inputs.attentionScore / 100) * 15;

    // 6. Facial Stability (20 points)
    score += (inputs.stabilityScore / 100) * 20;

    // If hands were not visible, normalize from 85 base to 100 so candidate is not penalized
    if (!gesturesEvaluated) {
        score = (score / 85) * 100;
    }

    return Math.min(Math.round(score), 100);
};

export const getProfessionalismRating = (score: number): ProfessionalismRating => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
};

export const getProfessionalismFeedback = (inputs: BehavioralInputs): string[] => {
    const feedback: string[] = [];

    if (inputs.posture === 'Slouching') {
        feedback.push("Maintain a straight, upright posture to project confidence.");
    }

    if (!inputs.eyeContact) {
        feedback.push("Try to look directly at the camera more often to engage your audience.");
    }

    if (inputs.gestureScore < 50) {
        feedback.push("Use more hand gestures to emphasize your points and show energy.");
    } else if (inputs.gestureScore > 85) {
        feedback.push("Your hand gestures are very expressive, ensure they remain controlled.");
    }

    if (inputs.attentionScore < 60) {
        feedback.push("Focus more on the discussion to show active participation.");
    }

    return feedback;
};
