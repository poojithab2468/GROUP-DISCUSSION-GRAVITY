import Colors from '@/constants/colors';
import { useSettings } from '@/context/SettingsContext';
import { router } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NotificationsScreen() {
    const { notificationPrefs, updateNotificationPrefs } = useSettings();
    const [timeInput, setTimeInput] = useState(notificationPrefs.reminderTime);

    const NotificationToggle = ({ title, description, value, onValueChange }: any) => (
        <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>{title}</Text>
                <Text style={styles.toggleDesc}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#CBD5E0', true: Colors.light.tint }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : value ? '#FFF' : '#F4F3F4'}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Push Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily Reminders</Text>
                    <View style={styles.card}>
                        <NotificationToggle 
                            title="Practice Reminders" 
                            description="Get a daily ping to stay consistent."
                            value={notificationPrefs.remindersEnabled}
                            onValueChange={(val: boolean) => updateNotificationPrefs({ remindersEnabled: val })}
                        />
                        
                        {notificationPrefs.remindersEnabled && (
                            <>
                                <View style={styles.separator} />
                                <View style={styles.timeRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock size={16} color={Colors.light.textSecondary} style={{ marginRight: 8 }}/>
                                        <Text style={styles.timeLabel}>Reminder Time (HH:MM)</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.timeInput}
                                        value={timeInput}
                                        onChangeText={setTimeInput}
                                        onBlur={() => updateNotificationPrefs({ reminderTime: timeInput })}
                                        keyboardType="numbers-and-punctuation"
                                        placeholder="18:00"
                                        placeholderTextColor={Colors.light.textSecondary}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Alerts & Progress</Text>
                    <View style={styles.card}>
                        <NotificationToggle 
                            title="Motivation Notifications" 
                            description="Occasional tips to boost your confidence."
                            value={notificationPrefs.motivationEnabled}
                            onValueChange={(val: boolean) => updateNotificationPrefs({ motivationEnabled: val })}
                        />
                        <View style={styles.separator} />
                        <NotificationToggle 
                            title="Weekly Progress Reports" 
                            description="Summary of your performance every Sunday."
                            value={notificationPrefs.weeklyReportsEnabled}
                            onValueChange={(val: boolean) => updateNotificationPrefs({ weeklyReportsEnabled: val })}
                        />
                        <View style={styles.separator} />
                        <NotificationToggle 
                            title="Session Completion Alerts" 
                            description="Notify when AI finishes long evaluations."
                            value={notificationPrefs.sessionAlertsEnabled}
                            onValueChange={(val: boolean) => updateNotificationPrefs({ sessionAlertsEnabled: val })}
                        />
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: Colors.light.surface, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
    content: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: Colors.light.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.light.border, shadowColor: Colors.light.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    toggleLeft: { flex: 1, paddingRight: 16 },
    toggleTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 4 },
    toggleDesc: { fontSize: 13, color: Colors.light.textSecondary },
    separator: { height: 1, backgroundColor: Colors.light.border, marginLeft: 16 },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.light.surfaceElevated },
    timeLabel: { fontSize: 14, color: Colors.light.text, fontWeight: '500' },
    timeInput: { backgroundColor: Colors.light.surface, color: Colors.light.text, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border, minWidth: 80, textAlign: 'center' },
});
