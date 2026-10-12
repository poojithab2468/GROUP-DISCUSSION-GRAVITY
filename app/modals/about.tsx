import Colors from '@/constants/colors';
import { router } from 'expo-router';
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoText}>FE</Text>
                    </View>
                    <Text style={styles.appName}>Fluent Edge</Text>
                    <Text style={styles.version}>Version 1.0.4</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.description}>
                        Fluent Edge is an AI-powered communication and placement preparation platform helping students improve GD, interview, and speaking confidence.
                    </Text>
                </View>

                <View style={[styles.section, styles.teamSection]}>
                    <Text style={styles.sectionTitle}>Developer Team</Text>
                    <Text style={styles.teamName}>QuadThink</Text>
                    <View style={styles.memberList}>
                        {['Poojitha', 'Harsha', 'Shreya', 'Chalavanth'].map((name, idx) => (
                            <View key={idx} style={styles.memberTag}>
                                <Text style={styles.memberName}>{name}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.bharatTag}>
                        <Text style={styles.bharatText}>Developed in Bharat 🇮🇳</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://example.com/terms')}>
                        <Text style={styles.linkText}>Terms & Conditions</Text>
                        <ExternalLink size={16} color={Colors.light.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://example.com/privacy')}>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                        <ShieldAlert size={16} color={Colors.light.textSecondary} />
                    </TouchableOpacity>
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
    logoContainer: { alignItems: 'center', marginVertical: 32 },
    logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.light.tint, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logoText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
    appName: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
    version: { fontSize: 14, color: Colors.light.textSecondary },
    section: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border, shadowColor: Colors.light.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    description: { fontSize: 15, color: Colors.light.text, lineHeight: 24, textAlign: 'center' },
    teamSection: { alignItems: 'center' },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    teamName: { fontSize: 22, fontWeight: '800', color: Colors.light.tint, marginBottom: 16 },
    memberList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
    memberTag: { backgroundColor: Colors.light.surfaceElevated, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border },
    memberName: { color: Colors.light.text, fontSize: 14, fontWeight: '600' },
    bharatTag: { backgroundColor: 'rgba(217, 119, 6, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(217, 119, 6, 0.25)' },
    bharatText: { color: Colors.light.accentWarm, fontSize: 14, fontWeight: '700' },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    linkText: { color: Colors.light.text, fontSize: 15, fontWeight: '500' },
    separator: { height: 1, backgroundColor: Colors.light.border, marginVertical: 12 },
});
