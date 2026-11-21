import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import {
  MessageSquare,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Mic,
  Type,
  Search,
  BookOpen,
} from 'lucide-react-native';
import { useSessions } from '@/context/SessionContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface FlatEntry {
  id: string;
  text: string;
  inputMode: 'text' | 'voice' | 'camera';
  analysis: string | null;
  wordCount: number;
  createdAt: string;
  sessionId: string;
  sessionTitle: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function EntryRow({
  item,
  onDelete,
}: {
  item: FlatEntry;
  onDelete: (sessionId: string, entryId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = useCallback(() => {
    const doDelete = () => {
      onDelete(item.sessionId, item.id);
    };

    if (Platform.OS === 'web') {
      if (confirm('Delete this response?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Response', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [item, onDelete]);

  const isVoice = item.inputMode === 'voice';
  const accentColor = isVoice ? Colors.light.voiceActive : Colors.light.tint;
  const accentBg = isVoice ? Colors.light.voiceLight : Colors.light.tintLight;
  const modeBg = isVoice ? '#FEF2F2' : Colors.light.tintLight;

  return (
    <View style={styles.entryCard}>
      {/* Left accent bar */}
      <View style={[styles.entryAccentBar, { backgroundColor: accentColor }]} />

      <View style={styles.entryInner}>
        {/* Header row */}
        <View style={styles.entryHeader}>
          <View style={styles.entryMeta}>
            <Text style={styles.entrySession} numberOfLines={1}>
              {item.sessionTitle}
            </Text>
            <View style={styles.entryInfoRow}>
              {/* Date badge */}
              <View style={styles.timeBadge}>
                <Clock size={10} color={Colors.light.tint} />
                <Text style={styles.entryDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {/* Mode badge */}
              <View style={[styles.modeBadge, { backgroundColor: modeBg }]}>
                {isVoice ? (
                  <Mic size={9} color={Colors.light.voiceActive} />
                ) : (
                  <Type size={9} color={Colors.light.tint} />
                )}
                <Text style={[styles.modeText, { color: accentColor }]}>
                  {isVoice ? 'Voice' : 'Text'}
                </Text>
              </View>
              {/* Word count */}
              <Text style={styles.entryWords}>{item.wordCount} words</Text>
            </View>
          </View>

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={13} color={Colors.light.danger} />
          </TouchableOpacity>
        </View>

        {/* Response text */}
        <Text style={styles.entryText} numberOfLines={expanded ? undefined : 2}>
          {item.text}
        </Text>

        {/* AI Feedback toggle */}
        {item.analysis && (
          <TouchableOpacity
            style={styles.analysisToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Sparkles size={12} color={Colors.light.tint} />
            <Text style={styles.analysisToggleText}>
              {expanded ? 'Hide Feedback' : 'View AI Feedback'}
            </Text>
            {expanded ? (
              <ChevronUp size={13} color={Colors.light.tint} />
            ) : (
              <ChevronDown size={13} color={Colors.light.tint} />
            )}
          </TouchableOpacity>
        )}

        {/* Analysis box */}
        {expanded && item.analysis && (
          <View style={styles.analysisBox}>
            <Text style={styles.analysisText}>{item.analysis}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function EntriesScreen() {
  const { sessions, deleteEntry } = useSessions();
  const [searchTerm, setSearchTerm] = useState('');

  const allEntries: FlatEntry[] = sessions.flatMap((s) =>
    s.entries.map((e) => ({
      ...e,
      inputMode: e.inputMode ?? 'text',
      sessionId: s.id,
      sessionTitle: s.title,
    }))
  );

  allEntries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const voiceCount = allEntries.filter((e) => e.inputMode === 'voice').length;
  const textCount = allEntries.filter((e) => e.inputMode === 'text').length;

  // Client-side search filter
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return allEntries;
    const lower = searchTerm.toLowerCase();
    return allEntries.filter(
      (e) =>
        e.text.toLowerCase().includes(lower) ||
        e.sessionTitle.toLowerCase().includes(lower)
    );
  }, [allEntries, searchTerm]);

  // Group by date
  const groupedEntries = useMemo(() => {
    const groups: { label: string; key: string; items: FlatEntry[] }[] = [];
    const keyMap: Record<string, number> = {};
    for (const entry of filteredEntries) {
      const key = getDateKey(entry.createdAt);
      if (keyMap[key] === undefined) {
        keyMap[key] = groups.length;
        groups.push({ label: formatDateLabel(entry.createdAt), key, items: [] });
      }
      groups[keyMap[key]].items.push(entry);
    }
    return groups;
  }, [filteredEntries]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page Header ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Practice History</Text>
        <Text style={styles.pageSubtitle}>All your GD responses</Text>
      </View>

      {/* ── Stats Cards ── */}
      {allEntries.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: Colors.light.tintLight }]}>
              <BookOpen size={16} color={Colors.light.tint} />
            </View>
            <Text style={styles.statValue}>{allEntries.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: Colors.light.tintLight }]}>
              <Type size={16} color={Colors.light.tint} />
            </View>
            <Text style={styles.statValue}>{textCount}</Text>
            <Text style={styles.statLabel}>Text</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: Colors.light.voiceLight }]}>
              <Mic size={16} color={Colors.light.voiceActive} />
            </View>
            <Text style={styles.statValue}>{voiceCount}</Text>
            <Text style={styles.statLabel}>Voice</Text>
          </View>
        </View>
      )}

      {/* ── Search Input ── */}
      {allEntries.length > 0 && (
        <View style={styles.searchWrapper}>
          <Search size={16} color={Colors.light.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search responses…"
            placeholderTextColor={Colors.light.textTertiary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* ── Empty State ── */}
      {allEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MessageSquare size={36} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No responses yet</Text>
          <Text style={styles.emptySubtitle}>Your practice history will appear here</Text>
          <Text style={styles.emptyText}>
            Go to a GD session and submit your response via text or voice to see it here
          </Text>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Search size={28} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>Try a different search term</Text>
        </View>
      ) : (
        groupedEntries.map((group) => (
          <View key={group.key}>
            {/* Date group header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{group.label}</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            {group.items.map((item) => (
              <EntryRow
                key={item.id}
                item={item}
                onDelete={deleteEntry}
              />
            ))}
          </View>
        ))
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
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  // ── Page Header ──
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },

  // ── Stats Cards ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 3px 10px rgba(79,70,229,0.08)' } : {}),
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Search ──
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 6px rgba(79,70,229,0.07)' } : {}),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500' as const,
    paddingVertical: 0,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.tint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 0,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },

  // ── Entry Card ──
  entryCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(79,70,229,0.08)' } : {}),
  },
  entryAccentBar: {
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    flexShrink: 0,
  },
  entryInner: {
    flex: 1,
    padding: 14,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  entryMeta: {
    flex: 1,
    marginRight: 10,
  },
  entrySession: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  entryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  entryDate: {
    fontSize: 11,
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  entryWords: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: '500' as const,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // ── Entry Body ──
  entryText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  analysisToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  analysisToggleText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.tint,
  },
  analysisBox: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  analysisText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.borderStrong,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },

  bottomSpacer: {
    height: 36,
  },
});
