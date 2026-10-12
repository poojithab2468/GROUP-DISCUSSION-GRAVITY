import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronLeft, Check, RefreshCw } from 'lucide-react-native';
import { useSessions } from '@/context/SessionContext';
import Colors from '@/constants/colors';
import {
  SessionCategory,
  CATEGORY_CONFIG,
  GD_TOPICS,
  PracticeSession,
} from '@/types/session';
import * as Haptics from 'expo-haptics';

export default function CreateSessionScreen() {
  const { addSession } = useSessions();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SessionCategory>('current_affairs');
  const [selectedTopic, setSelectedTopic] = useState(GD_TOPICS.current_affairs[0] || '');
  const [customTopic, setCustomTopic] = useState('');

  const canSave = title.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!canSave) return;

    const topic = customTopic.trim() || selectedTopic || title.trim();

    const newSession: PracticeSession = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      title: title.trim(),
      description: description.trim(),
      category,
      topic,
      entries: [],
      createdAt: new Date().toISOString(),
      lastPracticedAt: null,
    };

    addSession(newSession);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[CreateSession] GD Session created:', newSession.id);
    router.back();
  }, [canSave, title, description, category, selectedTopic, customTopic, addSession]);

  const shuffleTopic = useCallback(() => {
    const topics = GD_TOPICS[category];
    const currentIndex = topics.indexOf(selectedTopic);
    let newIndex = Math.floor(Math.random() * topics.length);
    if (newIndex === currentIndex && topics.length > 1) {
      newIndex = (newIndex + 1) % topics.length;
    }
    setSelectedTopic(topics[newIndex]);
    setCustomTopic('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [category, selectedTopic]);

  const categories = Object.entries(CATEGORY_CONFIG) as [
    SessionCategory,
    (typeof CATEGORY_CONFIG)[SessionCategory],
  ][];

  const currentTopics = GD_TOPICS[category];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBack}
            >
              <ChevronLeft size={22} color={Colors.light.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={[
                styles.headerSave,
                !canSave && styles.headerSaveDisabled,
              ]}
            >
              <Check size={18} color={canSave ? '#FFFFFF' : '#A0AEC0'} />
              <Text
                style={[
                  styles.headerSaveText,
                  !canSave && styles.headerSaveTextDisabled,
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>New GD Session</Text>
        <Text style={styles.pageSubtitle}>
          Pick a topic category and start practicing
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Session Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. AI Ethics Discussion"
            placeholderTextColor={Colors.light.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            testID="session-title-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Any notes about this session..."
            placeholderTextColor={Colors.light.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
            testID="session-description-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Topic Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map(([key, config]) => {
              const isSelected = category === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    isSelected && {
                      backgroundColor: config.color + '18',
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => {
                    setCategory(key);
                    setSelectedTopic('');
                    setCustomTopic('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && { color: config.color, fontWeight: '700' as const },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.topicHeader}>
            <Text style={styles.label}>Select a Topic</Text>
            <TouchableOpacity style={styles.shuffleBtn} onPress={shuffleTopic}>
              <RefreshCw size={14} color={Colors.light.tint} />
              <Text style={styles.shuffleText}>Random</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topicList}>
            {currentTopics.map((topic, idx) => {
              const isSelected = selectedTopic === topic && !customTopic.trim();
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.topicChip,
                    isSelected && styles.topicChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setCustomTopic('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.topicChipText,
                      isSelected && styles.topicChipTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Or Enter Custom Topic</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Type your own GD topic here..."
            placeholderTextColor={Colors.light.textSecondary}
            value={customTopic}
            onChangeText={(t) => {
              setCustomTopic(t);
              if (t.trim()) setSelectedTopic('');
            }}
            multiline
            maxLength={200}
            textAlignVertical="top"
            testID="custom-topic-input"
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, !canSave && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
          testID="create-session-button"
        >
          <Text style={styles.createButtonText}>Create GD Session</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  headerSave: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  headerSaveDisabled: {
    backgroundColor: Colors.light.borderLight,
  },
  headerSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerSaveTextDisabled: {
    color: '#A0AEC0',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 30,
  },
  section: {
    marginBottom: 26,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  textArea: {
    height: 80,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.borderLight,
    gap: 8,
  },
  chipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.light.tintLight,
  },
  shuffleText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
  topicList: {
    gap: 8,
  },
  topicChip: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.borderLight,
  },
  topicChipSelected: {
    backgroundColor: Colors.light.tintLight,
    borderColor: Colors.light.tint,
  },
  topicChipText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  topicChipTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
  createButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: Colors.light.borderLight,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
