/**
 * AIParticipantManager
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines 4 distinct AI student personas and a Finite State Machine (FSM)
 * that enforces strict one-AI-speaks → candidate-responds → next-AI-speaks flow.
 *
 * FSM States:
 *   WAITING_FOR_CANDIDATE  – An AI just spoke; we are now waiting for the user.
 *   PROCESSING_CANDIDATE   – The user submitted; we are selecting the next AI.
 *   AI_RESPONDING          – One AI is currently generating / speaking. Lock held.
 *
 * Hard rules enforced by the FSM:
 *   • Only ONE AI may hold the AI_RESPONDING lock at a time.
 *   • After every AI turn the FSM transitions to WAITING_FOR_CANDIDATE.
 *   • The next AI turn is only unlocked by recordUserSpoke() (the user submitting).
 *   • No AI-to-AI chaining is permitted (shouldFireChainedAITurn always false).
 */

export type PersonalityType = 'Analytical' | 'Challenger' | 'Supportive' | 'Creative';

export interface AIParticipant {
  id: string;
  name: string;
  roleTitle: string;
  personality: PersonalityType;
  avatarColor: string;
  voiceConfig: { rate: number; pitch: number };
  description: string;
}

export type DiscussionPhase = 'opening' | 'discussion' | 'debate' | 'conclusion';

// ─── FSM State ────────────────────────────────────────────────────────────────

export type FSMState =
  | 'WAITING_FOR_CANDIDATE'
  | 'PROCESSING_CANDIDATE'
  | 'AI_RESPONDING';

let _fsmState: FSMState = 'WAITING_FOR_CANDIDATE';

export function getFSMState(): FSMState {
  return _fsmState;
}

/** Called by the practice screen when the AI finishes generating + speaking. */
export function fsmAIFinished(): void {
  _fsmState = 'WAITING_FOR_CANDIDATE';
}

/** Called by the practice screen when the AI starts generating. */
export function fsmAIStarted(): void {
  _fsmState = 'AI_RESPONDING';
}

/**
 * Returns true ONLY if it is currently safe to trigger an AI turn.
 * Guards against duplicate/simultaneous AI responses.
 */
export function canAISpeak(): boolean {
  return _fsmState === 'PROCESSING_CANDIDATE';
}

// ─── Participant Definitions ──────────────────────────────────────────────────

export const AI_PARTICIPANTS: AIParticipant[] = [
  {
    id: 'ai_1',
    name: 'Aarav',
    roleTitle: 'Analytical Thinker',
    personality: 'Analytical',
    avatarColor: '#4F46E5',
    voiceConfig: { rate: 0.95, pitch: 1.0 },
    description: 'Presents facts, data, and logical cause-effect chains.',
  },
  {
    id: 'ai_2',
    name: 'Ananya',
    roleTitle: 'Supportive Collaborator',
    personality: 'Supportive',
    avatarColor: '#059669',
    voiceConfig: { rate: 1.0, pitch: 1.05 },
    description: "Builds on others' ideas and finds common ground.",
  },
  {
    id: 'ai_3',
    name: 'Vikram',
    roleTitle: 'Critical Challenger',
    personality: 'Challenger',
    avatarColor: '#EF4444',
    voiceConfig: { rate: 1.02, pitch: 0.95 },
    description: 'Respectfully questions weak assumptions and presents counterarguments.',
  },
  {
    id: 'ai_4',
    name: 'Maya',
    roleTitle: 'Creative Innovator',
    personality: 'Creative',
    avatarColor: '#8B5CF6',
    voiceConfig: { rate: 0.98, pitch: 1.08 },
    description: 'Introduces fresh angles, analogies and thought-provoking scenarios.',
  },
];

// ─── Turn-Tracking State ──────────────────────────────────────────────────────

const speakCount: Record<string, number> = {
  ai_1: 0, ai_2: 0, ai_3: 0, ai_4: 0,
};

let _lastSpeakerId: string | undefined;
let _secondLastSpeakerId: string | undefined;

/** Full reset — call when a new session starts. */
export function resetTurnTracking(): void {
  Object.keys(speakCount).forEach(k => { speakCount[k] = 0; });
  _lastSpeakerId = undefined;
  _secondLastSpeakerId = undefined;
  // Start in PROCESSING_CANDIDATE so the OPENING welcome fires immediately
  // without requiring the user to speak first (there is nothing yet to respond to).
  _fsmState = 'PROCESSING_CANDIDATE';
}

/**
 * Bootstrap the opening AI welcome turn.
 * Only valid when the transcript is empty (session just started).
 * After the welcome the FSM transitions to WAITING_FOR_CANDIDATE normally.
 */
export function fsmBootstrapOpening(): void {
  if (_fsmState === 'WAITING_FOR_CANDIDATE') {
    _fsmState = 'PROCESSING_CANDIDATE';
  }
}

/**
 * Called by the practice screen when the user submits their response.
 * Transitions the FSM from WAITING_FOR_CANDIDATE → PROCESSING_CANDIDATE,
 * which unlocks the next AI turn exactly once.
 */
export function recordUserSpoke(): void {
  if (_fsmState === 'WAITING_FOR_CANDIDATE') {
    _fsmState = 'PROCESSING_CANDIDATE';
  }
  // If called in any other state, it is a no-op (prevents double triggers).
}

/**
 * Always returns false — no AI-to-AI chaining allowed.
 * The FSM enforces the strict one-AI → candidate → one-AI cycle instead.
 */
export function shouldFireChainedAITurn(): boolean {
  return false;
}

// ─── Discussion Phase Inference ───────────────────────────────────────────────

export function inferDiscussionPhase(
  transcript: { text: string; sender: string }[]
): DiscussionPhase {
  // Count only user (non-AI) turns for phase estimation
  const userTurns = transcript.filter(t => isUserSender(t.sender)).length;
  if (userTurns <= 1) return 'opening';
  if (userTurns <= 4) return 'discussion';
  if (userTurns <= 7) return 'debate';
  return 'conclusion';
}

function isUserSender(sender: string): boolean {
  const s = (sender || '').toLowerCase().trim();
  return s === 'candidate' || s === 'you' || s === 'user' || s === 'me' || s === 'student';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lastMessageHasQuestion(transcript: { text: string; sender: string }[]): boolean {
  if (!transcript.length) return false;
  const last = transcript[transcript.length - 1].text;
  return (
    last.trim().endsWith('?') ||
    /\b(how|why|what|do you|should we|would you|don't you|isn't it|can we)\b/i.test(last.slice(-120))
  );
}

function findChallengedParticipantId(transcript: { text: string; sender: string }[]): string | undefined {
  const last5 = transcript.slice(-5);
  for (let i = last5.length - 1; i >= 0; i--) {
    const txt = last5[i].text.toLowerCase();
    for (const p of AI_PARTICIPANTS) {
      if (
        txt.includes(p.name.toLowerCase()) &&
        /disagree|wrong|challenge|not true|push back|oppose/i.test(txt)
      ) {
        return p.id;
      }
    }
  }
  return undefined;
}

// ─── Intelligent Speaker Selection ───────────────────────────────────────────

export interface TurnSelectionContext {
  transcript: { text: string; sender: string }[];
}

export function getNextAISpeaker(context?: TurnSelectionContext): AIParticipant {
  const transcript = context?.transcript ?? [];
  const phase = inferDiscussionPhase(transcript);
  const hasQuestion = lastMessageHasQuestion(transcript);
  const challengeeId = findChallengedParticipantId(transcript);

  const recentText = transcript
    .slice(-6)
    .map(t => t.text.toLowerCase())
    .join(' ');
  const agreementCount = (
    recentText.match(/\bagree\b|\bgreat point\b|\bexactly\b|\bwell said\b|\bcompletely agree\b/g) || []
  ).length;
  const tooMuchAgreement = agreementCount >= 3;

  // Candidate pool: exclude last + second-last AI speakers to prevent ping-pong
  let candidates = AI_PARTICIPANTS.filter(
    p => p.id !== _lastSpeakerId && p.id !== _secondLastSpeakerId
  );
  if (candidates.length === 0) candidates = AI_PARTICIPANTS.filter(p => p.id !== _lastSpeakerId);
  if (candidates.length === 0) candidates = [...AI_PARTICIPANTS];

  const minTurns = Math.min(...candidates.map(c => speakCount[c.id]));

  const scores: Record<string, number> = {};
  candidates.forEach(p => {
    let score = 0;

    // Favour agents who have spoken least
    if (speakCount[p.id] === minTurns) score += 4;
    else if (speakCount[p.id] === minTurns + 1) score += 2;

    // Phase-based personality boosts
    if (phase === 'opening') {
      if (p.personality === 'Analytical') score += 2;
      if (p.personality === 'Creative') score += 1;
    }
    if (phase === 'discussion') {
      if (p.personality === 'Supportive') score += 1;
      if (p.personality === 'Creative') score += 1;
    }
    if (phase === 'debate') {
      if (p.personality === 'Challenger') score += 2;
      if (p.personality === 'Analytical') score += 1;
    }
    if (phase === 'conclusion') {
      if (p.personality === 'Supportive') score += 2;
      if (p.personality === 'Analytical') score += 1;
    }

    // After Vikram challenges → let Ananya balance
    if (_lastSpeakerId === 'ai_3' && p.id === 'ai_2') score += 3;
    // After Ananya agrees → let Vikram challenge
    if (_lastSpeakerId === 'ai_2' && p.id === 'ai_3') score += 2;
    // If discussion is all agreement → stir with Vikram
    if (tooMuchAgreement && p.personality === 'Challenger') score += 3;
    // If a question was asked → Analytical or Supportive answers best
    if (hasQuestion) {
      if (p.personality === 'Analytical') score += 2;
      if (p.personality === 'Supportive') score += 1;
    }
    // Let a challenged agent respond
    if (challengeeId && p.id === challengeeId) score += 4;

    // Small jitter to prevent full determinism
    score += Math.random() * 0.4;
    scores[p.id] = score;
  });

  candidates.sort((a, b) => scores[b.id] - scores[a.id]);
  const chosen = candidates[0];

  _secondLastSpeakerId = _lastSpeakerId;
  _lastSpeakerId = chosen.id;
  speakCount[chosen.id] = (speakCount[chosen.id] || 0) + 1;

  return chosen;
}

// ─── Personality System Prompts ───────────────────────────────────────────────

export function getPersonalityPrompt(
  personality: PersonalityType,
  phase: DiscussionPhase,
  previousSpeakerName?: string
): string {
  // Phase hints — brief, not formal instruction blocks
  const phaseHint =
    phase === 'opening'
      ? 'State your position clearly and anchor it with a specific observation or fact.'
      : phase === 'discussion'
      ? 'Build on, challenge, or extend what was just said with your own argument and reasoning.'
      : phase === 'debate'
      ? 'Hold your position with specific evidence and directly address the opposing argument.'
      : 'Bring your key argument to a clear conclusion and suggest what should happen next.';

  const addressHint = previousSpeakerName
    ? `You can mention ${previousSpeakerName} by name when it makes your argument more direct — but only when it sounds natural.`
    : '';

  switch (personality) {
    case 'Analytical':
      return `Your role: Aarav — logical, data-driven, structured thinker.
${phaseHint}
${addressHint}

How you speak:
• State your position first, then explain the reasoning behind it ("I think X because Y leads to Z").
• Support your view with a specific fact, statistic, historical case, or policy example — be concrete.
• Evaluate what others say honestly: extend it if the evidence is sound, correct it if not.
• Identify the mechanism — why something works or fails, not just that it does.
• DO NOT ask questions as your main move. Present your argument and let it make the case.
• Questions are only acceptable when a specific logical gap in someone's argument genuinely needs filling — and even then, make it brief.
• Avoid formal language like "Let us examine", "It is important to note", or "One must consider". Sound like a student, not a professor.
• 3–5 sentences. Direct and clear.`;

    case 'Challenger':
      return `Your role: Vikram — sceptical, critical, pushes back on weak reasoning.
${phaseHint}
${addressHint}

How you speak:
• Identify the specific flaw, overlooked risk, or false assumption in what was just said — name it directly.
• State why you disagree or what the real issue is, using a counter-example or evidence.
• If part of the previous argument is fair, acknowledge it briefly ("Fair point, but...") — then explain why the picture is more complicated.
• Your primary move is a counterargument or critique with evidence — NOT a question.
• Questions are only occasional ("Has this actually worked elsewhere?" counts — "What do you think?" does not).
• Avoid sweeping rhetorical questions as your main response. Make a point, back it up.
• Sound firm but not aggressive — you are sharpening the thinking, not attacking the person.
• 3–5 sentences. Punchy and grounded.`;

    case 'Supportive':
      return `Your role: Ananya — balanced, inclusive, finds common ground and builds on ideas.
${phaseHint}
${addressHint}

How you speak:
• Pick the strongest concrete point from what was just said and build on it with new information or a human-centred angle.
• When positions are polarised, offer a synthesis — explain what both sides get right and what a balanced path forward looks like.
• Add something specific: a real example, a group of people affected, a practical implication that has not been mentioned.
• DO NOT primarily ask questions — your main contribution is building the argument, not prompting others.
• Avoid hollow phrases like "great point", "I totally agree", "as has been mentioned". Say what you actually think and why.
• Reference others by name only when it genuinely strengthens your point, not as a habit.
• 3–5 sentences. Warm, substantive and direct.`;

    case 'Creative':
      return `Your role: Maya — lateral thinker, introduces fresh angles and unexpected examples.
${phaseHint}
${addressHint}

How you speak:
• Introduce ONE genuinely new angle, analogy, or reframe that nobody else has brought up — make it specific and grounded.
• Draw from real cases: a country, a company, a policy, a technology that approached a similar problem unconventionally.
• Reframe when useful — challenge the assumption baked into the question, not just the answer.
• Your primary move is presenting the new idea clearly, not asking a question about it.
• You may end with a brief, specific question to invite the group in — but only occasionally, not as a habit.
• Avoid vague or philosophical statements ("What if we looked at this differently?" is not a point — the actual different angle is).
• Sound curious and confident, not abstract or mystical.
• 3–5 sentences. Imaginative but concrete.`;

    default:
      return `You are a smart, well-prepared student in a live group discussion. State your view, back it up with a specific example or reason, and engage directly with what the previous speaker said. 3–5 natural sentences.`;
  }
}
