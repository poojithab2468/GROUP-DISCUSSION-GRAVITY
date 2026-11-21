import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Users,
  X,
  CheckCircle2,
  Mic,
  BarChart3,
  Award,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export default function SignupScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focused, setFocused] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Floating decoration animations
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Looping float animations for decorative elements
    const makeFloat = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -12, duration, useNativeDriver: true, easing: undefined }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true, easing: undefined }),
        ])
      );

    makeFloat(float1, 2600, 0).start();
    makeFloat(float2, 3200, 500).start();
    makeFloat(float3, 2900, 1100).start();
  }, []);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSignup = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setErrorMessage('Please enter your full name.'); return; }
    if (!trimmedEmail) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setErrorMessage('Please enter your email address.'); return; }
    if (!validateEmail(trimmedEmail)) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setErrorMessage('Please enter a valid email address.'); return; }
    if (!password || password.length < 4) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setErrorMessage('Password must be at least 4 characters.'); return; }
    if (password !== confirmPassword) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setErrorMessage('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      await register(trimmedName, trimmedEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/(home)' as never);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e.message || 'Registration failed';
      setErrorMessage(msg.toLowerCase().includes('already registered') ? 'This email is already registered. Please sign in.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputRow = (fieldKey: string) => [styles.inputRow, focused === fieldKey && styles.inputRowFocused];
  const iconColor = (fieldKey: string) => focused === fieldKey ? Colors.light.tint : Colors.light.textSecondary;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const benefits = [
    { icon: Users,      label: '4 AI Discussion Participants' },
    { icon: Mic,        label: 'Speech & Non-verbal Analysis' },
    { icon: Award,      label: 'Corporate Placement Rubrics' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {isDesktop ? (
          /* ── DESKTOP: Two-column split ── */
          <View style={styles.splitWrapper}>

            {/* LEFT PANEL */}
            <View style={styles.leftPanel}>
              {/* Background decorative circles */}
              <View style={styles.bgCircle1} />
              <View style={styles.bgCircle2} />
              <View style={styles.bgCircle3} />

              {/* Floating decorative blobs */}
              <Animated.View style={[styles.floatBlob1, { transform: [{ translateY: float1 }] }]} />
              <Animated.View style={[styles.floatBlob2, { transform: [{ translateY: float2 }] }]} />
              <Animated.View style={[styles.floatBlob3, { transform: [{ translateY: float3 }] }]} />

              {/* Brand */}
              <View style={styles.leftBrand}>
                <View style={styles.leftLogoWrap}>
                  <GraduationCap size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.leftBrandName}>Fluent Edge</Text>
              </View>

              {/* Headline */}
              <View style={styles.leftHeadline}>
                <Text style={styles.leftHeadlineText}>
                  Join 10,000+{'\n'}Students Preparing{'\n'}for GD
                </Text>
                <Text style={styles.leftSubText}>
                  AI-powered practice with real-time feedback
                </Text>
              </View>

              {/* Benefit bullets */}
              <View style={styles.leftBenefits}>
                {benefits.map((b, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <View style={styles.benefitIconWrap}>
                      <b.icon size={15} color={Colors.light.tint} />
                    </View>
                    <Text style={styles.benefitText}>{b.label}</Text>
                  </View>
                ))}
              </View>

              {/* Bottom badge */}
              <View style={styles.leftBadge}>
                <BarChart3 size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.leftBadgeText}>Trusted by students at 200+ colleges</Text>
              </View>
            </View>

            {/* RIGHT PANEL */}
            <Animated.View style={[styles.rightPanel, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {/* Back button */}
              <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
                <ArrowLeft size={15} color={Colors.light.textSecondary} />
                <Text style={styles.backBtnText}>Back to Home</Text>
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.rightHeader}>
                <View style={styles.rightLogoWrap}>
                  <GraduationCap size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.rightTitle}>Create Account</Text>
                <Text style={styles.rightSubtitle}>Start your GD practice journey</Text>
              </View>

              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={15} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  <TouchableOpacity onPress={() => setErrorMessage(null)}>
                    <X size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Form */}
              <View style={styles.form}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={inputRow('name')}>
                    <Users size={17} color={iconColor('name')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Pooja Sharma"
                      placeholderTextColor={Colors.light.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused('')}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>College / Personal Email</Text>
                  <View style={inputRow('email')}>
                    <Mail size={17} color={iconColor('email')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="pooja@college.edu"
                      placeholderTextColor={Colors.light.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused('')}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Create Password</Text>
                  <View style={inputRow('password')}>
                    <Lock size={17} color={iconColor('password')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="At least 4 characters"
                      placeholderTextColor={Colors.light.textTertiary}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => { setPassword(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused('')}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? <EyeOff size={17} color={Colors.light.textSecondary} /> : <Eye size={17} color={Colors.light.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={inputRow('confirm')}>
                    <ShieldCheck size={17} color={iconColor('confirm')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor={Colors.light.textTertiary}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused('')}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={17} color={Colors.light.textSecondary} /> : <Eye size={17} color={Colors.light.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.signupBtn, isLoading && { opacity: 0.75 }]}
                  onPress={handleSignup}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.signupBtnText}>Creating Account…</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.signupBtnText}>Create Account &amp; Start GD</Text>
                      <ArrowRight size={17} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        ) : (
          /* ── MOBILE: Single column ── */
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
              <ArrowLeft size={16} color={Colors.light.textSecondary} />
              <Text style={styles.backBtnText}>Back to Home</Text>
            </TouchableOpacity>

            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.cardAccentBar} />

              {/* Header */}
              <View style={styles.headerArea}>
                <View style={styles.logoWrap}>
                  <GraduationCap size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Start your GD practice journey</Text>
              </View>

              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  <TouchableOpacity onPress={() => setErrorMessage(null)}>
                    <X size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Form */}
              <View style={styles.form}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={inputRow('name')}>
                    <Users size={17} color={iconColor('name')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Pooja Sharma"
                      placeholderTextColor={Colors.light.textTertiary}
                      value={name}
                      onChangeText={(t) => { setName(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused('')}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>College / Personal Email</Text>
                  <View style={inputRow('email')}>
                    <Mail size={17} color={iconColor('email')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="pooja@college.edu"
                      placeholderTextColor={Colors.light.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused('')}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Create Password</Text>
                  <View style={inputRow('password')}>
                    <Lock size={17} color={iconColor('password')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="At least 4 characters"
                      placeholderTextColor={Colors.light.textTertiary}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => { setPassword(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused('')}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? <EyeOff size={17} color={Colors.light.textSecondary} /> : <Eye size={17} color={Colors.light.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={inputRow('confirm')}>
                    <ShieldCheck size={17} color={iconColor('confirm')} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor={Colors.light.textTertiary}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (errorMessage) setErrorMessage(null); }}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused('')}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={17} color={Colors.light.textSecondary} /> : <Eye size={17} color={Colors.light.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.signupBtn, isLoading && { opacity: 0.75 }]}
                  onPress={handleSignup}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.signupBtnText}>Creating Account…</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.signupBtnText}>Create Account &amp; Start GD</Text>
                      <ArrowRight size={17} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // ── Scroll containers ─────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 48,
    justifyContent: 'center',
  },
  scrollContentDesktop: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: '100%' as any,
  },

  // ── Desktop split wrapper ─────────────────────────────────────────────────
  splitWrapper: {
    flexDirection: 'row',
    flex: 1,
    minHeight: '100%' as any,
  },

  // ── LEFT PANEL ────────────────────────────────────────────────────────────
  leftPanel: {
    flex: 1,
    backgroundColor: '#3730A3',
    paddingHorizontal: 52,
    paddingVertical: 56,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // Background decorative circles
  bgCircle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 60,
    left: -60,
  },
  bgCircle3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 200,
    right: 30,
  },

  // Floating animated blobs
  floatBlob1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99,102,241,0.35)',
    top: 120,
    right: 60,
  },
  floatBlob2: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(6,182,212,0.25)',
    top: 260,
    left: 40,
  },
  floatBlob3: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.25)',
    bottom: 160,
    right: 90,
  },

  // Brand block
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leftLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  leftBrandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // Headline block
  leftHeadline: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 32,
  },
  leftHeadlineText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: 16,
  },
  leftSubText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
  },

  // Benefits
  leftBenefits: {
    gap: 14,
    marginBottom: 36,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.90)',
  },

  // Bottom badge
  leftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
  },
  leftBadgeText: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '500',
  },

  // ── RIGHT PANEL (desktop) ─────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 52,
    paddingVertical: 48,
    justifyContent: 'center',
    maxWidth: 540,
  },
  rightHeader: {
    marginBottom: 28,
  },
  rightLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  rightTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  rightSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 21,
  },

  // ── MOBILE card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
    overflow: 'hidden',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.light.tint,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Shared: Back button ───────────────────────────────────────────────────
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  // ── Shared: Error banner ──────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Shared: Form ──────────────────────────────────────────────────────────
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRowFocused: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
    shadowColor: Colors.light.tint,
    shadowOpacity: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.light.text,
  },
  eyeBtn: {
    padding: 6,
  },

  // ── Shared: Submit button ─────────────────────────────────────────────────
  signupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Shared: Footer ────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '700',
  },
});
