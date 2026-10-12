import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MessageSquare, Trash2, Sparkles, ChevronDown, ChevronUp, Clock, Mic, Type } from 'lucide-react-native';
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

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          <Text style={styles.entrySession} numberOfLines={1}>
            {item.sessionTitle}
          </Text>
          <View style={styles.entryInfoRow}>
            <View style={styles.timeBadge}>
              <Clock size={10} color={Colors.light.tint} />
              <Text style={styles.entryDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[
              styles.modeBadge,
              item.inputMode === 'voice' ? styles.voiceModeBadge : styles.textModeBadge,
            ]}>
              {item.inputMode === 'voice' ? (
                <Mic size={9} color={Colors.light.voiceActive} />
              ) : (
                <Type size={9} color={Colors.light.tint} />
              )}
              <Text style={[
                styles.modeText,
                item.inputMode === 'voice' ? styles.voiceModeText : styles.textModeText,
              ]}>
                {item.inputMode === 'voice' ? 'Voice' : 'Text'}
              </Text>
            </View>
            <Text style={styles.entryWords}>{item.wordCount} words</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={14} color="#E8564A" />
        </TouchableOpacity>
      </View>

      <Text style={styles.entryText} numberOfLines={expanded ? undefined : 2}>
        {item.text}
      </Text>

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

      {expanded && item.analysis && (
        <View style={styles.analysisBox}>
          <Text style={styles.analysisText}>{item.analysis}</Text>
        </View>
      )}
    </View>
  );
}

export default function EntriesScreen() {
  const { sessions, deleteEntry } = useSessions();

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {allEntries.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <MessageSquare size={12} color={Colors.light.tint} />
            <Text style={styles.statText}>{allEntries.length} total</Text>
          </View>
          <View style={styles.statPill}>
            <Type size={12} color={Colors.light.tint} />
            <Text style={styles.statText}>{textCount} text</Text>
          </View>
          <View style={styles.statPill}>
            <Mic size={12} color={Colors.light.voiceActive} />
            <Text style={styles.statText}>{voiceCount} voice</Text>
          </View>
        </View>
      )}

      {allEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MessageSquare size={36} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No responses yet</Text>
          <Text style={styles.emptyText}>
            Go to a GD session and submit your response via text or voice to see it here
          </Text>
        </View>
      ) : (
        allEntries.map((item) => (
          <EntryRow
            key={item.id}
            item={item}
            onDelete={deleteEntry}
          />
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
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
    maxWidth: 270,
  },
  entryCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
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
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 5,
  },
  entryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  entryDate: {
    fontSize: 11,
    color: Colors.light.tint,
    fontWeight: '500' as const,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  voiceModeBadge: {
    backgroundColor: '#FEF2F2',
  },
  textModeBadge: {
    backgroundColor: Colors.light.tintLight,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  voiceModeText: {
    color: Colors.light.voiceActive,
  },
  textModeText: {
    color: Colors.light.tint,
  },
  entryWords: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  entryText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  analysisToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  analysisToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.tint,
    flex: 1,
  },
  analysisBox: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  analysisText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 19,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});
