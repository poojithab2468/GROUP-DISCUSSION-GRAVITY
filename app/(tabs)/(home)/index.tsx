import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { CATEGORY_CONFIG } from '@/types/session';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Clock,
  MessageSquare,
  Mic,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const QUOTES = [
  { text: "Communication is the solvent of all problems and is the foundation for personal development.", author: "Peter Shepherd" },
  { text: "The most important thing in communication is hearing what isn't said.", author: "Peter Drucker" },
  { text: "Effective communication is 20% what you know and 80% how you feel about what you know.", author: "Jim Rohn" },
  { text: "Speak clearly, if you speak at all; carve every word before you let it fall.", author: "Oliver Wendell Holmes" },
  { text: "The art of communication is the language of leadership.", author: "James Humes" },
  { text: "Good communication is as stimulating as black coffee, and just as hard to sleep after.", author: "Anne Morrow Lindbergh" },
  { text: "Your ability to communicate is a direct reflection of your ability to lead.", author: "Unknown" },
  { text: "Communication works for those who work at it.", author: "John Powell" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Skeleton placeholder card for loading state
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonBar} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: '70%' }]} />
          <View style={[styles.skeletonLine, { width: '45%', marginTop: 8 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { sessions, isLoading, deleteSession } = useSessions();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCreateSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-session' as never);
  };

  const handleSessionPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/practice/${id}` as never);
  };

  const handleDeleteSession = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doDelete = () => deleteSession(id);
    if (Platform.OS === 'web') {
      if (confirm('Delete this GD session? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Session', 'This will remove the session and all its responses.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not practiced';
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const totalEntries = sessions.reduce((sum, s) => sum + s.entries.length, 0);
  const totalAnalyzed = sessions.reduce((sum, s) => sum + s.entries.filter((e) => e.analysis).length, 0);
  const voiceEntries = sessions.reduce((sum, s) => sum + s.entries.filter((e) => e.inputMode === 'voice').length, 0);

  const userName = user?.name || 'Learner';
  const userInitial = userName.charAt(0).toUpperCase();
  const greeting = getGreeting();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <View style={styles.skeletonGreetLine} />
          <View style={[styles.skeletonGreetLine, { width: 160, marginTop: 8 }]} />
        </View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Top Header ── */}
      <Animated.View style={[styles.topHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.greetingText}>{greeting}, {userName}! 👋</Text>
          <Text style={styles.greetingSubtitle}>Ready to ace your next GD?</Text>
        </View>
        <View style={styles.topHeaderRight}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
            <Bell size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Hero Card ── */}
      <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Decorative orbs */}
        <View style={styles.heroOrb} />
        <View style={styles.heroOrbSmall} />

        {/* Welcome label */}
        <View style={styles.heroWelcomeRow}>
          <View style={styles.heroWelcomePill}>
            <Sparkles size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroWelcomeText}>Your Practice Hub</Text>
          </View>
        </View>

        {/* Icon + Title row */}
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <Users size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Group Discussion{'\n'}Practice</Text>
            <Text style={styles.heroSubtitle}>
              Practice GD topics with AI — voice or text — and get real feedback
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={handleCreateSession}
          activeOpacity={0.75}
          testID="create-session-hero"
        >
          <View style={styles.heroBtnIconWrap}>
            <Plus size={16} color={Colors.light.tint} />
          </View>
          <Text style={styles.heroBtnText}>Start New GD Session</Text>
          <ChevronRight size={16} color={Colors.light.tint} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Stats Row ── */}
      {sessions.length > 0 && (
        <View style={styles.statsRow}>
          {[
            { icon: <MessageSquare size={16} color={Colors.light.tint} />, value: totalEntries, label: 'Responses', bg: Colors.light.tintLight },
            { icon: <Mic size={16} color={Colors.light.accent} />, value: voiceEntries, label: 'Voice', bg: Colors.light.accentLight },
            { icon: <Sparkles size={16} color={Colors.light.success} />, value: totalAnalyzed, label: 'Analyzed', bg: Colors.light.successLight },
            { icon: <Users size={16} color='#F59E0B' />, value: sessions.length, label: 'Sessions', bg: 'rgba(245,158,11,0.10)' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>{s.icon}</View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Quick Actions Row ── */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.quickActionPrimary} onPress={handleCreateSession} activeOpacity={0.8}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.quickActionPrimaryText}>New Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionSecondary}
          onPress={() => router.push('/(tabs)/recordings' as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionSecondaryText}>View History</Text>
          <ChevronRight size={15} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      {/* ── Daily Quote Card ── */}
      <View style={styles.quoteCard}>
        <View style={styles.quoteAccentBar} />
        <View style={styles.quoteInner}>
          <View style={styles.quoteMark}>
            <Quote size={18} color={Colors.light.tint} />
          </View>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <View style={styles.quoteAuthorRow}>
            <View style={styles.quoteDivider} />
            <Text style={styles.quoteAuthor}>{quote.author}</Text>
          </View>
        </View>
      </View>

      {/* ── Sessions Section Header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sessions.length}</Text>
            </View>
          )}
        </View>
        {sessions.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/recordings' as never)}
            activeOpacity={0.75}
            style={styles.sectionViewAllBtn}
          >
            <Text style={styles.sectionViewAllText}>View All</Text>
            <ChevronRight size={13} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Sessions List or Empty State ── */}
      {sessions.length === 0 ? (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
          <View style={styles.emptyIconWrap}>
            <Zap size={42} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No GD Sessions Yet</Text>
          <Text style={styles.emptyText}>
            Create your first Group Discussion session to start practicing with AI-powered feedback
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateSession} activeOpacity={0.75}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Create Your First Session</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        sessions.map((session, index) => {
          const config = CATEGORY_CONFIG[session.category] || { label: session.category || 'Session', emoji: '📁', color: '#6B7280' };
          return (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                Platform.OS === 'web' ? (styles.sessionCardWeb as any) : {},
              ]}
              onPress={() => handleSessionPress(session.id)}
              activeOpacity={0.75}
              testID={`session-card-${index}`}
            >
              {/* Top accent bar */}
              <View style={[styles.sessionAccentBar, { backgroundColor: config.color }]} />

              <View style={styles.sessionBody}>
                {/* Top row: emoji box + title/tag + chevron + delete */}
                <View style={styles.sessionTop}>
                  <View style={[styles.sessionEmojiBox, { backgroundColor: config.color + '18' }]}>
                    <Text style={styles.emojiText}>{config.emoji}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                    <View style={[styles.categoryTag, { backgroundColor: config.color + '14' }]}>
                      <View style={[styles.catDot, { backgroundColor: config.color }]} />
                      <Text style={[styles.categoryTagText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={Colors.light.textTertiary} style={{ marginRight: 4 }} />
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteSession(session.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={14} color={Colors.light.danger} />
                  </TouchableOpacity>
                </View>

                {/* Topic text */}
                {session.topic ? (
                  <Text style={styles.topicText} numberOfLines={2}>{session.topic}</Text>
                ) : null}

                {/* Bottom meta row */}
                <View style={styles.sessionBottom}>
                  <View style={styles.metaItem}>
                    <MessageSquare size={11} color={Colors.light.textTertiary} />
                    <Text style={styles.metaText}>{session.entries.length} responses</Text>
                  </View>

                  <View style={styles.metaDot} />

                  <View style={styles.metaItem}>
                    <Clock size={11} color={Colors.light.textTertiary} />
                    <Text style={styles.metaText}>{formatDate(session.lastPracticedAt)}</Text>
                  </View>

                  {session.finalReport ? (
                    <>
                      <View style={styles.metaDot} />
                      <View style={styles.reportBadge}>
                        <Sparkles size={11} color={Colors.light.tint} />
                        <Text style={styles.reportBadgeText}>
                          {session.reportMetrics?.readinessScore !== undefined
                            ? `${session.reportMetrics.readinessScore}/100`
                            : 'Report Ready'}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  <View style={{ flex: 1 }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  loadingContainer: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 18, paddingTop: 24 },
  loadingHeader: { marginBottom: 24 },

  /* ── Skeleton ── */
  skeletonGreetLine: {
    height: 20,
    width: 220,
    borderRadius: 10,
    backgroundColor: Colors.light.border,
  },
  skeletonCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  skeletonBar: { height: 4, backgroundColor: Colors.light.border },
  skeletonBody: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  skeletonIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.light.border },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 13, borderRadius: 7, backgroundColor: Colors.light.border },

  /* ── Top Header ── */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 4,
  },
  topHeaderLeft: { flex: 1 },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* ── Hero Card ── */
  heroCard: {
    backgroundColor: Colors.light.tint,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 8,
  },
  heroOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    right: -60,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -35,
    left: -25,
  },
  heroWelcomeRow: { flexDirection: 'row', marginBottom: 14 },
  heroWelcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  heroWelcomeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 14 },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexShrink: 0,
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 5, letterSpacing: -0.3, lineHeight: 28 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: 'rgba(0,0,0,0.18)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBtnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  heroBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.light.tint },

  /* ── Stats ── */
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: Colors.light.textTertiary, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },

  /* ── Quick Actions ── */
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  quickActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.light.tint,
    paddingVertical: 13,
    borderRadius: 15,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  quickActionPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  quickActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.light.surface,
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  quickActionSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.light.tint },

  /* ── Quote Card ── */
  quoteCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  quoteAccentBar: {
    width: 4,
    backgroundColor: Colors.light.tint,
  },
  quoteInner: { flex: 1, padding: 18 },
  quoteMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteText: { fontSize: 14, color: Colors.light.text, lineHeight: 22, marginBottom: 12, fontStyle: 'italic' },
  quoteAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quoteDivider: { width: 28, height: 2, backgroundColor: Colors.light.tint, borderRadius: 2 },
  quoteAuthor: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '700', letterSpacing: 0.2 },

  /* ── Section Header ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.2 },
  countBadge: {
    backgroundColor: Colors.light.tintMid,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  countText: { fontSize: 12, color: Colors.light.tint, fontWeight: '800' },
  sectionViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  sectionViewAllText: { fontSize: 12, color: Colors.light.tint, fontWeight: '700' },

  /* ── Empty State ── */
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.light.tintLight,
    borderWidth: 2,
    borderColor: Colors.light.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.light.text, marginBottom: 10, letterSpacing: -0.4 },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
    marginBottom: 30,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  /* ── Session Cards ── */
  sessionCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  sessionCardWeb: {
    ...(Platform.OS === 'web'
      ? ({
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        } as any)
      : {}),
  },
  sessionAccentBar: { height: 3, width: '100%' },
  sessionBody: { padding: 16 },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionEmojiBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  emojiText: { fontSize: 22 },
  sessionInfo: { flex: 1, marginRight: 6 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 5, letterSpacing: -0.1 },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
    gap: 4,
  },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  categoryTagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: Colors.light.dangerLight ?? 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  sessionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    gap: 0,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.light.textTertiary, fontWeight: '500' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.light.textTertiary,
    marginHorizontal: 7,
    opacity: 0.4,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tintMid,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  reportBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.light.tint },

  bottomSpacer: { height: 36 },
});
