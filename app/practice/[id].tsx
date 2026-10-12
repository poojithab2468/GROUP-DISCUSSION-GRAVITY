import CameraEngine, { BehavioralMetrics } from '@/components/CameraEngine.web';
import SpeakingIndicator from '@/components/SpeakingIndicator';
import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { CATEGORY_CONFIG, InputMode, PracticeEntry, SessionCategory } from '@/types/session';
import { AI_PARTICIPANTS, getNextAISpeaker } from '@/utils/AIParticipantManager';
import { generateAIResponse } from '@/utils/AIResponseGenerator';
import { generateComprehensiveReport } from '@/utils/AIReportGenerator';
import { calculateProfessionalismScore } from '@/utils/ProfessionalismScore';
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
    const aiColor = (entry as any).avatarColor || Colors.light.tint;
    const participantName = (entry as any).participantName || 'AI Peer';

    return (
      <View style={[
        styles.entryCard,
        isAI
          ? { borderLeftWidth: 4, borderLeftColor: aiColor, backgroundColor: '#FFFFFF' }
          : { borderLeftWidth: 4, borderLeftColor: Colors.light.tint, backgroundColor: '#F8FAFC' }
      ]}>
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
                  <Text style={styles.speakerRoleSubtext}>
                    {participantName === 'Aarav' ? 'Analytical' :
                     participantName === 'Vikram' ? 'Challenger' :
                     participantName === 'Ananya' ? 'Supportive' :
                     participantName === 'Maya' ? 'Creative' : 'AI Peer'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.speakerBadgeRow}>
                <View style={[styles.speakerAvatarCircle, { backgroundColor: Colors.light.tint }]}>
                  <Text style={styles.speakerAvatarInitials}>You</Text>
                </View>
                <View>
                  <Text style={[styles.speakerNameText, { color: Colors.light.tint }]}>
                    You (Candidate)
                  </Text>
                  <View style={[
                    styles.inputModeBadge,
                    entry.inputMode === 'voice' ? styles.voiceBadge : styles.textBadge,
                  ]}>
                    {entry.inputMode === 'voice' ? (
                      <Mic size={10} color={Colors.light.voiceActive} />
                    ) : (
                      <Type size={10} color={Colors.light.tint} />
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

            <View style={styles.entryTimeBadge}>
              <Clock size={11} color={Colors.light.textTertiary} />
              <Text style={styles.entryTime}>
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.entryWordCount}>{entry.wordCount} words</Text>
          </View>
          <TouchableOpacity
            style={styles.entryDeleteBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={13} color={Colors.light.danger} />
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
          <Sparkles size={13} color={Colors.light.tint} />
          <Text style={styles.analysisToggleText}>
            {expanded ? 'Hide Details' : (entry.analysis ? 'View AI Feedback' : 'View Non-Verbal Stats')}
          </Text>
          {expanded ? (
            <ChevronUp size={14} color={Colors.light.tint} />
          ) : (
            <ChevronDown size={14} color={Colors.light.tint} />
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      tts.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  // AI Response Generator & Speech
  const triggerAIResponse = useCallback(async (customEntries?: PracticeEntry[]) => {
    if (!session || isAISpeaking || practiceMode !== 'ai') return;

    setIsAISpeaking(true);
    try {
      const speaker = getNextAISpeaker(lastAISpeakerId);
      setLastAISpeakerId(speaker.id);
      setCurrentSpeakerName(speaker.name);

      const entriesToUse = customEntries || session.entries;
      // Ensure strictly chronological ordering (oldest first, latest last)
      const chronologicalEntries = [...entriesToUse].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const aiResponse = await generateAIResponse(speaker, {
        topic: session.topic || 'General Discussion',
        category: session.category || 'General',
        transcript: chronologicalEntries.map(e => ({
          text: e.text,
          sender: (e as any).isAI ? ((e as any).participantName || 'AI Peer') : 'Candidate',
          createdAt: e.createdAt,
        }))
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
        } as any)
      };

      addEntry(session.id, newEntry);

      if (!isTtsMuted) {
        await tts.speak(aiResponse, {
          pitch: speaker.voiceConfig.pitch,
          rate: speaker.voiceConfig.rate
        });
      }
    } catch (error) {
      console.error('[PracticeScreen] AI Response error:', error);
    } finally {
      setIsAISpeaking(false);
      setCurrentSpeakerName('Candidate');
    }
  }, [session, isAISpeaking, practiceMode, lastAISpeakerId, isTtsMuted, addEntry]);

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

      // Trigger AI Response with updated entries so the AI understands user's actual speech!
      if (practiceMode === 'ai' && !isAISpeaking) {
        const updatedEntries = [newEntry, ...session.entries];
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

  const config = CATEGORY_CONFIG[session.category as SessionCategory] || { label: session.category || 'General', emoji: '💬', color: Colors.light.tint };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
              <ChevronLeft size={22} color={Colors.light.text} />
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
              {isTtsMuted ? <VolumeX size={18} color={Colors.light.danger} /> : <Volume2 size={18} color={Colors.light.tint} />}
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SpeakingIndicator
          isSpeaking={isAISpeaking || isRecording}
          speakerName={isRecording ? 'You' : currentSpeakerName}
          isUser={isRecording}
        />

        {/* Top Header Card */}
        <View style={styles.topSection}>
          <View style={[styles.categoryBadge, { backgroundColor: config.color + '18' }]}>
            <Text style={styles.badgeEmoji}>{config.emoji}</Text>
            <Text style={[styles.categoryLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          {session.topic && (
            <View style={styles.topicBanner}>
              <Text style={styles.topicBannerLabel}>Topic</Text>
              <Text style={styles.topicBannerText}>{session.topic}</Text>
            </View>
          )}
        </View>

        {/* Practice Input & Camera Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            {/* Mode selection row */}
            <View style={[styles.inputModeRow, { marginBottom: 12 }]}>
              <TouchableOpacity
                style={[styles.modeTab, practiceMode === 'ai' && styles.modeTabActive]}
                onPress={() => setPracticeMode('ai')}
              >
                <Sparkles size={14} color={practiceMode === 'ai' ? Colors.light.tint : Colors.light.textTertiary} />
                <Text style={[styles.modeTabText, practiceMode === 'ai' && styles.modeTabTextActive]}>AI Simulated GD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, practiceMode === 'individual' && styles.modeTabActive]}
                onPress={() => setPracticeMode('individual')}
              >
                <UserCheck size={14} color={practiceMode === 'individual' ? Colors.light.tint : Colors.light.textTertiary} />
                <Text style={[styles.modeTabText, practiceMode === 'individual' && styles.modeTabTextActive]}>Solo Practice</Text>
              </TouchableOpacity>
            </View>

            {/* Input tabs row */}
            <View style={styles.inputModeRow}>
              <TouchableOpacity
                style={[styles.modeTab, inputMode === 'text' && styles.modeTabActive]}
                onPress={() => setInputMode('text')}
              >
                <Type size={14} color={inputMode === 'text' ? Colors.light.tint : Colors.light.textTertiary} />
                <Text style={[styles.modeTabText, inputMode === 'text' && styles.modeTabTextActive]}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, inputMode === 'voice' && styles.modeTabActive]}
                onPress={() => setInputMode('voice')}
              >
                <Mic size={14} color={inputMode === 'voice' ? Colors.light.voiceActive : Colors.light.textTertiary} />
                <Text style={[styles.modeTabText, inputMode === 'voice' && styles.modeTabVoiceActive]}>Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, isCameraActive && styles.modeTabActive]}
                onPress={() => setIsCameraActive(!isCameraActive)}
              >
                {isCameraActive ? (
                  <Video size={14} color={Colors.light.tint} />
                ) : (
                  <VideoOff size={14} color={Colors.light.textTertiary} />
                )}
                <Text style={[styles.modeTabText, isCameraActive && styles.modeTabTextActive]}>
                  {isCameraActive ? 'Camera On' : 'Camera Off'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Camera & Behavioral Metrics Panel */}
          {isCameraActive && (
            <View style={styles.cameraRow}>
              {/* Camera Preview */}
              <View style={styles.cameraFrame}>
                <CameraEngine onMetricsUpdate={handleMetricsUpdate} />
              </View>

              {/* Real-time Behavioral Analytics */}
              <View style={styles.analyticsPanel}>
                <View style={styles.metricItem}>
                  <Activity size={16} color={liveMetrics.isFaceDetected ? Colors.light.success : Colors.light.textTertiary} />
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
                  <Eye size={16} color={liveMetrics.eyeContact ? Colors.light.tint : Colors.light.danger} />
                  <Text style={styles.metricLabel}>
                    Eye Contact:{' '}
                    <Text style={[styles.metricValue, { color: liveMetrics.eyeContact ? Colors.light.tint : Colors.light.textSecondary }]}>
                      {liveMetrics.isCameraActive
                        ? (liveMetrics.isFaceDetected
                            ? (liveMetrics.eyeContact ? 'Direct (Screen)' : 'Looking Away')
                            : 'Unable to detect')
                        : 'Unavailable'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <UserCheck size={16} color={liveMetrics.posture === 'Straight' ? Colors.light.success : Colors.light.warning} />
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
                    size={16}
                    color={
                      liveMetrics.isCameraActive && liveMetrics.handVisible
                        ? (liveMetrics.gestureStatus === 'Good'
                            ? Colors.light.success
                            : liveMetrics.gestureStatus === 'Excessive'
                              ? Colors.light.danger
                              : Colors.light.tint)
                        : Colors.light.textTertiary
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
                                ? Colors.light.success
                                : liveMetrics.gestureStatus === 'Excessive'
                                  ? Colors.light.danger
                                  : Colors.light.tint)
                            : Colors.light.textSecondary
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
                          backgroundColor: liveMetrics.engagementScore > 65 ? Colors.light.tint : Colors.light.accentWarm
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Argument Input */}
          <View style={styles.inputContainer}>
            {inputMode === 'text' ? (
              <TextInput
                style={styles.inputBox}
                placeholder="Type your arguments, counter-points, or opening statement..."
                placeholderTextColor={Colors.light.textTertiary}
                multiline
                value={inputText}
                onChangeText={setInputText}
                editable={!isAISpeaking}
              />
            ) : (
              <View style={styles.voiceSection}>
                {/* Speech Error Banner if any */}
                {speechError && (
                  <View style={styles.speechErrorBox}>
                    <AlertCircle size={14} color={Colors.light.danger} />
                    <Text style={styles.speechErrorText}>{speechError}</Text>
                  </View>
                )}

                {/* Microphone Status Header */}
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

                {/* Live Speech Preview */}
                <View style={[styles.transcriptionPreview, isRecording && styles.transcriptionPreviewRecording]}>
                  <Text style={[styles.transcriptionText, !inputText && !interimTranscript && styles.transcriptionPlaceholder]}>
                    {inputText
                      ? (interimTranscript ? `${inputText} ${interimTranscript}` : inputText)
                      : (interimTranscript || (isRecording ? "Listening... Speak your arguments freely..." : "Click the microphone button to speak your argument..."))}
                  </Text>
                </View>

                {/* Prominent Circular Microphone Button */}
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
                    <Mic size={32} color={isRecording ? "#FFFFFF" : Colors.light.tint} />
                  )}
                </TouchableOpacity>

                <Text style={[styles.recordInstruction, isRecording && { color: Colors.light.voiceActive, fontWeight: '700' }]}>
                  {isTranscribing
                    ? 'Processing audio transcription...'
                    : isRecording
                      ? `Listening (Pauses handled smoothly) — Click to stop`
                      : 'Click to speak your argument'}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Argument Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!inputText.trim() && !interimTranscript.trim() && !isRecording) && styles.submitButtonDisabled,
              isAISpeaking && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={(!inputText.trim() && !interimTranscript.trim() && !isRecording) || isAISpeaking}
          >
            <Send size={16} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isRecording ? 'Finish & Submit Argument' : 'Submit Argument'}
            </Text>
          </TouchableOpacity>

          {/* End Session Button */}
          <TouchableOpacity
            style={[
              styles.finalSubmitButton,
              isFinalAnalyzing && styles.submitButtonDisabled
            ]}
            onPress={handleFinalSubmit}
            disabled={isFinalAnalyzing}
          >
            {isFinalAnalyzing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Sparkles size={16} color="#FFFFFF" />
            )}
            <Text style={styles.submitButtonText}>
              {isFinalAnalyzing ? 'Generating Full GD Report...' : 'Finish Session & Get Full GD Report'}
            </Text>
          </TouchableOpacity>

          {/* Comprehensive GD Report */}
          {finalAnalysis && (
            <View style={styles.finalAnalysisContainer}>
              <View style={styles.finalAnalysisHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={20} color={Colors.light.tint} />
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
                      <Check size={13} color={Colors.light.success} />
                    ) : (
                      <Copy size={13} color={Colors.light.tint} />
                    )}
                    <Text style={[styles.reportActionText, copiedReport && { color: Colors.light.success }]}>
                      {copiedReport ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    onPress={handleExportReport}
                    activeOpacity={0.7}
                    accessibilityLabel="Export GD Report"
                  >
                    <Download size={13} color={Colors.light.tint} />
                    <Text style={styles.reportActionText}>Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {renderCleanReport(finalAnalysis)}
            </View>
          )}
        </View>

        {/* AI Group Members Bar */}
        {practiceMode === 'ai' && (
          <View style={styles.participantsSection}>
            <View style={styles.participantsHeaderRow}>
              <Text style={styles.sectionLabel}>AI Group Discussion Members</Text>
              <Text style={styles.participantsHint}>
                {isAISpeaking ? `${currentSpeakerName} is speaking...` : 'They will respond after your argument'}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsList}>
              {AI_PARTICIPANTS.map(p => {
                const isCurrent = currentSpeakerName === p.name && isAISpeaking;
                return (
                  <View key={p.id} style={[styles.participantItem, isCurrent && styles.participantItemActive]}>
                    <View style={[
                      styles.participantAvatar,
                      {
                        borderColor: isCurrent ? p.avatarColor : Colors.light.border,
                        backgroundColor: p.avatarColor + '18'
                      }
                    ]}>
                      <Text style={[styles.avatarText, { color: p.avatarColor }]}>{p.name[0]}</Text>
                    </View>
                    <Text style={styles.participantName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.participantRole}>{p.personality}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Discussion Transcript */}
        <View style={styles.entriesList}>
          <Text style={styles.sectionLabel}>Discussion Transcript ({session.entries.length} turns)</Text>
          {session.entries.length === 0 ? (
            <View style={styles.emptyEntriesBox}>
              <Text style={styles.emptyEntriesText}>No discussion entries yet.</Text>
              <Text style={styles.emptyEntriesSubtext}>Speak or type your opening argument above to begin the simulated GD.</Text>
            </View>
          ) : (
            session.entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} sessionId={session.id} onDelete={deleteEntry} />
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 8,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAudioBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 8,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topSection: {
    marginBottom: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 10,
  },
  badgeEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
  },
  topicBanner: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topicBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.tint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topicBannerText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600',
    lineHeight: 22,
  },
  inputSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputHeader: {
    marginBottom: 16,
  },
  inputModeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    gap: 4,
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
    backgroundColor: Colors.light.surface,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  modeTabTextActive: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  modeTabVoiceActive: {
    color: Colors.light.voiceActive,
    fontWeight: '700',
  },
  cameraRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
    alignItems: 'stretch',
  },
  cameraFrame: {
    width: 170,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
  },
  analyticsPanel: {
    flex: 1,
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  attentionContainer: {
    marginTop: 4,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  attentionLabel: {
    color: Colors.light.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attentionPercent: {
    color: Colors.light.tint,
    fontSize: 11,
    fontWeight: '800',
  },
  attentionTrack: {
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  attentionFill: {
    height: '100%',
    borderRadius: 3,
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputBox: {
    minHeight: 100,
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    color: Colors.light.text,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  micStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  micStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    color: Colors.light.text,
  },
  recordingTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  speechErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    width: '100%',
  },
  speechErrorText: {
    color: Colors.light.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  transcriptionPreview: {
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 70,
    width: '100%',
    justifyContent: 'center',
  },
  transcriptionPreviewRecording: {
    borderColor: Colors.light.voiceActive,
    backgroundColor: '#FEF2F2',
  },
  transcriptionText: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  transcriptionPlaceholder: {
    color: Colors.light.textTertiary,
    fontStyle: 'italic',
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.light.tintLight,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  recordButtonActive: {
    backgroundColor: Colors.light.voiceActive,
    borderColor: '#B91C1C',
    transform: [{ scale: 1.05 }],
  },
  recordButtonDisabled: {
    opacity: 0.4,
  },
  recordInstruction: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  finalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  finalAnalysisContainer: {
    marginTop: 20,
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  finalAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  finalAnalysisTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  reportActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  participantsSection: {
    marginBottom: 24,
  },
  participantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantsHint: {
    fontSize: 11,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  participantsList: {
    gap: 12,
    paddingVertical: 4,
  },
  participantItem: {
    alignItems: 'center',
    width: 76,
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  participantItemActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantName: {
    color: Colors.light.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  participantRole: {
    color: Colors.light.textTertiary,
    fontSize: 9,
    textAlign: 'center',
  },
  entriesList: {
    gap: 14,
  },
  emptyEntriesBox: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 8,
  },
  emptyEntriesText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  emptyEntriesSubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  speakerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  speakerAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  speakerNameText: {
    fontSize: 13,
    fontWeight: '800',
  },
  speakerRoleSubtext: {
    fontSize: 10,
    color: Colors.light.textTertiary,
    fontWeight: '600',
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: {
    fontSize: 11,
    color: Colors.light.textTertiary,
  },
  inputModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  voiceBadge: {
    backgroundColor: Colors.light.voiceLight,
  },
  textBadge: {
    backgroundColor: Colors.light.tintLight,
  },
  inputModeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  voiceBadgeText: {
    color: Colors.light.voiceActive,
  },
  textBadgeText: {
    color: Colors.light.tint,
  },
  entryWordCount: {
    fontSize: 11,
    color: Colors.light.textTertiary,
  },
  entryDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  analysisToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  analysisToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  analysisBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  pulseSection: {
    marginBottom: 10,
  },
  pulseTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  pulseLabel: {
    width: 90,
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  pulseBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
  },
  pulseBar: {
    height: '100%',
    borderRadius: 3,
  },
  pulseValue: {
    width: 32,
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  analysisText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  reportHeading2: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.tint,
    marginTop: 14,
    marginBottom: 6,
  },
  reportHeading3: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.accent,
    marginTop: 10,
    marginBottom: 4,
  },
  reportParagraph: {
    fontSize: 14,
    color: Colors.light.text,
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
    color: Colors.light.tint,
    marginRight: 8,
    fontSize: 14,
    marginTop: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
