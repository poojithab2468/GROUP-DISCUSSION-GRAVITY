import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { useSettings } from '@/context/SettingsContext';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Bell, Brain, ChevronLeft, ChevronRight, CircleHelp, Info, Moon, Shield, Smartphone, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const { isDarkMode, pushEnabled, hapticEnabled, setHapticEnabled, isLoaded } = useSettings();
    const { clearAllSessions } = useSessions();
    const [aiAnalysisEnabled, setAiAnalysisEnabled] = React.useState(true);

    const handleClearHistory = () => {
        if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete all practice history? This action cannot be undone.")) {
                clearAllSessions();
                alert("Practice history cleared successfully.");
            }
        } else {
            Alert.alert("Clear History", "Are you sure you want to delete all practice history? This action cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm Delete", style: "destructive", onPress: () => {
                    clearAllSessions();
                    Alert.alert("Success", "Practice history cleared successfully.");
                }}
            ]);
        }
    };

    const SettingRow = ({ icon: Icon, title, value, onValueChange, type = 'toggle', onPress, iconBg, iconColor }: any) => (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            disabled={type === 'toggle'}
            activeOpacity={0.7}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: iconBg || 'rgba(79,70,229,0.10)' }]}>
                    <Icon size={18} color={iconColor || '#4F46E5'} />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            {type === 'toggle' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#CBD5E0', true: '#4F46E5' }}
                    thumbColor={Platform.OS === 'ios' ? '#FFF' : value ? '#FFF' : '#F4F3F4'}
                />
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {value !== undefined && (
                        <Text style={styles.settingValue}>{value}</Text>
                    )}
                    <ChevronRight size={18} color="#94A3B8" />
                </View>
            )}
        </TouchableOpacity>
    );

    if (!isLoaded) return null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={22} color="#4F46E5" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* App Preferences Section */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>App Preferences</Text>
                <View style={styles.sectionCard}>
                    <SettingRow
                        icon={Moon}
                        title="Theme"
                        value="Light"
                        type="link"
                        iconBg="#EDE9FE"
                        iconColor="#7C3AED"
                        onPress={() => {
                            Alert.alert("Theme", "Fluent Edge is optimized with a clean light theme for professional GD preparation.");
                        }}
                    />
                    <View style={styles.separator} />
                    <SettingRow
                        icon={Bell}
                        title="Push Notifications"
                        value={pushEnabled ? "On" : "Off"}
                        type="link"
                        iconBg="#FEF3C7"
                        iconColor="#D97706"
                        onPress={() => router.push('/modals/notifications')}
                    />
                    <View style={styles.separator} />
                    <SettingRow
                        icon={Smartphone}
                        title="Haptic Feedback"
                        value={hapticEnabled}
                        onValueChange={setHapticEnabled}
                        iconBg="#DCFCE7"
                        iconColor="#059669"
                    />
                </View>
            </View>

            {/* Support & Info Section */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Support &amp; Info</Text>
                <View style={styles.sectionCard}>
                    <SettingRow
                        icon={CircleHelp}
                        title="Help Center"
                        type="link"
                        iconBg="#E0F2FE"
                        iconColor="#0284C7"
                        onPress={() => router.push('/modals/help-center')}
                    />
                    <View style={styles.separator} />
                    <SettingRow
                        icon={Info}
                        title="About Fluent Edge"
                        type="link"
                        iconBg="#F3E8FF"
                        iconColor="#8B5CF6"
                        onPress={() => router.push('/modals/about')}
                    />
                    <View style={styles.separator} />
                    <SettingRow
                        icon={Shield}
                        title="Privacy Policy"
                        type="link"
                        iconBg="rgba(79,70,229,0.10)"
                        iconColor="#4F46E5"
                        onPress={() => router.push('/modals/about')}
                    />
                </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: '#DC2626' }]}>Danger Zone</Text>
                <TouchableOpacity
                    style={styles.dangerZone}
                    onPress={handleClearHistory}
                    activeOpacity={0.8}
                >
                    <View style={styles.dangerContent}>
                        <View style={styles.dangerIconBox}>
                            <Trash2 size={20} color="#DC2626" />
                        </View>
                        <View style={styles.dangerTextCol}>
                            <Text style={styles.dangerText}>Clear All Practice History</Text>
                            <Text style={styles.dangerSubtext}>Permanently delete all GD sessions and reports</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#DC2626" />
                </TouchableOpacity>
            </View>

            {/* Version */}
            <Text style={styles.versionText}>Fluent Edge · Version 1.0.4 (Build 42)</Text>
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FF' },
    content: { paddingBottom: 24 },

    /* Custom Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 16,
        backgroundColor: '#F5F7FF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(79,70,229,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },

    /* Sections */
    section: {
        marginBottom: 8,
        paddingHorizontal: 16,
        marginTop: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#4F46E5',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E7FF',
        overflow: 'hidden',
        shadowColor: 'rgba(79,70,229,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
    },

    /* Setting Row */
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    settingValue: {
        fontSize: 14,
        color: '#475569',
        marginRight: 6,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: '#F1F5FF',
        marginLeft: 68,
    },

    /* Danger Zone */
    dangerZone: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
        shadowColor: 'rgba(220,38,38,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 2,
    },
    dangerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dangerIconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    dangerTextCol: { flex: 1 },
    dangerText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#DC2626',
    },
    dangerSubtext: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 2,
        fontWeight: '400',
    },

    versionText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 28,
        fontWeight: '500',
    },
    bottomSpacer: { height: 40 },
});
