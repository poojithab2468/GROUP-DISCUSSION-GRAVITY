import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  MessageSquare,
  Mic,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Video,
  Zap
} from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function LandingScreen() {
  const { isLoggedIn, user } = useAuth();

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLoggedIn) {
      router.push('/(tabs)/(home)' as never);
    } else {
      router.push('/signup' as never);
    }
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLoggedIn) {
      router.push('/(tabs)/(home)' as never);
    } else {
      router.push('/login' as never);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View style={styles.navbar}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Users size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Fluent Edge</Text>
              <Text style={styles.brandSub}>AI Group Discussion Platform</Text>
            </View>
          </View>

          <View style={styles.navActions}>
            {isLoggedIn ? (
              <TouchableOpacity
                style={styles.primaryNavBtn}
                onPress={() => router.push('/(tabs)/(home)' as never)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryNavBtnText}>Go to Dashboard</Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.signInNavBtn}
                  onPress={handleSignIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInNavBtnText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryNavBtn}
                  onPress={handleGetStarted}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryNavBtnText}>Get Started Free</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Sparkles size={14} color="#0284C7" />
            <Text style={styles.heroBadgeText}>AI-Powered GD Preparation for Campus Placements</Text>
          </View>

          <Text style={styles.heroHeading}>
            Master Group Discussions.{'\n'}
            <Text style={styles.heroHeadingHighlight}>Ace Your Campus Placements.</Text>
          </Text>

          <Text style={styles.heroDescription}>
            Practice realistic group discussions with 4 conversational AI peers.
            Receive real-time speech, eye-contact, and posture feedback, and get placement-ready reports evaluated on strict corporate hiring rubrics.
          </Text>

          <View style={styles.heroCtaRow}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.heroPrimaryBtnText}>
                {isLoggedIn ? 'Launch GD Practice' : 'Start Free Practice GD'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {!isLoggedIn && (
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={handleSignIn}
                activeOpacity={0.85}
              >
                <Text style={styles.heroSecondaryBtnText}>Sign In to Account</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Social Proof Tags */}
          <View style={styles.socialProofRow}>
            <View style={styles.proofTag}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={styles.proofText}>Simple, Student-Friendly English</Text>
            </View>
            <View style={styles.proofTag}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={styles.proofText}>Natural Indian Student Accents</Text>
            </View>
            <View style={styles.proofTag}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={styles.proofText}>Strict 100-Mark Corporate Rubric</Text>
            </View>
          </View>
        </View>

        {/* Interactive Live Demo Mockup Card */}
        <View style={styles.demoCardContainer}>
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <View style={styles.demoHeaderLeft}>
                <View style={styles.demoLiveDot} />
                <Text style={styles.demoLiveText}>LIVE GD SIMULATION</Text>
              </View>
              <View style={styles.demoCategoryChip}>
                <Text style={styles.demoCategoryText}>CAMPUS PLACEMENTS</Text>
              </View>
            </View>

            <Text style={styles.demoTopicTitle}>
              "Startups vs Corporate IT Giants for Fresh Engineering Graduates"
            </Text>

            {/* AI Participant Row */}
            <View style={styles.demoParticipantRow}>
              <View style={[styles.demoSpeakerBadge, { borderColor: '#0284C7', backgroundColor: '#F0F9FF' }]}>
                <View style={[styles.demoAvatarCircle, { backgroundColor: '#0284C7' }]}>
                  <Text style={styles.demoAvatarInitials}>A</Text>
                </View>
                <View>
                  <Text style={[styles.demoSpeakerName, { color: '#0284C7' }]}>Aarav (Analytical)</Text>
                  <Text style={styles.demoSpeakerStatus}>Speaking now...</Text>
                </View>
              </View>

              <View style={[styles.demoSpeakerBadge, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
                <View style={[styles.demoAvatarCircle, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.demoAvatarInitials}>An</Text>
                </View>
                <Text style={styles.demoPeerName}>Ananya (Supportive)</Text>
              </View>

              <View style={[styles.demoSpeakerBadge, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
                <View style={[styles.demoAvatarCircle, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.demoAvatarInitials}>V</Text>
                </View>
                <Text style={styles.demoPeerName}>Vikram (Challenger)</Text>
              </View>
            </View>

            {/* Live Message Bubble */}
            <View style={styles.demoSpeechBubble}>
              <Text style={styles.demoSpeechText}>
                "I agree with the point about fast learning in startups. But let us look at the practical side. In established companies like TCS or Infosys, freshers get formal training and project stability before client deadlines. What do you think about managing work pressure?"
              </Text>
            </View>

            {/* Real-Time Behavioral Stats Ribbon */}
            <View style={styles.demoBehavioralRibbon}>
              <View style={styles.ribbonItem}>
                <Mic size={14} color="#0284C7" />
                <Text style={styles.ribbonText}>Speech: 135 WPM (Clear)</Text>
              </View>
              <View style={styles.ribbonItem}>
                <Video size={14} color="#10B981" />
                <Text style={styles.ribbonText}>Eye Contact: 82% (Direct)</Text>
              </View>
              <View style={styles.ribbonItem}>
                <Award size={14} color="#8B5CF6" />
                <Text style={styles.ribbonText}>Posture: Upright</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4 Core Features Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderCentered}>
            <Text style={styles.sectionPreTitle}>POWERFUL FEATURES</Text>
            <Text style={styles.sectionHeading}>Everything You Need to Clear Campus GDs</Text>
            <Text style={styles.sectionDescription}>
              Designed specifically for engineering and college students preparing for TCS, Infosys, Wipro, product startups, and top placement drives.
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            {/* Feature 1 */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Users size={24} color="#0284C7" />
              </View>
              <Text style={styles.featureTitle}>4 Conversational AI Personas</Text>
              <Text style={styles.featureDesc}>
                Debate with Aarav (Analytical), Ananya (Supportive), Vikram (Critical Challenger), and Maya (Creative). They speak simple, natural English and respond directly to your points.
              </Text>
            </View>

            {/* Feature 2 */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Mic size={24} color="#10B981" />
              </View>
              <Text style={styles.featureTitle}>Indian Accent Speech Recognition</Text>
              <Text style={styles.featureDesc}>
                Optimized microphone transcription with en-IN support. Tracks your speaking cadence, pauses, word pace (WPM), and detects repetitive verbal filler words.
              </Text>
            </View>

            {/* Feature 3 */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Video size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.featureTitle}>Webcam Body Language Analysis</Text>
              <Text style={styles.featureDesc}>
                Privacy-preserving real-time camera tracking. Analyzes screen eye contact, posture alignment, and hand gestures without saving private video.
              </Text>
            </View>

            {/* Feature 4 */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Award size={24} color="#F59E0B" />
              </View>
              <Text style={styles.featureTitle}>Strict Corporate Placement Rubrics</Text>
              <Text style={styles.featureDesc}>
                Transparent 100-mark evaluation across 7 recruitment criteria (Content, Arguments, Fluency, Coherence, Vocabulary). Unlock 15 achievement badges as you grow.
              </Text>
            </View>
          </View>
        </View>

        {/* How It Works (3 Steps) */}
        <View style={styles.stepsSection}>
          <View style={styles.sectionHeaderCentered}>
            <Text style={styles.sectionPreTitle}>SIMPLE WORKFLOW</Text>
            <Text style={styles.sectionHeading}>How Fluent Edge Works</Text>
          </View>

          <View style={styles.stepsRow}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Pick a GD Topic</Text>
              <Text style={styles.stepDesc}>
                Select from popular placement topics in Technical, Current Affairs, or HR/Behavioral categories, or create your custom debate topic.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Speak & Debate with AI</Text>
              <Text style={styles.stepDesc}>
                Share your opening views using your microphone. AI participants listen, challenge your points, and engage in multi-turn discussions.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Get Placement Report</Text>
              <Text style={styles.stepDesc}>
                Review your detailed corporate performance scorecard, identified strengths, priority growth areas, and earned achievement badges.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom CTA Banner */}
        <View style={styles.ctaBannerContainer}>
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerTitle}>Start Practicing for Your Campus GD Today</Text>
            <Text style={styles.ctaBannerSub}>
              Build genuine speaking confidence and master group discussions in a friendly, realistic environment.
            </Text>

            <TouchableOpacity
              style={styles.ctaBannerBtn}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBannerBtnText}>Get Started for Free</Text>
              <ArrowRight size={18} color="#0284C7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBrandRow}>
            <Text style={styles.footerBrand}>Fluent Edge</Text>
            <Text style={styles.footerTagline}>AI-Based Group Discussion Preparation Platform</Text>
          </View>

          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => router.push('/login' as never)}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => router.push('/signup' as never)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 60,
  },

  /* Navbar */
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInNavBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signInNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  primaryNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Hero Section */
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
    alignItems: 'center',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  heroHeading: {
    fontSize: isLargeScreen ? 44 : 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 54 : 40,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroHeadingHighlight: {
    color: '#0284C7',
  },
  heroDescription: {
    fontSize: isLargeScreen ? 17 : 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 26 : 22,
    maxWidth: 720,
    marginBottom: 28,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  heroSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  socialProofRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  proofTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proofText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },

  /* Demo Card */
  demoCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 48,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  demoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  demoLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  demoCategoryChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  demoTopicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  demoParticipantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  demoSpeakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoAvatarInitials: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  demoSpeakerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  demoSpeakerStatus: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
  },
  demoPeerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  demoSpeechBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
    marginBottom: 16,
  },
  demoSpeechText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  demoBehavioralRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ribbonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ribbonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Features Section */
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 56,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%',
  },
  sectionHeaderCentered: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionPreTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: isLargeScreen ? 32 : 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 640,
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },

  /* Steps Section */
  stepsSection: {
    paddingHorizontal: 24,
    marginBottom: 56,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%',
  },
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stepCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },

  /* CTA Banner */
  ctaBannerContainer: {
    paddingHorizontal: 24,
    marginBottom: 48,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  ctaBanner: {
    backgroundColor: '#0284C7',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  ctaBannerTitle: {
    fontSize: isLargeScreen ? 28 : 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaBannerSub: {
    fontSize: 14,
    color: '#E0F2FE',
    textAlign: 'center',
    maxWidth: 580,
    lineHeight: 20,
    marginBottom: 24,
  },
  ctaBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaBannerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Footer */
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  footerBrandRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  footerDivider: {
    color: '#CBD5E1',
  },
  footerCopy: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
