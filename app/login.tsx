import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { 
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
  AlertCircle 
} from 'lucide-react-native';
import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Modal, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';

export default function LoginScreen() {
    const { login, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Forgot Password Modal State
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetNewPassword, setResetNewPassword] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState<string | null>(null);

    const validateEmail = (val: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    };

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
            setErrorMessage('Please enter a valid email address (e.g. name@college.edu).');
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
            if (msg.toLowerCase().includes('not found')) {
                setErrorMessage('No account found with this email. Would you like to create an account?');
            } else if (msg.toLowerCase().includes('invalid password')) {
                setErrorMessage('Incorrect password. Please try again or use "Forgot password?".');
            } else {
                setErrorMessage(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setResetError(null);
        setResetSuccess(null);
        const trimmedEmail = resetEmail.trim();

        if (!trimmedEmail) {
            setResetError('Please enter your registered email address.');
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            setResetError('Please provide a valid email address.');
            return;
        }

        if (!resetNewPassword || resetNewPassword.length < 4) {
            setResetError('New password must be at least 4 characters long.');
            return;
        }

        setResetLoading(true);
        try {
            await resetPassword(trimmedEmail, resetNewPassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setResetSuccess('Password updated successfully! You can now sign in with your new password.');
            setPassword(resetNewPassword);
            setEmail(trimmedEmail);
            setTimeout(() => {
                setForgotModalVisible(false);
                setResetSuccess(null);
            }, 1800);
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setResetError(e.message || 'Could not reset password. Please check the email entered.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleGoogleSignInPrompt = () => {
        setErrorMessage('Google Single Sign-On is reserved for partner campus portals. Please use your standard student email & password.');
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Back to Home Link */}
                <TouchableOpacity 
                    style={styles.backHomeBtn} 
                    onPress={() => router.replace('/')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.backHomeText}>Back to Fluent Edge Home</Text>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoWrap}>
                        <Users size={36} color="#FFF" />
                    </View>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue your placement GD practice</Text>
                </View>

                {/* Inline Error Banner */}
                {errorMessage && (
                    <View style={styles.errorBanner}>
                        <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
                        <Text style={styles.errorBannerText}>{errorMessage}</Text>
                        <TouchableOpacity onPress={() => setErrorMessage(null)}>
                            <X size={16} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>College / Student Email</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="student@college.edu"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(t) => {
                                    setEmail(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Password</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setResetEmail(email.trim());
                                    setResetError(null);
                                    setResetSuccess(null);
                                    setForgotModalVisible(true);
                                }}
                                style={styles.forgotBtn}
                            >
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={(t) => {
                                    setPassword(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                            />
                            <TouchableOpacity 
                                onPress={() => setShowPassword(!showPassword)} 
                                style={styles.eyeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} color={Colors.light.textSecondary} />
                                ) : (
                                    <Eye size={18} color={Colors.light.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sign In Button */}
                    <TouchableOpacity 
                        style={[styles.loginBtn, isLoading && { opacity: 0.75 }]} 
                        onPress={handleLogin} 
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <View style={styles.btnLoadingRow}>
                                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.loginBtnText}>Signing in...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.loginBtnText}>Sign In to Dashboard</Text>
                                <ArrowRight size={18} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Google Alternative */}
                    <TouchableOpacity 
                        style={styles.googleBtn} 
                        onPress={handleGoogleSignInPrompt}
                        activeOpacity={0.8}
                    >
                        <Sparkles size={16} color={Colors.light.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={styles.googleBtnText}>Sign in with Campus Google Account</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer Switch */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to Fluent Edge? </Text>
                    <TouchableOpacity onPress={() => router.push('/signup')}>
                        <Text style={styles.signupText}>Create free account</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Forgot Password Modal */}
            <Modal
                visible={forgotModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setForgotModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconWrap}>
                                <KeyRound size={20} color={Colors.light.tint} />
                            </View>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <TouchableOpacity 
                                onPress={() => setForgotModalVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={Colors.light.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDesc}>
                            Enter your registered email address and choose a new password to immediately restore account access.
                        </Text>

                        {resetError && (
                            <View style={styles.resetErrorBanner}>
                                <AlertCircle size={15} color="#DC2626" style={{ marginRight: 6 }} />
                                <Text style={styles.resetErrorText}>{resetError}</Text>
                            </View>
                        )}

                        {resetSuccess && (
                            <View style={styles.resetSuccessBanner}>
                                <CheckCircle2 size={15} color="#059669" style={{ marginRight: 6 }} />
                                <Text style={styles.resetSuccessText}>{resetSuccess}</Text>
                            </View>
                        )}

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Registered Email</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={16} color={Colors.light.textSecondary} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="your-email@college.edu"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={resetEmail}
                                    onChangeText={setResetEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>New Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={16} color={Colors.light.textSecondary} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter at least 4 characters"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showResetPassword}
                                    value={resetNewPassword}
                                    onChangeText={setResetNewPassword}
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowResetPassword(!showResetPassword)} 
                                    style={styles.eyeBtn}
                                >
                                    {showResetPassword ? (
                                        <EyeOff size={16} color={Colors.light.textSecondary} />
                                    ) : (
                                        <Eye size={16} color={Colors.light.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.cancelModalBtn}
                                onPress={() => setForgotModalVisible(false)}
                                disabled={resetLoading}
                            >
                                <Text style={styles.cancelModalText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.submitModalBtn, resetLoading && { opacity: 0.7 }]}
                                onPress={handleResetPassword}
                                disabled={resetLoading}
                            >
                                {resetLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.submitModalText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 36,
        paddingBottom: 40,
        justifyContent: 'center',
        maxWidth: 520,
        width: '100%',
        alignSelf: 'center',
    },
    backHomeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: Colors.light.surfaceSecondary,
    },
    backHomeText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        marginLeft: 6,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoWrap: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: Colors.light.tint,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.light.text,
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 20,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#DC2626',
        fontWeight: '500',
        lineHeight: 18,
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 18,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.text,
        marginLeft: 2,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        borderWidth: 1.2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        shadowColor: Colors.light.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    icon: {
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
    forgotBtn: {
        paddingVertical: 2,
    },
    forgotText: {
        fontSize: 13,
        color: Colors.light.tint,
        fontWeight: '600',
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.tint,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 6,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 3,
    },
    btnLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginRight: 8,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.surfaceSecondary,
        borderWidth: 1,
        borderColor: Colors.light.border,
        paddingVertical: 13,
        borderRadius: 14,
        marginTop: 12,
    },
    googleBtnText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    signupText: {
        fontSize: 14,
        color: Colors.light.tint,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 440,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.light.tintLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalDesc: {
        fontSize: 13.5,
        color: Colors.light.textSecondary,
        lineHeight: 19,
        marginBottom: 16,
    },
    resetErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 10,
        borderRadius: 10,
        marginBottom: 14,
    },
    resetErrorText: {
        flex: 1,
        fontSize: 12.5,
        color: '#DC2626',
        fontWeight: '500',
    },
    resetSuccessBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        padding: 10,
        borderRadius: 10,
        marginBottom: 14,
    },
    resetSuccessText: {
        flex: 1,
        fontSize: 12.5,
        color: '#059669',
        fontWeight: '600',
    },
    modalInputGroup: {
        marginBottom: 14,
    },
    modalLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 6,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    cancelModalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: Colors.light.surfaceSecondary,
    },
    cancelModalText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    submitModalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
        backgroundColor: Colors.light.tint,
        minWidth: 120,
        alignItems: 'center',
    },
    submitModalText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
