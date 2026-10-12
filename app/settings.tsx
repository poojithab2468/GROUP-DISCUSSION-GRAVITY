import Colors from '@/constants/colors';
import { useSessions } from '@/context/SessionContext';
import { useSettings } from '@/context/SettingsContext';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Bell, Brain, ChevronRight, CircleHelp, Info, Moon, Shield, Smartphone, Trash2 } from 'lucide-react-native';
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

    const SettingRow = ({ icon: Icon, title, value, onValueChange, type = 'toggle', onPress }: any) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={type === 'toggle'} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: Colors.light.tintLight }]}>
                    <Icon size={20} color={Colors.light.tint} />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            {type === 'toggle' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#CBD5E0', true: Colors.light.tint }}
                    thumbColor={Platform.OS === 'ios' ? '#FFF' : value ? '#FFF' : '#F4F3F4'}
                />
            ) : (
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     {value !== undefined && <Text style={{ color: Colors.light.textSecondary, marginRight: 8, fontSize: 14 }}>{value}</Text>}
                     <ChevronRight size={20} color={Colors.light.textSecondary} />
                 </View>
            )}
        </TouchableOpacity>
    );

    if (!isLoaded) return null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Settings',
                headerTitleStyle: { fontWeight: '700' },
            }} />

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>App Preferences</Text>
                <View style={styles.sectionCard}>
                    <SettingRow icon={Moon} title="Theme" value="Light" onValueChange={() => {
                        Alert.alert("Theme", "Fluent Edge is optimized with a clean light theme for professional GD preparation.");
                    }} />
                    <View style={styles.separator} />
                    <SettingRow icon={Bell} title="Push Notifications" value={pushEnabled ? "On" : "Off"} type="link" onPress={() => router.push('/modals/notifications')} />
                    <View style={styles.separator} />
                    <SettingRow icon={Smartphone} title="Haptic Feedback" value={hapticEnabled} onValueChange={setHapticEnabled} />
                </View>
            </View>


            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Support & Info</Text>
                <View style={styles.sectionCard}>
                    <SettingRow icon={CircleHelp} title="Help Center" type="link" onPress={() => router.push('/modals/help-center')} />
                    <View style={styles.separator} />
                    <SettingRow icon={Info} title="About Fluent Edge" type="link" onPress={() => router.push('/modals/about')} />
                </View>
            </View>

            <TouchableOpacity
                style={styles.dangerZone}
                onPress={handleClearHistory}
            >
                <View style={styles.dangerIconBox}>
                    <Trash2 size={20} color="#D32F2F" />
                </View>
                <Text style={styles.dangerText}>Clear All Practice History</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 1.0.4 (Build 42)</Text>
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: 20 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    sectionCard: { backgroundColor: Colors.light.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.borderLight, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    settingTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
    separator: { height: 1, backgroundColor: Colors.light.borderLight, marginLeft: 64 },
    dangerZone: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEB', padding: 16, borderRadius: 20, marginTop: 10 },
    dangerIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFDADA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    dangerText: { fontSize: 16, fontWeight: '600', color: '#D32F2F' },
    versionText: { textAlign: 'center', color: Colors.light.textSecondary, fontSize: 12, marginTop: 20 },
    bottomSpacer: { height: 40 }
});
