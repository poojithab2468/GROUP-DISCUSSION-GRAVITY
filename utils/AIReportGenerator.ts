import { PracticeSession, StrictRubricBreakdown, RubricCriterionScore } from '@/types/session';
import { generateText } from '@rork-ai/toolkit-sdk';

export interface CalculatedReportMetrics {
  totalTurns: number;
  userTurns: number;
  aiTurns: number;
  totalUserWords: number;
  speakingDurationSeconds: number;
  wpm: number;
  fillerWordsCount: number;
  fillerWordsFound: string[];
  vocabularyRichnessPct: number;
  cameraActive: boolean;
  avgEyeContactPct: number | null;
  avgPostureScore: number | null;
  avgGestureScore: number | null;
  avgStabilityScore: number | null;
  avgProfessionalismScore: number | null;
  dominantStress: string | null;
  rubricBreakdown: StrictRubricBreakdown;
  overallScore: number;
  unlockedBadgeIds: string[];
}

export interface ReportGenerationResult {
  reportText: string;
  isAiGenerated: boolean;
  metrics: CalculatedReportMetrics;
}

export interface SessionLiveCameraStats {
  frameCount?: number;
  avgEyeContactPct?: number;
  avgPostureScore?: number;
  avgGestureScore?: number;
  avgStabilityScore?: number;
  dominantStress?: string;
}

const COMMON_FILLERS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
  'so yeah', 'right', 'sort of', 'kind of', 'i mean', 'honestly'
];

/**
 * Evaluates topic relevance by comparing candidate's spoken vocabulary against discussion topic keywords and domain themes
 */
function evaluateTopicRelevance(
  userText: string,
  topic: string
): { relevanceRatio: number; matchedKeywords: string[]; keySnippet: string } {
  if (!userText || !topic) {
    return { relevanceRatio: 0, matchedKeywords: [], keySnippet: 'No contribution recorded.' };
  }

  const cleanUser = userText.toLowerCase();
  const topicWords = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'which', 'should', 'about', 'role', 'versus', 'impact'].includes(w));

  const matchedKeywords = topicWords.filter(w => cleanUser.includes(w));
  const relevanceRatio = topicWords.length > 0 ? matchedKeywords.length / topicWords.length : 0.5;

  const sentences = userText.split(/[.?!]+/).filter(s => s.trim().length > 10);
  const relevantSentence = sentences.find(s =>
    topicWords.some(w => s.toLowerCase().includes(w))
  ) || sentences[0] || userText.slice(0, 90);

  const keySnippet = relevantSentence.trim().slice(0, 110);

  return { relevanceRatio, matchedKeywords, keySnippet };
}

/**
 * Computes deterministic, evidence-based performance scores using the strict 100-mark corporate GD rubric
 */
export function computeSessionMetrics(
  session: PracticeSession,
  sessionDurationSeconds: number = 0,
  liveCameraStats?: SessionLiveCameraStats
): CalculatedReportMetrics {
  const entries = session.entries || [];
  const userEntries = entries.filter(e => !(e as any).isAI);
  const aiEntries = entries.filter(e => (e as any).isAI);

  const totalTurns = entries.length;
  const userTurns = userEntries.length;
  const aiTurns = aiEntries.length;

  const userWordsList = userEntries.flatMap(e =>
    (e.text || '').toLowerCase().match(/\b[a-z0-9'-]+\b/g) || []
  );
  const totalUserWords = userWordsList.length;

  const durationSeconds = Math.max(sessionDurationSeconds, userTurns * 18);
  const durationMinutes = Math.max(0.2, durationSeconds / 60);

  // WPM
  const wpm = Math.round(totalUserWords / durationMinutes);

  // Filler words
  const fullUserText = userEntries.map(e => e.text).join(' ');
  const fillerWordsFound: string[] = [];
  let fillerWordsCount = 0;

  for (const filler of COMMON_FILLERS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = fullUserText.match(regex);
    if (matches && matches.length > 0) {
      fillerWordsCount += matches.length;
      fillerWordsFound.push(`${filler} (${matches.length})`);
    }
  }

  // Vocabulary richness (Type-Token Ratio)
  const uniqueWords = new Set(userWordsList);
  const vocabularyRichnessPct = totalUserWords > 0
    ? Math.round((uniqueWords.size / totalUserWords) * 100)
    : 0;

  // Genuine camera metrics
  const cameraEntries = userEntries.filter(
    e => (e as any).eyeContactPercentage !== undefined && (e as any).engagementScore > 0
  );
  const hasLiveCamera = !!(liveCameraStats && (liveCameraStats.frameCount ?? 0) > 0);
  const cameraActive = cameraEntries.length > 0 || hasLiveCamera;

  let avgEyeContactPct: number | null = null;
  let avgPostureScore: number | null = null;
  let avgGestureScore: number | null = null;
  let avgStabilityScore: number | null = null;
  let avgProfessionalismScore: number | null = null;
  let dominantStress: string | null = null;

  if (cameraEntries.length > 0) {
    avgEyeContactPct = Math.round(
      cameraEntries.reduce((acc, e) => acc + ((e as any).eyeContactPercentage || 0), 0) / cameraEntries.length
    );
    avgPostureScore = Math.round(
      cameraEntries.reduce((acc, e) => acc + ((e as any).postureScore || 0), 0) / cameraEntries.length
    );
    avgGestureScore = Math.round(
      cameraEntries.reduce((acc, e) => acc + ((e as any).gestureScore || 0), 0) / cameraEntries.length
    );
    avgStabilityScore = Math.round(
      cameraEntries.reduce((acc, e) => acc + ((e as any).stabilityScore || 0), 0) / cameraEntries.length
    );
    avgProfessionalismScore = Math.round(
      cameraEntries.reduce((acc, e) => acc + ((e as any).professionalismScore || 65), 0) / cameraEntries.length
    );
    const stressMap: Record<string, number> = {};
    cameraEntries.forEach(e => {
      const s = (e as any).stressLevel || 'Low';
      stressMap[s] = (stressMap[s] || 0) + 1;
    });
    dominantStress = Object.keys(stressMap).sort((a, b) => stressMap[b] - stressMap[a])[0] || 'Low';
  } else if (hasLiveCamera && liveCameraStats) {
    avgEyeContactPct = liveCameraStats.avgEyeContactPct ?? null;
    avgPostureScore = liveCameraStats.avgPostureScore ?? null;
    avgGestureScore = liveCameraStats.avgGestureScore ?? null;
    avgStabilityScore = liveCameraStats.avgStabilityScore ?? null;
    avgProfessionalismScore = avgEyeContactPct && avgPostureScore
      ? Math.round((avgEyeContactPct + avgPostureScore) / 2)
      : null;
    dominantStress = liveCameraStats.dominantStress || 'Low';
  }

  // ==========================================
  // STRICT 100-MARK CORPORATE EVALUATION RUBRIC
  // ==========================================
  const { relevanceRatio, matchedKeywords, keySnippet } = evaluateTopicRelevance(fullUserText, session.topic || '');

  // 1. Content Relevance and Topic Understanding (Max 25 Marks)
  let contentMarks = 0;
  let contentExplanation = '';
  let contentRec = '';

  if (totalUserWords < 20) {
    contentMarks = 4;
    contentExplanation = 'Extremely brief contribution that does not sufficiently address or develop the topic.';
    contentRec = 'Provide structured viewpoints with specific context instead of short single-line remarks.';
  } else if (relevanceRatio === 0 && matchedKeywords.length === 0) {
    contentMarks = 6;
    contentExplanation = 'Response drifted completely away from the designated topic and key subject terms.';
    contentRec = 'Directly anchor your arguments to the topic keywords and core theme.';
  } else if (relevanceRatio < 0.4 || totalUserWords < 45) {
    contentMarks = 10;
    contentExplanation = 'Response touched upon general themes but offered shallow substance without depth.';
    contentRec = 'Define the problem statement clearly and present concrete domain arguments.';
  } else if (relevanceRatio < 0.7 || totalUserWords < 90) {
    contentMarks = 16;
    contentExplanation = 'Good topic understanding with relevant points, but lacks comprehensive elaboration.';
    contentRec = 'Elaborate on secondary implications and address opposing facets of the debate.';
  } else if (totalUserWords < 160) {
    contentMarks = 21;
    contentExplanation = 'Strong, direct topic alignment with clear focus on core subject matters.';
    contentRec = 'Connect arguments to real-world industrial or societal case studies.';
  } else {
    contentMarks = 24;
    contentExplanation = 'Exceptional topic mastery with thorough thematic relevance across contributions.';
    contentRec = 'Maintain this high standard of targeted thematic discourse.';
  }

  const contentRelevance: RubricCriterionScore = {
    score: contentMarks,
    maxMarks: 25,
    explanation: contentExplanation,
    evidence: keySnippet ? `"${keySnippet}..."` : 'Insufficient spoken text recorded.',
    recommendation: contentRec,
  };

  // 2. Quality of Arguments, Reasoning, and Examples (Max 20 Marks)
  const reasoningKeywords = ['because', 'therefore', 'for instance', 'for example', 'evidence', 'impact', 'however', 'consequently', 'specifically', 'due to', 'since', 'result'];
  const reasoningMatches = reasoningKeywords.filter(k => fullUserText.toLowerCase().includes(k));

  let argMarks = 0;
  let argExplanation = '';
  let argRec = '';

  if (totalUserWords < 25) {
    argMarks = 3;
    argExplanation = 'Lacked argumentative substance; bare assertions without backing.';
    argRec = 'State your claim, explain the underlying rationale, and back it with an example.';
  } else if (reasoningMatches.length === 0) {
    argMarks = 7;
    argExplanation = 'Contained opinions or statements but lacked causal connectors or evidence.';
    argRec = 'Use connecting phrases like "because", "due to", and "for instance" to substantiate points.';
  } else if (reasoningMatches.length <= 2 || totalUserWords < 60) {
    argMarks = 12;
    argExplanation = 'Moderate reasoning demonstrated with basic cause-and-effect structure.';
    argRec = 'Incorporate tangible examples from industry, market statistics, or real-world events.';
  } else if (reasoningMatches.length <= 4 || totalUserWords < 120) {
    argMarks = 16;
    argExplanation = 'Strong analytical arguments with clear causal reasoning and practical examples.';
    argRec = 'Add quantitative metrics or counter-evidence to elevate argument credibility.';
  } else {
    argMarks = 19;
    argExplanation = 'Superior argumentation with rigorous logic, structured reasoning, and supporting evidence.';
    argRec = 'Continue leveraging structured frameworks like PEEL (Point, Explanation, Evidence, Link).';
  }

  const argumentQuality: RubricCriterionScore = {
    score: argMarks,
    maxMarks: 20,
    explanation: argExplanation,
    evidence: reasoningMatches.length > 0 ? `Utilized analytical connectors: ${reasoningMatches.join(', ')}` : 'No causal reasoning connectors detected.',
    recommendation: argRec,
  };

  // 3. Coherence and Logical Organization (Max 15 Marks)
  let cohMarks = 0;
  let cohExplanation = '';
  let cohRec = '';

  if (totalUserWords < 25) {
    cohMarks = 3;
    cohExplanation = 'Disjointed phrases with insufficient organizational continuity.';
    cohRec = 'Construct full sentences that flow logically from problem to solution.';
  } else if (totalUserWords < 55) {
    cohMarks = 7;
    cohExplanation = 'Basic sentence flow with noticeable fragmentation or abrupt transitions.';
    cohRec = 'Organize your contribution in a clear Beginning-Middle-Conclusion structure.';
  } else if (totalUserWords < 110) {
    cohMarks = 11;
    cohExplanation = 'Coherent progression of thoughts with readable logical structure.';
    cohRec = 'Use transition phrases (e.g., "Furthermore", "On the other hand") to link ideas seamlessly.';
  } else {
    cohMarks = 14;
    cohExplanation = 'Highly articulated, seamless progression of arguments and orderly points.';
    cohRec = 'Maintain this structured clarity in multi-speaker corporate settings.';
  }

  const coherence: RubricCriterionScore = {
    score: cohMarks,
    maxMarks: 15,
    explanation: cohExplanation,
    evidence: `Average delivery segment length: ~${Math.round(totalUserWords / (userTurns || 1))} words per turn across ${userTurns} turn${userTurns === 1 ? '' : 's'}.`,
    recommendation: cohRec,
  };

  // 4. Fluency and Delivery (Max 15 Marks)
  let fluMarks = 0;
  let fluExplanation = '';
  let fluRec = '';

  if (totalUserWords < 20) {
    fluMarks = 4;
    fluExplanation = 'Insufficient speech volume to reliably assess fluency and vocal rhythm.';
    fluRec = 'Speak for at least 60-90 seconds to showcase natural verbal pace.';
  } else {
    let baseFlu = 10;
    // Pace calibration (115-155 WPM is ideal for GD)
    if (wpm >= 115 && wpm <= 155) {
      baseFlu += 4;
      fluExplanation = `Optimal conversational pace maintained at ${wpm} WPM.`;
    } else if ((wpm >= 90 && wpm < 115) || (wpm > 155 && wpm <= 175)) {
      baseFlu += 2;
      fluExplanation = `Acceptable tempo (${wpm} WPM), though slight pacing adjustment recommended.`;
    } else if (wpm < 90) {
      baseFlu -= 2;
      fluExplanation = `Deliberately slow or halting pace recorded (${wpm} WPM).`;
    } else {
      baseFlu -= 2;
      fluExplanation = `Fast or rushed delivery recorded (${wpm} WPM), which may impair listener clarity.`;
    }

    // Filler deduction
    if (fillerWordsCount === 0 && totalUserWords >= 50) {
      baseFlu += 1;
    } else if (fillerWordsCount > 3) {
      baseFlu -= Math.min(5, fillerWordsCount);
      fluExplanation += ` Verbal crutches flagged: ${fillerWordsCount} instances.`;
    }

    fluMarks = Math.min(15, Math.max(3, baseFlu));
    fluRec = fillerWordsCount > 2
      ? 'Replace verbal crutches like "um/like" with confident silent pauses.'
      : 'Aim for a consistent, measured cadence of 120-140 WPM.';
  }

  const fluency: RubricCriterionScore = {
    score: fluMarks,
    maxMarks: 15,
    explanation: fluExplanation,
    evidence: `Cadence: ${wpm} WPM, Filler words detected: ${fillerWordsCount} (${fillerWordsFound.slice(0, 3).join(', ') || 'None'}).`,
    recommendation: fluRec,
  };

  // 5. Vocabulary and Language Usage (Max 10 Marks)
  let vocMarks = 0;
  let vocExplanation = '';
  let vocRec = '';

  if (totalUserWords < 20) {
    vocMarks = 3;
    vocExplanation = 'Extremely restricted lexical sample.';
    vocRec = 'Express complete thoughts using diverse vocabulary.';
  } else if (vocabularyRichnessPct < 40) {
    vocMarks = 5;
    vocExplanation = `Repetitive diction (${vocabularyRichnessPct}% unique vocabulary ratio).`;
    vocRec = 'Avoid repeating identical phrases; use synonyms and domain-specific terminology.';
  } else if (vocabularyRichnessPct < 55) {
    vocMarks = 7;
    vocExplanation = `Good functional vocabulary (${vocabularyRichnessPct}% unique ratio).`;
    vocRec = 'Incorporate formal corporate communication terminology.';
  } else {
    vocMarks = 9;
    vocExplanation = `Rich, diverse vocabulary (${vocabularyRichnessPct}% unique ratio).`;
    vocRec = 'Maintain concise precision without resorting to unnecessary jargon.';
  }

  const vocabulary: RubricCriterionScore = {
    score: vocMarks,
    maxMarks: 10,
    explanation: vocExplanation,
    evidence: `Vocabulary Richness Ratio: ${vocabularyRichnessPct}% (${uniqueWords.size} unique terms out of ${totalUserWords} total words).`,
    recommendation: vocRec,
  };

  // 6. Active Participation and Meaningful Engagement (Max 10 Marks)
  let partMarks = 0;
  let partExplanation = '';
  let partRec = '';

  if (userTurns === 1) {
    partMarks = 3;
    partExplanation = 'Critical GD deficit: Contributed only once and remained silent for the remainder of the session.';
    partRec = 'Re-enter the discussion at least 2-3 times to respond to counter-arguments and summarize group points.';
  } else if (userTurns === 2) {
    partMarks = 6;
    partExplanation = 'Satisfactory participation with two interventions, but limited ongoing dialogue.';
    partRec = 'Engage actively with opposing peers rather than only presenting isolated thoughts.';
  } else if (userTurns === 3) {
    partMarks = 8;
    partExplanation = 'Strong multi-turn participation demonstrating active listening and engagement.';
    partRec = 'Build bridges between disagreeing participants to demonstrate leadership.';
  } else {
    partMarks = 10;
    partExplanation = 'Exemplary continuous engagement across multiple phases of the group discussion.';
    partRec = 'Ensure you leave adequate airtime for peers while maintaining leadership presence.';
  }

  const activeParticipation: RubricCriterionScore = {
    score: partMarks,
    maxMarks: 10,
    explanation: partExplanation,
    evidence: `Candidate interventions: ${userTurns} turn${userTurns === 1 ? '' : 's'} (Discussion total: ${totalTurns} turns including ${aiTurns} peer turns).`,
    recommendation: partRec,
  };

  // 7. Conciseness and Avoidance of Unnecessary Repetition (Max 5 Marks)
  let conMarks = 0;
  let conExplanation = '';
  let conRec = '';

  const repeatedPhrases = fullUserText.toLowerCase().includes('i think i think') || (totalUserWords > 120 && vocabularyRichnessPct < 38);

  if (totalUserWords < 15) {
    conMarks = 2;
    conExplanation = 'Under-contributed; conciseness cannot be credited without substance.';
    conRec = 'Provide structured reasoning within a focused 45-60 second window.';
  } else if (repeatedPhrases) {
    conMarks = 2;
    conExplanation = 'Noticeable verbal circularity or repeated expressions detected.';
    conRec = 'Conclude each argument with a firm summary sentence rather than circling back.';
  } else if (totalUserWords > 220 && userTurns <= 2) {
    conMarks = 3;
    conExplanation = 'Slightly monopolized single speaking turns without pausing for peer responses.';
    conRec = 'Keep individual speaking turns between 45 and 60 seconds (70-90 words).';
  } else {
    conMarks = 5;
    conExplanation = 'Crisp, articulate points delivered without rambling or circular repetition.';
    conRec = 'Maintain this sharp, respectful balance of brevity and substance.';
  }

  const conciseness: RubricCriterionScore = {
    score: conMarks,
    maxMarks: 5,
    explanation: conExplanation,
    evidence: `Delivered ${totalUserWords} words across ${userTurns} turn${userTurns === 1 ? '' : 's'} with ${vocabularyRichnessPct}% lexical diversity.`,
    recommendation: conRec,
  };

  // PROGRAMMATIC TOTAL SCORE (Mathematically locked to 100)
  const totalScore = contentMarks + argMarks + cohMarks + fluMarks + vocMarks + partMarks + conMarks;

  let performanceLevel = 'Average Performance';
  if (totalScore >= 90) performanceLevel = 'Exceptional Performance (Top Tier Cleared)';
  else if (totalScore >= 80) performanceLevel = 'Very Good Performance (Placement Ready)';
  else if (totalScore >= 70) performanceLevel = 'Good Performance (Competitive Standard)';
  else if (totalScore >= 60) performanceLevel = 'Average Performance (Baseline Met with Improvement Gaps)';
  else if (totalScore >= 40) performanceLevel = 'Below-Average Performance (Needs Structured Practice)';
  else if (totalScore >= 20) performanceLevel = 'Poor Performance (Critical Deficits in Substance)';
  else performanceLevel = 'Extremely Poor Performance (Non-Responsive / Disqualified)';

  const rubricBreakdown: StrictRubricBreakdown = {
    contentRelevance,
    argumentQuality,
    coherence,
    fluency,
    vocabulary,
    activeParticipation,
    conciseness,
    totalScore,
    performanceLevel,
  };

  // Determine Badge Eligibility based on genuine performance
  const unlockedBadgeIds: string[] = [];
  if (userTurns > 0) unlockedBadgeIds.push('first_discussion');
  if (fluMarks >= 12) unlockedBadgeIds.push('fluent_speaker');
  if (cohMarks >= 12) unlockedBadgeIds.push('clear_communicator');
  if (vocMarks >= 8 || vocabularyRichnessPct >= 60) unlockedBadgeIds.push('vocabulary_builder');
  if (fillerWordsCount < 2 && totalUserWords >= 60) unlockedBadgeIds.push('filler_free');
  if (userTurns >= 3) unlockedBadgeIds.push('active_participant');
  if (argMarks >= 15) unlockedBadgeIds.push('critical_thinker');
  if (contentMarks >= 20) unlockedBadgeIds.push('topic_expert');
  if (conMarks >= 4 && totalUserWords >= 50) unlockedBadgeIds.push('concise_speaker');
  if (totalScore >= 75) unlockedBadgeIds.push('all_round_communicator');
  if (cameraActive && (avgEyeContactPct || 0) >= 70) unlockedBadgeIds.push('eye_contact_champ');
  if (cameraActive && (avgGestureScore || 0) >= 65 && (avgGestureScore || 0) <= 85) unlockedBadgeIds.push('gesture_master');

  return {
    totalTurns,
    userTurns,
    aiTurns,
    totalUserWords,
    speakingDurationSeconds: durationSeconds,
    wpm,
    fillerWordsCount,
    fillerWordsFound,
    vocabularyRichnessPct,
    cameraActive,
    avgEyeContactPct,
    avgPostureScore,
    avgGestureScore,
    avgStabilityScore,
    avgProfessionalismScore,
    dominantStress,
    rubricBreakdown,
    overallScore: totalScore,
    unlockedBadgeIds,
  };
}

/**
 * Builds the comprehensive structured report text conforming to the strict 100-mark rubric
 */
function buildDeterministicReport(
  session: PracticeSession,
  metrics: CalculatedReportMetrics
): string {
  const durationMin = Math.floor(metrics.speakingDurationSeconds / 60);
  const durationSec = metrics.speakingDurationSeconds % 60;
  const timeFormatted = `${durationMin}m ${durationSec}s`;
  const rb = metrics.rubricBreakdown;

  return `## FLUENT EDGE GD EVALUATION REPORT
### [EVALUATION ENGINE: Strict Corporate GD Evaluation Rubric]

## A. SESSION SUMMARY & PARTICIPATION OVERVIEW
- Topic: ${session.topic || 'General Topic'}
- Discussion Category: ${session.category ? session.category.toUpperCase() : 'GENERAL'}
- Evaluated Placement Level: ${rb.performanceLevel}
- FINAL GD SCORE: ${metrics.overallScore} / 100
- Discussion Interventions: ${metrics.userTurns} candidate turn${metrics.userTurns === 1 ? '' : 's'} (${metrics.totalTurns} total discussion turns including ${metrics.aiTurns} AI peer responses)
- Speaking Duration: ${timeFormatted}
- Total Spoken Volume: ${metrics.totalUserWords} words ${metrics.totalUserWords < 60 ? '[-SEVERE DEDUCTION: Under 60 words indicates critical non-participation]' : ''}
- Pace of Speech: ${metrics.wpm} Words Per Minute (WPM)

## B. STRICT SCORING RUBRIC BREAKDOWN (100 MARKS TOTAL)

### 1. Content Relevance & Topic Understanding: ${rb.contentRelevance.score} / ${rb.contentRelevance.maxMarks}
- Assessment: ${rb.contentRelevance.explanation}
- Evidence from Response: ${rb.contentRelevance.evidence}
- Actionable Recommendation: ${rb.contentRelevance.recommendation}

### 2. Quality of Arguments, Reasoning & Examples: ${rb.argumentQuality.score} / ${rb.argumentQuality.maxMarks}
- Assessment: ${rb.argumentQuality.explanation}
- Evidence from Response: ${rb.argumentQuality.evidence}
- Actionable Recommendation: ${rb.argumentQuality.recommendation}

### 3. Coherence & Logical Organization: ${rb.coherence.score} / ${rb.coherence.maxMarks}
- Assessment: ${rb.coherence.explanation}
- Evidence from Response: ${rb.coherence.evidence}
- Actionable Recommendation: ${rb.coherence.recommendation}

### 4. Fluency & Delivery: ${rb.fluency.score} / ${rb.fluency.maxMarks}
- Assessment: ${rb.fluency.explanation}
- Evidence from Response: ${rb.fluency.evidence}
- Actionable Recommendation: ${rb.fluency.recommendation}

### 5. Vocabulary & Language Usage: ${rb.vocabulary.score} / ${rb.vocabulary.maxMarks}
- Assessment: ${rb.vocabulary.explanation}
- Evidence from Response: ${rb.vocabulary.evidence}
- Actionable Recommendation: ${rb.vocabulary.recommendation}

### 6. Active Participation & Meaningful Engagement: ${rb.activeParticipation.score} / ${rb.activeParticipation.maxMarks}
- Assessment: ${rb.activeParticipation.explanation}
- Evidence from Response: ${rb.activeParticipation.evidence}
- Actionable Recommendation: ${rb.activeParticipation.recommendation}

### 7. Conciseness & Avoidance of Repetition: ${rb.conciseness.score} / ${rb.conciseness.maxMarks}
- Assessment: ${rb.conciseness.explanation}
- Evidence from Response: ${rb.conciseness.evidence}
- Actionable Recommendation: ${rb.conciseness.recommendation}

---

## C. NON-VERBAL & BEHAVIORAL ANALYSIS
${metrics.cameraActive ? `- Screen/Camera Eye Contact: ${metrics.avgEyeContactPct !== null ? `${metrics.avgEyeContactPct}% of session duration (${metrics.avgEyeContactPct >= 65 ? 'Consistent screen focus' : 'Gaze drifted frequently'})` : 'Unable to detect reliably'}
- Posture Alignment: ${metrics.avgPostureScore !== null ? `${metrics.avgPostureScore}% (${metrics.avgPostureScore >= 70 ? 'Upright professional posture' : 'Slouching detected'})` : 'Unable to detect'}
- Hand Gesture Expressiveness: ${metrics.avgGestureScore !== null && metrics.avgGestureScore > 0 ? `${metrics.avgGestureScore} / 100 (${metrics.avgGestureScore >= 65 && metrics.avgGestureScore <= 85 ? 'Controlled, natural hand gestures' : metrics.avgGestureScore > 85 ? 'Excessive / restless gestures detected' : 'Hands mostly resting in camera view'})` : 'Hands not visible during arguments (Excluded from scoring)'}
- Facial Stability & Composure: ${metrics.avgStabilityScore !== null ? `${metrics.avgStabilityScore} / 100` : 'Unable to detect'}
- Observed Stress Level: ${metrics.dominantStress || 'Low'} Composure` : `- Camera Status: Camera was inactive during this discussion.
- Honest Notice: Non-verbal metrics omitted from scoring. Verbal and content criteria evaluated independently.`}

## D. KEY STRENGTHS & CRITICAL IMPROVEMENT ROADMAP
### Identified Strengths:
- ${rb.contentRelevance.score >= 18 ? 'Targeted understanding of the core discussion theme.' : 'Attempted to address the assigned topic.'}
- ${rb.fluency.score >= 11 ? 'Demonstrated clear speaking pace with minimal hesitation.' : 'Spoke clearly with intelligible pronunciation.'}
- ${rb.argumentQuality.score >= 14 ? 'Constructed analytical arguments with cause-and-effect reasoning.' : 'Contributed identifiable opinions to the group discussion.'}

### Priority Growth Areas:
- ${metrics.userTurns < 3 ? `Increase turn frequency: Speaking only ${metrics.userTurns} time${metrics.userTurns === 1 ? '' : 's'} is a disqualifier in campus GDs. Target 3-4 structured entries.` : 'Deepen counter-rebuttals when peers challenge your points.'}
- ${metrics.totalUserWords < 120 ? `Expand argument depth: Delivered only ${metrics.totalUserWords} words. Aim for 140-180 words across multiple interventions.` : 'Incorporate specific market data, corporate frameworks, or Indian case studies.'}
- ${metrics.fillerWordsCount > 2 ? `Eliminate verbal crutches: Flagged ${metrics.fillerWordsCount} filler words (${metrics.fillerWordsFound.slice(0, 3).join(', ')}). Replace with silent pauses.` : 'Maintain refined vocabulary without repeating simple adjectives.'}

## E. FINAL SKILL SCORECARD
- 1. Content Relevance (25 Marks): ${rb.contentRelevance.score} / 25
- 2. Argument Quality & Examples (20 Marks): ${rb.argumentQuality.score} / 20
- 3. Coherence & Organization (15 Marks): ${rb.coherence.score} / 15
- 4. Fluency & Delivery (15 Marks): ${rb.fluency.score} / 15
- 5. Vocabulary Usage (10 Marks): ${rb.vocabulary.score} / 10
- 6. Active Participation (10 Marks): ${rb.activeParticipation.score} / 10
- 7. Conciseness & Precision (5 Marks): ${rb.conciseness.score} / 5
- TOTAL SCORE: ${metrics.overallScore} / 100
- VERDICT: ${rb.performanceLevel}`;
}

/**
 * Locks programmatically calculated rubric scores into generated text
 */
function lockReportScores(reportText: string, metrics: CalculatedReportMetrics): string {
  let updated = reportText;
  const rb = metrics.rubricBreakdown;

  updated = updated.replace(/FINAL GD SCORE:\s*\d+\s*\/\s*100/gi, `FINAL GD SCORE: ${metrics.overallScore} / 100`);
  updated = updated.replace(/TOTAL SCORE:\s*\d+\s*\/\s*100/gi, `TOTAL SCORE: ${metrics.overallScore} / 100`);

  return updated;
}

/**
 * Generates the comprehensive personalized GD report with remote AI + strict deterministic rubric
 */
export async function generateComprehensiveReport(
  session: PracticeSession,
  sessionDurationSeconds: number = 0,
  liveCameraStats?: SessionLiveCameraStats
): Promise<ReportGenerationResult> {
  const metrics = computeSessionMetrics(session, sessionDurationSeconds, liveCameraStats);

  const transcriptLines = (session.entries || []).map(e =>
    `${(e as any).isAI ? (e as any).participantName || 'AI Peer' : 'Candidate'}: ${e.text}`
  ).join('\n\n');

  const prompt = `You are a Strict Senior GD Placement Evaluator assessing an Indian campus placement candidate.
Topic: "${session.topic}".

EXACT COMPUTED SCORES (DO NOT INFLATE OR CHANGE THESE MARKS):
1. Content Relevance: ${metrics.rubricBreakdown.contentRelevance.score} / 25
2. Argument Quality & Examples: ${metrics.rubricBreakdown.argumentQuality.score} / 20
3. Coherence & Organization: ${metrics.rubricBreakdown.coherence.score} / 15
4. Fluency & Delivery: ${metrics.rubricBreakdown.fluency.score} / 15
5. Vocabulary Usage: ${metrics.rubricBreakdown.vocabulary.score} / 10
6. Active Participation: ${metrics.rubricBreakdown.activeParticipation.score} / 10
7. Conciseness: ${metrics.rubricBreakdown.conciseness.score} / 5
TOTAL SCORE: ${metrics.overallScore} / 100
Performance Level: ${metrics.rubricBreakdown.performanceLevel}

Candidate Words: ${metrics.totalUserWords} words, Turns: ${metrics.userTurns}, WPM: ${metrics.wpm}, Fillers: ${metrics.fillerWordsCount}.

Full Discussion Transcript:
${transcriptLines || 'No transcript available.'}

Generate an exhaustive, realistic corporate GD report following this structure:
## FLUENT EDGE GD EVALUATION REPORT
### [EVALUATION ENGINE: Strict Corporate GD Evaluation Rubric]

## A. SESSION SUMMARY & PARTICIPATION OVERVIEW
- Topic, Category, Evaluated Placement Level, FINAL GD SCORE: ${metrics.overallScore} / 100.
- Summary of candidate's presence and contribution.

## B. STRICT SCORING RUBRIC BREAKDOWN (100 MARKS TOTAL)
Provide for each of the 7 criteria: Score, Assessment, Exact Evidence quoted from transcript, and Actionable Recommendation.

## C. NON-VERBAL & BEHAVIORAL ANALYSIS
(Reflect actual metrics: Eye Contact ${metrics.avgEyeContactPct ?? 'Unavailable'}%, Posture ${metrics.avgPostureScore ?? 'Unavailable'}%, Gestures ${metrics.avgGestureScore ?? 'Unavailable'}%)

## D. KEY STRENGTHS & CRITICAL IMPROVEMENT ROADMAP
Specific evidence-based strengths and top 3 priorities for campus placement readiness.

## E. FINAL SKILL SCORECARD
List all 7 criteria and TOTAL SCORE: ${metrics.overallScore} / 100.`;

  try {
    const aiCall = generateText(prompt);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI report generation timeout')), 6500)
    );

    const generatedText = await Promise.race([aiCall, timeout]);
    if (generatedText && generatedText.length > 350) {
      const lockedReport = lockReportScores(generatedText.trim(), metrics);
      return {
        reportText: lockedReport,
        isAiGenerated: true,
        metrics,
      };
    }
  } catch (error) {
    console.log('[AIReportGenerator] Remote AI generation skipped/timed out. Generating strict deterministic placement report.');
  }

  const deterministicReport = buildDeterministicReport(session, metrics);
  return {
    reportText: deterministicReport,
    isAiGenerated: false,
    metrics,
  };
}
