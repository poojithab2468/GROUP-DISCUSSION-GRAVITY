import { Mic, Volume2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface SpeakingIndicatorProps {
    isSpeaking: boolean;
    speakerName: string;
    isUser?: boolean;
}

export default function SpeakingIndicator({ isSpeaking, speakerName, isUser }: SpeakingIndicatorProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isSpeaking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isSpeaking]);

    if (!isSpeaking) return null;

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ scale: pulseAnim }] },
            isUser ? styles.userContainer : styles.aiContainer
        ]}>
            {isUser ? <Mic size={16} color="#FFF" /> : <Volume2 size={16} color="#FFF" />}
            <Text style={styles.text}>{speakerName} {isUser ? 'is speaking...' : 'responding...'}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    userContainer: {
        backgroundColor: '#DC2626', // Red voice pulse
    },
    aiContainer: {
        backgroundColor: '#0D9488', // Professional Teal AI pulse
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    }
});
