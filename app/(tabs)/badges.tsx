import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { BADGES_LIST, calculateUnlockedBadges } from '@/utils/BadgeManager';
import { Award, CheckCircle2, Lock, Trophy } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BadgesScreen() {
  const { sessions } = useSessions();

  const unlockedBadges = useMemo(() => calculateUnlockedBadges(sessions), [sessions]);
  const unlockedCount = unlockedBadges.size;
  const totalCount = BADGES_LIST.length;
  const pct = Math.round((unlockedCount / totalCount) * 100);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const earnedBadges = BADGES_LIST.filter(b => unlockedBadges.has(b.id));
  const lockedBadgesArr = BADGES_LIST.filter(b => !unlockedBadges.has(b.id));

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Trophy size={36} color="#4F46E5" />
      </View>
      <Text style={styles.emptyTitle}>No Sessions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start practicing Group Discussions to earn your first badge and track your progress!
      </Text>
      <TouchableOpacity style={styles.emptyBtn}>
        <Text style={styles.emptyBtnText}>Start Practicing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Trophy size={26} color="#4F46E5" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>
            Badges{' '}
            <Text style={{ color: '#4F46E5' }}>&amp; Achievements</Text>
          </Text>
          <Text style={styles.pageSubtitle}>
            Earn milestone badges across verbal delivery, content relevance, non-verbal presence, and consistent practice.
          </Text>
        </View>
      </View>

      {/* Progress Overview Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressCardTop}>
          <View style={styles.progressLabelRow}>
            <Award size={16} color="#4F46E5" />
            <Text style={styles.progressLabel}>Badges Unlocked</Text>
          </View>
          <View style={styles.progressCountChip}>
            <Text style={styles.progressCountMain}>{unlockedCount}</Text>
            <Text style={styles.progressCountSep}> / </Text>
            <Text style={styles.progressCountTotal}>{totalCount}</Text>
          </View>
        </View>

        {/* Animated progress track */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: animatedWidth }]} />
          {/* Glow dot indicator */}
          <Animated.View
            style={[
              styles.progressDot,
              {
                left: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '98%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>

        <View style={styles.progressFooter}>
          <Text style={styles.progressPct}>{pct}% Complete</Text>
          <Text style={styles.progressRemaining}>{totalCount - unlockedCount} remaining</Text>
        </View>
      </View>

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Earned Badges Section */}
          {earnedBadges.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <CheckCircle2 size={16} color="#059669" />
                <Text style={styles.sectionHeaderText}>
                  Earned Badges{' '}
                  <Text style={styles.sectionHeaderCount}>({earnedBadges.length})</Text>
                </Text>
              </View>

              <View style={styles.grid}>
                {earnedBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <View
                      key={badge.id}
                      style={[
                        styles.badgeCard,
                        {
                          borderColor: badge.color + '40',
                          ...(Platform.OS === 'web' ? {
                            boxShadow: `0 4px 20px ${badge.color}18`,
                            transition: 'transform 0.2s ease',
                          } : {
                            shadowColor: badge.color,
                          }),
                        },
                      ]}
                    >
                      {/* Top accent bar */}
                      <View style={[styles.badgeAccentBar, { backgroundColor: badge.color }]} />

                      {/* Icon circle */}
                      <View
                        style={[
                          styles.iconWrap,
                          {
                            backgroundColor: badge.color + '18',
                            borderColor: badge.color + '35',
                          },
                        ]}
                      >
                        <Icon size={26} color={badge.color} />
                      </View>

                      <Text style={styles.badgeTitle}>{badge.title}</Text>

                      {/* Category tag */}
                      <View style={[styles.categoryTag, { backgroundColor: badge.color + '14', borderColor: badge.color + '30' }]}>
                        <Text style={[styles.categoryTagText, { color: badge.color }]}>{badge.category}</Text>
                      </View>

                      <Text style={styles.badgeDesc}>{badge.desc}</Text>

                      <View style={[styles.criteriaBox, { backgroundColor: badge.color + '10', borderColor: badge.color + '25' }]}>
                        <Text style={[styles.criteriaText, { color: badge.color }]}>🎯 {badge.criteria}</Text>
                      </View>

                      {/* Unlocked chip */}
                      <View style={[styles.unlockedTag, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={[styles.unlockedTagText, { color: '#059669' }]}>✓ Unlocked</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Locked Badges Section */}
          {lockedBadgesArr.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: earnedBadges.length > 0 ? 24 : 0 }]}>
                <Lock size={16} color="#94A3B8" />
                <Text style={[styles.sectionHeaderText, { color: '#475569' }]}>
                  Locked Badges{' '}
                  <Text style={[styles.sectionHeaderCount, { color: '#94A3B8' }]}>({lockedBadgesArr.length})</Text>
                </Text>
              </View>

              <View style={styles.grid}>
                {lockedBadgesArr.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <View
                      key={badge.id}
                      style={[styles.badgeCard, styles.lockedCard]}
                    >
                      {/* Icon circle – gray */}
                      <View style={styles.iconWrapLocked}>
                        <Icon size={26} color="#94A3B8" />
                      </View>

                      <Text style={[styles.badgeTitle, styles.lockedText]}>{badge.title}</Text>

                      <View style={styles.categoryTagLocked}>
                        <Text style={styles.categoryTagLockedText}>{badge.category}</Text>
                      </View>

                      <Text style={styles.badgeDesc}>{badge.desc}</Text>

                      <View style={styles.criteriaBoxLocked}>
                        <Text style={styles.criteriaTextLocked}>🎯 {badge.criteria}</Text>
                      </View>

                      {/* Locked chip */}
                      <View style={styles.lockedTag}>
                        <Lock size={10} color="#94A3B8" />
                        <Text style={styles.lockedTagText}>Locked</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FF' },
  content: { paddingTop: 20, paddingHorizontal: 16 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(79,70,229,0.10)',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  headerText: { flex: 1 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },

  /* Progress Card */
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressCountChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(79,70,229,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  progressCountMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  progressCountSep: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressCountTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E0E7FF',
    borderRadius: 5,
    overflow: 'visible',
    marginBottom: 10,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 5,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  progressRemaining: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderCount: {
    fontWeight: '600',
    color: '#475569',
  },

  /* Badge Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 220,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  badgeAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lockedCard: {
    backgroundColor: '#F8FAFF',
    opacity: 0.75,
    borderColor: '#E0E7FF',
  },

  /* Icon */
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    marginTop: 4,
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrapLocked: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },

  /* Badge Text */
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockedText: { color: '#94A3B8' },
  badgeDesc: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },

  /* Category Tags */
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryTagLocked: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryTagLockedText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#94A3B8',
  },

  /* Criteria Box */
  criteriaBox: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
  },
  criteriaText: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  criteriaBoxLocked: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  criteriaTextLocked: {
    fontSize: 9,
    color: '#94A3B8',
    lineHeight: 13,
    textAlign: 'center',
  },

  /* Status Chips */
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  unlockedTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  lockedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79,70,229,0.10)',
    borderWidth: 2,
    borderColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpacer: { height: 40 },
});
