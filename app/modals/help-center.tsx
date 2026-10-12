import Colors from '@/constants/colors';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquareWarning } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FAQS = [
  { q: "How does AI scoring work?", a: "Fluent Edge analyzes your voice transcription, eye contact, and emotional stability to compute a comprehensive professionalism score using advanced real-time ML components." },
  { q: "Why microphone isn't working?", a: "Make sure you have granted microphone permissions. On Web, standard browser prompts appear. On Mobile, check your app settings." },
  { q: "How is placement readiness calculated?", a: "It aggregates your performance across multiple GD sessions, tracking argument structure, vocal clarity, and non-verbal communication." },
  { q: "How do I improve confidence score?", a: "Maintain steady eye contact with the camera, speak at a consistent pace, and use positive hand gestures while talking." }
];

export default function HelpCenterScreen() {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Center</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroSection}>
                    <LifeBuoy size={48} color={Colors.light.tint} />
                    <Text style={styles.heroTitle}>How can we help?</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    {FAQS.map((faq, idx) => (
                        <View key={idx} style={styles.faqCard}>
                            <TouchableOpacity 
                                style={styles.faqHeader} 
                                onPress={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.faqQ}>{faq.q}</Text>
                                {expandedIndex === idx ? (
                                    <ChevronUp size={20} color={Colors.light.tint} />
                                ) : (
                                    <ChevronDown size={20} color={Colors.light.textSecondary} />
                                )}
                            </TouchableOpacity>
                            {expandedIndex === idx && (
                                <Text style={styles.faqA}>{faq.a}</Text>
                            )}
                        </View>
                    ))}
                </View>

                <View style={[styles.section, { marginTop: 8 }]}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    
                    <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:support@fluentedge.ai')}>
                        <View style={styles.contactIcon}>
                            <Mail size={20} color={Colors.light.tint} />
                        </View>
                        <View style={styles.contactText}>
                            <Text style={styles.contactTitle}>Contact Support</Text>
                            <Text style={styles.contactSub}>Email our team directly</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:bugs@fluentedge.ai?subject=Bug Report')}>
                        <View style={[styles.contactIcon, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <MessageSquareWarning size={20} color="#F43F5E" />
                        </View>
                        <View style={styles.contactText}>
                            <Text style={styles.contactTitle}>Report a Bug</Text>
                            <Text style={styles.contactSub}>Found an issue? Let us know</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.bottomSpacer} />
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
    heroSection: { alignItems: 'center', marginVertical: 24 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginTop: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    faqCard: { backgroundColor: Colors.light.surface, borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.light.border, shadowColor: Colors.light.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    faqQ: { fontSize: 15, fontWeight: '600', color: Colors.light.text, flex: 1, marginRight: 16 },
    faqA: { fontSize: 14, color: Colors.light.textSecondary, paddingHorizontal: 16, paddingBottom: 16, lineHeight: 22 },
    contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surface, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.light.border, shadowColor: Colors.light.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    contactIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.tintLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    contactText: { flex: 1 },
    contactTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 2 },
    contactSub: { fontSize: 13, color: Colors.light.textSecondary },
    bottomSpacer: { height: 40 },
});
