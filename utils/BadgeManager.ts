import { PracticeSession } from '@/types/session';
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Eye,
  Flame,
  Hand,
  Layers,
  MessageSquare,
  Mic,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react-native';

export interface BadgeDefinition {
  id: string;
  title: string;
  category: 'Practice' | 'Verbal' | 'Content' | 'Non-Verbal' | 'Milestone';
  desc: string;
  criteria: string;
  icon: any;
  color: string;
}

export const BADGES_LIST: BadgeDefinition[] = [
  {
    id: 'first_discussion',
    title: 'First Discussion',
    category: 'Practice',
    desc: 'Completed your very first GD practice session.',
    criteria: 'Complete at least 1 practice session with speech or text arguments.',
    icon: CheckCircle2,
    color: '#3B82F6', // Blue
  },
  {
    id: 'consistent_speaker',
    title: 'Consistent Speaker',
    category: 'Practice',
    desc: 'Committed to regular practice by finishing 3+ sessions.',
    criteria: 'Complete 3 or more total group discussion sessions.',
    icon: Target,
    color: '#10B981', // Green
  },
  {
    id: 'fluent_speaker',
    title: 'Fluent Speaker',
    category: 'Verbal',
    desc: 'Achieved strong verbal rhythm and optimal cadence.',
    criteria: 'Score 12/15 or higher in the Fluency & Delivery rubric criterion.',
    icon: Mic,
    color: '#8B5CF6', // Purple
  },
  {
    id: 'clear_communicator',
    title: 'Clear Communicator',
    category: 'Verbal',
    desc: 'Demonstrated superior coherence and logical sequencing.',
    criteria: 'Score 12/15 or higher in Coherence & Logical Organization.',
    icon: Layers,
    color: '#06B6D4', // Cyan
  },
  {
    id: 'vocabulary_builder',
    title: 'Vocabulary Builder',
    category: 'Verbal',
    desc: 'Demonstrated rich, diverse, and professional diction.',
    criteria: 'Score 8/10 or higher in Vocabulary & Language Usage.',
    icon: BookOpen,
    color: '#EC4899', // Pink
  },
  {
    id: 'filler_free',
    title: 'Filler-Free Speaker',
    category: 'Verbal',
    desc: 'Articulated thoughts cleanly with minimal verbal crutches.',
    criteria: 'Deliver a multi-turn discussion with fewer than 2 filler words.',
    icon: Zap,
    color: '#EAB308', // Yellow
  },
  {
    id: 'active_participant',
    title: 'Active Participant',
    category: 'Content',
    desc: 'Intervened dynamically across multiple discussion phases.',
    criteria: 'Contribute 3 or more structured speaking turns in a session.',
    icon: MessageSquare,
    color: '#F97316', // Orange
  },
  {
    id: 'critical_thinker',
    title: 'Critical Thinker',
    category: 'Content',
    desc: 'Provided strong cause-and-effect reasoning with evidence.',
    criteria: 'Score 15/20 or higher in Quality of Arguments & Reasoning.',
    icon: Brain,
    color: '#6366F1', // Indigo
  },
  {
    id: 'topic_expert',
    title: 'Topic Expert',
    category: 'Content',
    desc: 'Exhibited deep domain knowledge and direct topic relevance.',
    criteria: 'Score 20/25 or higher in Content Relevance & Topic Understanding.',
    icon: Award,
    color: '#D97706', // Amber
  },
  {
    id: 'concise_speaker',
    title: 'Concise Speaker',
    category: 'Verbal',
    desc: 'Delivered high argument density without circular rambling.',
    criteria: 'Score 4/5 or higher in Conciseness & Precision.',
    icon: Sparkles,
    color: '#14B8A6', // Teal
  },
  {
    id: 'improvement_star',
    title: 'Improvement Star',
    category: 'Milestone',
    desc: 'Demonstrated measurable score growth compared to an earlier session.',
    criteria: 'Earn an overall score higher than your previous completed session.',
    icon: TrendingUp,
    color: '#F43F5E', // Rose
  },
  {
    id: 'eye_contact_champ',
    title: 'Eye Contact Champion',
    category: 'Non-Verbal',
    desc: 'Maintained excellent direct screen gaze with active camera tracking.',
    criteria: 'Achieve >= 70% direct screen eye contact when camera is active.',
    icon: Eye,
    color: '#2563EB', // Blue
  },
  {
    id: 'gesture_master',
    title: 'Gesture Master',
    category: 'Non-Verbal',
    desc: 'Utilized natural, controlled, and expressive hand gestures.',
    criteria: 'Achieve a gesture score between 65 and 85 with verified hand tracking.',
    icon: Hand,
    color: '#16A34A', // Green
  },
  {
    id: 'consistency_champ',
    title: 'Consistency Champion',
    category: 'Milestone',
    desc: 'Maintained active GD practice across 3 distinct calendar days.',
    criteria: 'Practice sessions across at least 3 distinct calendar dates.',
    icon: Flame,
    color: '#DC2626', // Red
  },
  {
    id: 'all_round_communicator',
    title: 'All-Round Communicator',
    category: 'Milestone',
    desc: 'Attained a corporate distinction score of 75+ / 100.',
    criteria: 'Achieve an overall score >= 75 in the comprehensive rubric.',
    icon: Star,
    color: '#F59E0B', // Gold
  },
];

/**
 * Calculates all unlocked badges deterministically based on actual verified performance and session history
 */
export function calculateUnlockedBadges(sessions: PracticeSession[]): Set<string> {
  const unlocks = new Set<string>();

  if (!sessions || sessions.length === 0) return unlocks;

  const completedSessions = sessions.filter(s => s.status === 'completed' || s.finalReport);
  const totalSessionsCount = sessions.length;

  if (totalSessionsCount >= 1) unlocks.add('first_discussion');
  if (totalSessionsCount >= 3) unlocks.add('consistent_speaker');

  // Multi-day consistency
  const activeDates = new Set(
    sessions.map(s => new Date(s.createdAt).toISOString().slice(0, 10))
  );
  if (activeDates.size >= 3) unlocks.add('consistency_champ');

  // Improvement star check
  let previousScore: number | null = null;
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const sess of sortedSessions) {
    const metrics = sess.reportMetrics;
    const score = metrics?.readinessScore ?? 0;
    const userEntries = (sess.entries || []).filter(e => !(e as any).isAI);

    if (previousScore !== null && score > previousScore && score >= 45) {
      unlocks.add('improvement_star');
    }
    if (score > 0) previousScore = score;

    if (userEntries.length >= 3) unlocks.add('active_participant');

    // Rubric breakdown metrics if available
    const rb = metrics?.rubricBreakdown;
    if (rb) {
      if (rb.fluency.score >= 12) unlocks.add('fluent_speaker');
      if (rb.coherence.score >= 12) unlocks.add('clear_communicator');
      if (rb.vocabulary.score >= 8) unlocks.add('vocabulary_builder');
      if (rb.argumentQuality.score >= 15) unlocks.add('critical_thinker');
      if (rb.contentRelevance.score >= 20) unlocks.add('topic_expert');
      if (rb.conciseness.score >= 4) unlocks.add('concise_speaker');
      if (rb.totalScore >= 75) unlocks.add('all_round_communicator');
    } else {
      // Fallback evaluation from direct session metrics
      if (score >= 75) unlocks.add('all_round_communicator');
    }

    if (metrics?.fillerWordsCount !== undefined && metrics.fillerWordsCount < 2 && userEntries.length >= 2) {
      unlocks.add('filler_free');
    }

    // Camera metrics
    if (metrics?.avgEyeContact && metrics.avgEyeContact >= 70) {
      unlocks.add('eye_contact_champ');
    }
    if (metrics?.avgGestures && metrics.avgGestures >= 65 && metrics.avgGestures <= 85) {
      unlocks.add('gesture_master');
    }

    // Include explicitly stored badges from report
    if (metrics?.unlockedBadges) {
      metrics.unlockedBadges.forEach(b => unlocks.add(b));
    }
  }

  return unlocks;
}
