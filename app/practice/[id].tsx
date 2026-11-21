import CameraEngine, { BehavioralMetrics } from '@/components/CameraEngine.web';
import SpeakingIndicator from '@/components/SpeakingIndicator';
import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { CATEGORY_CONFIG, InputMode, PracticeEntry, SessionCategory } from '@/types/session';
import {
  AI_PARTICIPANTS,
  getNextAISpeaker,
  inferDiscussionPhase,
  recordUserSpoke,
  resetTurnTracking,
  shouldFireChainedAITurn,
  canAISpeak,
  fsmAIStarted,
  fsmAIFinished,
} from '@/utils/AIParticipantManager';
import { generateAIResponse } from '@/utils/AIResponseGenerator';
import { generateComprehensiveReport } from '@/utils/AIReportGenerator';
import { calculateProfessionalismScore, resetProfessionalismSmoothers } from '@/utils/ProfessionalismScore';
import { VoiceActivityDetector, PitchVariationAnalyser, WPMTracker, computeFluencyScore } from '@/utils/FluencyAnalysis';
import { tts } from '@/utils/TextToSpeech';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Hand,
  Mic,
  Send,
  Sparkles,
  Trash2,
  Type,
  UserCheck,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STT_URL = 'https://toolkit.rork.com/stt/transcribe/';

// Design tokens
const DS = {
  primary: '#4F46E5',
  primaryLight: 'rgba(79,70,229,0.10)',
  primaryLighter: 'rgba(79,70,229,0.06)',
  primaryBorder: 'rgba(79,70,229,0.18)',
  bg: '#F5F7FF',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E0E7FF',
  cardShadow: 'rgba(79,70,229,0.08)',
  voiceActive: '#DC2626',
  voiceLight: 'rgba(220,38,38,0.08)',
  success: '#059669',
  warning: '#F59E0B',
  danger: '#DC2626',
  accent: '#06B6D4',
};

// Per-participant colors
const PARTICIPANT_COLORS: Record<string, string> = {
  Aarav: '#4F46E5',
  Ananya: '#059669',
  Vikram: '#EF4444',
  Maya: '#8B5CF6',
};

function getParticipantColor(name: string) {
  return PARTICIPANT_COLORS[name] || DS.primary;
}

function getParticipantRole(name: string) {
  if (name === 'Aarav') return 'Analytical';
  if (name === 'Vikram') return 'Challenger';
  if (name === 'Ananya') return 'Supportive';
  if (name === 'Maya') return 'Creative';
  return 'AI Peer';
}

// ─── EntryCard ───────────────────────────────────────────────────────────────
function EntryCard({
  entry,
  sessionId,
  onDelete,
}: {
  entry: PracticeEntry;
  sessionId: string;
  onDelete: (sessionId: string, entryId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMetrics = (entry as any).engagementScore !== undefined && (entry as any).engagementScore > 0;

  const handleDelete = useCallback(() => {
    const doDelete = () => {
      onDelete(sessionId, entry.id);
    };
    if (Platform.OS === 'web') {
      if (confirm('Delete this entry?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Entry', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [sessionId, entry.id, onDelete]);

  const isAI = (entry as any).isAI;
  const aiColor = (entry as any).avatarColor || getParticipantColor((entry as any).participantName || 'AI');
  const participantName = (entry as any).participantName || 'AI Peer';
  const roleLabel = getParticipantRole(participantName);

  return (
    <View style={[
      styles.entryCard,
      isAI
        ? { borderLeftColor: aiColor }
        : { borderLeftColor: DS.primary }
    ]}>
      {/* Entry header row */}
      <View style={styles.entryHeader}>
        <View style={styles.entryTimeRow}>
          {isAI ? (
            <View style={styles.speakerBadgeRow}>
              <View style={[styles.speakerAvatarCircle, { backgroundColor: aiColor }]}>
                <Text style={styles.speakerAvatarInitials}>{participantName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={[styles.speakerNameText, { color: aiColor }]}>
                  {participantName}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: aiColor + '18' }]}>
                  <Text style={[styles.rolePillText, { color: aiColor }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.speakerBadgeRow}>
              <View style={[styles.speakerAvatarCircle, { backgroundColor: DS.primary }]}>
                <Text style={styles.speakerAvatarInitials}>Y</Text>
              </View>
              <View>
                <Text style={[styles.speakerNameText, { color: DS.primary }]}>
                  You (Candidate)
                </Text>
                <View style={[
                  styles.inputModeBadge,
                  entry.inputMode === 'voice' ? styles.voiceBadge : styles.textBadge,
                ]}>
                  {entry.inputMode === 'voice' ? (
                    <Mic size={10} color={DS.voiceActive} />
                  ) : (
                    <Type size={10} color={DS.primary} />
                  )}
                  <Text style={[
                    styles.inputModeText,
                    entry.inputMode === 'voice' ? styles.voiceBadgeText : styles.textBadgeText,
                  ]}>
                    {entry.inputMode === 'voice' ? 'Spoken' : 'Typed'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.entryMetaRow}>
            <View style={styles.entryTimeBadge}>
              <Clock size={11} color={DS.textTertiary} />
              <Text style={styles.entryTime}>
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.entryWordCount}>{entry.wordCount}w</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.entryDeleteBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={13} color={DS.danger} />
        </TouchableOpacity>
      </View>

      <Text style={styles.entryText} numberOfLines={expanded ? undefined : 4}>
        {entry.text}
      </Text>

      {(entry.analysis || hasMetrics) && (
        <TouchableOpacity
          style={styles.analysisToggle}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Sparkles size={13} color={DS.primary} />
          <Text style={styles.analysisToggleText}>
            {expanded ? 'Hide Details' : (entry.analysis ? 'View AI Feedback' : 'View Non-Verbal Stats')}
          </Text>
          {expanded ? (
            <ChevronUp size={14} color={DS.primary} />
          ) : (
            <ChevronDown size={14} color={DS.primary} />
          )}
        </TouchableOpacity>
      )}

      {hasMetrics && expanded && (
        <View style={styles.analysisBox}>
          <View style={styles.pulseSection}>
            <Text style={styles.pulseTitle}>Behavioral Pulse</Text>

            <View style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>Professionalism</Text>
              <View style={styles.pulseBarBg}>
                <View style={[styles.pulseBar, { width: `${(entry as any).professionalismScore || 0}%`, backgroundColor: '#0D9488' }]} />
              </View>
              <Text style={styles.pulseValue}>{(entry as any).professionalismScore || 0}%</Text>
            </View>

            <View style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>Gestures</Text>
              <View style={styles.pulseBarBg}>
                <View style={[styles.pulseBar, { width: `${(entry as any).gestureScore || 0}%`, backgroundColor: '#0284C7' }]} />
              </View>
              <Text style={styles.pulseValue}>{(entry as any).gestureScore || 0}%</Text>
            </View>

            <View style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>Posture</Text>
              <View style={styles.pulseBarBg}>
                <View style={[styles.pulseBar, { width: `${(entry as any).postureScore || 0}%`, backgroundColor: '#059669' }]} />
              </View>
              <Text style={styles.pulseValue}>{(entry as any).postureScore || 0}%</Text>
            </View>

            <View style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>Eye Contact</Text>
              <View style={styles.pulseBarBg}>
                <View style={[styles.pulseBar, { width: `${(entry as any).eyeContactPercentage || 0}%`, backgroundColor: '#2563EB' }]} />
              </View>
              <Text style={styles.pulseValue}>{(entry as any).eyeContactPercentage || 0}%</Text>
            </View>

            <View style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>Stability</Text>
              <View style={styles.pulseBarBg}>
                <View style={[styles.pulseBar, { width: `${(entry as any).stabilityScore || 0}%`, backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.pulseValue}>{(entry as any).stabilityScore || 0}%</Text>
            </View>
          </View>
          {entry.analysis && <Text style={styles.analysisText}>{entry.analysis}</Text>}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSession, addEntry, updateEntryAnalysis, deleteEntry, saveFinalReport } = useSessions();
  const session = getSession(id ?? '');

  const [inputText, setInputText] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [practiceMode, setPracticeMode] = useState<'ai' | 'individual'>('ai');
  const [isFinalAnalyzing, setIsFinalAnalyzing] = useState(false);
  const [finalAnalysis, setFinalAnalysis] = useState<string | null>(session?.finalReport || null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [currentSpeakerName, setCurrentSpeakerName] = useState('User');
  const [lastAISpeakerId, setLastAISpeakerId] = useState<string | undefined>(undefined);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordPulseAnim = useRef(new Animated.Value(1)).current;
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Speech Recognition and Session timing refs
  const isRecordingIntentRef = useRef(false);
  const baseTextRef = useRef('');
  const finalizedSegmentsRef = useRef<string[]>([]);
  const interimTranscriptRef = useRef('');
  const isSubmittingRef = useRef(false);
  const sessionStartTimeRef = useRef(Date.now());
  const totalSpeakingSecondsRef = useRef(0);

  // Restore final report if loaded from session cache/storage
  useEffect(() => {
    if (session?.finalReport && !finalAnalysis) {
      setFinalAnalysis(session.finalReport);
    }
  }, [session?.finalReport]);

  const [accumulatedMetrics, setAccumulatedMetrics] = useState({
    emotions: [] as string[],
    eyeContactCount: 0,
    postureScore: 0,
    frameCount: 0,
    gestureScores: [] as number[],
    stabilityScores: [] as number[],
    maxStress: 'Low' as 'Low' | 'Medium' | 'High'
  });

  const sessionAccumulatedMetricsRef = useRef({
    frameCount: 0,
    eyeContactCount: 0,
    postureScore: 0,
    gestureScores: [] as number[],
    stabilityScores: [] as number[],
    emotions: [] as string[],
    maxStress: 'Low' as string,
  });

  const [liveMetrics, setLiveMetrics] = useState<BehavioralMetrics>({
    isCameraActive: false,
    isFaceDetected: false,
    detectionStatus: 'loading',
    emotion: 'Initializing...',
    emotionConfidence: 0,
    eyeContact: false,
    eyeContactStatus: 'Unable to detect',
    posture: 'Unknown',
    gestureStatus: 'Not Visible',
    gestureScore: 0,
    handVisible: false,
    engagementScore: 0,
    stabilityScore: 100,
    stressLevel: 'Low',
    nervousnessScore: 0,
  });

  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fluency analysis — wired to mic stream during voice recording sessions
  const vadRef = useRef<VoiceActivityDetector>(new VoiceActivityDetector());
  const pitchRef = useRef<PitchVariationAnalyser>(new PitchVariationAnalyser());
  const wpmTrackerRef = useRef<WPMTracker>(new WPMTracker());
  // Accumulated fluency data across all voice turns in this session
  const sessionSilenceIntervalsRef = useRef<number[]>([]);
  const sessionPitchResultRef = useRef<{ variationIndex: number; label: string }>({ variationIndex: 0, label: 'Monotone' });
  const sessionFillerCountRef = useRef<number>(0);

  // Fade in + session timer + pulse animations
  useEffect(() => {
    // Reset AI turn tracking for this new session
    resetTurnTracking();
    // Reset per-session EMA smoothers (professionalism non-verbal scoring)
    resetProfessionalismSmoothers();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    sessionTimerRef.current = setInterval(() => {
      setSessionTimer(prev => prev + 1);
    }, 1000);

    return () => {
      tts.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  // Pulsing animation for speaking indicator
  useEffect(() => {
    if (isAISpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAISpeaking]);

  // Pulsing animation for record button
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
          Animated.timing(recordPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordPulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMetricsUpdate = useCallback((metrics: BehavioralMetrics) => {
    setLiveMetrics(metrics);
    const postureIncrement = metrics.posture === 'Straight' ? 1 : metrics.posture === 'Slouching' ? 0 : 0.5;

    // Track session-level cumulative stats across all turns
    const s = sessionAccumulatedMetricsRef.current;
    s.frameCount += 1;
    if (metrics.eyeContact) s.eyeContactCount += 1;
    s.postureScore += postureIncrement;
    if (metrics.handVisible && metrics.gestureScore > 0) s.gestureScores.push(metrics.gestureScore);
    if (metrics.stabilityScore) s.stabilityScores.push(metrics.stabilityScore);
    s.emotions.push(metrics.emotion);
    if (metrics.stressLevel === 'High') s.maxStress = 'High';
    else if (metrics.stressLevel === 'Medium' && s.maxStress !== 'High') s.maxStress = 'Medium';

    setAccumulatedMetrics(prev => ({
      emotions: [...prev.emotions, metrics.emotion].slice(-100),
      eyeContactCount: prev.eyeContactCount + (metrics.eyeContact ? 1 : 0),
      postureScore: prev.postureScore + postureIncrement,
      frameCount: prev.frameCount + 1,
      gestureScores: (metrics.handVisible && metrics.gestureScore > 0)
        ? [...prev.gestureScores, metrics.gestureScore].slice(-100)
        : prev.gestureScores,
      stabilityScores: [...prev.stabilityScores, metrics.stabilityScore || 100].slice(-100),
      maxStress: (metrics.stressLevel === 'High' || prev.maxStress === 'High') ? 'High' :
        (metrics.stressLevel === 'Medium' || prev.maxStress === 'Medium') ? 'Medium' : 'Low'
    }));
  }, []);

  // AI Response Generator & Speech — strict FSM-enforced turn order
  // Rule: ONE AI speaks → candidate responds → ONE different AI speaks.
  // No AI-to-AI chaining. FSM state guards against duplicate triggers.
  const triggerAIResponse = useCallback(async (customEntries?: PracticeEntry[]) => {
    if (!session || practiceMode !== 'ai') return;

    // FSM gate: only proceed if the FSM is in PROCESSING_CANDIDATE state
    if (!canAISpeak()) {
      console.log('[FSM] AI trigger blocked — not in PROCESSING_CANDIDATE state.');
      return;
    }

    // Acquire the AI_RESPONDING lock
    fsmAIStarted();
    setIsAISpeaking(true);

    try {
      // Build full chronological transcript (oldest first) for context
      const entriesToUse = customEntries || session.entries;
      const chronologicalEntries = [...entriesToUse].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const transcript = chronologicalEntries.map(e => ({
        text: e.text,
        sender: (e as any).isAI
          ? ((e as any).participantName || 'AI Peer')
          : 'Candidate',
        createdAt: e.createdAt,
      }));

      // Intelligent speaker selection — considers phase, sentiment, question detection
      const speaker = getNextAISpeaker({ transcript });
      setLastAISpeakerId(speaker.id);
      setCurrentSpeakerName(speaker.name);

      const aiResponse = await generateAIResponse(speaker, {
        topic: session.topic || 'General Discussion',
        category: session.category || 'General',
        transcript,
      });

      const newEntry: PracticeEntry = {
        id: 'ai-' + Date.now(),
        text: aiResponse,
        inputMode: 'text',
        analysis: null,
        wordCount: aiResponse.split(/\s+/).filter(Boolean).length,
        createdAt: new Date().toISOString(),
        ...({
          isAI: true,
          participantName: speaker.name,
          avatarColor: speaker.avatarColor,
        } as any),
      };

      addEntry(session.id, newEntry);

      if (!isTtsMuted) {
        await tts.speak(aiResponse, {
          pitch: speaker.voiceConfig.pitch,
          rate: speaker.voiceConfig.rate,
        });
      }

      // NO AI-to-AI chaining — the FSM now waits for the candidate.
      // shouldFireChainedAITurn() always returns false (enforced by FSM).
    } catch (error) {
      console.error('[PracticeScreen] AI Response error:', error);
    } finally {
      // Release the AI_RESPONDING lock → transition to WAITING_FOR_CANDIDATE
      fsmAIFinished();
      setIsAISpeaking(false);
      setCurrentSpeakerName('Candidate');
    }
  }, [session, practiceMode, lastAISpeakerId, isTtsMuted, addEntry]);

  // Voice Recording: Start
  const startRecording = async () => {
    tts.stop();
    setIsAISpeaking(false);
    setSpeechError(null);
    setInterimTranscript('');
    isRecordingIntentRef.current = true;
    baseTextRef.current = inputText.trim();
    finalizedSegmentsRef.current = [];
    interimTranscriptRef.current = '';

    if (Platform.OS === 'web') {
      // 1. Verify mic permission via getUserMedia
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getTracks().forEach(t => t.stop());
        } catch (permErr: any) {
          console.warn('[STT] Microphone permission denied:', permErr);
          isRecordingIntentRef.current = false;
          setSpeechError('Microphone permission blocked. Please allow mic access in your browser settings.');
          Alert.alert('Microphone Blocked', 'Please grant microphone permissions in your browser address bar.');
          return;
        }
      }

      // 2. Start Web Speech Recognition with en-IN preference for Indian accents
      const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognitionClass) {
        const createAndStartRecognition = () => {
          if (!isRecordingIntentRef.current) return;

          try {
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (_) {}
              recognitionRef.current = null;
            }

            const recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = true;
            try {
              recognition.lang = 'en-IN';
            } catch (_) {
              recognition.lang = 'en-US';
            }
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
              setIsRecording(true);
              if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                  setRecordingDuration(prev => {
                    totalSpeakingSecondsRef.current += 1;
                    return prev + 1;
                  });
                }, 1000);
              }
            };

            recognition.onresult = (event: any) => {
              let currentInterim = '';
              const newFinals: string[] = [];

              for (let i = event.resultIndex; i < event.results.length; i++) {
                const item = event.results[i];
                const text = item[0]?.transcript?.trim() || '';
                if (!text) continue;

                if (item.isFinal) {
                  newFinals.push(text);
                } else {
                  currentInterim += (currentInterim ? ' ' : '') + text;
                }
              }

              if (newFinals.length > 0) {
                finalizedSegmentsRef.current.push(...newFinals);
                const fullFinal = finalizedSegmentsRef.current.join(' ');
                const updated = baseTextRef.current
                  ? `${baseTextRef.current} ${fullFinal}`
                  : fullFinal;
                setInputText(updated);
              }

              interimTranscriptRef.current = currentInterim;
              setInterimTranscript(currentInterim);
            };

            recognition.onerror = (event: any) => {
              console.warn('[STT] Recognition event error:', event.error);
              if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isRecordingIntentRef.current = false;
                setIsRecording(false);
                setSpeechError('Microphone permission was denied.');
              } else if (event.error === 'network') {
                setSpeechError('Speech recognition network error. Please verify internet connection.');
              } else if (event.error === 'audio-capture') {
                isRecordingIntentRef.current = false;
                setIsRecording(false);
                setSpeechError('No audio capture device found.');
              }
              // Normal speech pause (no-speech) - keep listening
            };

            recognition.onend = () => {
              // Flush any lingering interim text so pauses do not lose words
              if (interimTranscriptRef.current) {
                finalizedSegmentsRef.current.push(interimTranscriptRef.current);
                const fullFinal = finalizedSegmentsRef.current.join(' ');
                const updated = baseTextRef.current
                  ? `${baseTextRef.current} ${fullFinal}`
                  : fullFinal;
                setInputText(updated);
                interimTranscriptRef.current = '';
                setInterimTranscript('');
              }

              // Auto-restart smoothly if candidate is still speaking/pausing
              if (isRecordingIntentRef.current) {
                setTimeout(() => {
                  if (isRecordingIntentRef.current) {
                    createAndStartRecognition();
                  }
                }, 120);
              } else {
                setIsRecording(false);
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
              }
            };

            recognitionRef.current = recognition;
            recognition.start();
          } catch (initErr) {
            console.error('[STT] SpeechRecognition start failed:', initErr);
            isRecordingIntentRef.current = false;
            setIsRecording(false);
          }
        };

        createAndStartRecognition();
        return;
      }
    }

    // Fallback: Audio recording
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        isRecordingIntentRef.current = false;
        Alert.alert('Permission needed', 'Microphone access is required for voice practice.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Platform.OS === 'web'
          ? { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, web: { mimeType: 'audio/webm', bitsPerSecond: 128000 } } as any
          : Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          totalSpeakingSecondsRef.current += 1;
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start native recording', err);
      isRecordingIntentRef.current = false;
      setIsRecording(false);
      setSpeechError('Could not start microphone recording.');
    }
  };

  // Voice Recording: Stop
  const stopRecording = async () => {
    isRecordingIntentRef.current = false;

    // Stop fluency analysis and collect turn-level results
    vadRef.current.stop();
    pitchRef.current.stop();
    const turnSilence = vadRef.current.getSilenceIntervals();
    const turnPitch = pitchRef.current.getResult();
    if (turnSilence.length > 0) {
      sessionSilenceIntervalsRef.current.push(...turnSilence);
      vadRef.current.reset(); // clear so next turn starts fresh
    }
    if (turnPitch.variationIndex > 0) {
      sessionPitchResultRef.current = { variationIndex: turnPitch.variationIndex, label: turnPitch.label };
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
      setIsRecording(false);

      if (interimTranscriptRef.current) {
        finalizedSegmentsRef.current.push(interimTranscriptRef.current);
        interimTranscriptRef.current = '';
        setInterimTranscript('');
      }

      const fullFinal = finalizedSegmentsRef.current.join(' ');
      if (fullFinal) {
        const finalCommitted = baseTextRef.current
          ? `${baseTextRef.current} ${fullFinal}`
          : fullFinal;
        setInputText(finalCommitted);
      }
      return;
    }

    if (!recordingRef.current) return;

    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const rawBlob = await response.blob();
            formData.append('file', rawBlob, 'recording.webm');
          } else {
            formData.append('file', {
              uri,
              type: 'audio/m4a',
              name: 'recording.m4a',
            } as any);
          }

          const response = await fetch(STT_URL, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              setInputText(prev => prev + (prev ? ' ' : '') + data.text);
            }
          }
        } catch (sttErr) {
          console.error('[STT] Server upload failed:', sttErr);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Submit User Argument
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;

    // If recording, stop first and flush speech
    if (isRecording || isRecordingIntentRef.current) {
      await stopRecording();
    }

    const pendingInterim = interimTranscriptRef.current || interimTranscript;
    const finalFromSegments = finalizedSegmentsRef.current.join(' ');
    let fullText = inputText;
    if (finalFromSegments && !inputText.includes(finalFromSegments)) {
      fullText = baseTextRef.current
        ? `${baseTextRef.current} ${finalFromSegments}`
        : finalFromSegments;
    }
    if (pendingInterim && !fullText.includes(pendingInterim)) {
      fullText = fullText ? `${fullText} ${pendingInterim}` : pendingInterim;
    }

    const combinedText = fullText.trim();
    if (!combinedText) {
      Alert.alert('Empty Input', 'Please speak or type your argument before submitting.');
      return;
    }

    if (!session) return;

    isSubmittingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let finalEyeContactPct = 0;
    let finalPostureScore = 0;
    let finalGestureScore = 0;
    let finalStabilityScore = 100;
    let finalMaxStress = 'Low';
    let finalProfessionalismScore = 75;

    try {
      if (accumulatedMetrics.frameCount > 0) {
        finalEyeContactPct = Math.round((accumulatedMetrics.eyeContactCount / accumulatedMetrics.frameCount) * 100);
        finalPostureScore = Math.round((accumulatedMetrics.postureScore / accumulatedMetrics.frameCount) * 100);
        finalGestureScore = Math.round(accumulatedMetrics.gestureScores.reduce((a, b) => a + b, 0) / (accumulatedMetrics.gestureScores.length || 1));
        finalStabilityScore = Math.round(accumulatedMetrics.stabilityScores.reduce((a, b) => a + b, 0) / (accumulatedMetrics.stabilityScores.length || 1));
        finalMaxStress = accumulatedMetrics.maxStress;

        const dominantEmotion = accumulatedMetrics.emotions.sort((a, b) =>
          accumulatedMetrics.emotions.filter(v => v === a).length - accumulatedMetrics.emotions.filter(v => v === b).length
        ).pop() || 'Neutral';

        finalProfessionalismScore = calculateProfessionalismScore({
          posture: finalPostureScore > 65 ? 'Straight' : 'Slouching',
          eyeContact: finalEyeContactPct > 50,
          gestureScore: finalGestureScore,
          emotion: dominantEmotion.toLowerCase(),
          emotionConfidence: 0.85,
          attentionScore: finalEyeContactPct,
          stabilityScore: finalStabilityScore
        });
      }

      setAccumulatedMetrics({
        emotions: [],
        eyeContactCount: 0,
        postureScore: 0,
        frameCount: 0,
        gestureScores: [],
        stabilityScores: [],
        maxStress: 'Low'
      });

      const newEntry: PracticeEntry = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        text: combinedText,
        inputMode,
        analysis: null,
        wordCount: combinedText.split(/\s+/).filter(Boolean).length,
        createdAt: new Date().toISOString(),
        ...({
          eyeContactPercentage: finalEyeContactPct,
          postureScore: finalPostureScore,
          gestureScore: finalGestureScore,
          professionalismScore: finalProfessionalismScore,
          stabilityScore: finalStabilityScore,
          stressLevel: finalMaxStress,
          engagementScore: Math.round((finalEyeContactPct + finalPostureScore + finalGestureScore + finalProfessionalismScore + finalStabilityScore) / 5),
        } as any)
      };

      addEntry(session.id, newEntry);
      setInputText('');
      setInterimTranscript('');
      baseTextRef.current = '';
      finalizedSegmentsRef.current = [];
      interimTranscriptRef.current = '';

      // Trigger AI Response — FSM-enforced: recordUserSpoke transitions
      // the FSM from WAITING_FOR_CANDIDATE → PROCESSING_CANDIDATE, which
      // is the ONLY state in which canAISpeak() returns true.
      if (practiceMode === 'ai') {
        recordUserSpoke();   // FSM transition: unlock exactly ONE AI turn
        const updatedEntries = [...session.entries, newEntry];
        setTimeout(() => triggerAIResponse(updatedEntries), 800);
      }
    } catch (error) {
      console.error('[PracticeScreen] Submit error:', error);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [inputText, interimTranscript, isRecording, session, practiceMode, isAISpeaking, inputMode, accumulatedMetrics, addEntry, triggerAIResponse]);

  // Final Session Evaluation
  const handleFinalSubmit = useCallback(async () => {
    if (!session) return;

    if (session.entries.length === 0) {
      Alert.alert(
        'No Discussion Entries',
        'Please contribute at least one argument before finishing the session to generate your GD evaluation report.'
      );
      return;
    }

    if (isFinalAnalyzing) return;

    setIsFinalAnalyzing(true);
    try {
      const durationSeconds = Math.max(
        totalSpeakingSecondsRef.current,
        Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      );

      const sessStats = sessionAccumulatedMetricsRef.current;
      const liveCameraStats = sessStats.frameCount > 0 ? {
        frameCount: sessStats.frameCount,
        avgEyeContactPct: Math.round((sessStats.eyeContactCount / sessStats.frameCount) * 100),
        avgPostureScore: Math.round((sessStats.postureScore / sessStats.frameCount) * 100),
        avgGestureScore: sessStats.gestureScores.length > 0
          ? Math.round(sessStats.gestureScores.reduce((a, b) => a + b, 0) / sessStats.gestureScores.length)
          : undefined,
        avgStabilityScore: sessStats.stabilityScores.length > 0
          ? Math.round(sessStats.stabilityScores.reduce((a, b) => a + b, 0) / sessStats.stabilityScores.length)
          : undefined,
        dominantStress: sessStats.maxStress,
        // Fluency data collected from VoiceActivityDetector and PitchVariationAnalyser
        silenceIntervalsMs: sessionSilenceIntervalsRef.current,
        pitchVariationIndex: sessionPitchResultRef.current.variationIndex,
        pitchLabel: sessionPitchResultRef.current.label,
      } : undefined;

      const result = await generateComprehensiveReport(session, durationSeconds, liveCameraStats);
      setFinalAnalysis(result.reportText);

      // Save report into SessionContext & persistent storage with full rubric breakdown and unlocked badges
      saveFinalReport(session.id, result.reportText, {
        avgEyeContact: result.metrics.avgEyeContactPct ?? undefined,
        avgPosture: result.metrics.avgPostureScore ?? undefined,
        avgGestures: result.metrics.avgGestureScore ?? undefined,
        avgStability: result.metrics.avgStabilityScore ?? undefined,
        avgProfessionalism: result.metrics.avgProfessionalismScore ?? undefined,
        totalWords: result.metrics.totalUserWords,
        wpm: result.metrics.wpm,
        fillerWordsCount: result.metrics.fillerWordsCount,
        readinessScore: result.metrics.overallScore,
        rubricBreakdown: result.metrics.rubricBreakdown,
        unlockedBadges: result.metrics.unlockedBadgeIds,
      });

      // Optional backend sync to MongoDB
      try {
        fetch('http://localhost:3000/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            topic: session.topic,
            category: session.category,
            reportText: result.reportText,
            metrics: {
              ...result.metrics,
              rubricBreakdown: result.metrics.rubricBreakdown,
              unlockedBadges: result.metrics.unlockedBadgeIds,
            },
          }),
        }).catch(err => {
          console.log('[PracticeScreen] Backend sync optional notice:', err.message);
        });
      } catch (_) {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[PracticeScreen] Final analysis failed:', error);
      Alert.alert('Analysis Failed', 'Could not generate report. Please try again.');
    } finally {
      setIsFinalAnalyzing(false);
    }
  }, [session, isFinalAnalyzing, saveFinalReport]);

  const handleCopyReport = async () => {
    if (!finalAnalysis) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(finalAnalysis);
      }
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  const handleExportReport = async () => {
    if (!finalAnalysis || !session) return;
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([finalAnalysis], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FluentEdge_GD_Report_${(session.topic || 'Session').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Export failed', e);
    }
  };

  const renderCleanReport = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      let cleanLine = line.replace(/[*\|\\]/g, '').trim();

      if (cleanLine.startsWith('### ')) {
        return <Text key={index} style={styles.reportHeading3}>{cleanLine.replace('### ', '')}</Text>;
      } else if (cleanLine.startsWith('## ')) {
        return <Text key={index} style={styles.reportHeading2}>{cleanLine.replace('## ', '')}</Text>;
      } else if (cleanLine.startsWith('- ')) {
        return (
          <View key={index} style={styles.reportBulletRow}>
            <Text style={styles.reportBullet}>•</Text>
            <Text style={styles.reportParagraph}>{cleanLine.replace('- ', '')}</Text>
          </View>
        );
      } else if (cleanLine.length > 0) {
        return <Text key={index} style={styles.reportParagraph}>{cleanLine}</Text>;
      }
      return <View key={index} style={{ height: 10 }} />;
    });
  };

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const config = CATEGORY_CONFIG[session.category as SessionCategory] || { label: session.category || 'General', emoji: '💬', color: DS.primary };
  const wordCount = inputText.split(/\s+/).filter(Boolean).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Custom Header ── */}
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
              <ChevronLeft size={22} color={DS.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                setIsTtsMuted(!isTtsMuted);
                if (!isTtsMuted) tts.stop();
              }}
              style={styles.headerAudioBtn}
              accessibilityLabel={isTtsMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            >
              {isTtsMuted ? <VolumeX size={18} color={DS.danger} /> : <Volume2 size={18} color={DS.primary} />}
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Session Info Header Card ── */}
          <View style={styles.sessionHeaderCard}>
            <View style={styles.sessionHeaderTop}>
              <View style={[styles.categoryBadge, { backgroundColor: config.color + '18' }]}>
                <Text style={styles.badgeEmoji}>{config.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={styles.timerBadge}>
                <Clock size={13} color={DS.primary} />
                <Text style={styles.timerText}>{formatTime(sessionTimer)}</Text>
              </View>
            </View>
            <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
            {session.topic && (
              <View style={styles.topicBanner}>
                <FileText size={12} color={DS.primary} />
                <Text style={styles.topicBannerText} numberOfLines={2}>{session.topic}</Text>
              </View>
            )}
            {/* End Session button */}
            <TouchableOpacity
              style={[styles.endSessionBtn, isFinalAnalyzing && { opacity: 0.5 }]}
              onPress={handleFinalSubmit}
              disabled={isFinalAnalyzing}
            >
              {isFinalAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Sparkles size={15} color="#FFFFFF" />
              )}
              <Text style={styles.endSessionBtnText}>
                {isFinalAnalyzing ? 'Generating Report...' : 'End Session & Get Report'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── SpeakingIndicator ── */}
          <SpeakingIndicator
            isSpeaking={isAISpeaking || isRecording}
            speakerName={isRecording ? 'You' : currentSpeakerName}
            isUser={isRecording}
          />

          {/* ── AI Participants Panel ── */}
          {practiceMode === 'ai' && (
            <View style={styles.participantsSection}>
              <View style={styles.participantsHeaderRow}>
                <Text style={styles.sectionLabel}>AI Discussion Members</Text>
                {isAISpeaking && (
                  <View style={styles.aiThinkingBadge}>
                    <ActivityIndicator size="small" color={DS.primary} />
                    <Text style={styles.aiThinkingText}>{currentSpeakerName} is speaking...</Text>
                  </View>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsList}>
                {AI_PARTICIPANTS.map(p => {
                  const isCurrent = currentSpeakerName === p.name && isAISpeaking;
                  const pColor = getParticipantColor(p.name);
                  return (
                    <Animated.View
                      key={p.id}
                      style={[
                        styles.participantCard,
                        isCurrent && {
                          borderColor: pColor,
                          backgroundColor: pColor + '10',
                          transform: [{ scale: pulseAnim }],
                        }
                      ]}
                    >
                      <View style={[
                        styles.participantAvatar,
                        {
                          backgroundColor: pColor,
                          borderWidth: isCurrent ? 3 : 0,
                          borderColor: isCurrent ? pColor + '60' : 'transparent',
                        }
                      ]}>
                        <Text style={styles.avatarText}>{p.name[0]}</Text>
                      </View>
                      <Text style={[styles.participantName, isCurrent && { color: pColor }]} numberOfLines={1}>{p.name}</Text>
                      <View style={[styles.rolePillSmall, { backgroundColor: pColor + '18' }]}>
                        <Text style={[styles.rolePillSmallText, { color: pColor }]}>{getParticipantRole(p.name)}</Text>
                      </View>
                      {isCurrent && (
                        <View style={[styles.speakingLabel, { backgroundColor: pColor }]}>
                          <Text style={styles.speakingLabelText}>Speaking</Text>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Practice Mode Toggle ── */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeTab, practiceMode === 'ai' && styles.modeTabActive]}
              onPress={() => setPracticeMode('ai')}
            >
              <Sparkles size={14} color={practiceMode === 'ai' ? DS.primary : DS.textTertiary} />
              <Text style={[styles.modeTabText, practiceMode === 'ai' && styles.modeTabTextActive]}>AI Simulated GD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, practiceMode === 'individual' && styles.modeTabActive]}
              onPress={() => setPracticeMode('individual')}
            >
              <UserCheck size={14} color={practiceMode === 'individual' ? DS.primary : DS.textTertiary} />
              <Text style={[styles.modeTabText, practiceMode === 'individual' && styles.modeTabTextActive]}>Solo Practice</Text>
            </TouchableOpacity>
          </View>

          {/* ── Camera & Analytics Panel ── */}
          <View style={styles.cameraControlRow}>
            <TouchableOpacity
              style={[styles.cameraToggleBtn, isCameraActive && styles.cameraToggleBtnActive]}
              onPress={() => setIsCameraActive(!isCameraActive)}
            >
              {isCameraActive ? (
                <Video size={15} color={DS.primary} />
              ) : (
                <VideoOff size={15} color={DS.textTertiary} />
              )}
              <Text style={[styles.cameraToggleBtnText, isCameraActive && { color: DS.primary }]}>
                {isCameraActive ? 'Camera On' : 'Camera Off'}
              </Text>
            </TouchableOpacity>
            {isCameraActive && (
              <View style={styles.engagementMiniBar}>
                <Text style={styles.engagementMiniLabel}>Attention</Text>
                <View style={styles.engagementMiniTrack}>
                  <View style={[
                    styles.engagementMiniFill,
                    {
                      width: `${liveMetrics.isCameraActive && liveMetrics.isFaceDetected ? liveMetrics.engagementScore : 0}%`,
                      backgroundColor: liveMetrics.engagementScore > 65 ? DS.success : DS.warning,
                    }
                  ]} />
                </View>
                <Text style={styles.engagementMiniPct}>
                  {liveMetrics.isCameraActive && liveMetrics.isFaceDetected ? `${liveMetrics.engagementScore}%` : '--'}
                </Text>
              </View>
            )}
          </View>

          {isCameraActive && (
            <View style={styles.cameraRow}>
              {/* Camera Preview */}
              <View style={styles.cameraFrame}>
                <CameraEngine onMetricsUpdate={handleMetricsUpdate} />
              </View>

              {/* Real-time Behavioral Analytics */}
              <View style={styles.analyticsPanel}>
                <View style={styles.metricItem}>
                  <Activity size={15} color={liveMetrics.isFaceDetected ? DS.success : DS.textTertiary} />
                  <Text style={styles.metricLabel}>
                    Emotion:{' '}
                    <Text style={styles.metricValue}>
                      {liveMetrics.isCameraActive
                        ? (liveMetrics.isFaceDetected ? `${liveMetrics.emotion} (${Math.round(liveMetrics.emotionConfidence * 100)}%)` : 'Looking for face...')
                        : 'Camera unavailable'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Eye size={15} color={liveMetrics.eyeContact ? DS.primary : DS.danger} />
                  <Text style={styles.metricLabel}>
                    Eye Contact:{' '}
                    <Text style={[styles.metricValue, { color: liveMetrics.eyeContact ? DS.primary : DS.textSecondary }]}>
                      {liveMetrics.isCameraActive
                        ? (liveMetrics.isFaceDetected
                            ? (liveMetrics.eyeContact ? 'Direct (Screen)' : 'Looking Away')
                            : 'Unable to detect')
                        : 'Unavailable'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <UserCheck size={15} color={liveMetrics.posture === 'Straight' ? DS.success : DS.warning} />
                  <Text style={styles.metricLabel}>
                    Posture:{' '}
                    <Text style={styles.metricValue}>
                      {liveMetrics.isCameraActive
                        ? (liveMetrics.isFaceDetected ? liveMetrics.posture : 'Unable to detect')
                        : 'Unavailable'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Hand
                    size={15}
                    color={
                      liveMetrics.isCameraActive && liveMetrics.handVisible
                        ? (liveMetrics.gestureStatus === 'Good'
                            ? DS.success
                            : liveMetrics.gestureStatus === 'Excessive'
                              ? DS.danger
                              : DS.primary)
                        : DS.textTertiary
                    }
                  />
                  <Text style={styles.metricLabel}>
                    Gestures:{' '}
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color: liveMetrics.isCameraActive && liveMetrics.handVisible
                            ? (liveMetrics.gestureStatus === 'Good'
                                ? DS.success
                                : liveMetrics.gestureStatus === 'Excessive'
                                  ? DS.danger
                                  : DS.primary)
                            : DS.textSecondary
                        }
                      ]}
                    >
                      {liveMetrics.isCameraActive
                        ? (liveMetrics.handVisible
                            ? (liveMetrics.gestureStatus === 'Good'
                                ? 'Expressive (Good)'
                                : liveMetrics.gestureStatus === 'Excessive'
                                  ? 'Excessive Gestures'
                                  : liveMetrics.gestureStatus === 'Low'
                                    ? 'Resting / Minimal'
                                    : 'Unable to Detect')
                            : (liveMetrics.gestureStatus === 'Unable to Detect' ? 'Unable to Detect' : 'Hands Not Visible'))
                        : 'Unavailable'}
                    </Text>
                  </Text>
                </View>

                {/* Attention Meter */}
                <View style={styles.attentionContainer}>
                  <View style={styles.attentionHeader}>
                    <Text style={styles.attentionLabel}>Attention Meter</Text>
                    <Text style={styles.attentionPercent}>
                      {liveMetrics.isCameraActive && liveMetrics.isFaceDetected ? `${liveMetrics.engagementScore}%` : '0%'}
                    </Text>
                  </View>
                  <View style={styles.attentionTrack}>
                    <View
                      style={[
                        styles.attentionFill,
                        {
                          width: `${liveMetrics.isCameraActive && liveMetrics.isFaceDetected ? liveMetrics.engagementScore : 0}%`,
                          backgroundColor: liveMetrics.engagementScore > 65 ? DS.primary : DS.warning
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Input Section ── */}
          <View style={styles.inputSection}>
            {/* Input mode toggle: Text | Voice */}
            <View style={styles.inputModeToggleRow}>
              <TouchableOpacity
                style={[styles.inputModeTab, inputMode === 'text' && styles.inputModeTabActive]}
                onPress={() => setInputMode('text')}
              >
                <Type size={14} color={inputMode === 'text' ? DS.primary : DS.textTertiary} />
                <Text style={[styles.inputModeTabText, inputMode === 'text' && styles.inputModeTabTextActive]}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModeTab, inputMode === 'voice' && styles.inputModeTabVoiceActive]}
                onPress={() => setInputMode('voice')}
              >
                <Mic size={14} color={inputMode === 'voice' ? DS.voiceActive : DS.textTertiary} />
                <Text style={[styles.inputModeTabText, inputMode === 'voice' && styles.inputModeTabVoiceText]}>Voice</Text>
              </TouchableOpacity>
            </View>

            {/* Text mode */}
            {inputMode === 'text' ? (
              <View>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Type your arguments, counter-points, or opening statement..."
                  placeholderTextColor={DS.textTertiary}
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isAISpeaking}
                />
                <View style={styles.inputFooterRow}>
                  <Text style={styles.wordCountText}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</Text>
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      (!inputText.trim() || isAISpeaking) && styles.sendBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!inputText.trim() || isAISpeaking}
                  >
                    <Send size={16} color="#FFFFFF" />
                    <Text style={styles.sendBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Voice mode */
              <View style={styles.voiceSection}>
                {/* Speech error banner */}
                {speechError && (
                  <View style={styles.speechErrorBox}>
                    <AlertCircle size={14} color={DS.danger} />
                    <Text style={styles.speechErrorText}>{speechError}</Text>
                  </View>
                )}

                {/* Mic status */}
                <View style={styles.micStatusRow}>
                  <View style={[
                    styles.micStatusIndicator,
                    isRecording ? styles.micStatusListening : isTranscribing ? styles.micStatusProcessing : styles.micStatusReady
                  ]}>
                    <View style={[
                      styles.micStatusDot,
                      { backgroundColor: isRecording ? '#EF4444' : isTranscribing ? '#F59E0B' : '#10B981' }
                    ]} />
                    <Text style={styles.micStatusText}>
                      {isRecording ? 'Listening...' : isTranscribing ? 'Processing...' : 'Microphone Ready'}
                    </Text>
                  </View>
                  {isRecording && (
                    <Text style={styles.recordingTimerText}>
                      ⏱️ {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  )}
                </View>

                {/* Live speech preview */}
                <View style={[styles.transcriptionPreview, isRecording && styles.transcriptionPreviewRecording]}>
                  <Text style={[styles.transcriptionText, !inputText && !interimTranscript && styles.transcriptionPlaceholder]}>
                    {inputText
                      ? (interimTranscript ? `${inputText} ${interimTranscript}` : inputText)
                      : (interimTranscript || (isRecording ? "Listening... Speak your arguments freely..." : "Click the microphone button to speak your argument..."))}
                  </Text>
                </View>

                {/* Large circular record button */}
                <Animated.View style={{ transform: [{ scale: recordPulseAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      isRecording && styles.recordButtonActive,
                      isAISpeaking && styles.recordButtonDisabled
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.8}
                    disabled={isAISpeaking}
                    accessibilityLabel={isRecording ? "Stop recording speech" : "Start recording speech"}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Mic size={32} color={isRecording ? "#FFFFFF" : DS.primary} />
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <Text style={[styles.recordInstruction, isRecording && { color: DS.voiceActive, fontWeight: '700' }]}>
                  {isTranscribing
                    ? 'Processing audio transcription...'
                    : isRecording
                      ? `Listening (Pauses handled smoothly) — Click to stop`
                      : 'Click to speak your argument'}
                </Text>

                {/* Word count + submit for voice */}
                {(inputText || interimTranscript) && (
                  <View style={styles.voiceSubmitRow}>
                    <Text style={styles.wordCountText}>
                      {inputText.split(/\s+/).filter(Boolean).length} words captured
                    </Text>
                    <TouchableOpacity
                      style={[styles.sendBtn, isAISpeaking && styles.sendBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={isAISpeaking}
                    >
                      <Send size={15} color="#FFFFFF" />
                      <Text style={styles.sendBtnText}>{isRecording ? 'Stop & Submit' : 'Submit'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* AI responding indicator */}
            {isAISpeaking && (
              <View style={styles.aiRespondingBanner}>
                <ActivityIndicator size="small" color={DS.primary} />
                <Text style={styles.aiRespondingText}>AI is responding...</Text>
              </View>
            )}
          </View>

          {/* ── Discussion Transcript ── */}
          <View style={styles.entriesList}>
            <View style={styles.transcriptHeader}>
              <Text style={styles.sectionLabel}>Discussion Transcript</Text>
              <View style={styles.transcriptCountBadge}>
                <Text style={styles.transcriptCountText}>{session.entries.length} turns</Text>
              </View>
            </View>

            {session.entries.length === 0 ? (
              <View style={styles.emptyEntriesBox}>
                <Sparkles size={28} color={DS.primary} style={{ marginBottom: 10, opacity: 0.5 }} />
                <Text style={styles.emptyEntriesText}>No discussion entries yet.</Text>
                <Text style={styles.emptyEntriesSubtext}>Speak or type your opening argument above to begin the simulated GD.</Text>
              </View>
            ) : (
              session.entries.map(entry => (
                <EntryCard key={entry.id} entry={entry} sessionId={session.id} onDelete={deleteEntry} />
              ))
            )}

            {/* Pulsing speaking bar when AI is speaking */}
            {isAISpeaking && (
              <Animated.View style={[styles.speakingBarContainer, { transform: [{ scaleX: pulseAnim }] }]}>
                <View style={styles.speakingBar} />
              </Animated.View>
            )}
          </View>

          {/* ── Performance Report ── */}
          {finalAnalysis && (
            <View style={styles.finalAnalysisContainer}>
              <View style={styles.finalAnalysisHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.reportIconCircle}>
                    <Sparkles size={18} color={DS.primary} />
                  </View>
                  <Text style={styles.finalAnalysisTitle}>Full GD Evaluation Report</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    onPress={handleCopyReport}
                    activeOpacity={0.7}
                    accessibilityLabel="Copy GD Report"
                  >
                    {copiedReport ? (
                      <Check size={13} color={DS.success} />
                    ) : (
                      <Copy size={13} color={DS.primary} />
                    )}
                    <Text style={[styles.reportActionText, copiedReport && { color: DS.success }]}>
                      {copiedReport ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    onPress={handleExportReport}
                    activeOpacity={0.7}
                    accessibilityLabel="Export GD Report"
                  >
                    <Download size={13} color={DS.primary} />
                    <Text style={styles.reportActionText}>Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.reportDivider} />
              {renderCleanReport(finalAnalysis)}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.bg,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 18,
    paddingBottom: 48,
  },

  // ── Header ──
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.surface,
    borderWidth: 1,
    borderColor: DS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 8,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAudioBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.surface,
    borderWidth: 1,
    borderColor: DS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 8,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Session Header Card ──
  sessionHeaderCard: {
    backgroundColor: DS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DS.border,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeEmoji: {
    fontSize: 14,
    marginRight: 5,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DS.primaryLighter,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: DS.primary,
    fontVariant: ['tabular-nums'],
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DS.text,
    marginBottom: 10,
    lineHeight: 29,
  },
  topicBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: DS.primaryLighter,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
  },
  topicBannerText: {
    flex: 1,
    fontSize: 13,
    color: DS.text,
    fontWeight: '600',
    lineHeight: 19,
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.danger,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: DS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  endSessionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── AI Participants Panel ──
  participantsSection: {
    marginBottom: 16,
  },
  participantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  aiThinkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DS.primaryLighter,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
  },
  aiThinkingText: {
    fontSize: 11,
    color: DS.primary,
    fontWeight: '600',
  },
  participantsList: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  participantCard: {
    alignItems: 'center',
    width: 82,
    padding: 10,
    borderRadius: 16,
    backgroundColor: DS.surface,
    borderWidth: 1.5,
    borderColor: DS.border,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 4,
  },
  participantAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  participantName: {
    color: DS.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  rolePillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  rolePillSmallText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  speakingLabel: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  speakingLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // ── Practice Mode Toggle ──
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: DS.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DS.border,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: DS.surface,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.textSecondary,
  },
  modeTabTextActive: {
    color: DS.text,
    fontWeight: '700',
  },

  // ── Camera Control Row ──
  cameraControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cameraToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: DS.surfaceElevated,
    borderWidth: 1,
    borderColor: DS.border,
  },
  cameraToggleBtnActive: {
    backgroundColor: DS.primaryLighter,
    borderColor: DS.primaryBorder,
  },
  cameraToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.textSecondary,
  },
  engagementMiniBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engagementMiniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DS.textSecondary,
    width: 56,
  },
  engagementMiniTrack: {
    flex: 1,
    height: 6,
    backgroundColor: DS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  engagementMiniFill: {
    height: '100%',
    borderRadius: 3,
  },
  engagementMiniPct: {
    fontSize: 11,
    fontWeight: '800',
    color: DS.primary,
    width: 32,
    textAlign: 'right',
  },

  // ── Camera Row ──
  cameraRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  cameraFrame: {
    width: 170,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DS.border,
  },
  analyticsPanel: {
    flex: 1,
    backgroundColor: DS.surfaceElevated,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: DS.border,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metricLabel: {
    color: DS.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    color: DS.text,
    fontWeight: '700',
  },
  attentionContainer: {
    marginTop: 2,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  attentionLabel: {
    color: DS.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  attentionPercent: {
    color: DS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  attentionTrack: {
    height: 6,
    backgroundColor: DS.border,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  attentionFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Input Section ──
  inputSection: {
    backgroundColor: DS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.border,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  inputModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: DS.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DS.border,
  },
  inputModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  inputModeTabActive: {
    backgroundColor: DS.surface,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  inputModeTabVoiceActive: {
    backgroundColor: DS.voiceLight,
    shadowColor: DS.voiceActive,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  inputModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.textSecondary,
  },
  inputModeTabTextActive: {
    color: DS.text,
    fontWeight: '700',
  },
  inputModeTabVoiceText: {
    color: DS.voiceActive,
    fontWeight: '700',
  },
  inputBox: {
    minHeight: 100,
    backgroundColor: DS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    color: DS.text,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: DS.border,
    lineHeight: 22,
  },
  inputFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  wordCountText: {
    fontSize: 12,
    color: DS.textTertiary,
    fontWeight: '500',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  aiRespondingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DS.primaryLighter,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
  },
  aiRespondingText: {
    color: DS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Voice mode
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  speechErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    width: '100%',
  },
  speechErrorText: {
    color: DS.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  micStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  micStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  micStatusReady: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  micStatusListening: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  micStatusProcessing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  micStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  micStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.text,
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '800',
    color: DS.voiceActive,
  },
  transcriptionPreview: {
    backgroundColor: DS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DS.border,
    minHeight: 70,
    width: '100%',
    justifyContent: 'center',
  },
  transcriptionPreviewRecording: {
    borderColor: DS.voiceActive,
    backgroundColor: '#FEF2F2',
  },
  transcriptionText: {
    color: DS.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  transcriptionPlaceholder: {
    color: DS.textTertiary,
    fontStyle: 'italic',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DS.primaryLighter,
    borderWidth: 2.5,
    borderColor: DS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  recordButtonActive: {
    backgroundColor: DS.voiceActive,
    borderColor: '#B91C1C',
    shadowColor: DS.voiceActive,
    shadowOpacity: 0.3,
  },
  recordButtonDisabled: {
    opacity: 0.4,
  },
  recordInstruction: {
    color: DS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  voiceSubmitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },

  // ── Transcript Section ──
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transcriptCountBadge: {
    backgroundColor: DS.primaryLighter,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
  },
  transcriptCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.primary,
  },
  entriesList: {
    gap: 12,
    marginBottom: 20,
  },
  emptyEntriesBox: {
    backgroundColor: DS.surface,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.border,
    marginTop: 4,
  },
  emptyEntriesText: {
    fontSize: 15,
    fontWeight: '700',
    color: DS.text,
    marginBottom: 6,
  },
  emptyEntriesSubtext: {
    fontSize: 13,
    color: DS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  speakingBarContainer: {
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: 4,
  },
  speakingBar: {
    height: 4,
    backgroundColor: DS.primary,
    borderRadius: 4,
    opacity: 0.6,
  },

  // ── EntryCard ──
  entryCard: {
    backgroundColor: DS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.border,
    borderLeftWidth: 4,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  entryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  speakerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  speakerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  speakerNameText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  speakerRoleSubtext: {
    fontSize: 10,
    color: DS.textTertiary,
    fontWeight: '600',
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  entryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: {
    fontSize: 11,
    color: DS.textTertiary,
  },
  inputModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  voiceBadge: {
    backgroundColor: DS.voiceLight,
  },
  textBadge: {
    backgroundColor: DS.primaryLighter,
  },
  inputModeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  voiceBadgeText: {
    color: DS.voiceActive,
  },
  textBadgeText: {
    color: DS.primary,
  },
  entryWordCount: {
    fontSize: 11,
    color: DS.textTertiary,
  },
  entryDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  entryText: {
    fontSize: 15,
    color: DS.text,
    lineHeight: 23,
    marginBottom: 10,
  },
  analysisToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: DS.primaryLighter,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
    marginTop: 4,
  },
  analysisToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.primary,
  },
  analysisBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DS.border,
  },
  pulseSection: {
    marginBottom: 10,
  },
  pulseTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: DS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    gap: 8,
  },
  pulseLabel: {
    width: 92,
    fontSize: 11,
    color: DS.textSecondary,
    fontWeight: '500',
  },
  pulseBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: DS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pulseBar: {
    height: '100%',
    borderRadius: 3,
  },
  pulseValue: {
    width: 34,
    fontSize: 11,
    color: DS.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  analysisText: {
    fontSize: 13,
    color: DS.textSecondary,
    lineHeight: 20,
  },

  // ── Report ──
  finalAnalysisContainer: {
    marginTop: 4,
    backgroundColor: DS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: DS.border,
    shadowColor: DS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  finalAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reportIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.primaryLighter,
    borderWidth: 1,
    borderColor: DS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finalAnalysisTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DS.text,
  },
  reportDivider: {
    height: 1,
    backgroundColor: DS.border,
    marginBottom: 14,
  },
  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: DS.surfaceElevated,
    borderWidth: 1,
    borderColor: DS.border,
  },
  reportActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.text,
  },
  reportHeading2: {
    fontSize: 17,
    fontWeight: '800',
    color: DS.primary,
    marginTop: 16,
    marginBottom: 6,
  },
  reportHeading3: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.accent,
    marginTop: 10,
    marginBottom: 4,
  },
  reportParagraph: {
    fontSize: 14,
    color: DS.text,
    lineHeight: 21,
    flex: 1,
  },
  reportBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingRight: 6,
  },
  reportBullet: {
    color: DS.primary,
    marginRight: 8,
    fontSize: 14,
    marginTop: 1,
  },

  // ── Error / Misc ──
  errorContainer: {
    flex: 1,
    backgroundColor: DS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: DS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 48,
  },
});
