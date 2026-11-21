import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Mic,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
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
const isLargeScreen = width >= 768;

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary:        '#4F46E5',
  secondary:      '#6366F1',
  bg:             '#F5F7FF',
  surface:        '#FFFFFF',
  accent:         '#06B6D4',
  text:           '#0F172A',
  textSec:        '#475569',
  success:        '#059669',
  warning:        '#F59E0B',
  danger:         '#DC2626',
  primaryLight:   'rgba(79,70,229,0.08)',
  accentLight:    'rgba(6,182,212,0.10)',
  border:         'rgba(79,70,229,0.12)',
  cardShadow:     'rgba(79,70,229,0.08)',
};

// ── Floating Orb ─────────────────────────────────────────────────────────────
function FloatingOrb({ size, color, style }: { size: number; color: string; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000 + Math.random() * 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000 + Math.random() * 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.55, 0.25] });
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ translateY }] }, style]}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingScreen() {
  const { isLoggedIn } = useAuth();

  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(40)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(isLoggedIn ? '/(tabs)/(home)' : '/signup' as never);
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(isLoggedIn ? '/(tabs)/(home)' : '/login' as never);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Navbar ── */}
        <View style={[
          styles.navbar,
          Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 1px 0 rgba(79,70,229,0.08)',
          } as any : {},
        ]}>
          <View style={styles.logoRow}>
            <View style={[
              styles.logoIcon,
              Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(79,70,229,0.30)' } as any : {},
            ]}>
              <Users size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Fluent Edge</Text>
              <Text style={styles.brandSub}>AI Group Discussion Platform</Text>
            </View>
          </View>

          <View style={styles.navActions}>
            {isLoggedIn ? (
              <TouchableOpacity
                style={[styles.primaryNavBtn, Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(79,70,229,0.35)' } as any : {}]}
                onPress={() => router.push('/(tabs)/(home)' as never)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryNavBtnText}>Dashboard</Text>
                <ArrowRight size={13} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.ghostNavBtn} onPress={handleSignIn} activeOpacity={0.8}>
                  <Text style={styles.ghostNavBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryNavBtn, Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(79,70,229,0.35)' } as any : {}]}
                  onPress={handleGetStarted}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryNavBtnText}>Get Started</Text>
                  <ArrowRight size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Hero Section ── */}
        <View style={styles.heroSection}>
          <FloatingOrb size={240} color={C.primary}        style={styles.orbTopRight} />
          <FloatingOrb size={140} color={C.accent}         style={styles.orbBottomLeft} />
          <FloatingOrb size={80}  color={C.secondary}      style={styles.orbMid} />
          <FloatingOrb size={48}  color='rgba(6,182,212,0.4)' style={{ position: 'absolute', top: '30%', left: '8%' }} />

          <Animated.View style={[styles.heroContent, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            {/* Animated gradient badge */}
            <View style={[
              styles.heroBadge,
              Platform.OS === 'web' ? { boxShadow: '0 2px 12px rgba(6,182,212,0.18)' } as any : {},
            ]}>
              <Sparkles size={13} color={C.accent} />
              <Text style={styles.heroBadgeText}>AI-Powered GD Preparation for Campus Placements</Text>
            </View>

            <Text style={styles.heroHeading}>
              Master Group Discussions.{'\n'}
              <Text style={styles.heroHeadingAccent}>Ace Your Campus Placements.</Text>
            </Text>

            <Text style={styles.heroDescription}>
              Practice realistic group discussions with 4 conversational AI peers. Receive real-time speech, eye-contact, and posture feedback — evaluated on strict corporate hiring rubrics.
            </Text>

            <View style={styles.heroCtaRow}>
              <TouchableOpacity
                style={[
                  styles.heroPrimaryBtn,
                  Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(79,70,229,0.40)' } as any : {},
                ]}
                onPress={handleGetStarted}
                activeOpacity={0.85}
              >
                <Text style={styles.heroPrimaryBtnText}>{isLoggedIn ? 'Launch GD Practice' : 'Start Free Practice'}</Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </TouchableOpacity>
              {!isLoggedIn && (
                <TouchableOpacity
                  style={[
                    styles.heroSecondaryBtn,
                    Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(79,70,229,0.08)' } as any : {},
                  ]}
                  onPress={handleSignIn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroSecondaryBtnText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Social proof tags */}
            <View style={styles.socialProofRow}>
              {['Student-Friendly English', 'Indian Accents Supported', '100-Mark Corporate Rubric'].map((t) => (
                <View key={t} style={styles.proofTag}>
                  <CheckCircle2 size={13} color={C.success} />
                  <Text style={styles.proofText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── Live Demo Card ── */}
        <Animated.View style={[styles.demoCardWrap, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
          <View style={[
            styles.demoCard,
            Platform.OS === 'web' ? { boxShadow: '0 20px 60px rgba(79,70,229,0.12)' } as any : {},
          ]}>
            <View style={styles.demoAccentBar} />
            <View style={styles.demoHeader}>
              <View style={styles.demoLiveRow}>
                <View style={styles.demoLiveDot} />
                <Text style={styles.demoLiveLabel}>LIVE GD SIMULATION</Text>
              </View>
              <View style={styles.demoCategoryPill}>
                <Text style={styles.demoCategoryText}>CAMPUS PLACEMENTS</Text>
              </View>
            </View>
            <Text style={styles.demoTopic}>"Startups vs Corporate IT Giants for Fresh Engineering Graduates"</Text>

            <View style={styles.demoAvatarRow}>
              {[
                { init: 'A', name: 'Aarav (Analytical)', color: C.primary, active: true },
                { init: 'An', name: 'Ananya (Supportive)', color: C.success, active: false },
                { init: 'V', name: 'Vikram (Critical)', color: '#EF4444', active: false },
              ].map((p) => (
                <View key={p.name} style={[styles.demoAvatar, p.active && styles.demoAvatarActive]}>
                  <View style={[styles.demoAvatarCircle, { backgroundColor: p.color }]}>
                    <Text style={styles.demoAvatarInit}>{p.init}</Text>
                  </View>
                  <Text style={[styles.demoAvatarName, p.active && { color: p.color }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.active && <Text style={styles.demoSpeakingLabel}>Speaking…</Text>}
                </View>
              ))}
            </View>

            <View style={styles.demoSpeechBubble}>
              <Text style={styles.demoSpeechText}>
                "I agree with the point about fast learning in startups. But in established companies like TCS or Infosys, freshers get formal training and project stability before client deadlines."
              </Text>
            </View>

            <View style={styles.demoStatsRibbon}>
              {[
                { icon: <Mic size={13} color={C.primary} />,   label: 'Speech: 135 WPM (Clear)' },
                { icon: <Video size={13} color={C.success} />, label: 'Eye Contact: 82%' },
                { icon: <Award size={13} color="#8B5CF6" />,   label: 'Posture: Upright' },
              ].map((item) => (
                <View key={item.label} style={styles.demoStatItem}>
                  {item.icon}
                  <Text style={styles.demoStatText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Features Grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>POWERFUL FEATURES</Text>
          <Text style={styles.sectionHeading}>Everything You Need to Clear Campus GDs</Text>
          <Text style={styles.sectionDesc}>
            Designed specifically for engineering and college students preparing for TCS, Infosys, Wipro, product startups, and top placement drives.
          </Text>

          <View style={styles.featuresGrid}>
            {[
              {
                icon: <Users size={22} color={C.primary} />,
                bg: C.primaryLight,
                border: 'rgba(79,70,229,0.15)',
                title: '4 Conversational AI Personas',
                desc: 'Debate with Aarav, Ananya, Vikram, and Maya — they speak natural English and respond to your points.',
              },
              {
                icon: <Mic size={22} color={C.success} />,
                bg: 'rgba(5,150,105,0.08)',
                border: 'rgba(5,150,105,0.15)',
                title: 'Indian Accent Speech Recognition',
                desc: 'Optimized en-IN transcription tracking your WPM, cadence, pauses, and verbal filler detection.',
              },
              {
                icon: <Video size={22} color="#8B5CF6" />,
                bg: 'rgba(139,92,246,0.08)',
                border: 'rgba(139,92,246,0.15)',
                title: 'Webcam Body Language Analysis',
                desc: 'Privacy-preserving real-time camera tracking of eye contact, posture alignment, and gestures.',
              },
              {
                icon: <Award size={22} color={C.warning} />,
                bg: 'rgba(245,158,11,0.08)',
                border: 'rgba(245,158,11,0.15)',
                title: 'Strict Corporate Placement Rubrics',
                desc: 'Transparent 100-mark evaluation across 7 recruitment criteria. Unlock 15 achievement badges.',
              },
            ].map((f, i) => (
              <View
                key={i}
                style={[
                  styles.featureCard,
                  { borderColor: f.border },
                  Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(79,70,229,0.08)' } as any : {},
                ]}
              >
                <View style={[styles.featureIconBox, { backgroundColor: f.bg }]}>{f.icon}</View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── How It Works ── */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionEyebrow}>SIMPLE WORKFLOW</Text>
          <Text style={styles.sectionHeading}>How Fluent Edge Works</Text>

          <View style={styles.stepsRow}>
            {[
              { n: '1', title: 'Pick a GD Topic', desc: 'Select from popular placement topics — Technical, Current Affairs, HR — or create a custom debate topic.' },
              { n: '2', title: 'Speak & Debate with AI', desc: 'Share your opening views using your microphone. AI participants listen, challenge, and engage in multi-turn discussions.' },
              { n: '3', title: 'Get Placement Report', desc: 'Review your detailed corporate performance scorecard, identified strengths, and earned achievement badges.' },
            ].map((s) => (
              <View
                key={s.n}
                style={[
                  styles.stepCard,
                  Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(79,70,229,0.08)' } as any : {},
                ]}
              >
                <View style={[styles.stepNumBadge, Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(79,70,229,0.35)' } as any : {}]}>
                  <Text style={styles.stepNumText}>{s.n}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA Banner ── */}
        <View style={styles.ctaWrap}>
          <View style={[
            styles.ctaBanner,
            Platform.OS === 'web' ? { boxShadow: '0 20px 60px rgba(15,23,42,0.30)' } as any : {},
          ]}>
            <FloatingOrb size={160} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', top: -40, right: -20 }} />
            <FloatingOrb size={90}  color="rgba(79,70,229,0.25)"   style={{ position: 'absolute', bottom: -20, left: 20 }} />
            <FloatingOrb size={60}  color="rgba(6,182,212,0.15)"   style={{ position: 'absolute', top: '50%', right: '20%' }} />

            <View style={[styles.ctaIconWrap, Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(79,70,229,0.25)' } as any : {}]}>
              <Zap size={22} color={C.primary} />
            </View>
            <Text style={styles.ctaTitle}>Start Practicing for Your Campus GD Today</Text>
            <Text style={styles.ctaSubtitle}>
              Build genuine speaking confidence and master group discussions in a friendly, realistic environment.
            </Text>
            <TouchableOpacity
              style={[styles.ctaBtn, Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(0,0,0,0.20)' } as any : {}]}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>Get Started for Free</Text>
              <ArrowRight size={17} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerLogoRow}>
            <View style={styles.footerLogoIcon}>
              <Users size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.footerBrand}>Fluent Edge</Text>
          </View>
          <Text style={styles.footerTagline}>AI-Based Group Discussion Preparation Platform</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/login' as never)}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/signup' as never)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/onboarding' as never)}>
              <Text style={styles.footerLink}>Product Tour</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopy}>© {new Date().getFullYear()} Fluent Edge. Empowering Indian students for corporate placement success.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 0 },

  /* ── Navbar ── */
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(245,247,255,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTitle: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  brandSub:   { fontSize: 10, color: C.textSec, fontWeight: '500' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghostNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  ghostNavBtnText: { fontSize: 13, fontWeight: '700', color: C.text },
  primaryNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryNavBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  /* ── Hero ── */
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 56,
    alignItems: 'center',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  orbTopRight:  { position: 'absolute', top: -60, right: -60, opacity: 0.18 },
  orbBottomLeft:{ position: 'absolute', bottom: -20, left: -40, opacity: 0.15 },
  orbMid:       { position: 'absolute', top: '35%', right: '10%', opacity: 0.20 },
  heroContent:  { alignItems: 'center', width: '100%', zIndex: 1 },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.22)',
    marginBottom: 28,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#0E7490', letterSpacing: 0.1 },

  heroHeading: {
    fontSize: isLargeScreen ? 52 : 34,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
    lineHeight: isLargeScreen ? 62 : 44,
    letterSpacing: -1.2,
    marginBottom: 20,
  },
  heroHeadingAccent: { color: C.primary },

  heroDescription: {
    fontSize: isLargeScreen ? 17 : 15,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: isLargeScreen ? 28 : 23,
    maxWidth: 660,
    marginBottom: 36,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  heroPrimaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroSecondaryBtn: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  heroSecondaryBtnText: { fontSize: 15, fontWeight: '700', color: C.text },

  socialProofRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18 },
  proofTag:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proofText:      { fontSize: 12, color: C.textSec, fontWeight: '600' },

  /* ── Demo Card ── */
  demoCardWrap: { paddingHorizontal: 20, marginBottom: 64, maxWidth: 960, alignSelf: 'center', width: '100%' },
  demoCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  demoAccentBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: C.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  demoHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  demoLiveRow:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  demoLiveDot:      { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444' },
  demoLiveLabel:    { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  demoCategoryPill: { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  demoCategoryText: { fontSize: 10, fontWeight: '800', color: C.primary },
  demoTopic:        { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 18, lineHeight: 23 },
  demoAvatarRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  demoAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  demoAvatarActive:   { borderColor: C.primary, backgroundColor: C.primaryLight },
  demoAvatarCircle:   { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  demoAvatarInit:     { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  demoAvatarName:     { fontSize: 12, fontWeight: '600', color: C.textSec },
  demoSpeakingLabel:  { fontSize: 10, color: C.primary, fontWeight: '700' },
  demoSpeechBubble: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    marginBottom: 16,
  },
  demoSpeechText:  { fontSize: 13.5, color: C.text, lineHeight: 21, fontStyle: 'italic' },
  demoStatsRibbon: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  demoStatItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoStatText:    { fontSize: 12, fontWeight: '600', color: C.textSec },

  /* ── Sections ── */
  section:       { paddingHorizontal: 24, marginBottom: 64, maxWidth: 1080, alignSelf: 'center', width: '100%' },
  stepsSection:  { paddingHorizontal: 24, marginBottom: 64, maxWidth: 1080, alignSelf: 'center', width: '100%' },
  sectionEyebrow:{ fontSize: 11, fontWeight: '800', color: C.primary, letterSpacing: 1.8, marginBottom: 10 },
  sectionHeading:{
    fontSize: isLargeScreen ? 34 : 26,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 10,
    lineHeight: isLargeScreen ? 42 : 34,
  },
  sectionDesc: { fontSize: 14, color: C.textSec, lineHeight: 22, maxWidth: 640, marginBottom: 36 },

  /* ── Features Grid ── */
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featureCard: {
    flex: 1,
    minWidth: isLargeScreen ? 260 : '100%',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  featureIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 8, lineHeight: 22 },
  featureDesc:  { fontSize: 13, color: C.textSec, lineHeight: 20 },

  /* ── Steps ── */
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stepCard: {
    flex: 1,
    minWidth: isLargeScreen ? 240 : '100%',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  stepNumBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  stepNumText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  stepTitle:   { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 8 },
  stepDesc:    { fontSize: 13, color: C.textSec, lineHeight: 20 },

  /* ── CTA Banner ── */
  ctaWrap: { paddingHorizontal: 24, marginBottom: 56, maxWidth: 960, alignSelf: 'center', width: '100%' },
  ctaBanner: {
    backgroundColor: C.text,
    borderRadius: 28,
    padding: 48,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: C.text,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 10,
  },
  ctaIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaTitle:    { fontSize: isLargeScreen ? 30 : 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 12, lineHeight: isLargeScreen ? 38 : 32, letterSpacing: -0.5 },
  ctaSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 520, lineHeight: 23, marginBottom: 32 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: C.primary },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  footerLogoIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBrand:   { fontSize: 15, fontWeight: '800', color: C.text },
  footerTagline: { fontSize: 12, color: C.textSec, marginBottom: 18 },
  footerLinks:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  footerLink:    { fontSize: 13, fontWeight: '600', color: C.primary },
  footerDot:     { color: '#CBD5E1', fontSize: 14 },
  footerCopy:    { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 17 },
});
