import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Type, RefreshCw, Plus, AlignLeft, Shuffle } from 'lucide-react-native';
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
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [customFocused, setCustomFocused] = useState(false);

  // Shuffle animation
  const shuffleRotate = useRef(new Animated.Value(0)).current;

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

    // Animate shuffle icon
    Animated.sequence([
      Animated.timing(shuffleRotate, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(shuffleRotate, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [category, selectedTopic, shuffleRotate]);

  const categories = Object.entries(CATEGORY_CONFIG) as [
    SessionCategory,
    (typeof CATEGORY_CONFIG)[SessionCategory],
  ][];

  const currentTopics = GD_TOPICS[category];

  const spinInterpolate = shuffleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Create GD Session',
          headerStyle: { backgroundColor: Colors.light.surface },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '700',
            color: Colors.light.text,
          },
          headerShadowVisible: false,
          headerBackVisible: true,
          headerTintColor: Colors.light.tint,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page Intro ── */}
        <View style={styles.introSection}>
          <View style={styles.introIconCircle}>
            <Text style={styles.introEmoji}>🎯</Text>
          </View>
          <Text style={styles.pageTitle}>Create New GD Session</Text>
          <Text style={styles.pageSubtitle}>
            Choose a topic and start your AI-powered practice
          </Text>
        </View>

        {/* ── Session Name ── */}
        <View style={styles.section}>
          <Text style={styles.label}>Session Name</Text>
          <View
            style={[
              styles.inputWrapper,
              titleFocused && styles.inputWrapperFocused,
            ]}
          >
            <View style={styles.inputIconBox}>
              <Type size={16} color={titleFocused ? Colors.light.tint : Colors.light.textTertiary} />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. AI Ethics Discussion"
              placeholderTextColor={Colors.light.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              testID="session-title-input"
            />
            <Text style={styles.charCount}>{title.length}/60</Text>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <Text style={styles.label}>Description <Text style={styles.labelOptional}>(optional)</Text></Text>
          <View
            style={[
              styles.inputWrapper,
              styles.textAreaWrapper,
              descFocused && styles.inputWrapperFocused,
            ]}
          >
            <View style={[styles.inputIconBox, styles.inputIconBoxTop]}>
              <AlignLeft size={16} color={descFocused ? Colors.light.tint : Colors.light.textTertiary} />
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add session goals, focus areas, or any notes…"
              placeholderTextColor={Colors.light.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              testID="session-description-input"
            />
          </View>
        </View>

        {/* ── Category Cards ── */}
        <View style={styles.section}>
          <Text style={styles.label}>Topic Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map(([key, config]) => {
              const isSelected = category === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryCard,
                    isSelected && {
                      backgroundColor: config.color + '14',
                      borderColor: config.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setCategory(key);
                    setSelectedTopic(GD_TOPICS[key][0] || '');
                    setCustomTopic('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryCardEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryCardLabel,
                      isSelected && { color: config.color, fontWeight: '700' as const },
                    ]}
                    numberOfLines={2}
                  >
                    {config.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.categorySelectedDot, { backgroundColor: config.color }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Topic Selection ── */}
        <View style={styles.section}>
          <View style={styles.topicHeader}>
            <Text style={styles.label}>Select a Topic</Text>
            <TouchableOpacity
              style={styles.shuffleBtn}
              onPress={shuffleTopic}
              activeOpacity={0.75}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <Shuffle size={14} color={Colors.light.tint} />
              </Animated.View>
              <Text style={styles.shuffleText}>Shuffle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topicList}>
            {currentTopics.map((topic, idx) => {
              const isSelected = selectedTopic === topic && !customTopic.trim();
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.topicItem,
                    isSelected && styles.topicItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setCustomTopic('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.75}
                >
                  {/* Radio dot */}
                  <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                    {isSelected && <View style={styles.radioDotInner} />}
                  </View>
                  <Text
                    style={[
                      styles.topicItemText,
                      isSelected && styles.topicItemTextSelected,
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

        {/* ── Custom Topic ── */}
        <View style={styles.section}>
          {/* OR separator */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <View style={styles.orBadge}>
              <Text style={styles.orText}>OR</Text>
            </View>
            <View style={styles.orLine} />
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Enter a Custom Topic</Text>
          <View
            style={[
              styles.inputWrapper,
              styles.textAreaWrapper,
              customFocused && styles.inputWrapperFocused,
              customTopic.trim().length > 0 && styles.inputWrapperActive,
            ]}
          >
            <TextInput
              style={[styles.textInput, styles.textArea, styles.customTopicInput]}
              placeholder="Type your own GD topic here… e.g. 'Should remote work become the global norm?'"
              placeholderTextColor={Colors.light.textTertiary}
              value={customTopic}
              onChangeText={(t) => {
                setCustomTopic(t);
                if (t.trim()) setSelectedTopic('');
              }}
              multiline
              maxLength={200}
              textAlignVertical="top"
              onFocus={() => setCustomFocused(true)}
              onBlur={() => setCustomFocused(false)}
              testID="custom-topic-input"
            />
          </View>
        </View>

        {/* ── Create Button ── */}
        <TouchableOpacity
          style={[styles.createButton, !canSave && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.75}
          testID="create-session-button"
        >
          <Plus
            size={20}
            color={canSave ? '#FFFFFF' : Colors.light.textTertiary}
            strokeWidth={2.5}
          />
          <Text style={[styles.createButtonText, !canSave && styles.createButtonTextDisabled]}>
            Create GD Session
          </Text>
        </TouchableOpacity>

        {!canSave && (
          <Text style={styles.createHint}>Enter a session name to continue</Text>
        )}

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
    paddingTop: 24,
    paddingBottom: 20,
  },

  // ── Intro ──
  introSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  introIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.borderStrong,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  introEmoji: {
    fontSize: 34,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Sections ──
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelOptional: {
    fontWeight: '500' as const,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
    color: Colors.light.textTertiary,
  },

  // ── Inputs ──
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  inputWrapperActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputIconBox: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconBoxTop: {
    paddingTop: 15,
    alignSelf: 'flex-start',
  },
  textInput: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 14,
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 15,
    paddingBottom: 12,
  },
  customTopicInput: {
    paddingLeft: 14,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    paddingRight: 14,
    fontWeight: '500' as const,
    alignSelf: 'center',
  },

  // ── Category Cards ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47.5%',
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  categoryCardEmoji: {
    fontSize: 28,
  },
  categoryCardLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  categorySelectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Topic List ──
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  shuffleText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: '700' as const,
  },
  topicList: {
    gap: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  topicItemSelected: {
    backgroundColor: Colors.light.tintLight,
    borderColor: Colors.light.tint,
    borderLeftWidth: 4,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.borderStrong,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  radioDotSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  radioDotInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.light.tint,
  },
  topicItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  topicItemTextSelected: {
    color: Colors.light.tint,
    fontWeight: '700' as const,
  },

  // ── OR Separator ──
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  orBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  orText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.light.textTertiary,
    letterSpacing: 1.2,
  },

  // ── Create Button ──
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: Colors.light.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  createButtonTextDisabled: {
    color: Colors.light.textTertiary,
  },
  createHint: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
    color: Colors.light.textTertiary,
    fontWeight: '500' as const,
  },

  bottomSpacer: {
    height: 48,
  },
});
