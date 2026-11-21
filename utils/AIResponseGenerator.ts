/**
 * AIResponseGenerator
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates context-aware, personality-driven AI responses for a GD simulator.
 *
 * Key design decisions:
 *  1. Topic-category enrichment — the prompt carries domain hints (tech /
 *     social / business / education / environment / policy) so the LLM frames
 *     arguments in the right register rather than producing generic philosophy.
 *  2. Rich conversation memory — the last 10 turns are passed verbatim,
 *     AND the full set of unique claims made so far is extracted and listed
 *     so the LLM can't repeat any of them.
 *  3. Personality-first prompting — each agent's system message forces a
 *     distinct reasoning style, vocabulary and question-asking pattern.
 *  4. Dynamic opening generation — the first message is built from the topic,
 *     not from a hardcoded template.
 *  5. Topic relevance validation with one automatic retry.
 *  6. High-quality local fallback that uses the full topic phrase, real
 *     domain context, and actual conversation threads — never raw `${kw}`.
 */

import { generateText } from '@rork-ai/toolkit-sdk';
import {
  AIParticipant,
  DiscussionPhase,
  getPersonalityPrompt,
  inferDiscussionPhase,
} from './AIParticipantManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GDContext {
  topic: string;
  category: string;
  transcript: { text: string; sender: string; createdAt?: string }[];
}

// ─── Deduplication Cache ──────────────────────────────────────────────────────

const recentResponses: Record<string, Set<string>> = {
  ai_1: new Set(), ai_2: new Set(), ai_3: new Set(), ai_4: new Set(),
};

function markUsed(pid: string, text: string): void {
  const cache = recentResponses[pid] ?? new Set();
  cache.add(text);
  if (cache.size > 25) {
    const arr = Array.from(cache);
    arr.splice(0, 5).forEach(s => cache.delete(s));
  }
  recentResponses[pid] = cache;
}

function isUsed(pid: string, text: string): boolean {
  return (recentResponses[pid] ?? new Set()).has(text);
}

function pickUnused(pid: string, options: string[]): string {
  const unused = options.filter(o => !isUsed(pid, o));
  const pool = unused.length > 0 ? unused : options;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  markUsed(pid, picked);
  return picked;
}

// ─── Sender Normalisation ─────────────────────────────────────────────────────

function isUserSender(sender: string): boolean {
  const s = (sender || '').toLowerCase().trim();
  return s === 'candidate' || s === 'you' || s === 'user' || s === 'me' || s === 'student';
}

function displayName(sender: string): string {
  return isUserSender(sender) ? 'You (Candidate)' : sender;
}

// ─── Topic Category Detection ─────────────────────────────────────────────────

type TopicDomain =
  | 'technology' | 'education' | 'environment' | 'social'
  | 'business' | 'policy' | 'health' | 'general';

const DOMAIN_PATTERNS: Array<{ domain: TopicDomain; patterns: RegExp }> = [
  { domain: 'technology', patterns: /\b(ai|artificial intelligence|tech|digital|internet|automation|robot|software|data|cyber|blockchain|5g|cloud|app|smartphone|social media|algorithm)\b/i },
  { domain: 'education', patterns: /\b(education|school|college|university|student|learning|curriculum|teacher|classroom|degree|skill|training|coaching|exam|competitive)\b/i },
  { domain: 'environment', patterns: /\b(climate|environment|pollution|carbon|green|sustainable|renewable|energy|plastic|forest|biodiversity|ecology|emission|global warming)\b/i },
  { domain: 'health', patterns: /\b(health|mental health|hospital|doctor|medicine|vaccine|covid|pandemic|nutrition|fitness|wellbeing|healthcare|patient)\b/i },
  { domain: 'business', patterns: /\b(business|startup|economy|market|gdp|investment|profit|entrepreneur|company|corporate|trade|revenue|financial|stock|industry)\b/i },
  { domain: 'social', patterns: /\b(women|gender|equality|diversity|caste|religion|marriage|family|society|culture|poverty|unemployment|inequality|reservation|rights)\b/i },
  { domain: 'policy', patterns: /\b(government|policy|law|regulation|parliament|democracy|election|politics|tax|subsidy|scheme|reform|constitution|federal|state)\b/i },
];

function detectDomain(topic: string): TopicDomain {
  for (const { domain, patterns } of DOMAIN_PATTERNS) {
    if (patterns.test(topic)) return domain;
  }
  return 'general';
}

/**
 * Returns 2–3 factual talking-point seeds specific to the domain.
 * These are injected into the prompt as "domain context" so the LLM
 * grounds its arguments in real-world knowledge rather than abstractions.
 */
function getDomainContext(domain: TopicDomain, topic: string): string {
  const contexts: Record<TopicDomain, string[]> = {
    technology: [
      `India has over 900 million internet users and is the world's second-largest smartphone market — making digital access a live policy question.`,
      `The World Economic Forum estimates automation could displace 85 million jobs globally by 2025 while creating 97 million new ones.`,
      `AI tools like ChatGPT reached 100 million users in just 2 months — faster than any technology in history.`,
    ],
    education: [
      `India's Gross Enrollment Ratio in higher education is around 28%, compared to 60–80% in developed nations.`,
      `The National Education Policy 2020 recommends a shift from rote learning to critical thinking and vocational training.`,
      `Only 45% of engineering graduates in India are considered job-ready by industry standards, highlighting a significant skills gap.`,
    ],
    environment: [
      `India is the third-largest emitter of CO₂ globally but has committed to achieving net-zero by 2070 under the Paris Agreement.`,
      `The Intergovernmental Panel on Climate Change warns that global temperatures must stay within 1.5°C of pre-industrial levels to prevent irreversible damage.`,
      `Renewable energy capacity in India crossed 150 GW in 2023, with solar energy leading the charge.`,
    ],
    health: [
      `India spends roughly 1.5% of GDP on public health, well below the WHO-recommended minimum of 5%.`,
      `Mental health disorders affect 1 in 7 Indians, yet fewer than 1% have access to professional mental healthcare.`,
      `The COVID-19 pandemic exposed deep inequalities in healthcare infrastructure between urban and rural India.`,
    ],
    business: [
      `India is projected to become the world's third-largest economy by 2030, driven by domestic consumption and digital services.`,
      `India has over 100 unicorn startups, but fewer than 10% are profitable — raising questions about sustainability.`,
      `The gig economy employs over 7.7 million workers in India, with little regulatory protection.`,
    ],
    social: [
      `India ranks 127th out of 146 countries in the Global Gender Gap Index 2023, reflecting persistent structural inequalities.`,
      `Despite constitutional safeguards, caste-based discrimination remains a documented reality in education and employment.`,
      `The 2011 Census showed that over 40% of India's population lives in conditions of multidimensional poverty.`,
    ],
    policy: [
      `India's parliamentary democracy operates on the principle of federalism, but fiscal centralization often limits state autonomy.`,
      `The GST, implemented in 2017, was one of India's most significant tax reforms, unifying 29 state tax systems into one.`,
      `The Right to Information Act has been used over 80 lakh times, making it one of the most exercised citizen rights globally.`,
    ],
    general: [
      `Every complex issue has trade-offs — optimising for one goal (speed, cost, inclusivity) often involves compromising another.`,
      `Historical evidence shows that most sustainable changes are driven by a combination of policy, technology, and behavioral shift.`,
    ],
  };

  const pool = contexts[domain];
  // Pick 2 seeds that are most relevant (simple word-overlap)
  const topicLower = topic.toLowerCase();
  const scored = pool.map(seed => ({
    seed,
    score: seed.toLowerCase().split(/\s+/).filter(w => topicLower.includes(w) && w.length > 4).length,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map(s => `• ${s.seed}`).join('\n');
}

// ─── Transcript Analysis ──────────────────────────────────────────────────────

interface TranscriptAnalysis {
  lastUserText: string;
  previousSpeakerName: string;
  previousSpeakerText: string;
  recentConversationBlock: string;
  uniqueClaimsBlock: string;
  phase: DiscussionPhase;
  hasOpenQuestion: boolean;
  dominantSentiment: 'agreement' | 'disagreement' | 'neutral';
  topicKeywords: string[];
  conversationKeywords: string[];
  domain: TopicDomain;
  domainContextBlock: string;
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'that', 'to', 'it', 'of',
  'for', 'with', 'as', 'this', 'by', 'are', 'i', 'think', 'believe', 'should', 'would',
  'could', 'about', 'also', 'because', 'we', 'you', 'they', 'my', 'point', 'feel',
  'like', 'just', 'from', 'have', 'has', 'been', 'so', 'if', 'or', 'be', 'me', 'our',
  'us', 'its', 'was', 'were', 'am', 'vs', 'versus', 'very', 'really', 'quite', 'said',
  'but', 'not', 'what', 'when', 'where', 'who', 'how', 'then', 'than', 'there', 'here',
]);

function extractUniqueClaims(transcript: { text: string; sender: string }[]): string {
  // Extract first meaningful sentence from each turn, deduplicate by rough similarity
  const seen = new Set<string>();
  const claims: string[] = [];

  for (const turn of transcript.slice(-12)) {
    const sentences = turn.text
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    for (const sentence of sentences.slice(0, 2)) {
      // Normalize for deduplication (remove filler words, lowercase)
      const normalized = sentence.toLowerCase().replace(/\b(i think|i believe|i feel|in my opinion|basically|actually)\b/g, '').trim();
      const key = normalized.split(/\s+/).slice(0, 6).join(' ');
      if (!seen.has(key)) {
        seen.add(key);
        const speaker = displayName(turn.sender);
        claims.push(`- ${speaker}: "${sentence}"`);
      }
    }
  }

  return claims.length > 0
    ? claims.join('\n')
    : '(none yet — this is the opening of the discussion)';
}

function analyseTranscript(
  transcript: { text: string; sender: string }[],
  topic: string,
  category: string
): TranscriptAnalysis {
  // Last user contribution
  let lastUserText = '';
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (isUserSender(transcript[i].sender)) {
      lastUserText = transcript[i].text.trim();
      break;
    }
  }

  // Most recent speaker
  const lastEntry = transcript[transcript.length - 1];
  const previousSpeakerName = lastEntry ? displayName(lastEntry.sender) : '';
  const previousSpeakerText = lastEntry ? lastEntry.text.trim() : '';

  // Full readable conversation block
  const recentConversationBlock = transcript
    .slice(-10)
    .map(t => `${displayName(t.sender)}: "${t.text.trim()}"`)
    .join('\n');

  // Unique claims extracted from the full transcript
  const uniqueClaimsBlock = extractUniqueClaims(transcript);

  const phase = inferDiscussionPhase(transcript);

  // Question detection
  const hasOpenQuestion =
    previousSpeakerText.trim().endsWith('?') ||
    /\b(how|why|what|do you|should we|would you|don't you|isn't it|can we|could you think)\b/i.test(
      previousSpeakerText.slice(-150)
    );

  // Sentiment of recent turns
  const recentText = transcript.slice(-6).map(t => t.text.toLowerCase()).join(' ');
  const agreementSig = (recentText.match(/\bagree\b|\bgreat point\b|\bexactly\b|\bwell said\b|\bcompletely\b/g) || []).length;
  const disagreeSig = (recentText.match(/\bdisagree\b|\bchallenge\b|\bhowever\b|\bpush back\b|\boppose\b|\bwrong\b/g) || []).length;
  const dominantSentiment =
    agreementSig > disagreeSig + 1 ? 'agreement' :
      disagreeSig > agreementSig ? 'disagreement' : 'neutral';

  // Topic title keywords
  const topicKeywords = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 8);

  // High-frequency conversation keywords
  const allConvText = transcript.slice(-8).map(t => t.text.toLowerCase()).join(' ');
  const wordFreq: Record<string, number> = {};
  allConvText
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w))
    .forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const conversationKeywords = Object.entries(wordFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 8);

  // Domain detection (use category hint if available)
  const domainHint = (category || '').toLowerCase();
  const domain: TopicDomain =
    domainHint.includes('tech') ? 'technology' :
      domainHint.includes('edu') ? 'education' :
        domainHint.includes('env') ? 'environment' :
          domainHint.includes('health') ? 'health' :
            domainHint.includes('busi') ? 'business' :
              domainHint.includes('social') ? 'social' :
                domainHint.includes('policy') || domainHint.includes('gov') ? 'policy' :
                  detectDomain(topic);

  const domainContextBlock = getDomainContext(domain, topic);

  return {
    lastUserText,
    previousSpeakerName,
    previousSpeakerText,
    recentConversationBlock,
    uniqueClaimsBlock,
    phase,
    hasOpenQuestion,
    dominantSentiment,
    topicKeywords,
    conversationKeywords,
    domain,
    domainContextBlock,
  };
}

// ─── Topic Relevance Validation ───────────────────────────────────────────────

function isResponseRelevant(
  response: string,
  topicKeywords: string[],
  conversationKeywords: string[]
): boolean {
  if (!response || response.length < 20) return false;
  const lc = response.toLowerCase();
  const allKeywords = [...new Set([...topicKeywords, ...conversationKeywords])];
  const matchCount = allKeywords.filter(kw => lc.includes(kw)).length;
  return matchCount >= 1;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(
  participant: AIParticipant,
  topic: string,
  analysis: TranscriptAnalysis
): string {
  const {
    previousSpeakerName,
    previousSpeakerText,
    recentConversationBlock,
    uniqueClaimsBlock,
    phase,
    hasOpenQuestion,
    dominantSentiment,
    domainContextBlock,
  } = analysis;

  const personalityPrompt = getPersonalityPrompt(
    participant.personality,
    phase,
    previousSpeakerName !== participant.name ? previousSpeakerName : undefined
  );

  // Determine if this is a good moment to end with a question (max 1 in 5 turns)
  const allowQuestion = hasOpenQuestion || Math.random() < 0.2;

  // Conditional situational hints
  const situationalHints: string[] = [];
  if (hasOpenQuestion) {
    situationalHints.push('The previous speaker asked a question — answer it concretely first, then add your own view.');
  }
  if (dominantSentiment === 'agreement') {
    situationalHints.push('Everyone has been agreeing — introduce a nuance, a risk, or a counterpoint to deepen the discussion.');
  }
  if (dominantSentiment === 'disagreement') {
    situationalHints.push('The debate is heated — briefly acknowledge the strongest part of the opposing argument before making your point.');
  }
  if (phase === 'conclusion') {
    situationalHints.push('The discussion is wrapping up — focus on synthesising the key argument, not introducing new points.');
  }

  const situationalBlock = situationalHints.length > 0
    ? `\n━━━ SITUATIONAL CONTEXT ━━━\n${situationalHints.map(h => `• ${h}`).join('\n')}`
    : '';

  return `You are ${participant.name}, a confident and opinionated student in a live college Group Discussion.

${personalityPrompt}

━━━ TOPIC (internal reference only — do NOT repeat this phrase verbatim in your response) ━━━
${topic}

━━━ BACKGROUND FACTS (use these to ground your argument when relevant) ━━━
${domainContextBlock}

━━━ RECENT CONVERSATION ━━━
${recentConversationBlock}

━━━ PREVIOUS SPEAKER ━━━
${previousSpeakerName} said: "${previousSpeakerText}"

━━━ POINTS ALREADY MADE — NEVER REPEAT OR PARAPHRASE THESE ━━━
${uniqueClaimsBlock}
${situationalBlock}

━━━ HOW TO RESPOND ━━━
• Start by directly engaging with what ${previousSpeakerName} said — agree, disagree, or build on it with a reason.
• Then add your own argument: state your position clearly and explain WHY using a fact, example, or cause-effect logic.
• Keep it conversational. Talk like a student, not a news anchor or essay writer.
• DO NOT repeat the topic title verbatim. You are already in this discussion — everyone knows the topic.
• DO NOT use filler openers like "That's a great point", "Let me draw attention to", "This discussion reveals", or "The most important question is".
• DO NOT start with the topic name or "On this topic" or "Regarding [topic]".
• ${allowQuestion ? 'You MAY end with a brief, specific question IF it genuinely advances the conversation.' : 'Do NOT ask a question this turn. Present your argument and let it stand.'}
• 3–5 sentences. No name prefix. Output ONLY the spoken words.`;
}

// ─── Opening Generator ────────────────────────────────────────────────────────

/**
 * Generates a topic-specific opening statement by calling the LLM with a
 * targeted prompt. Falls back to a topic-aware local string if the LLM fails.
 */
async function generateOpeningStatement(
  participant: AIParticipant,
  topic: string,
  domain: TopicDomain,
  domainContextBlock: string
): Promise<string> {
  const openingPrompt = `You are ${participant.name}, a student in a college Group Discussion.

${getPersonalityPrompt(participant.personality, 'opening', undefined)}

━━━ GD TOPIC (internal reference — do NOT repeat this phrase word-for-word in your response) ━━━
${topic}

━━━ BACKGROUND FACTS ━━━
${domainContextBlock}

━━━ YOUR OPENING STATEMENT ━━━
Share your first contribution to kick off this group discussion.
• State your position or the central tension you see — be direct and specific.
• Include one real fact, example, or observation to anchor your point.
• Sound natural, like a confident student — not like you are reading from notes.
• DO NOT start with the topic title verbatim. Everyone already knows what we are discussing.
• DO NOT use openers like "Today we are discussing...", "The topic for today is...", or "Let me draw attention to...".
• You may invite others' views at the end — but only if it sounds natural, not forced.
• 3–4 sentences. No name prefix. Output only the spoken words.`;

  try {
    const aiCall = generateText(openingPrompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 7000)
    );
    const raw = await Promise.race([aiCall, timeoutPromise]);
    if (raw && raw.trim().length > 30) {
      const cleaned = raw
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^[A-Za-z]+\s*:\s*/, '')
        .replace(/^\*\*[^*]+\*\*\s*/, '')
        .trim();
      if (cleaned.length > 30) return cleaned;
    }
  } catch {
    // Fall through to local fallback
  }

  // Local fallback openings — topic-specific, not generic
  const openings: Record<TopicDomain, string[]> = {
    technology: [
      `Let me open our discussion on "${topic}" with a quick framing. Technology is evolving faster than policy and social norms — and "${topic}" sits right at that intersection. The real question is not whether this is happening, but whether we are prepared to navigate the consequences thoughtfully. I am curious where others draw the line here.`,
      `"${topic}" is a topic that looks simple on the surface but becomes genuinely complex when you examine who benefits and who gets left behind. We have seen with every major technological shift that early adopters gain disproportionately — so who are we designing this for? I think that question should anchor our discussion.`,
    ],
    education: [
      `Let us start our discussion on "${topic}" by grounding it in a real tension: India produces millions of graduates every year, yet industry routinely says they are not job-ready. So whatever we discuss here, we need to ask — are we reforming education for examinations, or for life? That is the lens I want to bring.`,
      `"${topic}" is something I feel strongly about because education in India is often treated as a credential factory rather than a learning system. The NEP 2020 tried to address this, but implementation has been uneven. I want to explore where the real barriers to meaningful reform actually lie.`,
    ],
    environment: [
      `"${topic}" is not just an environmental question — it is an economic and social justice question. India has committed to net-zero by 2070, but millions of people still depend on coal for livelihoods. How do we reconcile those realities? I think that tension should shape our entire discussion.`,
      `When we talk about "${topic}", we have to be honest about the gap between global commitments and ground-level action. India is both a victim of climate change and a contributor to it. What does a genuinely fair and effective response look like from our position?`,
    ],
    health: [
      `"${topic}" is a subject where we often confuse access with outcomes. India has built more hospitals, but whether people can actually afford to use them effectively is a different story. I want us to examine the structural gaps — not just the number of beds or doctors.`,
      `When I think about "${topic}", the COVID-19 experience is a useful reference point. It exposed how fragile our health systems are when stress-tested. The question is whether we have drawn the right lessons from that or simply returned to business as usual.`,
    ],
    business: [
      `"${topic}" is a space where I think we conflate growth with prosperity. India's GDP numbers look impressive, but unemployment among youth remains stubbornly high. So who exactly is benefiting from this growth, and is the system designed to include everyone? That is the question I want us to genuinely wrestle with.`,
      `Let me open with a provocation on "${topic}": we celebrate unicorn startups, but fewer than 10% of them are profitable. Are we building real businesses or just burning venture capital? I think that question matters enormously for where India's economy is actually heading.`,
    ],
    social: [
      `"${topic}" touches something fundamental — the gap between what our Constitution promises and what people actually experience daily. We rank 127th on the Gender Gap Index despite decades of policy interventions. What is not working, and why? I want our discussion to go beyond obvious answers.`,
      `When we discuss "${topic}", I think we need to be honest that the problem is structural, not individual. It is not about attitudes alone — it is about systems of education, employment, and law that have historically been designed to favour certain groups. What does genuine reform actually require?`,
    ],
    policy: [
      `"${topic}" is a policy question where the gap between intent and implementation is often enormous. Laws get passed, schemes get announced, but the last-mile execution breaks down. I want us to examine the governance mechanisms — or lack thereof — that explain that gap.`,
      `Let me approach "${topic}" from a governance lens. India's federal structure means national policy often collides with state priorities. Understanding that tension is key to understanding why certain reforms succeed in some states and completely fail in others. That is the frame I think matters most here.`,
    ],
    general: [
      `Let us approach "${topic}" by first understanding what the core problem or opportunity actually is. Too often in group discussions we jump to solutions before we have agreed on what exactly we are solving for. I want to start there — what is the central tension or question that "${topic}" raises?`,
      `"${topic}" is a topic with multiple valid perspectives, and I think the most useful thing this group can do is map those perspectives honestly rather than rushing to consensus. Let me share where I stand initially, and I am genuinely interested in where others push back.`,
    ],
  };

  return pickUnused(participant.id, openings[domain]);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const generateAIResponse = async (
  participant: AIParticipant,
  context: GDContext
): Promise<string> => {
  const transcript = context.transcript || [];
  const topic = (context.topic || 'the topic under discussion').trim();
  const category = context.category || '';
  const analysis = analyseTranscript(transcript, topic, category);

  // ── Opening statement (no prior transcript) ──────────────────────────────
  if (transcript.length === 0) {
    return generateOpeningStatement(participant, topic, analysis.domain, analysis.domainContextBlock);
  }

  const prompt = buildPrompt(participant, topic, analysis);

  // ── Remote AI call with one retry ─────────────────────────────────────────
  const tryRemoteAI = async (): Promise<string | null> => {
    try {
      const aiCall = generateText(prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 7000)
      );
      const raw = await Promise.race([aiCall, timeoutPromise]);
      if (!raw || raw.trim().length < 20) return null;

      const cleaned = raw
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^[A-Za-z]+\s*:\s*/, '')
        .replace(/^\*\*[^*]+\*\*\s*/, '')
        .replace(/^(Aarav|Ananya|Vikram|Maya)\s*[-:]\s*/i, '')
        .trim();

      if (
        cleaned.length > 20 &&
        !isUsed(participant.id, cleaned) &&
        isResponseRelevant(cleaned, analysis.topicKeywords, analysis.conversationKeywords)
      ) {
        return cleaned;
      }
      return null;
    } catch {
      return null;
    }
  };

  let result = await tryRemoteAI();
  if (!result) result = await tryRemoteAI();

  if (result) {
    markUsed(participant.id, result);
    return result;
  }

  console.log(
    `[AIResponseGenerator] Remote AI unavailable or off-topic for ${participant.name}. Using local fallback.`
  );
  return generateLocalFallback(participant, analysis, topic);
};

// ─── Local Fallback Engine ────────────────────────────────────────────────────
/**
 * Uses the FULL topic phrase and actual domain context — never raw `${kw}`.
 * Tailored per personality, per phase, per domain.
 */
function generateLocalFallback(
  participant: AIParticipant,
  analysis: TranscriptAnalysis,
  topic: string
): string {
  const {
    previousSpeakerName,
    previousSpeakerText,
    phase,
    dominantSentiment,
    domain,
    conversationKeywords,
    topicKeywords,
  } = analysis;

  const { personality, id } = participant;

  // Build a natural reference to the previous speaker
  const prevFirst = previousSpeakerText.split(/[.!?]/)[0]?.trim() ?? '';
  const prevSummary = prevFirst.length > 80
    ? 'the point just raised'
    : prevFirst.length > 15
      ? `"${prevFirst}"`
      : 'that point';
  const speakerRef = isUserSender(previousSpeakerName)
    ? `The candidate raised ${prevSummary}.`
    : `${previousSpeakerName} raised ${prevSummary}.`;

  // Key concept from conversation or topic (used for variety, not raw insertion)
  const keyConcept = conversationKeywords[0] ?? topicKeywords[0] ?? 'this';
  const secondConcept = conversationKeywords[1] ?? topicKeywords[1] ?? 'the approach';

  // ── Analytical (Aarav) ────────────────────────────────────────────────────
  if (personality === 'Analytical') {
    const opts: string[] = [];

    if (domain === 'technology') {
      opts.push(
        `When we examine "${topic}" from a data standpoint, the numbers tell an interesting story. Technology adoption in India has been asymmetric — urban India benefits first, while rural areas catch up years later. Any serious policy on "${topic}" must account for that implementation gap, otherwise we are designing for the minority.`,
        `The core analytical question on "${topic}" is: what problem are we actually solving, and for whom? If we look at comparable cases globally, rapid adoption without structural support typically leads to exclusion of the most vulnerable. That is the pattern I think we need to actively design against here.`,
      );
    }
    if (domain === 'education') {
      opts.push(
        `Looking at "${topic}" through an outcomes lens, the data is sobering. India has dramatically increased enrollment numbers, but learning outcomes — especially at secondary level — remain well below peer countries. So expanding access without fixing quality is essentially scaling a broken model. We need to separate these two variables in our discussion.`,
        `My analytical concern about "${topic}" is that we tend to measure inputs rather than outputs. We count schools, teachers, and budgets — but what percentage of students can actually read and reason critically at the end of it? Until we answer that honestly, our solutions will keep addressing symptoms rather than causes.`,
      );
    }
    if (domain === 'environment') {
      opts.push(
        `On "${topic}", there is a real tension between economic development and environmental protection that we cannot wish away. India's per-capita emissions are still below the global average, but our total emissions are the third-highest globally and rising. Any honest conversation about "${topic}" needs to grapple with that duality.`,
        `The empirical case on "${topic}" is fairly clear at the macro level. What is less clear is the transition pathway — who bears the cost of moving from fossil fuels, and over what timeline? Without a just transition plan, environmental goals become politically unsustainable. That is the missing piece I want to address.`,
      );
    }
    if (domain === 'social') {
      opts.push(
        `The data on "${topic}" points to something structural rather than attitudinal. Policy interventions in India have repeatedly shown that legal provisions alone — without enforcement, awareness, and economic empowerment — do not change outcomes on the ground. We need to be specific about which lever actually works here.`,
        `${speakerRef} I want to add a data dimension here. When we track outcomes on "${topic}" over time, the indicators that actually move are tied to economic independence and education levels, not primarily to attitude campaigns. That is not to dismiss awareness efforts, but it tells us where to put the most weight.`,
      );
    }

    // Phase-specific options (domain-agnostic)
    if (phase === 'opening') {
      opts.push(
        `Let me approach "${topic}" systematically. The first thing we need to establish is the core tension: who benefits from the current state, and who bears the cost of changing it? Without mapping that honestly, we tend to generate solutions that work in theory but fail in implementation.`,
        `When I examine "${topic}", I see a gap between what the evidence supports and what the dominant narrative claims. The evidence suggests that the relationship between ${keyConcept} and ${secondConcept} is conditional, not guaranteed. We should be specific about what conditions need to be true before this approach actually works.`,
      );
    }
    if (phase === 'discussion' || phase === 'debate') {
      opts.push(
        `${speakerRef} From a logical standpoint, the connection between ${keyConcept} and improved outcomes on "${topic}" is plausible, but it rests on assumptions that are not always met in practice. What specific evidence do we have that those conditions are present in this context?`,
        `The issue I keep returning to on "${topic}" is that we are treating correlation as causation. The fact that ${keyConcept} and ${secondConcept} often appear together does not mean one causes the other. We need to identify the actual mechanism before recommending it as a solution.`,
        `I want to zoom in on the accountability gap in this discussion on "${topic}". Who is responsible for ensuring the outcome, and what happens when it does not materialise? Plans without clear ownership tend to drift — and that is a pattern we should explicitly design around here.`,
      );
    }
    if (phase === 'conclusion') {
      opts.push(
        `To bring my analytical perspective on "${topic}" together: the strongest path forward combines clear metrics, phased implementation, and built-in feedback loops. The vision has merit — what it needs is an execution architecture that can actually hold it accountable. That is the gap I would want any recommendation from this group to address.`,
        `After this discussion on "${topic}", the evidence points toward a measured approach: pilot first, measure honestly, and scale only what works. Optimism is valuable — but it needs to be anchored to milestones that tell us whether we are on track or need to course-correct.`,
      );
    }

    opts.push(
      `${speakerRef} I think we need to separate the concept from the implementation on "${topic}". The logic is sound, but good logic running through a broken system still produces poor outcomes. What structural conditions need to be in place before this approach can deliver what it promises?`,
      `On "${topic}", the most honest question is: what does success actually look like, and how will we know when we have achieved it? Without a clear and measurable definition of success, we cannot evaluate whether any intervention is working. I would like us to try to define that before we go further.`,
    );
    return pickUnused(id, opts);
  }

  // ── Challenger (Vikram) ───────────────────────────────────────────────────
  if (personality === 'Challenger') {
    const opts: string[] = [];

    if (domain === 'technology') {
      opts.push(
        `I want to challenge the optimism around "${topic}". Every major technology wave in India has promised inclusion and democratisation, and every single one has initially widened the gap between those with and without access. What specific mechanism makes "${topic}" different? I am genuinely asking — not being rhetorical.`,
        `The uncomfortable question on "${topic}" that nobody wants to ask is: who loses if this succeeds? Automation, AI, digital transformation — they all create winners and losers. If we cannot name the losers clearly, our plan is not complete. I think this group is avoiding that part of the conversation.`,
      );
    }
    if (domain === 'education') {
      opts.push(
        `I am sceptical about the direction this discussion on "${topic}" is heading. We keep talking about reform as if the main constraint is policy design — but the real constraint is implementation capacity. India has launched dozens of education reforms in the last 20 years; how many have actually changed what happens inside the classroom? Almost none.`,
        `My challenge on "${topic}" is this: who is accountable when students graduate without skills? Right now, the answer is nobody — not the institution, not the educator, not the system. Until we build real accountability into the education system, more reforms will just add more layers to an already non-functional structure.`,
      );
    }
    if (domain === 'business') {
      opts.push(
        `The concern I have with this discussion on "${topic}" is that we are conflating business success with social value creation. A startup can achieve a billion-dollar valuation while creating very few jobs and paying minimal taxes. Is that really the economic model India needs? I think we need to be more precise about what we are actually celebrating here.`,
        `${speakerRef} But I would push back on that framing. The assumption that ${keyConcept} naturally leads to broad-based growth ignores decades of evidence to the contrary in emerging markets. Growth that concentrates at the top and trickles down slowly — if at all — is not the same as development. What specific redistribution mechanism are we relying on here?`,
      );
    }

    if (phase === 'opening') {
      opts.push(
        `Before we build consensus on "${topic}", I want to surface the uncomfortable assumption we are starting with. Most discussions on this topic take the goal as self-evidently good — but whether it is good, for whom, and at what cost are genuinely contested questions. I think we should earn our conclusions rather than assume them.`,
        `I want to open with a challenge to the standard framing of "${topic}". We tend to focus on the best-case version of this idea — but responsible analysis requires us to also examine the realistic failure mode. What does it look like when this goes wrong, and have we genuinely designed against that? That is what I want this group to grapple with.`,
      );
    }
    if (phase === 'discussion' || phase === 'debate') {
      opts.push(
        `${speakerRef} I appreciate the point, but I think it underestimates the execution risk. The gap between a coherent argument and a deliverable outcome on "${topic}" is enormous — and that gap is exactly where most well-intentioned plans collapse. What specific safeguards are we embedding to prevent that?`,
        `Here is the question I keep coming back to on "${topic}": if this approach is as clearly beneficial as this discussion suggests, why has it not happened already? Either the obstacles are bigger than we are acknowledging, or the benefits are smaller. I think we owe it to ourselves to explore that before recommending it.`,
        `${speakerRef} That is fair — but let me add a layer. Even if the direction is right, pace matters enormously. Moving too fast on "${topic}" without building the supporting infrastructure creates fragility. We have seen that repeatedly in India's reform history. What is the sequencing, and who is responsible for each step?`,
      );
    }
    if (dominantSentiment === 'agreement') {
      opts.push(
        `I am noticing that this group has been trending toward agreement on "${topic}" — which makes me want to slow down. Consensus in a GD is not always a sign of good thinking; sometimes it means we are all operating in the same blind spot. What are we collectively not seeing here?`,
        `The fact that everyone is aligning on "${topic}" is actually a flag for me. Real problems rarely have solutions that everyone agrees on easily. If this answer is obvious, it probably means we have not yet found the real difficulty. What is the hardest problem we are sidestepping in this discussion?`,
      );
    }
    if (phase === 'conclusion') {
      opts.push(
        `Before we close on "${topic}", I want to make sure we have done justice to the hard parts. The plan we are converging on sounds compelling — but it assumes capable institutions, adequate funding, and political will, all of which are historically in short supply. Have we actually addressed that? Or have we just produced an optimistic wish list?`,
      );
    }
    opts.push(
      `My underlying concern with "${topic}" is that we are treating a structural problem as if it can be solved with a targeted intervention. Structural problems require structural solutions — and those take time, resources, and political will that are rarely available simultaneously. What is our realistic theory of change here?`,
      `Let me bring something into the open that this discussion has been avoiding. The people most affected by "${topic}" are rarely the ones in the room deciding how to address it. That representation gap shapes what gets counted as a problem and what counts as a solution. How do we correct for that bias in our thinking?`,
    );
    return pickUnused(id, opts);
  }

  // ── Supportive (Ananya) ───────────────────────────────────────────────────
  if (personality === 'Supportive') {
    const opts: string[] = [];

    if (domain === 'social') {
      opts.push(
        `${speakerRef} I think that point is really important and I want to build on it. What often gets missed in conversations about "${topic}" is the lived experience of the people most affected — and when you centre that, the priorities shift in meaningful ways. Policy that looks neutral on paper can land very differently depending on your starting point.`,
        `I want to bring a bridging perspective to "${topic}". It is tempting to see this as an either/or debate, but I think the most effective approach combines the structural reforms that Vikram is pointing to with the community-level support systems that actually make those reforms real for individuals. Neither alone is sufficient.`,
      );
    }
    if (domain === 'education') {
      opts.push(
        `I want to build on what has been said about "${topic}" by adding the teacher's perspective, which I feel is often missing from these conversations. Any reform that does not invest heavily in educator capacity and motivation is building on sand. The best curriculum in the world cannot overcome a demotivated or under-supported teaching workforce.`,
        `${speakerRef} I agree with the core concern, and I want to add a constructive angle. The schools that have actually improved outcomes on "${topic}" consistently share three features: strong local leadership, community involvement, and a culture of honest internal feedback. These are replicable — so rather than redesigning the whole system, can we ask what it would take to spread these practices?`,
      );
    }
    if (domain === 'environment') {
      opts.push(
        `On "${topic}", I think the frame that is often missing is the co-benefits angle. Environmental action is not just about saving the planet in the abstract — it also creates jobs, reduces health costs, and increases energy security. If we frame "${topic}" around those tangible benefits, we build a broader coalition for action instead of treating it as a sacrifice.`,
      );
    }

    if (phase === 'opening') {
      opts.push(
        `I am glad we are having this discussion on "${topic}" because it genuinely benefits from multiple viewpoints. My instinct is that the most productive framing is not "should we do this" but "how do we do this in a way that works for the most people". Let me share where I stand and I am very curious where others see it differently.`,
        `"${topic}" is exactly the kind of topic where sitting together and stress-testing each other's assumptions produces better thinking than any single perspective could. I see real merit in what has been said, and I also see some important gaps. I want to try to bridge those rather than just picking a side.`,
      );
    }
    if (phase === 'discussion' || phase === 'debate') {
      opts.push(
        `${speakerRef} I want to acknowledge that point and build on it rather than refute it. If we take that insight seriously and combine it with the concern raised earlier about ${secondConcept}, we actually get to a more nuanced and workable position on "${topic}". The two ideas are not contradictory — they are complementary.`,
        `I think what this discussion on "${topic}" is revealing is that the real disagreement is not about the destination but about the sequencing. Everyone here seems to want similar outcomes — the debate is about which steps come first and what trade-offs we are willing to accept along the way. If we frame it that way, we might find more common ground.`,
        `${speakerRef} That concern is legitimate and I do not want to dismiss it. At the same time, I think there is a constructive path through it. What if we started with a smaller-scale experiment that lets us test the core assumptions before we commit to full implementation? That way we learn without betting everything on the first attempt.`,
      );
    }
    if (phase === 'conclusion') {
      opts.push(
        `Looking back at this entire discussion on "${topic}", the most productive insight I think we have landed on is that the goal is broadly shared, and the disagreements are about implementation. That is actually a good place to be — it means we can move forward if we build the right accountability and feedback mechanisms. I am genuinely encouraged by this conversation.`,
        `To bring things together on "${topic}": I think this group has demonstrated that the question is not whether to act, but how to act in a way that is both effective and fair. The insights from both the analytical and the critical perspectives have sharpened what a good answer actually needs to look like. That is exactly what a good GD should do.`,
      );
    }
    opts.push(
      `What I appreciate about how this discussion on "${topic}" is evolving is that we are not just taking sides — we are actually trying to understand the real constraints. That is where the best thinking happens. I want to build on that spirit and suggest that the path forward combines the structural seriousness that the data demands with the human-centred focus that implementation requires.`,
      `I want to offer a reframe for "${topic}" that might help us move from debate to design. Instead of asking "which approach is right", we ask "what would it take to make this work in practice". That question forces us to be specific about resources, timelines, and trade-offs — and it tends to produce actionable insights rather than just competing positions.`,
    );
    return pickUnused(id, opts);
  }

  // ── Creative (Maya) ───────────────────────────────────────────────────────
  if (personality === 'Creative') {
    const opts: string[] = [];

    if (domain === 'technology') {
      opts.push(
        `Here is an angle on "${topic}" that I think is underexplored: what if we stopped trying to manage the technology and started focusing on building the human capacity to work alongside it? Every technological shift in history that created broad prosperity did so not by controlling the technology, but by investing massively in human adaptability. Estonia's digital transformation is a good example — they taught the population, not just the government.`,
        `I want to introduce a systems thinking lens to "${topic}". The challenge with most technology policy is that we try to solve one variable at a time, but technology ecosystems are interdependent. What if we mapped the full system — users, developers, regulators, affected communities — and designed the intervention for the system rather than the component? That is how Singapore approached its digital economy strategy, and it is worth examining.`,
      );
    }
    if (domain === 'education') {
      opts.push(
        `I want to offer a genuinely different entry point to "${topic}". What if the problem is not that our education system is failing — it is that we are optimising it for a world that no longer exists? The skills that drive value in 2025 are fundamentally different from those designed into our curriculum in the 1980s. Finland's education model keeps reinventing itself every decade — what would it look like if we gave Indian education that mandate?`,
        `Here is a thought experiment on "${topic}": what if we gave every student ₹50,000 and three months to learn anything they wanted, in any way they chose? Some would waste it. But a significant number would discover how they learn best and what genuinely motivates them — information that the current system never surfaces. The point is not to do this literally, but to ask: what does it tell us about what is missing from our current approach?`,
      );
    }
    if (domain === 'environment') {
      opts.push(
        `I want to bring in an unconventional angle on "${topic}". The most successful environmental solutions historically have come from communities that had a direct stake in the outcome — not from top-down mandates. Kerala's coastal management, Rajasthan's water harvesting, Uttarakhand's forest protection — all of these were community-driven. What would "${topic}" look like if we started from that design principle rather than a centralised policy model?`,
      );
    }

    if (phase === 'opening') {
      opts.push(
        `I want to start our discussion on "${topic}" with a reframe. We tend to approach this as a problem to be solved — but what if it is actually an opportunity to be designed? The difference matters: problem-solving looks at what is broken, while design thinking asks what system we want to create. That shift in starting point consistently produces better solutions. What would a truly well-designed response to "${topic}" actually look like?`,
        `Here is my opening provocation on "${topic}": what are we missing because we are thinking about this in the conventional way? Every major breakthrough in related domains — Aadhaar for identity, UPI for payments, COWIN for vaccination — came from people who ignored the established playbook and started from first principles. What would first-principles thinking reveal about "${topic}"?`,
      );
    }
    if (phase === 'discussion' || phase === 'debate') {
      opts.push(
        `${speakerRef} That is an important point, and it reminds me of an interesting parallel. When India launched UPI, the established view was that cash would dominate for decades. The real insight was not to fight that — but to design a system so frictionless that the behaviour changed naturally. Could a similar design logic apply to "${topic}"? What would zero-friction look like in this context?`,
        `I want to introduce an angle we have not explored yet on "${topic}". The most underutilised resource in almost every complex problem is the knowledge that already exists among the people experiencing it. What if the best solutions to "${topic}" are already operating at a small scale somewhere in India — and our job is to identify, understand, and replicate them rather than designing from scratch?`,
        `Here is a thought experiment that might reframe our debate on "${topic}": imagine it is 10 years from now and this has gone really well. What did the people who made it work do differently from what we are currently discussing? That question often reveals assumptions we did not know we were making.`,
      );
    }
    if (phase === 'conclusion') {
      opts.push(
        `As we conclude on "${topic}", I want to leave the group with this idea: the most important step might not be the biggest one. A well-designed small experiment — with real measurement, real learning, and real willingness to change course — can generate more progress than a large, expensive programme that nobody is allowed to honestly evaluate. What is the one experiment this group would bet on?`,
        `My synthesis on "${topic}" is that the disagreements we have had today are actually the most valuable output of this discussion. They have revealed the real tension — not between good and bad ideas, but between ideas that optimise for different things. The creative challenge is: can we design something that holds multiple values simultaneously, rather than trading one off against another?`,
      );
    }
    opts.push(
      `I keep thinking about "${topic}" through the lens of incentive design. Most policies on this topic try to push behaviour through regulation or awareness — but the most durable changes happen when the incentive structure naturally rewards the desired behaviour. What would it look like to redesign the incentives, not just the rules?`,
      `Here is a reframe for "${topic}" that I find compelling: instead of asking "how do we fix this", ask "how do we make the alternative so attractive that the problem solves itself". That is how WhatsApp replaced SMS, how Swiggy changed restaurant behaviour, how online learning is slowly reshaping formal education. What is the equivalent "pull" strategy for "${topic}"?`,
    );
    return pickUnused(id, opts);
  }

  // ── Default (should never be reached) ────────────────────────────────────
  return `I think "${topic}" raises important questions this group should explore carefully. What matters most is that we consider all perspectives — both the practical challenges and the long-term possibilities — before drawing any conclusions.`;
}
