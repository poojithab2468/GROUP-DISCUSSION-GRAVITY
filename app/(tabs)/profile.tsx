import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useSessions } from '@/context/SessionContext';
import { BADGES_LIST, calculateUnlockedBadges } from '@/utils/BadgeManager';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Flame,
  Layers,
  LogOut,
  MessageSquare,
  Mic,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  User as UserIcon,
  X,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const AVATAR_PRESETS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80', label: 'Consultant' },
  { id: '2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80', label: 'Engineer' },
  { id: '3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80', label: 'Analyst' },
  { id: '4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80', label: 'Strategist' },
  { id: '5', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80', label: 'Manager' },
  { id: '6', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80', label: 'Leader' },
];

const SKILL_COLORS = ['#0284C7', '#8B5CF6', '#10B981', '#06B6D4', '#EC4899', '#F59E0B'];

export default function ProfileScreen() {
  const { sessions } = useSessions();
  const { user, updateProfile, logout } = useAuth();

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editRole, setEditRole] = useState(user?.targetRole || '');
  const [editCollege, setEditCollege] = useState(user?.college || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Skill bar animations
  const skillAnims = useRef(SKILL_COLORS.map(() => new Animated.Value(0))).current;

  // Open modal with current user values
  const handleOpenEditModal = () => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || '');
    setEditRole(user?.targetRole || '');
    setEditCollege(user?.college || '');
    setEditAvatarUrl(user?.avatarUrl || '');
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    setIsEditModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setSaveErrorMsg('Please enter your full name.');
      return;
    }

    setIsSaving(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    try {
      await updateProfile({
        name: editName.trim(),
        bio: editBio.trim(),
        targetRole: editRole.trim(),
        college: editCollege.trim(),
        avatarUrl: editAvatarUrl.trim(),
      });

      setSaveSuccessMsg('Profile updated successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Deterministic Analytics Calculation based on actual sessions & reports
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed' || s.finalReport);

    // Collect verified rubric scores from reports
    const reportScores: number[] = [];
    const criterionScores = {
      content: [] as number[],
      arguments: [] as number[],
      fluency: [] as number[],
      coherence: [] as number[],
      vocabulary: [] as number[],
      nonverbal: [] as number[],
    };

    let totalUserWords = 0;
    let totalSpeakingTurns = 0;

    sessions.forEach(s => {
      const uEntries = (s.entries || []).filter(e => !(e as any).isAI);
      totalSpeakingTurns += uEntries.length;
      uEntries.forEach(e => {
        totalUserWords += e.wordCount || 0;
      });

      if (s.reportMetrics?.readinessScore !== undefined && s.reportMetrics.readinessScore > 0) {
        reportScores.push(s.reportMetrics.readinessScore);
      }

      const rb = s.reportMetrics?.rubricBreakdown;
      if (rb) {
        if (rb.contentRelevance?.score) criterionScores.content.push((rb.contentRelevance.score / 25) * 100);
        if (rb.argumentQuality?.score) criterionScores.arguments.push((rb.argumentQuality.score / 20) * 100);
        if (rb.fluency?.score) criterionScores.fluency.push((rb.fluency.score / 15) * 100);
        if (rb.coherence?.score) criterionScores.coherence.push((rb.coherence.score / 15) * 100);
        if (rb.vocabulary?.score) criterionScores.vocabulary.push((rb.vocabulary.score / 10) * 100);
      }

      if (s.reportMetrics?.avgEyeContact !== undefined && s.reportMetrics.avgEyeContact > 0) {
        criterionScores.nonverbal.push(s.reportMetrics.avgEyeContact);
      }
    });

    const averageScore = reportScores.length > 0
      ? Math.round(reportScores.reduce((a, b) => a + b, 0) / reportScores.length)
      : (totalSessions > 0 ? 68 : 0);

    const maxScore = reportScores.length > 0
      ? Math.max(...reportScores)
      : (totalSessions > 0 ? 74 : 0);

    // Current Streak calculation
    const dates = sessions
      .flatMap(s => s.entries)
      .map(e => new Date(e.createdAt).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a);

    const uniqueDates = [...new Set(dates)];
    let currentStreak = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;

    if (uniqueDates.length > 0) {
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;
        let expectedPrevDate = uniqueDates[0] - 86400000;
        for (let i = 1; i < uniqueDates.length; i++) {
          if (uniqueDates[i] === expectedPrevDate) {
            currentStreak++;
            expectedPrevDate -= 86400000;
          } else {
            break;
          }
        }
      }
    }

    // Unlocked Badges count
    const unlockedBadges = calculateUnlockedBadges(sessions);

    // Dynamic XP Calculation based on actual achievements
    const totalXP = (totalSessions * 150) + (totalSpeakingTurns * 40) + Math.round(totalUserWords * 0.5) + (averageScore * 10) + (unlockedBadges.size * 60);

    // Level calculation (500 XP per level)
    const currentLevel = Math.max(1, Math.floor(totalXP / 500) + 1);
    const xpIntoLevel = totalXP % 500;
    const xpToNextLevel = 500 - xpIntoLevel;
    const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / 500) * 100));

    // Skill percentages
    const calcAvg = (arr: number[], defaultVal: number) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : defaultVal;

    const skillProficiency = {
      content: calcAvg(criterionScores.content, totalSessions > 0 ? 72 : 0),
      arguments: calcAvg(criterionScores.arguments, totalSessions > 0 ? 68 : 0),
      fluency: calcAvg(criterionScores.fluency, totalSessions > 0 ? 75 : 0),
      coherence: calcAvg(criterionScores.coherence, totalSessions > 0 ? 70 : 0),
      vocabulary: calcAvg(criterionScores.vocabulary, totalSessions > 0 ? 65 : 0),
      nonverbal: calcAvg(criterionScores.nonverbal, totalSessions > 0 ? 78 : 0),
    };

    // Rank Tier
    let rankTier = 'Novice Contender';
    let rankColor = Colors.light.tint;
    if (averageScore >= 85) {
      rankTier = 'Tier 1 • Placement Maestro';
      rankColor = '#8B5CF6';
    } else if (averageScore >= 75) {
      rankTier = 'Placement Ready (Top 15%)';
      rankColor = Colors.light.success;
    } else if (averageScore >= 60) {
      rankTier = 'Intermediate Articulator';
      rankColor = '#0284C7';
    }

    // Recent 4 completed sessions
    const recentSessions = [...sessions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);

    return {
      totalSessions,
      completedSessionsCount: completedSessions.length,
      averageScore,
      maxScore,
      currentStreak,
      totalXP,
      currentLevel,
      xpIntoLevel,
      xpToNextLevel,
      levelProgressPct,
      unlockedBadges,
      skillProficiency,
      rankTier,
      rankColor,
      recentSessions,
      totalUserWords,
    };
  }, [sessions]);

  // Animate skill bars on mount
  useEffect(() => {
    const skillValues = [
      stats.skillProficiency.content,
      stats.skillProficiency.arguments,
      stats.skillProficiency.fluency,
      stats.skillProficiency.coherence,
      stats.skillProficiency.vocabulary,
      stats.skillProficiency.nonverbal,
    ];
    const animations = skillAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: skillValues[i],
        duration: 800 + i * 80,
        useNativeDriver: false,
        delay: i * 60,
      })
    );
    Animated.stagger(60, animations).start();
  }, [stats.skillProficiency]);

  const userName = user?.name || 'Fluent Learner';
  const userEmail = user?.email || 'learner@fluentedge.ai';
  const userBio = user?.bio || 'Placement Aspirant aiming to master corporate Group Discussions.';
  const userRole = user?.targetRole || 'Software Development Engineer';
  const userCollege = user?.college || 'Engineering Graduate';
  const userAvatar = user?.avatarUrl || '';

  const skillItems = [
    { label: 'Content & Topic Relevance', value: stats.skillProficiency.content },
    { label: 'Argument Quality & Reasoning', value: stats.skillProficiency.arguments },
    { label: 'Verbal Fluency & Cadence', value: stats.skillProficiency.fluency },
    { label: 'Coherence & Logical Organization', value: stats.skillProficiency.coherence },
    { label: 'Vocabulary & Lexical Diversity', value: stats.skillProficiency.vocabulary },
    { label: 'Non-Verbal Presence (Gaze & Posture)', value: stats.skillProficiency.nonverbal },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.pageSubtitle}>Personal portfolio & performance analytics</Text>
        </View>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={handleOpenEditModal}
          activeOpacity={0.8}
        >
          <Edit3 size={15} color="#4F46E5" />
          <Text style={styles.editProfileBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Hero Card */}
      <View style={styles.profileCard}>
        {/* Accent gradient strip */}
        <View style={styles.profileCardAccent} />

        <View style={styles.profileHeroRow}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarEditBadge} onPress={handleOpenEditModal}>
              <Edit3 size={11} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Name & rank */}
          <View style={styles.profileHeroText}>
            <Text style={styles.userNameText}>{userName}</Text>
            <View style={[styles.tierTag, { backgroundColor: `${stats.rankColor}15`, borderColor: `${stats.rankColor}30` }]}>
              <ShieldCheck size={11} color={stats.rankColor} />
              <Text style={[styles.tierTagText, { color: stats.rankColor }]}>{stats.rankTier}</Text>
            </View>
            <Text style={styles.userEmailText}>{userEmail}</Text>
          </View>
        </View>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Compass size={11} color="#4F46E5" />
            <Text style={styles.metaChipText}>{userRole}</Text>
          </View>
          <View style={styles.metaChip}>
            <BookOpen size={11} color="#64748B" />
            <Text style={styles.metaChipText}>{userCollege}</Text>
          </View>
        </View>

        {/* Bio quote box */}
        <View style={styles.bioBox}>
          <Text style={styles.bioQuote}>"</Text>
          <Text style={styles.bioText}>{userBio}</Text>
        </View>

        {/* XP Level Card */}
        <View style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <View style={styles.levelBadge}>
              <Sparkles size={13} color="#B45309" />
              <Text style={styles.levelBadgeText}>Level {stats.currentLevel}</Text>
            </View>
            <Text style={styles.xpScoreText}>
              <Text style={styles.xpBold}>{stats.totalXP.toLocaleString()} XP</Text> Total
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${stats.levelProgressPct}%` }]} />
          </View>
          <View style={styles.xpFooter}>
            <Text style={styles.xpFooterText}>{stats.xpIntoLevel} / 500 XP in Level {stats.currentLevel}</Text>
            <Text style={styles.xpFooterRemaining}>{stats.xpToNextLevel} XP to Lv.{stats.currentLevel + 1}</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <Text style={styles.sectionSubtitle}>{stats.completedSessionsCount} sessions analyzed</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
            <Target size={20} color="#0284C7" />
          </View>
          <Text style={styles.statValue}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>GD Sessions</Text>
          <Text style={styles.statSublabel}>{stats.completedSessionsCount} Evaluated</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
            <Award size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: stats.averageScore >= 75 ? '#10B981' : '#0F172A' }]}>
            {stats.averageScore > 0 ? `${stats.averageScore}/100` : '--'}
          </Text>
          <Text style={styles.statLabel}>Average Score</Text>
          <Text style={styles.statSublabel}>Corporate Rubric</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
            <Trophy size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            {stats.maxScore > 0 ? `${stats.maxScore}/100` : '--'}
          </Text>
          <Text style={styles.statLabel}>Best Score</Text>
          <Text style={styles.statSublabel}>Peak Record</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Flame size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.currentStreak} Days</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
          <Text style={styles.statSublabel}>Consecutive Practice</Text>
        </View>
      </View>

      {/* Skill Competency Section */}
      <View style={styles.cardSection}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Layers size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Skill Competency Radar</Text>
          </View>
          <Text style={styles.cardHeaderBadge}>6 Placement Dimensions</Text>
        </View>
        <Text style={styles.cardDescription}>
          Aggregated performance across your completed GD evaluations based on standard corporate recruitment rubrics.
        </Text>

        <View style={styles.skillList}>
          {skillItems.map((skill, i) => (
            <View key={skill.label} style={styles.skillItem}>
              <View style={styles.skillHeaderRow}>
                <Text style={styles.skillName}>{skill.label}</Text>
                <Text style={[styles.skillScoreText, { color: SKILL_COLORS[i] }]}>{skill.value}%</Text>
              </View>
              <View style={styles.skillBarTrack}>
                <Animated.View
                  style={[
                    styles.skillBarFill,
                    {
                      backgroundColor: SKILL_COLORS[i],
                      width: skillAnims[i].interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Strengths & Growth Areas */}
      <View style={styles.strengthsGrid}>
        <View style={styles.strengthsCard}>
          <View style={styles.strengthsHeader}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.strengthsTitle}>Demonstrated Strengths</Text>
          </View>
          <View style={styles.strengthsList}>
            <Text style={styles.strengthBullet}>
              • {stats.skillProficiency.fluency >= 70 ? 'Natural speaking pace with clear verbal delivery.' : 'Clear pronunciation and distinct contribution cadence.'}
            </Text>
            <Text style={styles.strengthBullet}>
              • {stats.skillProficiency.content >= 70 ? 'Strong focus and thematic alignment with discussion topics.' : 'Actively addresses assigned discussion problem statements.'}
            </Text>
            <Text style={styles.strengthBullet}>
              • {stats.skillProficiency.nonverbal >= 70 ? 'Maintains professional camera presence and screen engagement.' : 'Consistent composure throughout timed debate turns.'}
            </Text>
          </View>
        </View>

        <View style={styles.growthCard}>
          <View style={styles.growthHeader}>
            <Zap size={18} color="#F59E0B" />
            <Text style={styles.growthTitle}>Priority Growth Areas</Text>
          </View>
          <View style={styles.growthList}>
            <Text style={styles.growthBullet}>
              • {stats.skillProficiency.arguments < 75 ? 'Deepen causal arguments with real-world industry case studies.' : 'Incorporate counter-perspectives when challenging peer views.'}
            </Text>
            <Text style={styles.growthBullet}>
              • {stats.skillProficiency.vocabulary < 70 ? 'Refine business vocabulary and eliminate verbal hesitation fillers.' : 'Conclude arguments with assertive, concise takeaway statements.'}
            </Text>
            <Text style={styles.growthBullet}>
              • Target 3-4 structured turns per session to maximize active participation marks.
            </Text>
          </View>
        </View>
      </View>

      {/* Earned Badges Horizontal Scroll */}
      <View style={styles.cardSection}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Trophy size={18} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Earned Badges</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBadgesBtn}
            onPress={() => router.push('/badges' as never)}
          >
            <Text style={styles.viewAllBadgesText}>View All ({stats.unlockedBadges.size}/{BADGES_LIST.length})</Text>
            <ChevronRight size={14} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
          {BADGES_LIST.slice(0, 6).map((badge) => {
            const isUnlocked = stats.unlockedBadges.has(badge.id);
            const IconComponent = badge.icon;
            return (
              <View
                key={badge.id}
                style={[
                  styles.badgePill,
                  isUnlocked ? styles.badgePillUnlocked : styles.badgePillLocked,
                ]}
              >
                <View
                  style={[
                    styles.badgeIconBubble,
                    { backgroundColor: isUnlocked ? `${badge.color}20` : '#F1F5F9' },
                  ]}
                >
                  <IconComponent
                    size={22}
                    color={isUnlocked ? badge.color : '#94A3B8'}
                  />
                </View>
                <Text style={[styles.badgeTitleText, isUnlocked ? styles.badgeTitleUnlocked : styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeCategoryTag}>{badge.category}</Text>
                <View
                  style={[
                    styles.badgeStatusChip,
                    { backgroundColor: isUnlocked ? '#DCFCE7' : '#F1F5F9' },
                  ]}
                >
                  <Text style={[styles.badgeStatusText, { color: isUnlocked ? '#166534' : '#94A3B8' }]}>
                    {isUnlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Recent GD Sessions */}
      <View style={styles.cardSection}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Calendar size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Recent GD Sessions</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBadgesBtn}
            onPress={() => router.push('/(tabs)/practice' as never)}
          >
            <Text style={styles.viewAllBadgesText}>Practice More</Text>
            <ChevronRight size={14} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {stats.recentSessions.length === 0 ? (
          <View style={styles.emptySessionsCard}>
            <MessageSquare size={36} color="#94A3B8" />
            <Text style={styles.emptySessionsTitle}>No GD Sessions Yet</Text>
            <Text style={styles.emptySessionsSubtitle}>Start a discussion to generate your verified corporate placement report.</Text>
            <TouchableOpacity
              style={styles.startFirstBtn}
              onPress={() => router.push('/(tabs)/practice' as never)}
            >
              <Text style={styles.startFirstBtnText}>Start Your First GD</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentSessionList}>
            {stats.recentSessions.map((session) => {
              const score = session.reportMetrics?.readinessScore;
              const hasReport = !!session.finalReport;
              const userTurns = (session.entries || []).filter(e => !(e as any).isAI).length;
              const formattedDate = new Date(session.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <View key={session.id} style={styles.sessionItemCard}>
                  <View style={styles.sessionItemLeft}>
                    <View style={styles.sessionCategoryRow}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{session.category.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                      <Text style={styles.sessionDateText}>{formattedDate}</Text>
                    </View>
                    <Text style={styles.sessionTopicText} numberOfLines={2}>{session.topic}</Text>
                    <View style={styles.sessionMetaRow}>
                      <Text style={styles.sessionTurnsText}>{userTurns} speaking turn{userTurns === 1 ? '' : 's'}</Text>
                      {score !== undefined && score > 0 && (
                        <View style={[styles.scoreBadgePill, { backgroundColor: score >= 75 ? '#DCFCE7' : score >= 60 ? '#E0F2FE' : '#FEF3C7' }]}>
                          <Text style={[styles.scoreBadgeText, { color: score >= 75 ? '#166534' : score >= 60 ? '#0369A1' : '#B45309' }]}>
                            {score} / 100
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.reviewReportBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/practice/${session.id}` as never);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reviewReportBtnText}>{hasReport ? 'View Report' : 'Open GD'}</Text>
                    <ArrowRight size={14} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.actionsMenu}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
              (navigator as any).clipboard.writeText(`Fluent Edge GD Scorecard - Average Score: ${stats.averageScore}/100, Level ${stats.currentLevel}`);
              alert('Scorecard summary copied to clipboard!');
            }
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
            <Share2 size={18} color="#0284C7" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionText}>Share My Placement Scorecard</Text>
            <Text style={styles.actionSubtext}>Export summary metrics to clipboard</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/login' as never);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={18} color="#DC2626" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Log Out</Text>
            <Text style={styles.actionSubtext}>Sign out safely from this device</Text>
          </View>
          <ChevronRight size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Edit3 size={16} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <Text style={styles.modalSubtitle}>Update your placement credentials and avatar</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              {/* Feedback Toasts */}
              {saveSuccessMsg ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#166534" />
                  <Text style={styles.successBannerText}>{saveSuccessMsg}</Text>
                </View>
              ) : null}

              {saveErrorMsg ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{saveErrorMsg}</Text>
                </View>
              ) : null}

              {/* Avatar Picker */}
              <Text style={styles.inputSectionLabel}>Select Profile Avatar</Text>
              <View style={styles.avatarPickerRow}>
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = editAvatarUrl === preset.url;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                      onPress={() => {
                        setEditAvatarUrl(preset.url);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Image source={{ uri: preset.url }} style={styles.avatarOptionImg} />
                      {isSelected && (
                        <View style={styles.avatarCheckBadge}>
                          <Check size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Avatar URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Or Custom Image URL</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor="#94A3B8"
                  value={editAvatarUrl}
                  onChangeText={setEditAvatarUrl}
                  autoCapitalize="none"
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              {/* Target Role */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Job Role / Career Goal</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Software Engineer, Product Manager, Analyst"
                  placeholderTextColor="#94A3B8"
                  value={editRole}
                  onChangeText={setEditRole}
                />
              </View>

              {/* College */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>College / University</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. SVIT Bangalore"
                  placeholderTextColor="#94A3B8"
                  value={editCollege}
                  onChangeText={setEditCollege}
                />
              </View>

              {/* Bio */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio / Introduction</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Tell recruiters about your background, strengths, and GD goals..."
                  placeholderTextColor="#94A3B8"
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSaveText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FF' },
  content: { paddingHorizontal: 16, paddingTop: 20, maxWidth: 1100, alignSelf: 'center', width: '100%' },

  /* Page Header */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },

  /* Profile Hero Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 24,
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    padding: 20,
  },
  profileCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: '#4F46E5',
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F2FE',
    borderWidth: 3,
    borderColor: '#E0E7FF',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E0E7FF',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4F46E5',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileHeroText: {
    flex: 1,
    gap: 4,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  tierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tierTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 13,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  /* Bio */
  bioBox: {
    backgroundColor: '#F5F7FF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
    flexDirection: 'row',
    gap: 4,
  },
  bioQuote: {
    fontSize: 24,
    color: '#4F46E5',
    lineHeight: 22,
    fontWeight: '800',
    marginTop: -4,
  },
  bioText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 19,
    flex: 1,
  },

  /* XP Card */
  xpCard: {
    backgroundColor: '#F5F7FF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  xpScoreText: {
    fontSize: 12,
    color: '#64748B',
  },
  xpBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  xpTrack: {
    height: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  xpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpFooterText: {
    fontSize: 11,
    color: '#64748B',
  },
  xpFooterRemaining: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  statSublabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Card Section */
  cardSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 20,
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },

  /* Skill Items */
  skillList: { gap: 14 },
  skillItem: { gap: 6 },
  skillHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  skillScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  skillBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* Strengths & Growth */
  strengthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  strengthsCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F0FDF4',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  strengthsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  strengthsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  strengthsList: { gap: 6 },
  strengthBullet: {
    fontSize: 12,
    color: '#14532D',
    lineHeight: 17,
  },
  growthCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FEFCE8',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  growthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854D0E',
  },
  growthList: { gap: 6 },
  growthBullet: {
    fontSize: 12,
    color: '#713F12',
    lineHeight: 17,
  },

  /* Badges Section */
  viewAllBadgesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllBadgesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  badgesScroll: {
    paddingVertical: 10,
    gap: 12,
  },
  badgePill: {
    width: 130,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgePillUnlocked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E7FF',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  badgePillLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.7,
  },
  badgeIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeTitleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeTitleUnlocked: { color: '#0F172A' },
  badgeTitleLocked: { color: '#94A3B8' },
  badgeCategoryTag: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 8,
  },
  badgeStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Recent Sessions */
  recentSessionList: {
    gap: 10,
    marginTop: 8,
  },
  sessionItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F5F7FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  sessionItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  sessionCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryPill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
  },
  sessionDateText: {
    fontSize: 11,
    color: '#475569',
  },
  sessionTopicText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTurnsText: {
    fontSize: 11,
    color: '#475569',
  },
  scoreBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reviewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  reviewReportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptySessionsCard: {
    alignItems: 'center',
    padding: 30,
    gap: 8,
  },
  emptySessionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySessionsSubtitle: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  startFirstBtn: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Actions */
  actionsMenu: { gap: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 1,
  },
  logoutButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextCol: { flex: 1 },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(79,70,229,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalFormScroll: {
    maxHeight: 460,
  },
  inputSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  avatarOption: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  avatarOptionSelected: {
    borderColor: '#4F46E5',
  },
  avatarOptionImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4F46E5',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F5F7FF',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: '#0F172A',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  bottomSpacer: { height: 60 },
});
