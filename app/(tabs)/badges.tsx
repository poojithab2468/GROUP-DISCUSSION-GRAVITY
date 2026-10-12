import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { BADGES_LIST, calculateUnlockedBadges } from '@/utils/BadgeManager';
import { Award, CheckCircle2, Lock } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function BadgesScreen() {
  const { sessions } = useSessions();

  const unlockedBadges = useMemo(() => {
    return calculateUnlockedBadges(sessions);
  }, [sessions]);

  const unlockedCount = unlockedBadges.size;
  const totalCount = BADGES_LIST.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.pageTitle}>Badges &</Text>
          <Text style={[styles.pageTitle, { color: Colors.light.tint }]}>Achievements</Text>
        </View>
        <Text style={styles.pageSubtitle}>
          Earn milestone badges across verbal delivery, content relevance, non-verbal presence, and consistent practice.
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Badges Unlocked</Text>
            <Text style={styles.progressNumbers}>
              <Text style={{ color: Colors.light.tint, fontWeight: '800' }}>{unlockedCount}</Text> / {totalCount}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((unlockedCount / totalCount) * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {BADGES_LIST.map((badge) => {
          const isUnlocked = unlockedBadges.has(badge.id);
          const Icon = badge.icon;

          return (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                !isUnlocked && styles.lockedCard,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isUnlocked ? badge.color + '20' : '#F1F5F9',
                    borderColor: isUnlocked ? badge.color + '40' : '#E2E8F0',
                  },
                ]}
              >
                <Icon size={26} color={isUnlocked ? badge.color : '#94A3B8'} />
              </View>

              <Text style={[styles.badgeTitle, !isUnlocked && styles.lockedText]}>
                {badge.title}
              </Text>
              <Text style={styles.badgeCategory}>{badge.category}</Text>
              <Text style={styles.badgeDesc}>{badge.desc}</Text>

              <View style={styles.criteriaBox}>
                <Text style={styles.criteriaText}>🎯 {badge.criteria}</Text>
              </View>

              {isUnlocked ? (
                <View style={[styles.unlockedTag, { borderColor: badge.color + '40' }]}>
                  <CheckCircle2 size={11} color={badge.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.unlockedTagText, { color: badge.color }]}>Unlocked</Text>
                </View>
              ) : (
                <View style={styles.lockedTag}>
                  <Lock size={10} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.lockedTagText}>Locked</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  headerTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: Colors.light.text, lineHeight: 36 },
  pageSubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 6, lineHeight: 19 },
  progressCard: {
    marginTop: 16,
    backgroundColor: Colors.light.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.text },
  progressNumbers: { fontSize: 13, color: Colors.light.textSecondary },
  progressTrack: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.light.tint, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: {
    width: '48%',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
    minHeight: 230,
    justifyContent: 'space-between',
  },
  lockedCard: { backgroundColor: '#F8FAFC', opacity: 0.75 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  badgeTitle: { fontSize: 13, fontWeight: '700', color: Colors.light.text, textAlign: 'center', marginBottom: 2 },
  lockedText: { color: Colors.light.textTertiary },
  badgeCategory: { fontSize: 9, fontWeight: '600', color: Colors.light.tint, textTransform: 'uppercase', marginBottom: 4 },
  badgeDesc: { fontSize: 11, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 15, marginBottom: 8 },
  criteriaBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    width: '100%',
  },
  criteriaText: { fontSize: 9, color: Colors.light.textSecondary, lineHeight: 12, textAlign: 'center' },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  unlockedTagText: { fontSize: 9, fontWeight: '700' },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedTagText: { fontSize: 9, fontWeight: '700', color: '#64748B' },
  bottomSpacer: { height: 40 },
});
