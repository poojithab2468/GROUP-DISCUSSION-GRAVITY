import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  Lock, 
  Mail, 
  Users, 
  AlertCircle, 
  X,
  ShieldCheck
} from 'lucide-react-native';
import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
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

    const validateEmail = (val: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    };

    const handleSignup = async () => {
        setErrorMessage(null);

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage('Please enter your full name.');
            return;
        }

        if (!trimmedEmail) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage('Please enter a valid email address (e.g. name@college.edu).');
            return;
        }

        if (!password || password.length < 4) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage('Password must be at least 4 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMessage('Passwords do not match. Please re-enter your password.');
            return;
        }

        setIsLoading(true);
        try {
            await register(trimmedName, trimmedEmail, password);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)/(home)' as never);
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = e.message || 'Registration failed';
            if (msg.toLowerCase().includes('already registered')) {
                setErrorMessage('This email is already registered. Please sign in or use a different email.');
            } else {
                setErrorMessage(msg);
            }
        } finally {
            setIsLoading(false);
        }
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
                        <GraduationCap size={36} color="#FFF" />
                    </View>
                    <Text style={styles.title}>Create Student Account</Text>
                    <Text style={styles.subtitle}>Join Fluent Edge to practice Placement Group Discussions</Text>
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

                {/* Signup Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputWrapper}>
                            <Users size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Pooja Sharma"
                                placeholderTextColor="#94A3B8"
                                value={name}
                                onChangeText={(t) => {
                                    setName(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>College / Personal Email</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="pooja@college.edu"
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
                        <Text style={styles.label}>Create Password</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="At least 4 characters"
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <ShieldCheck size={18} color={Colors.light.textSecondary} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter your password"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry={!showConfirmPassword}
                                value={confirmPassword}
                                onChangeText={(t) => {
                                    setConfirmPassword(t);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                            />
                            <TouchableOpacity 
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                                style={styles.eyeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={18} color={Colors.light.textSecondary} />
                                ) : (
                                    <Eye size={18} color={Colors.light.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[styles.signupBtn, isLoading && { opacity: 0.75 }]} 
                        onPress={handleSignup} 
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <View style={styles.btnLoadingRow}>
                                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.signupBtnText}>Creating Account...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.signupBtnText}>Create Account & Start GD</Text>
                                <ArrowRight size={18} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text style={styles.loginText}>Sign in</Text>
                    </TouchableOpacity>
                </View>

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
        marginBottom: 26,
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
        marginBottom: 16,
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
    signupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.tint,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 10,
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
    signupBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginRight: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
    footerText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    loginText: {
        fontSize: 14,
        color: Colors.light.tint,
        fontWeight: '700',
    },
});
