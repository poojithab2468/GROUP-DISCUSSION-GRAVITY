export type InputMode = 'voice' | 'text' | 'camera';

export type SessionCategory = 'current_affairs' | 'technical' | 'hr' | 'random';

export const CATEGORY_CONFIG: Record<SessionCategory, { label: string; emoji: string; color: string }> = {
    current_affairs: { label: 'Current Affairs', emoji: '🌍', color: '#3B82F6' },
    technical: { label: 'Technical', emoji: '💻', color: '#10B981' },
    hr: { label: 'HR / Behavioral', emoji: '🤝', color: '#8B5CF6' },
    random: { label: 'Random', emoji: '🎲', color: '#F59E0B' },
};

export const GD_TOPICS: Record<SessionCategory, string[]> = {
    current_affairs: [
        'Impact of AI on the Job Market',
        'Can AI Replace Software Developers in Indian Tech Companies?',
        'Startups vs Corporate IT Giants for Fresh Engineering Graduates',
        'Electric Vehicle Adoption in India: Infrastructure and Challenges',
        'Climate Change and Global Policies',
        'The Future of Remote and Hybrid Work in India',
    ],
    technical: [
        'Cloud Computing vs On-Premise: Cost and Scalability',
        'The Role of Blockchain and Web3 in Modern Tech',
        'Data Privacy and Cybersecurity in the Age of Generative AI',
        'Open Source Software vs Proprietary Enterprise Tools',
        'Will Automation Reduce Entry-Level Coding Jobs?',
    ],
    hr: [
        'Campus Placements vs Higher Studies (GATE/CAT/Abroad)',
        'How to Handle Conflict and Differing Opinions in a Team',
        'Leadership vs Management: What Corporate Recruiters Look For',
        'Work-Life Balance vs Hustle Culture in Early Career',
        'Importance of Mental Health and Psychological Safety at Work',
    ],
    random: [
        'Is Social Media a Boon or a Bane for Student Productivity?',
        'The Ethics of Autonomous Vehicles and AI Decision-Making',
        'Should Higher Education Focus on Skills over Degrees?',
        'Moonlighting in the IT Industry: Ethical Dilemma or Fair Pursuit?',
    ],
};

export interface PracticeEntry {
    id: string;
    text: string;
    inputMode: InputMode;
    analysis: string | null;
    wordCount: number;
    createdAt: string;

    // Real-time camera metrics
    emotionDistribution?: Record<string, number>;
    eyeContactPercentage?: number;
    postureScore?: number;
    engagementScore?: number;
}

export interface RubricCriterionScore {
    score: number;
    maxMarks: number;
    explanation: string;
    evidence: string;
    recommendation: string;
}

export interface StrictRubricBreakdown {
    contentRelevance: RubricCriterionScore;      // 25 marks
    argumentQuality: RubricCriterionScore;       // 20 marks
    coherence: RubricCriterionScore;             // 15 marks
    fluency: RubricCriterionScore;               // 15 marks
    vocabulary: RubricCriterionScore;            // 10 marks
    activeParticipation: RubricCriterionScore;   // 10 marks
    conciseness: RubricCriterionScore;           // 5 marks
    totalScore: number;                          // 100 marks
    performanceLevel: string;
}

export interface SessionReportMetrics {
    avgEyeContact?: number;
    avgPosture?: number;
    avgGestures?: number;
    avgStability?: number;
    avgProfessionalism?: number;
    totalWords?: number;
    wpm?: number;
    fillerWordsCount?: number;
    readinessScore?: number;
    rubricBreakdown?: StrictRubricBreakdown;
    unlockedBadges?: string[];
}

export interface PracticeSession {
    id: string;
    title: string;
    description?: string;
    category: SessionCategory;
    topic: string;
    entries: PracticeEntry[];
    createdAt: string;
    lastPracticedAt: string | null;
    finalReport?: string | null;
    status?: 'in_progress' | 'completed';
    reportGeneratedAt?: string | null;
    reportMetrics?: SessionReportMetrics | null;
}

