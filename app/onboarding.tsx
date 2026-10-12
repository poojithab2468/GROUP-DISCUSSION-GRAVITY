import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { ChevronRight, LineChart, Trophy, Video } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Welcome to Fluent Edge',
        description: 'Master your communication with AI-powered group discussions.',
        icon: (props: any) => <Video {...props} />,
    },
    {
        id: '2',
        title: 'Real-Time AI Feedback',
        description: 'Get insights on your speech, confidence, and body language.',
        icon: (props: any) => <LineChart {...props} />,
    },
    {
        id: '3',
        title: 'Track Your Growth',
        description: 'Analyze performance, earn badges, and improve every session.',
        icon: (props: any) => <Trophy {...props} />,
    }
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < SLIDES.length - 1) {
            scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
        }
    };

    const handleFinish = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await AsyncStorage.setItem('hasSeenIntro', 'true');
            router.replace('/login' as never);
        } catch (e) {
            console.error(e);
            router.replace('/login' as never);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                scrollEventThrottle={16}
            >
                {SLIDES.map((slide, i) => {
                    return (
                        <View key={slide.id} style={styles.slide}>
                            <View style={[styles.iconContainer, { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }]}>
                                {slide.icon({ size: 80, color: '#6366F1' })}
                            </View>
                            <Text style={styles.title}>{slide.title}</Text>
                            <Text style={styles.description}>{slide.description}</Text>
                        </View>
                    );
                })}
            </Animated.ScrollView>

            <View style={styles.footer}>
                <View style={styles.dotContainer}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 20, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.dot, { width: dotWidth, opacity }]}
                            />
                        );
                    })}
                </View>

                <View style={styles.buttonRow}>
                    {currentIndex < SLIDES.length - 1 ? (
                        <>
                            <TouchableOpacity onPress={handleFinish} style={styles.skipButton}>
                                <Text style={styles.skipText}>Skip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleNext} style={styles.primaryButton}>
                                <Text style={styles.primaryButtonText}>Next</Text>
                                <ChevronRight size={20} color="#fff" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity onPress={handleFinish} style={[styles.primaryButton, styles.fullButton]}>
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    slide: {
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        paddingBottom: 120, // leave space for footer
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: Colors.light.tintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.light.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 30,
        paddingBottom: 50,
    },
    dotContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.tint,
        marginHorizontal: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    skipButton: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    skipText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: Colors.light.tint,
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 4,
    },
    fullButton: {
        flex: 1,
        paddingVertical: 18,
    }
});
