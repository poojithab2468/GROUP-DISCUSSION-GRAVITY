import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
  Users,
  X,
  Shield,
  Zap,
  Trophy,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH >= 900;

// ─── Floating Orb ────────────────────────────────────────────────────────────
function FloatingOrb({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: object;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          position: 'absolute',
          transform: [{ translateY }],
        },
        style,
      ]}
    />
  );
}

// ─── Feature Bullet ──────────────────────────────────────────────────────────
function FeatureBullet({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureBullet}>
      <View style={styles.featureBulletIcon}>
        <Icon size={15} color="#FFFFFF" />
      </View>
      <Text style={styles.featureBulletText}>{text}</Text>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const forgotModalVisible_state = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = forgotModalVisible_state;
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleLogin = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Please enter both your email address and password.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      await login(trimmedEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/(home)' as never);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e.message || 'Invalid credentials';
      if (msg.toLowerCase().includes('not found')) setErrorMessage('No account found with this email.');
      else if (msg.toLowerCase().includes('invalid password')) setErrorMessage('Incorrect password. Please try again.');
      else setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError(null);
    setResetSuccess(null);
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) { setResetError('Please enter your registered email.'); return; }
    if (!validateEmail(trimmedEmail)) { setResetError('Please provide a valid email.'); return; }
    if (!resetNewPassword || resetNewPassword.length < 4) { setResetError('New password must be at least 4 characters.'); return; }
    setResetLoading(true);
    try {
      await resetPassword(trimmedEmail, resetNewPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResetSuccess('Password updated! You can now sign in.');
      setPassword(resetNewPassword);
      setEmail(trimmedEmail);
      setTimeout(() => { setForgotModalVisible(false); setResetSuccess(null); }, 1800);
    } catch (e: any) {
      setResetError(e.message || 'Could not reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Left Panel (wide screens) ──────────────────────────────────────────
  const LeftPanel = () => (
    <View style={styles.leftPanel}>
      {/* Floating orbs */}
      <FloatingOrb size={260} color="rgba(255,255,255,0.05)" style={{ top: -60, right: -60 }} />
      <FloatingOrb size={160} color="rgba(6,182,212,0.18)" style={{ bottom: 80, left: -50 }} />
      <FloatingOrb size={90} color="rgba(255,255,255,0.08)" style={{ top: '45%', right: 20 }} />

      {/* Brand logo */}
      <View style={styles.leftLogoWrap}>
        <View style={styles.leftLogoCircle}>
          <Users size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.leftBrandName}>Fluent Edge</Text>
      </View>

      {/* Headline */}
      <Text style={styles.leftTagline}>
        Master Group{'\n'}Discussions.{'\n'}Ace Your Placement.
      </Text>
      <Text style={styles.leftSubTagline}>
        AI-powered GD simulations trusted by{'\n'}students across top campuses.
      </Text>

      {/* Feature bullets */}
      <View style={styles.featureList}>
        <FeatureBullet icon={Zap} text="Real-time AI feedback on your arguments" />
        <FeatureBullet icon={Trophy} text="Topic bank from actual placement rounds" />
        <FeatureBullet icon={Shield} text="Safe space to practice & build confidence" />
      </View>

      {/* Bottom badge */}
      <View style={styles.leftBadge}>
        <Sparkles size={13} color="rgba(255,255,255,0.75)" />
        <Text style={styles.leftBadgeText}>Powered by Gemini AI</Text>
      </View>
    </View>
  );

  // ─── Right Panel (form) ─────────────────────────────────────────────────
  const RightPanel = () => (
    <Animated.View
      style={[
        styles.rightPanel,
        IS_WIDE ? styles.rightPanelWide : styles.rightPanelMobile,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.rightScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={15} color={Colors.light.textSecondary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        {/* Logo + header */}
        <View style={styles.rightHeader}>
          <View style={styles.rightLogoWrap}>
            <Users size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your placement GD practice</Text>
        </View>

        {/* Error banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>College / Student Email</Text>
            <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
              <Mail size={17} color={emailFocused ? Colors.light.tint : Colors.light.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="student@college.edu"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errorMessage) setErrorMessage(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                onPress={() => { setResetEmail(email.trim()); setResetError(null); setResetSuccess(null); setForgotModalVisible(true); }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
              <Lock size={17} color={passwordFocused ? Colors.light.tint : Colors.light.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.light.textTertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errorMessage) setErrorMessage(null); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword
                  ? <EyeOff size={17} color={Colors.light.textSecondary} />
                  : <Eye size={17} color={Colors.light.textSecondary} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign-in button */}
          <TouchableOpacity
            style={[styles.signInBtn, isLoading && styles.signInBtnLoading]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.signInBtnText}>Signing in…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.signInBtnText}>Sign In to Dashboard</Text>
                <ArrowRight size={17} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Campus Google button */}
          <TouchableOpacity
            style={styles.altBtn}
            onPress={() => setErrorMessage('Google SSO is reserved for partner campus portals. Please use email & password.')}
            activeOpacity={0.8}
          >
            <Sparkles size={15} color={Colors.light.tint} />
            <Text style={styles.altBtnText}>Sign in with Campus Google Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.footerLink}>Create free account →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─── Root ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {IS_WIDE ? (
        // Wide / Desktop — two-column split
        <View style={styles.splitLayout}>
          <LeftPanel />
          <RightPanel />
        </View>
      ) : (
        // Mobile — single column
        <View style={styles.mobileLayout}>
          <RightPanel />
        </View>
      )}

      {/* ── Forgot Password Modal ─────────────────────────────────── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Accent bar */}
            <View style={styles.modalCardAccent} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <KeyRound size={18} color={Colors.light.tint} />
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={19} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter your registered email and choose a new password to restore account access.
            </Text>

            {resetError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={[styles.errorText, { flex: 1 }]}>{resetError}</Text>
              </View>
            )}
            {resetSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={14} color="#059669" />
                <Text style={styles.successText}>{resetSuccess}</Text>
              </View>
            )}

            {/* Reset email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Registered Email</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your-email@college.edu"
                  placeholderTextColor={Colors.light.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
              </View>
            </View>

            {/* Reset new password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 4 characters"
                  placeholderTextColor={Colors.light.textTertiary}
                  secureTextEntry={!showResetPassword}
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowResetPassword(!showResetPassword)}
                  style={styles.eyeBtn}
                >
                  {showResetPassword
                    ? <EyeOff size={16} color={Colors.light.textSecondary} />
                    : <Eye size={16} color={Colors.light.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setForgotModalVisible(false)}
                disabled={resetLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, resetLoading && { opacity: 0.7 }]}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.confirmBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root layout
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // ── Wide (split) layout
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
  },

  // ── Left panel
  leftPanel: {
    flex: 1,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 56,
    overflow: 'hidden',
  },
  leftLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 48,
  },
  leftLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  leftBrandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  leftTagline: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 50,
    letterSpacing: -1,
    marginBottom: 18,
  },
  leftSubTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 23,
    marginBottom: 44,
  },
  featureList: {
    gap: 16,
    marginBottom: 56,
  },
  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureBulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureBulletText: {
    flex: 1,
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.90)',
    fontWeight: '500',
    lineHeight: 21,
  },
  leftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  leftBadgeText: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.80)',
    fontWeight: '600',
  },

  // ── Right panel
  rightPanel: {
    backgroundColor: Colors.light.surface,
  },
  rightPanelWide: {
    flex: 1,
    shadowColor: 'rgba(79,70,229,0.12)',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  rightPanelMobile: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  rightScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 36,
    paddingTop: 44,
    paddingBottom: 48,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginBottom: 36,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  // Right header
  rightHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  rightLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  // Error / success banners
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },

  // Form
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
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
  forgotText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: '700',
  },

  // Sign-in button
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  signInBtnLoading: {
    opacity: 0.75,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    fontSize: 12.5,
    color: Colors.light.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Google / Alt button
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.borderStrong,
    paddingVertical: 14,
    borderRadius: 16,
  },
  altBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.light.text,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
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

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    width: '100%',
    maxWidth: 460,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
  },
  modalCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.light.tint,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13.5,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  confirmBtn: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    minWidth: 130,
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
