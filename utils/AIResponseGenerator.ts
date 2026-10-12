import { generateText } from '@rork-ai/toolkit-sdk';
import { AIParticipant, getPersonalityPrompt } from './AIParticipantManager';

export interface GDContext {
  topic: string;
  category: string;
  transcript: { text: string; sender: string; createdAt?: string }[];
}

// Track used responses to prevent duplicate replies
const usedResponsesCache = new Set<string>();

/**
 * Analyzes the candidate's statement in the context of the specific GD topic:
 * - Detects conversational intent (question, agreement, disagreement, example).
 * - Extracts key subjects and assertions.
 */
function analyzeCandidateStatement(
  userText: string,
  topic: string
): {
  cleanText: string;
  isQuestion: boolean;
  isAgreement: boolean;
  isDisagreement: boolean;
  hasExample: boolean;
  userPoint: string;
  topicSubject: string;
} {
  const clean = (userText || '').trim();
  const cleanTopic = (topic || 'this discussion').trim();

  // Extract a clean topic subject noun (e.g. "AI", "electric vehicles", "remote work")
  const topicLower = cleanTopic.toLowerCase();
  let topicSubject = cleanTopic;
  if (topicLower.includes('ai') || topicLower.includes('artificial intelligence')) {
    topicSubject = 'Artificial Intelligence';
  } else if (topicLower.includes('electric vehicle') || topicLower.includes('ev')) {
    topicSubject = 'Electric Vehicles';
  } else if (topicLower.includes('remote') || topicLower.includes('work from home')) {
    topicSubject = 'Remote and Hybrid Work';
  } else if (topicLower.includes('social media')) {
    topicSubject = 'Social Media';
  } else if (topicLower.includes('cloud')) {
    topicSubject = 'Cloud Computing';
  } else if (topicLower.includes('blockchain') || topicLower.includes('crypto')) {
    topicSubject = 'Blockchain and Crypto';
  } else if (topicLower.includes('privacy') || topicLower.includes('cybersecurity')) {
    topicSubject = 'Data Privacy and Cybersecurity';
  } else if (topicLower.includes('climate') || topicLower.includes('environment')) {
    topicSubject = 'Climate Change and Environmental Policy';
  } else if (topicLower.includes('startup')) {
    topicSubject = 'Startups and Entrepreneurship';
  } else if (topicLower.includes('mental health')) {
    topicSubject = 'Mental Health and Wellbeing';
  } else if (topicLower.includes('education') || topicLower.includes('degree') || topicLower.includes('skill')) {
    topicSubject = 'Skills versus Degrees in Education';
  }

  if (!clean) {
    return {
      cleanText: '',
      isQuestion: false,
      isAgreement: false,
      isDisagreement: false,
      hasExample: false,
      userPoint: 'the topic',
      topicSubject,
    };
  }

  const lower = clean.toLowerCase();

  // 1. Question detection
  const isQuestion = lower.includes('?') ||
    lower.startsWith('what') ||
    lower.startsWith('why') ||
    lower.startsWith('how') ||
    lower.startsWith('do you think') ||
    lower.startsWith('can we') ||
    lower.startsWith('should we') ||
    lower.startsWith('is it true');

  // 2. Agreement detection
  const isAgreement =
    lower.includes('i agree') ||
    lower.includes('totally agree') ||
    lower.includes('completely agree') ||
    lower.includes('yes, that is true') ||
    lower.includes('yes, you are right') ||
    lower.includes('good point') ||
    lower.includes('great point') ||
    lower.includes('i support') ||
    lower.includes('same here');

  // 3. Disagreement detection
  const isDisagreement =
    lower.includes('i disagree') ||
    lower.includes('i do not agree') ||
    lower.includes("i don't agree") ||
    lower.includes('on the other hand') ||
    lower.includes('however') ||
    lower.includes('not necessarily') ||
    lower.includes('but that is not true') ||
    lower.includes('i oppose');

  // 4. Example detection
  const hasExample =
    lower.includes('for example') ||
    lower.includes('for instance') ||
    lower.includes('take the case') ||
    lower.includes('like what happened') ||
    lower.includes('in real life');

  // 5. Extract core idea from user statement (clean up stopwords)
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'that', 'to',
    'it', 'of', 'for', 'with', 'as', 'this', 'by', 'are', 'i', 'think', 'believe',
    'should', 'would', 'could', 'about', 'also', 'because', 'we', 'you', 'they',
    'my', 'point', 'feel', 'like', 'just', 'from', 'have', 'has', 'been',
    'so', 'if', 'or', 'be', 'me', 'our', 'us', 'its', 'was', 'were', 'am'
  ]);
  const words = lower.replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const userPoint = words.length > 0 ? words.slice(0, 4).join(' ') : 'what you mentioned';

  return {
    cleanText: clean,
    isQuestion,
    isAgreement,
    isDisagreement,
    hasExample,
    userPoint,
    topicSubject,
  };
}

/**
 * Generates dynamic, simple, student-friendly responses strictly grounded in the GD topic.
 * Strictly 3 to 5 simple sentences focused entirely on the subject matter of the discussion.
 */
function generateDynamicPersonaResponse(
  participant: AIParticipant,
  context: GDContext,
  candidateText: string
): string {
  const topic = (context.topic || 'the topic under discussion').trim();
  const analysis = analyzeCandidateStatement(candidateText, topic);
  const persona = participant.personality;
  const sub = analysis.topicSubject;
  const pt = analysis.userPoint;

  // Handle case where user asked a direct question about the topic
  if (analysis.isQuestion) {
    switch (persona) {
      case 'Analytical':
        return `That is an important question regarding ${topic}. Looking at the data and practical reality, ${sub} brings both clear benefits and certain trade-offs that we cannot ignore. For instance, the main factors are implementation cost, user adoption, and long-term efficiency. If we analyze those three factors carefully, we can see whether the positives outweigh the negatives. What specific numbers or evidence do you think support your view?`;
      case 'Aggressive':
        return `To answer your question directly on ${topic}, the ground reality is much more complicated than it appears. While many people support the idea in theory, in real life there are significant bottlenecks that slow down progress. If we do not address the financial and operational obstacles first, any plan will face serious resistance. We have to look at the practical challenges honestly.`;
      case 'Supportive':
        return `That is a really constructive question about ${topic}. Addressing that doubt helps everyone in the group see the issue from a clearer perspective. If we combine practical regulations with public awareness, we can make steady progress on ${sub}. Working together on these solutions will make the outcome much more effective.`;
      case 'Creative':
        return `That question opens up an exciting new way to examine ${topic}. Instead of relying only on traditional methods, we could look at modern technology and digital tools to solve this problem. For example, adopting decentralized solutions or community-driven initiatives could make a huge difference. What do you think about trying a completely fresh approach to this?`;
    }
  }

  // Handle case where user agreed with a point on the topic
  if (analysis.isAgreement) {
    switch (persona) {
      case 'Analytical':
        return `I am glad we agree on that aspect of ${topic}. When we examine the facts closely, focusing on ${pt} makes strong logical sense. However, to make this work sustainably, we also need to account for the overall budget, infrastructure, and timeline. Without proper planning and measurable milestones, even a sound idea can fall short.`;
      case 'Aggressive':
        return `I understand why you agree with that point on ${topic}, but we cannot overlook the darker side of this issue. Agreeing on the concept is easy, but implementing it on a large scale creates real friction and hidden costs. If the key stakeholders do not support it fully, the plan will collapse under pressure. We need to focus on how to tackle these hard obstacles.`;
      case 'Supportive':
        return `I completely agree with your thoughts on ${topic}. You highlighted a very valid perspective about ${pt} that adds immense value to our group discussion. If more people adopt this balanced mindset, finding a workable middle ground becomes much simpler. Building on your idea, we should also consider how everyday citizens will benefit from this.`;
      case 'Creative':
        return `It is wonderful that we share that perspective on ${topic}! Since we agree on the foundation, why not push the concept even further? We could imagine pilot programs that test this idea on a small scale before launching it everywhere. That kind of progressive experimentation could lead to breakthrough results for ${sub}.`;
    }
  }

  // Handle case where user disagreed with a point on the topic
  if (analysis.isDisagreement) {
    switch (persona) {
      case 'Analytical':
        return `I appreciate your counter-argument regarding ${topic}, and you make a reasonable point about ${pt}. However, looking at the long-term trends and logical consequences, we have to evaluate the bigger picture. When we weigh the immediate risks against the future returns of ${sub}, the overall direction remains positive. We should balance both caution and forward progress.`;
      case 'Aggressive':
        return `I hear your disagreement, but let us look at the facts directly. If we avoid taking decisive action on ${topic}, the existing problems will only compound over time. Staying in the comfort zone and ignoring the urgency will cause greater damage in the long run. We have to be bold and face the real difficulties head-on.`;
      case 'Supportive':
        return `I see why you have a different opinion on ${topic}, and having varied perspectives makes our discussion much richer. You rightly pointed out genuine concerns that need to be addressed carefully. Perhaps the best solution is a phased approach that gives everyone time to adapt without sudden disruptions. What kind of compromise do you feel would work best?`;
      case 'Creative':
        return `Your disagreement points to a blind spot that most people overlook when discussing ${topic}. Instead of seeing this as an either-or battle, we can design a hybrid model that captures the strengths of both sides. By leveraging modern digital tools and adaptable policies, we can resolve the conflict cleanly. What alternative solutions would you propose?`;
    }
  }

  // General persona responses strictly tailored to the topic and user's points
  const analyticalOptions = [
    `Regarding ${topic}, what you said about ${pt} is very relevant to our core question. From a logical viewpoint, any progress in ${sub} requires balancing cost, technical feasibility, and long-term impact. If we look at recent developments, organizations and governments that plan systematically achieve much better outcomes. Therefore, focusing on measurable results is key to making this work.`,

    `I agree with the direction of your thoughts on ${topic}. Looking at the data, the main challenge with ${sub} is not just having the right intent, but ensuring smooth execution on the ground. When resources are allocated wisely and regular audits are conducted, the overall efficiency improves significantly. That is why simple, disciplined planning must be our top priority.`,

    `You made an insightful point about ${pt} in the context of ${topic}. To evaluate this properly, we have to look at both short-term expenses and long-term gains. If the benefits compound over the next five to ten years, then the initial investment is completely justified. That logical trade-off is the central question we must answer.`
  ];

  const aggressiveOptions = [
    `I understand your argument about ${pt}, but let us look at the tough realities surrounding ${topic}. In the real world, things rarely go as smoothly as people assume in discussions. If there is no clear accountability or strict enforcement, even the best policies around ${sub} will fail to deliver results. We need to question how these bottlenecks will be solved.`,

    `That sounds very promising in theory, but when you look at the ground reality of ${topic}, there are serious hurdles. Budgets are limited, public resistance is common, and existing infrastructure cannot always handle the sudden transition. How can we guarantee success if we do not prepare for these difficult friction points?`,

    `I have to challenge that view regarding ${pt}. Focusing only on the optimistic side ignores the genuine risks involved in ${topic}. Without strict guidelines and transparent measures, the entire initiative could end up wasting valuable resources. We must demand practical proof before jumping to conclusions.`
  ];

  const supportiveOptions = [
    `I really like how you highlighted ${pt} in our discussion on ${topic}. That is a very constructive point that helps move our conversation in the right direction. Building on what you said, when communities and leaders collaborate openly, solving complex challenges around ${sub} becomes much easier. It is all about maintaining positive teamwork and shared responsibility.`,

    `That is a very thoughtful perspective on ${topic}. In discussions like this, it is easy to get caught up in criticisms, but your point brings practical optimism to the table. If we provide adequate guidance, training, and support to the people involved, we can achieve substantial improvements. What additional steps do you think would help strengthen this?`,

    `You explained your point about ${pt} very clearly, and I fully support that direction for ${topic}. When stakeholders are given clear goals and compassionate leadership, adapting to changes in ${sub} becomes natural and stress-free. It is a solid foundation for sustainable progress.`
  ];

  const creativeOptions = [
    `What you shared about ${pt} sparks an exciting new perspective on ${topic}. Instead of following outdated conventions, we could use modern digital platforms, artificial intelligence, and grassroots initiatives to transform ${sub}. Just like how digital payments revolutionized transactions, innovative approaches can solve this problem much faster.`,

    `That is a compelling thought on ${topic}. But what if we think outside the box for a moment? Rather than waiting for top-down mandates, what if local communities and young innovators build grassroots prototypes to address this challenge? That kind of agile experimentation often creates the most impactful change.`,

    `I find your point about ${pt} very intriguing in relation to ${topic}. If we look five years ahead, the landscape of ${sub} will be completely transformed by emerging trends. Those who embrace smart, creative, and adaptable solutions early on will lead the way in this space.`
  ];

  const poolMap: Record<string, string[]> = {
    Analytical: analyticalOptions,
    Aggressive: aggressiveOptions,
    Supportive: supportiveOptions,
    Creative: creativeOptions,
  };

  const pool = poolMap[persona] || analyticalOptions;
  const unused = pool.filter(r => !usedResponsesCache.has(r));
  const chosen = (unused.length > 0 ? unused : pool)[Math.floor(Math.random() * (unused.length > 0 ? unused.length : pool.length))];

  usedResponsesCache.add(chosen);
  if (usedResponsesCache.size > 40) {
    usedResponsesCache.clear();
  }

  return chosen;
}

/**
 * Generates an intelligent, context-aware AI response in simple, student-friendly English,
 * strictly focused on the discussion topic.
 */
export const generateAIResponse = async (
  participant: AIParticipant,
  context: GDContext
): Promise<string> => {
  // 1. Identify the user's latest statement reliably
  const transcriptList = context.transcript || [];
  let candidateStatement = '';

  for (let i = transcriptList.length - 1; i >= 0; i--) {
    const entry = transcriptList[i];
    if (entry && (entry.sender === 'Candidate' || entry.sender === 'You')) {
      candidateStatement = entry.text.trim();
      break;
    }
  }

  // If no candidate statement yet, take the very last entry
  if (!candidateStatement && transcriptList.length > 0) {
    candidateStatement = transcriptList[transcriptList.length - 1].text.trim();
  }

  const cleanTopic = (context.topic || 'the topic').trim();

  // If transcript is completely empty, welcome the group with the exact topic!
  if (!candidateStatement) {
    return `Hello everyone! Let's begin our group discussion on "${cleanTopic}". I invite anyone in the group to share their opening thoughts on this topic.`;
  }

  // 2. Prepare chronological conversation history
  const recentTranscript = transcriptList
    .slice(-5)
    .map(t => `${t.sender}: ${t.text}`)
    .join('\n');

  const personalityPrompt = getPersonalityPrompt(participant.personality);

  // 3. Build strict topic-anchored prompt
  const prompt = `You are ${participant.name}, a student participating in a group discussion.
Your Persona: ${participant.roleTitle} (${participant.personality})
Persona Rules:
${personalityPrompt}

CURRENT DISCUSSION TOPIC:
"${cleanTopic}"

Recent Discussion Turns:
${recentTranscript}

Previous Speaker (Candidate) Said:
"${candidateStatement}"

STRICT TOPIC & LANGUAGE RULES:
1. MANDATORY: Every single sentence you speak must be directly about the discussion topic: "${cleanTopic}".
2. DO NOT change the topic. DO NOT talk about generic campus placements, engineering college internals, or IT service companies UNLESS the topic itself is specifically about that subject.
3. Speak in SIMPLE, NATURAL, STUDENT-FRIENDLY ENGLISH. Use common, everyday words. Avoid unnecessarily advanced vocabulary, heavy jargon, and complicated sentences.
4. Keep your response to 3 to 5 clear, short sentences.
5. Directly address the previous speaker's point regarding "${cleanTopic}". If they asked a question, answer it about the topic. If they agreed or disagreed, explain your side about the topic.
6. Stay true to your persona (${participant.personality}):
   - Analytical: Focus on logic, facts, feasibility, and pros/cons of "${cleanTopic}".
   - Aggressive: Firmly challenge assumptions and highlight real-world risks or trade-offs of "${cleanTopic}".
   - Supportive: Warmly validate good points and suggest constructive ways forward on "${cleanTopic}".
   - Creative: Suggest innovative alternatives and fresh perspectives on "${cleanTopic}".
7. Speak ONLY what the participant says out loud. No quotes, stage directions, or character names.`;

  // 4. Attempt remote AI with strict 4.5s timeout
  try {
    const aiCall = generateText(prompt);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 4500)
    );

    const response = await Promise.race([aiCall, timeout]);
    if (response && response.trim().length > 25) {
      const cleanResponse = response.trim().replace(/^["']|["']$/g, '');
      if (!usedResponsesCache.has(cleanResponse)) {
        usedResponsesCache.add(cleanResponse);
        return cleanResponse;
      }
    }
  } catch (error: any) {
    console.log(`[AIResponseGenerator] Remote AI fallback for ${participant.name}: ${error.message}`);
  }

  // 5. High-reliability, topic-grounded local engine
  return generateDynamicPersonaResponse(participant, context, candidateStatement);
};
