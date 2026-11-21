import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { ChevronRight, LineChart, Trophy, Video, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:   '#4F46E5',
  secondary: '#6366F1',
  bg:        '#F5F7FF',
  surface:   '#FFFFFF',
  accent:    '#06B6D4',
  text:      '#0F172A',
  textSec:   '#475569',
  success:   '#059669',
  warning:   '#F59E0B',
};

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Fluent Edge',
    description: 'Master your communication skills with AI-powered group discussion practice sessions.',
    icon: (props: any) => <Video {...props} />,
    accentColor: C.primary,
    bgColor: 'rgba(79,70,229,0.08)',
    gradientTop: '#4F46E5',
    gradientBot: '#3730A3',
  },
  {
    id: '2',
    title: 'Real-Time AI Feedback',
    description: 'Get instant insights on your speech clarity, confidence, body language, and content quality.',
    icon: (props: any) => <LineChart {...props} />,
    accentColor: C.accent,
    bgColor: 'rgba(6,182,212,0.08)',
    gradientTop: '#06B6D4',
    gradientBot: '#0E7490',
  },
  {
    id: '3',
    title: 'Track Your Growth',
    description: 'Analyze your performance over time, earn achievement badges, and get placement-ready.',
    icon: (props: any) => <Trophy {...props} />,
    accentColor: C.warning,
    bgColor: 'rgba(245,158,11,0.08)',
    gradientTop: '#F59E0B',
    gradientBot: '#D97706',
  },
];

// ── Pulse Ring animation ──────────────────────────────────────────────────────
function PulseRing({ color, delay, size }: { color: string; delay: number; size: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale,   { toValue: 1.6, duration: 2000, useNativeDriver: true }),
            Animated.timing(scale,   { toValue: 1,   duration: 2000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0,   duration: 2000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX       = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await AsyncStorage.setItem('hasSeenIntro', 'true');
      router.replace('/login' as never);
    } catch {
      router.replace('/login' as never);
    }
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Top indicator bar ── */}
      <View style={styles.topBar}>
        <View style={styles.logoMark}>
          <Video size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.topBrandName}>Fluent Edge</Text>
        <View style={styles.topDots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth   = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
            const bgColor    = scrollX.interpolate({
              inputRange,
              outputRange: [
                'rgba(79,70,229,0.25)',
                currentSlide.accentColor,
                'rgba(79,70,229,0.25)',
              ],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.topDot, { width: dotWidth, backgroundColor: bgColor }]}
              />
            );
          })}
        </View>
        <TouchableOpacity onPress={handleFinish} style={styles.topSkipBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.topSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Slides ── */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {/* Large decorative background circles */}
            <View style={[styles.bgCircleLarge, { backgroundColor: slide.bgColor }]} />
            <View style={[styles.bgCircleMed, { backgroundColor: slide.accentColor + '10' }]} />
            <View style={[styles.bgCircleSmall, { backgroundColor: slide.accentColor + '08' }]} />

            {/* Icon area with pulse rings */}
            <View style={styles.iconContainer}>
              <PulseRing color={slide.accentColor} delay={0}    size={200} />
              <PulseRing color={slide.accentColor} delay={700}  size={160} />
              <PulseRing color={slide.accentColor} delay={1400} size={120} />
              <View style={[
                styles.iconInner,
                {
                  backgroundColor: slide.bgColor,
                  borderColor: slide.accentColor + '40',
                },
                Platform.OS === 'web' ? { boxShadow: `0 12px 40px ${slide.accentColor}30` } as any : {},
              ]}>
                {slide.icon({ size: 56, color: slide.accentColor })}
              </View>
            </View>

            {/* Text content */}
            <View style={styles.textArea}>
              <View style={[styles.slideBadge, { backgroundColor: slide.bgColor, borderColor: slide.accentColor + '30' }]}>
                <Text style={[styles.slideBadgeText, { color: slide.accentColor }]}>
                  {slide.id === '1' ? '🎯 Get Started' : slide.id === '2' ? '⚡ AI Powered' : '🏆 Track Growth'}
                </Text>
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDesc}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      {/* ── Footer ── */}
      <View style={[
        styles.footer,
        Platform.OS === 'web' ? { boxShadow: '0 -4px 24px rgba(79,70,229,0.08)' } as any : {},
      ]}>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: scrollX.interpolate({
                  inputRange: [0, (SLIDES.length - 1) * width],
                  outputRange: ['33%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: currentSlide.accentColor,
              },
            ]}
          />
        </View>

        {/* Dot indicators */}
        <View style={styles.dotRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth   = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
            const opacity    = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            const bgColor    = scrollX.interpolate({
              inputRange,
              outputRange: [Colors.light.border, C.primary, Colors.light.border],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity, backgroundColor: bgColor }]} />
            );
          })}
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          {currentIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleFinish} style={styles.skipBtnBottom}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                style={[
                  styles.nextBtn,
                  { backgroundColor: currentSlide.accentColor },
                  Platform.OS === 'web' ? { boxShadow: `0 6px 20px ${currentSlide.accentColor}50` } as any : {},
                ]}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Next</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleFinish}
              style={[
                styles.nextBtn,
                styles.fullBtn,
                { backgroundColor: C.primary },
                Platform.OS === 'web' ? { boxShadow: '0 6px 20px rgba(79,70,229,0.45)' } as any : {},
              ]}
              activeOpacity={0.85}
            >
              <Zap size={18} color="#FFFFFF" />
              <Text style={styles.nextBtnText}>Get Started →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: C.bg,
    zIndex: 10,
  },
  logoMark: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  topBrandName: { fontSize: 14, fontWeight: '800', color: C.text, flex: 1 },
  topDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topDot:  { height: 6, borderRadius: 3 },
  topSkipBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  topSkipText: { fontSize: 13, color: C.textSec, fontWeight: '600' },

  /* ── Slides ── */
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 200,
    overflow: 'hidden',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -100,
    right: -100,
    opacity: 0.6,
  },
  bgCircleMed: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: 180,
    left: -60,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: '55%',
    right: 30,
  },

  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 52,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },

  textArea: { alignItems: 'center', maxWidth: 340 },
  slideBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  slideBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  slideTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  slideDesc: {
    fontSize: 15,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 24,
  },

  /* ── Footer ── */
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.08)',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 44,
    shadowColor: 'rgba(79,70,229,0.10)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(79,70,229,0.10)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, gap: 6 },
  dot:    { height: 8, borderRadius: 4 },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipBtnBottom: { paddingVertical: 15, paddingHorizontal: 20 },
  skipText:      { fontSize: 16, color: C.textSec, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 32,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  fullBtn:     { flex: 1, justifyContent: 'center' },
});
