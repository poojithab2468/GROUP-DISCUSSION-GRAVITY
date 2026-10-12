import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { CATEGORY_CONFIG } from '@/types/session';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Clock, MessageSquare, Mic, Plus, Quote, Sparkles, Trash2, Type, Users } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
  { text: "Communication works for those who work at it.", author: "John Powell" }
];

export default function HomeScreen() {
  const { sessions, isLoading, deleteSession } = useSessions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCreateSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-session' as never);
  };

  const handleSessionPress = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/practice/${sessionId}` as never);
  };

  const handleDeleteSession = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doDelete = () => {
      deleteSession(sessionId);
      console.log('[HomeScreen] Session deleted:', sessionId);
    };
    if (Platform.OS === 'web') {
      if (confirm('Delete this GD session? This cannot be undone.')) {
        doDelete();
      }
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
    const now = new Date();
    const diff = now.getTime() - d.getTime();
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
  const totalAnalyzed = sessions.reduce(
    (sum, s) => sum + s.entries.filter((e) => e.analysis).length,
    0
  );
  const voiceEntries = sessions.reduce(
    (sum, s) => sum + s.entries.filter((e) => e.inputMode === 'voice').length,
    0
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.heroCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <Users size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Group Discussion</Text>
            <Text style={styles.heroSubtitle}>
              Practice GD topics with text or voice input and get AI feedback
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.heroButton, { flex: 1 }]}
            onPress={handleCreateSession}
            activeOpacity={0.8}
            testID="create-session-hero"
          >
            <Plus size={17} color="#FFFFFF" />
            <Text style={styles.heroButtonText}>Start GD Practice Session</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.quoteCard}>
        <View style={styles.quoteHeader}>
          <Quote size={16} color={Colors.light.tint} />
          <Text style={styles.quoteLabel}>Daily Inspiration</Text>
        </View>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.quoteAuthor}>— {quote.author}</Text>
      </View>

      {sessions.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MessageSquare size={18} color={Colors.light.tint} />
            <Text style={styles.statValue}>{totalEntries}</Text>
            <Text style={styles.statLabel}>Responses</Text>
          </View>
          <View style={styles.statCard}>
            <Mic size={18} color={Colors.light.accent} />
            <Text style={styles.statValue}>{voiceEntries}</Text>
            <Text style={styles.statLabel}>Voice</Text>
          </View>
          <View style={styles.statCard}>
            <Type size={18} color={Colors.light.success} />
            <Text style={styles.statValue}>{totalAnalyzed}</Text>
            <Text style={styles.statLabel}>Analyzed</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your GD Sessions</Text>
        {sessions.length > 0 && (
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCount}>{sessions.length}</Text>
          </View>
        )}
      </View>

      {sessions.length === 0 ? (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
          <View style={styles.emptyIconContainer}>
            <Users size={40} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No GD sessions yet</Text>
          <Text style={styles.emptyText}>
            Create your first Group Discussion session to start practicing with AI-powered feedback
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleCreateSession}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Create Session</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        sessions.map((session, index) => {
          const config = CATEGORY_CONFIG[session.category] || { label: session.category || 'Legacy App', emoji: '📁', color: '#6B7280' };
          return (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() => handleSessionPress(session.id)}
              activeOpacity={0.7}
              testID={`session-card-${index}`}
            >
              <View style={styles.sessionTop}>
                <View style={styles.sessionLeft}>
                  <View style={[styles.sessionEmoji]}>
                    <Text style={styles.emojiText}>{config.emoji}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <View style={[styles.categoryTag, { backgroundColor: config.color + '14' }]}>
                      <View style={[styles.catDot, { backgroundColor: config.color }]} />
                      <Text style={[styles.categoryTagText, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteSession(session.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={14} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {session.topic ? (
                <Text style={styles.topicText} numberOfLines={2}>
                  {session.topic}
                </Text>
              ) : null}
              <View style={styles.sessionBottom}>
                <View style={styles.metaItem}>
                  <MessageSquare size={11} color={Colors.light.textSecondary} />
                  <Text style={styles.metaText}>
                    {session.entries.length} responses
                  </Text>
                </View>
                {session.finalReport ? (
                  <>
                    <View style={styles.metaDot} />
                    <View style={styles.reportBadge}>
                      <Sparkles size={11} color={Colors.light.tint} />
                      <Text style={styles.reportBadgeText}>
                        {session.reportMetrics?.readinessScore !== undefined
                          ? `Score: ${session.reportMetrics.readinessScore}/100`
                          : 'Report Ready'}
                      </Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Clock size={11} color={Colors.light.textSecondary} />
                  <Text style={styles.metaText}>
                    {formatDate(session.lastPracticedAt)}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <ChevronRight size={16} color={Colors.light.textSecondary} />
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
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  heroCard: {
    backgroundColor: Colors.light.tint,
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  quoteCard: {
    backgroundColor: Colors.light.surface,
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 7,
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  sectionCountBadge: {
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '700' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 15,
  },
  sessionCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  sessionEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 22,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 5,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
    fontStyle: 'italic' as const,
  },
  sessionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.light.textSecondary,
    marginHorizontal: 8,
    opacity: 0.4,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tint + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.light.tint,
  },
  bottomSpacer: {
    height: 30,
  },
});
