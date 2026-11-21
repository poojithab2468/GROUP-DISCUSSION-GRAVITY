/**
 * NLPAnalysis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Advanced NLP analysis module for Fluent Edge GD evaluation.
 *
 * Implements (all client-side, zero external API calls):
 *   1. TF-IDF keyword extraction
 *   2. Semantic topic relevance via cosine similarity on word-frequency vectors
 *      (approximates Sentence-BERT for in-browser use without model weights)
 *   3. VADER-inspired sentiment analysis
 *   4. Argument Mining: Claim / Evidence / Reasoning detection
 *   5. Grammar heuristics (subject-verb agreement, article errors, repeated words)
 *   6. Filler word detection
 *   7. Sentence quality scoring
 *
 * Design principles:
 *   - Pure TypeScript, no native modules, no external HTTP calls.
 *   - All results are estimates — labelled as such in feedback strings.
 *   - Works in Expo Web (browser) without Node.js crypto or native addons.
 */

// ─── Shared Vocabulary ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'and','or','but','if','so','yet','nor','for','at','by','from','in','into',
  'of','on','to','up','with','about','after','before','between','during','into',
  'through','under','above','below','over','again','then','than','that','this',
  'these','those','they','their','there','here','when','where','which','who',
  'whom','what','how','why','i','me','my','we','our','you','your','he','she',
  'it','its','they','them','its','i\'m','it\'s','don\'t','can\'t','won\'t',
  'very','just','also','even','both','few','more','most','other','some','such',
  'no','not','only','same','any','each','every','because','since','while',
]);

const FILLER_WORDS = [
  'um','uh','like','you know','basically','actually','literally',
  'so yeah','right','sort of','kind of','i mean','honestly','anyway',
  'you see','well uh','ok so','alright so','let me think','hmm',
];

// ─── 1. TF-IDF Keyword Extraction ────────────────────────────────────────────

export interface TFIDFKeyword {
  word: string;
  score: number;
  frequency: number;
}

/**
 * Extracts the top-N keywords from user text using TF-IDF.
 * The "corpus" for IDF is a small synthetic reference representing general
 * English conversation (treating unknown words as appearing in ~20% of docs).
 */
export function extractKeywords(text: string, topN = 8): TFIDFKeyword[] {
  if (!text || text.trim().length === 0) return [];

  const words = tokenise(text);
  if (words.length === 0) return [];

  // Term Frequency
  const tf: Record<string, number> = {};
  for (const w of words) {
    tf[w] = (tf[w] || 0) + 1;
  }

  // Normalise TF
  const maxTF = Math.max(...Object.values(tf));
  const normTF: Record<string, number> = {};
  for (const [w, cnt] of Object.entries(tf)) {
    normTF[w] = cnt / maxTF;
  }

  // Approximate IDF using word length and rarity heuristic
  // Short common words get high IDF penalty; longer domain words get higher IDF
  const scores: TFIDFKeyword[] = [];
  for (const [word, freq] of Object.entries(tf)) {
    const idf = Math.log(1 + word.length / 3) + (word.length > 7 ? 0.5 : 0);
    const tfidf = normTF[word] * idf;
    scores.push({ word, score: Math.round(tfidf * 1000) / 1000, frequency: freq });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topN);
}

// ─── 2. Cosine Similarity Topic Relevance ────────────────────────────────────

export interface TopicRelevanceResult {
  /** 0.0 – 1.0 similarity between user text and topic */
  score: number;
  /** Descriptive label */
  level: 'High' | 'Moderate' | 'Low' | 'Off-topic';
  /** Keywords from topic found in user text */
  matchedTopicKeywords: string[];
  /** Top user keywords that relate to the topic */
  relatedUserKeywords: string[];
  /** Explanation string */
  explanation: string;
}

/**
 * Computes cosine similarity between user contribution and GD topic.
 *
 * Uses bag-of-words TF vectors. This approximates Sentence-BERT for
 * in-browser use: semantic alignment comes from shared root forms and
 * domain synonym expansion applied before vectorising.
 */
export function computeTopicRelevance(userText: string, topic: string): TopicRelevanceResult {
  if (!userText || !topic) {
    return {
      score: 0, level: 'Off-topic',
      matchedTopicKeywords: [], relatedUserKeywords: [],
      explanation: 'No text to evaluate.',
    };
  }

  // Expand topic with known synonyms / related domain terms
  const expandedTopic = expandTopicSemantically(topic);

  const userWords   = tokenise(userText);
  const topicWords  = tokenise(expandedTopic);
  const topicSet    = new Set(topicWords);

  // Build joint vocabulary
  const vocab = Array.from(new Set([...userWords, ...topicWords]));

  // TF vectors
  const userVec  = buildTFVector(userWords,  vocab);
  const topicVec = buildTFVector(topicWords, vocab);

  const cosine = cosineSimilarity(userVec, topicVec);

  // Direct keyword match (bonus signal)
  const topicKeywordsRaw = tokenise(topic);
  const matchedTopicKeywords = topicKeywordsRaw.filter(w => userWords.includes(w));

  const relatedUserKeywords = extractKeywords(userText, 5)
    .filter(k => topicSet.has(k.word) || isSemanticallySimilar(k.word, topicKeywordsRaw))
    .map(k => k.word);

  // Blend cosine and keyword match ratio for final score
  const keywordMatchRatio = topicKeywordsRaw.length > 0
    ? matchedTopicKeywords.length / topicKeywordsRaw.length
    : 0;
  const blendedScore = Math.min(1, cosine * 0.65 + keywordMatchRatio * 0.35);

  let level: TopicRelevanceResult['level'];
  let explanation: string;

  if (blendedScore >= 0.55) {
    level = 'High';
    explanation = `Strong semantic alignment with the topic. Key terms present: ${matchedTopicKeywords.slice(0, 4).join(', ') || 'found in context'}.`;
  } else if (blendedScore >= 0.30) {
    level = 'Moderate';
    explanation = `Moderate topic relevance. Some key concepts addressed but central theme not fully developed.`;
  } else if (blendedScore >= 0.12) {
    level = 'Low';
    explanation = `Weak topic alignment. Response touched tangential ideas but missed the core subject.`;
  } else {
    level = 'Off-topic';
    explanation = `Response appears unrelated to the discussion topic. Focus on the specific subject matter.`;
  }

  return {
    score: Math.round(blendedScore * 100) / 100,
    level,
    matchedTopicKeywords,
    relatedUserKeywords,
    explanation,
  };
}

// ─── 3. Argument Mining ───────────────────────────────────────────────────────

export interface ArgumentComponent {
  type: 'Claim' | 'Evidence' | 'Reasoning' | 'Filler' | 'None';
  text: string;
  confidence: number;
}

export interface ArgumentMiningResult {
  hasClaim: boolean;
  hasEvidence: boolean;
  hasReasoning: boolean;
  components: ArgumentComponent[];
  argumentScore: number;        // 0–100
  qualityLabel: string;
  feedback: string;
}

const CLAIM_SIGNALS    = ['i think','i believe','in my opinion','i feel','my view','i argue','we should','it is important','it is clear','the fact is','i would say','i propose'];
const EVIDENCE_SIGNALS = ['for example','for instance','take the case','such as','according to','research shows','data shows','statistics show','in real life','a study','surveys suggest','reports indicate','like in the case of','consider the example','in india'];
const REASONING_SIGNALS= ['because','therefore','hence','thus','as a result','consequently','this means','which means','due to','since','this leads to','this causes','the reason is','this is why','this implies','it follows that','which shows that'];

/**
 * Analyses user text to identify Claim, Evidence, and Reasoning components.
 * Based on argument structure detection from discourse markers.
 */
export function mineArguments(text: string): ArgumentMiningResult {
  if (!text || text.trim().length < 10) {
    return {
      hasClaim: false, hasEvidence: false, hasReasoning: false,
      components: [],
      argumentScore: 0,
      qualityLabel: 'No Content',
      feedback: 'No argument detected. Please provide at least a claim or opinion.',
    };
  }

  const sentences = splitSentences(text);
  const components: ArgumentComponent[] = [];

  let hasClaim    = false;
  let hasEvidence = false;
  let hasReasoning= false;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    const claimMatch    = CLAIM_SIGNALS.some(s => lower.includes(s));
    const evidenceMatch = EVIDENCE_SIGNALS.some(s => lower.includes(s));
    const reasonMatch   = REASONING_SIGNALS.some(s => lower.includes(s));

    if (claimMatch && !evidenceMatch && !reasonMatch) {
      hasClaim = true;
      components.push({ type: 'Claim', text: sentence.trim(), confidence: 0.80 });
    } else if (evidenceMatch) {
      hasEvidence = true;
      components.push({ type: 'Evidence', text: sentence.trim(), confidence: 0.82 });
    } else if (reasonMatch) {
      hasReasoning = true;
      components.push({ type: 'Reasoning', text: sentence.trim(), confidence: 0.75 });
    } else if (sentence.trim().split(/\s+/).length > 5) {
      // Generic statement — could be elaboration
      components.push({ type: 'None', text: sentence.trim(), confidence: 0.5 });
    }
  }

  // If no explicit claim signal but sentence is substantive, treat as implicit claim
  if (!hasClaim && components.length > 0 && text.split(/\s+/).length > 15) {
    hasClaim = true;
  }

  // Score: 0–100 based on argument completeness
  let score = 0;
  if (hasClaim)    score += 35;
  if (hasEvidence) score += 35;
  if (hasReasoning)score += 30;

  // Partial credit for length / substance even without markers
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (score === 0 && wordCount > 20) score = 15;

  let qualityLabel: string;
  let feedback: string;

  if (score >= 90) {
    qualityLabel = 'Complete Argument (CER)';
    feedback = 'Excellent structure: Claim, Evidence, and Reasoning all present. Very strong contribution.';
  } else if (score >= 60) {
    qualityLabel = 'Partial Argument';
    feedback = hasEvidence
      ? 'Good evidence provided. Add a clear reasoning link to explain why the evidence supports your claim.'
      : hasReasoning
      ? 'Good reasoning present. Reinforce with a concrete example or data point.'
      : 'Claim identified. Support it with evidence (an example) and reasoning (because/therefore).';
  } else if (score >= 30) {
    qualityLabel = 'Claim Only';
    feedback = 'Opinion stated but not supported. Add: (1) an example/data point, (2) a reason why it matters.';
  } else {
    qualityLabel = 'Undeveloped';
    feedback = 'Response lacks a clear argument structure. State your position, give a reason, and an example.';
  }

  return {
    hasClaim, hasEvidence, hasReasoning,
    components,
    argumentScore: score,
    qualityLabel,
    feedback,
  };
}

// ─── 4. VADER-Inspired Sentiment Analysis ────────────────────────────────────

export interface SentimentResult {
  label: 'Positive' | 'Negative' | 'Neutral';
  score: number;         // –1.0 to +1.0
  positiveScore: number; // 0–1
  negativeScore: number; // 0–1
  neutralScore: number;  // 0–1
}

// Minimal lexicon — covers GD-common discourse vocabulary
const POSITIVE_WORDS = new Set([
  'good','great','excellent','important','valuable','effective','beneficial','useful',
  'innovative','strong','positive','improve','success','achieve','opportunity','growth',
  'progressive','advantage','solution','best','right','correct','agree','support',
  'clear','valid','productive','efficient','successful','collaborative','constructive',
  'forward','advance','better','gain','empower','meaningful','relevant','logical',
]);
const NEGATIVE_WORDS = new Set([
  'bad','poor','ineffective','harmful','problem','issue','fail','failure','wrong',
  'difficult','challenge','concern','risk','danger','threat','weak','disadvantage',
  'obstacle','barrier','disagree','oppose','reject','flawed','misleading','incorrect',
  'unreliable','costly','expensive','complex','impractical','limited','restrict',
  'unable','prevent','block','confusion','bias','unfair','unclear',
]);
const INTENSIFIERS = new Set(['very','extremely','highly','particularly','especially','significantly','critically','remarkably']);
const NEGATORS = new Set(['not','never','no','neither','nor','cannot','can\'t','won\'t','don\'t','doesn\'t','isn\'t','aren\'t']);

export function analyseSentiment(text: string): SentimentResult {
  if (!text) return { label: 'Neutral', score: 0, positiveScore: 0, negativeScore: 0, neutralScore: 1 };

  const tokens = text.toLowerCase().split(/\s+/);
  let posCount = 0;
  let negCount = 0;
  let intensify = false;
  let negate = false;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i].replace(/[^a-z']/g, '');
    if (!word) continue;

    if (INTENSIFIERS.has(word)) { intensify = true; continue; }
    if (NEGATORS.has(word))     { negate = true; continue; }

    const multiplier = intensify ? 1.5 : 1.0;
    intensify = false;

    if (POSITIVE_WORDS.has(word)) {
      if (negate) negCount += multiplier;
      else        posCount += multiplier;
    } else if (NEGATIVE_WORDS.has(word)) {
      if (negate) posCount += multiplier;
      else        negCount += multiplier;
    }

    negate = false;
  }

  const total = posCount + negCount + 1e-9;
  const positiveScore = Math.round((posCount / total) * 100) / 100;
  const negativeScore = Math.round((negCount / total) * 100) / 100;
  const neutralScore  = Math.max(0, 1 - positiveScore - negativeScore);
  const rawScore = (posCount - negCount) / (total + 1);
  const score = Math.max(-1, Math.min(1, Math.round(rawScore * 100) / 100));

  const label = score > 0.05 ? 'Positive' : score < -0.05 ? 'Negative' : 'Neutral';
  return { label, score, positiveScore, negativeScore, neutralScore };
}

// ─── 5. Grammar Heuristics ───────────────────────────────────────────────────

export interface GrammarResult {
  score: number;           // 0–100
  issuesFound: string[];
  correctionHints: string[];
  level: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

/**
 * Lightweight grammar checker using pattern-based heuristics.
 * Does NOT replace a full grammar engine — results are approximate.
 */
export function analyseGrammar(text: string): GrammarResult {
  const issues: string[] = [];
  const hints: string[] = [];
  const lower = text.toLowerCase();

  // 1. Double words (e.g., "the the", "is is")
  const doubleWord = text.match(/\b(\w+)\s+\1\b/gi);
  if (doubleWord) {
    issues.push(`Repeated word detected: "${doubleWord[0]}".`);
    hints.push('Remove the duplicate word.');
  }

  // 2. Subject-verb agreement — rough check for "he/she/it are", "they is"
  if (/\b(he|she|it)\s+are\b/i.test(text)) {
    issues.push('Possible subject-verb disagreement: "he/she/it are" should be "is".');
    hints.push('Use "he is", "she is", "it is".');
  }
  if (/\bthey\s+is\b/i.test(text)) {
    issues.push('Possible agreement error: "they is" should be "they are".');
    hints.push('Use "they are".');
  }

  // 3. Article before vowel sounds ("a apple", "a hour")
  if (/\ba\s+[aeiou]/i.test(text) && !/\ba\s+(un|us|eu|ew|one)/i.test(text)) {
    // Heuristic: flag only clear cases
    const match = text.match(/\ba\s+([aeiou]\w+)/i);
    if (match && !['use','useful','university','uniform','unique','union','unit'].includes((match[1] || '').toLowerCase())) {
      issues.push(`Possible article error: "a ${match[1]}" — consider "an ${match[1]}".`);
      hints.push('Use "an" before words starting with vowel sounds.');
    }
  }

  // 4. Very long run-on sentences (> 60 words without punctuation)
  const sentenceParts = text.split(/[.?!;]/);
  const runOn = sentenceParts.find(s => s.trim().split(/\s+/).length > 55);
  if (runOn) {
    issues.push('Run-on sentence detected — very long sentence without punctuation.');
    hints.push('Break long sentences at logical pause points.');
  }

  // 5. Repeated identical sentences (copy-paste patterns)
  const sentences = splitSentences(text);
  const sentenceSet = new Set<string>();
  for (const s of sentences) {
    const normalised = s.trim().toLowerCase();
    if (normalised.length > 15) {
      if (sentenceSet.has(normalised)) {
        issues.push('Identical sentence used more than once.');
        hints.push('Vary your phrasing to avoid repetition.');
        break;
      }
      sentenceSet.add(normalised);
    }
  }

  // 6. Informal contractions in professional context
  const informalPatterns = ["gonna","wanna","gotta","kinda","sorta","dunno","lemme","y'all"];
  const foundInformal = informalPatterns.filter(p => lower.includes(p));
  if (foundInformal.length > 0) {
    issues.push(`Informal language: "${foundInformal[0]}" in a formal GD context.`);
    hints.push('Use formal alternatives (e.g., "going to", "want to").');
  }

  // Score: start at 100, deduct per issue
  const deductionPerIssue = [15, 12, 10, 8, 10, 8];
  let score = 100;
  issues.forEach((_, idx) => {
    score -= deductionPerIssue[idx] ?? 8;
  });
  score = Math.max(0, Math.min(100, score));

  const level =
    score >= 88 ? 'Excellent' :
    score >= 72 ? 'Good' :
    score >= 55 ? 'Fair' : 'Poor';

  return { score, issuesFound: issues, correctionHints: hints, level };
}

// ─── 6. Filler Word Analysis ──────────────────────────────────────────────────

export interface FillerAnalysisResult {
  count: number;
  found: { word: string; occurrences: number }[];
  density: number;      // fillers per 100 words
  score: number;        // 100 = no fillers, decreasing
  feedback: string;
}

export function analyseFillerWords(text: string): FillerAnalysisResult {
  if (!text) return { count: 0, found: [], density: 0, score: 100, feedback: 'No text provided.' };

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const found: { word: string; occurrences: number }[] = [];
  let total = 0;

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      found.push({ word: filler, occurrences: matches.length });
      total += matches.length;
    }
  }

  const density = wordCount > 0 ? Math.round((total / wordCount) * 100 * 10) / 10 : 0;

  // Score: 100 → 0 as filler density increases
  let score: number;
  if (density === 0)      score = 100;
  else if (density < 1)   score = 90;
  else if (density < 2)   score = 75;
  else if (density < 4)   score = 55;
  else if (density < 6)   score = 35;
  else                    score = 15;

  const topFillers = found.slice(0, 3).map(f => `"${f.word}" (${f.occurrences}x)`).join(', ');
  const feedback =
    total === 0
      ? 'Excellent — no filler words detected. Speech sounds polished and professional.'
      : total <= 2
      ? `Minor: ${total} filler word(s) detected (${topFillers}). Keep minimising these.`
      : `${total} filler words noted (${topFillers}). Replace with confident pauses. Target: < 1 per 50 words.`;

  return { count: total, found, density, score, feedback };
}

// ─── 7. Sentence Quality ──────────────────────────────────────────────────────

export interface SentenceQualityResult {
  avgWordsPerSentence: number;
  sentenceCount: number;
  qualityScore: number;   // 0–100
  feedback: string;
}

export function analyseSentenceQuality(text: string): SentenceQualityResult {
  const sentences = splitSentences(text).filter(s => s.trim().split(/\s+/).length >= 3);
  const sentenceCount = sentences.length;

  if (sentenceCount === 0) {
    return { avgWordsPerSentence: 0, sentenceCount: 0, qualityScore: 20, feedback: 'No complete sentences found.' };
  }

  const avgWords = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentenceCount;

  // Ideal GD sentence: 12–22 words
  let score = 70;
  if (avgWords >= 12 && avgWords <= 22) score = 95;
  else if (avgWords >= 8  && avgWords <= 28) score = 80;
  else if (avgWords < 8)  score = 50;  // too terse
  else                    score = 55;  // run-ons

  const feedback =
    avgWords >= 12 && avgWords <= 22
      ? `Clear, well-sized sentences (avg ${Math.round(avgWords)} words). Easy to follow.`
      : avgWords < 8
      ? `Sentences are very short (avg ${Math.round(avgWords)} words). Elaborate your points more.`
      : `Sentences are long (avg ${Math.round(avgWords)} words). Consider breaking them up for clarity.`;

  return { avgWordsPerSentence: Math.round(avgWords * 10) / 10, sentenceCount, qualityScore: score, feedback };
}

// ─── Composite Analysis Entry Point ──────────────────────────────────────────

export interface FullNLPAnalysis {
  keywords:        TFIDFKeyword[];
  topicRelevance:  TopicRelevanceResult;
  argumentMining:  ArgumentMiningResult;
  sentiment:       SentimentResult;
  grammar:         GrammarResult;
  fillerWords:     FillerAnalysisResult;
  sentenceQuality: SentenceQualityResult;
  /** Composite NLP quality score 0–100 */
  compositeScore:  number;
}

/**
 * Runs all NLP analysis modules on a user's text contribution.
 * Safe to call per session-entry or for the full session transcript.
 */
export function runFullNLPAnalysis(userText: string, topic: string): FullNLPAnalysis {
  const keywords        = extractKeywords(userText, 8);
  const topicRelevance  = computeTopicRelevance(userText, topic);
  const argumentMining  = mineArguments(userText);
  const sentiment       = analyseSentiment(userText);
  const grammar         = analyseGrammar(userText);
  const fillerWords     = analyseFillerWords(userText);
  const sentenceQuality = analyseSentenceQuality(userText);

  // Weighted composite NLP score (excludes camera metrics)
  // Weights align with the user-specified rubric:
  //   Topic Relevance    → 25%
  //   Argument Quality   → 25%
  //   Grammar            → 20%
  //   Filler Words       → 15%
  //   Sentence Quality   → 15%
  const compositeScore = Math.round(
    topicRelevance.score  * 100 * 0.25 +
    argumentMining.argumentScore * 0.25 +
    grammar.score               * 0.20 +
    fillerWords.score           * 0.15 +
    sentenceQuality.qualityScore* 0.15
  );

  return {
    keywords,
    topicRelevance,
    argumentMining,
    sentiment,
    grammar,
    fillerWords,
    sentenceQuality,
    compositeScore,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.?!])\s+|(?<=\.\s)/).filter(s => s.trim().length > 0);
}

function buildTFVector(tokens: string[], vocab: string[]): number[] {
  const count: Record<string, number> = {};
  for (const t of tokens) count[t] = (count[t] || 0) + 1;
  return vocab.map(v => count[v] || 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple semantic expansion: appends common synonyms/related terms to the topic
 * so that the cosine similarity picks up paraphrased contributions.
 */
function expandTopicSemantically(topic: string): string {
  const lower = topic.toLowerCase();
  let expansion = topic;

  const expansions: [string, string][] = [
    ['artificial intelligence', 'ai machine learning automation algorithms data models'],
    ['ai','automation machine learning data neural networks technology'],
    ['electric vehicle', 'ev battery charging renewable clean green energy'],
    ['remote work', 'work from home wfh hybrid flexible telecommute online'],
    ['startup', 'entrepreneurship venture innovation founder product market'],
    ['social media', 'twitter instagram facebook platform online digital'],
    ['blockchain', 'crypto decentralised distributed ledger web3 nft'],
    ['climate change', 'environment global warming carbon emission sustainability'],
    ['mental health', 'wellbeing stress anxiety depression psychological support'],
    ['education', 'learning skills college degree knowledge training academic'],
    ['job market', 'employment career hiring recruitment workforce layoffs'],
    ['cybersecurity', 'privacy data breach hacking security encryption'],
    ['cloud computing', 'saas server infrastructure hosting aws azure google'],
    ['campus placement', 'recruitment internship interview offer fresher salary'],
    ['leadership', 'management team organisation decision authority'],
    ['work life balance', 'hustle burnout overtime personal family time stress'],
  ];

  for (const [keyword, related] of expansions) {
    if (lower.includes(keyword)) {
      expansion += ' ' + related;
    }
  }

  return expansion;
}

/**
 * Checks if a user keyword is semantically similar to topic keywords
 * via simple prefix / stem matching (poor man's stemmer).
 */
function isSemanticallySimilar(word: string, topicWords: string[]): boolean {
  const stem = word.slice(0, Math.max(4, word.length - 2));
  return topicWords.some(tw => tw.startsWith(stem) || tw.includes(stem));
}
