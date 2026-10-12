import { HandGestureTracker, HandLandmark, GestureMetrics } from '@/utils/GestureDetection';
import { detectMicroExpressions } from '@/utils/MicroExpressionDetector';
import { AlertCircle, Camera, RefreshCw, ShieldAlert, Video, VideoOff } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js';
const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
const MEDIAPIPE_HANDS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';

// Dynamic CDN Script Loader with deduplication
const loadScript = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') {
            resolve(false);
            return;
        }
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = (e) => {
            console.warn(`[CameraEngine] CDN script load error for ${src}:`, e);
            resolve(false);
        };
        document.head.appendChild(script);
    });
};

export interface BehavioralMetrics {
    isCameraActive: boolean;
    isFaceDetected: boolean;
    detectionStatus: 'ready' | 'loading' | 'offline' | 'fallback';
    emotion: string;
    emotionConfidence: number;
    eyeContact: boolean;
    eyeContactStatus: 'Direct (Screen)' | 'Looking Away' | 'Unable to detect';
    posture: 'Straight' | 'Slouching' | 'Unknown';
    engagementScore: number;
    handVisible: boolean;
    gestureStatus: 'Good' | 'Low' | 'Excessive' | 'Not Visible' | 'Unable to Detect';
    gestureScore: number;
    stabilityScore: number;
    stressLevel: 'Low' | 'Medium' | 'High';
    nervousnessScore: number;
}

interface CameraEngineProps {
    onMetricsUpdate: (metrics: BehavioralMetrics) => void;
    onCameraStatusChange?: (status: 'active' | 'denied' | 'not_found' | 'error' | 'loading') => void;
}

export default function CameraEngine({ onMetricsUpdate, onCameraStatusChange }: CameraEngineProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [cameraState, setCameraState] = useState<'loading' | 'active' | 'denied' | 'not_found' | 'unsupported' | 'error'>('loading');
    const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
    const [modelsState, setModelsState] = useState<'loading' | 'ready' | 'fallback' | 'failed'>('loading');

    // Keep latest metrics callback in ref
    const onMetricsUpdateRef = useRef(onMetricsUpdate);
    onMetricsUpdateRef.current = onMetricsUpdate;

    const onCameraStatusChangeRef = useRef(onCameraStatusChange);
    onCameraStatusChangeRef.current = onCameraStatusChange;

    // Rolling history buffers for temporal stability
    const eyeContactHistoryRef = useRef<boolean[]>([]);
    const gestureHistoryRef = useRef<{ isVisible: boolean; status: 'Good' | 'Low' | 'Excessive' | 'Not Visible' | 'Unable to Detect'; motionRatio: number }[]>([]);
    const previousFrameDataRef = useRef<{ data: Uint8ClampedArray; time: number } | null>(null);
    const previousGestureFrameRef = useRef<{ data: Uint8ClampedArray; time: number } | null>(null);

    // Dedicated Hand Gesture Tracker & Neural Hand Model
    const handTrackerRef = useRef<HandGestureTracker>(new HandGestureTracker());
    const handsInstanceRef = useRef<any>(null);
    const latestHandsLandmarksRef = useRef<HandLandmark[][] | null>(null);

    // 1. Camera Initialization with detailed diagnostics
    const startCamera = useCallback(async () => {
        setCameraState('loading');
        setCameraErrorMessage('');
        if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('loading');

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('[CameraEngine] navigator.mediaDevices.getUserMedia not available in this environment');
            const isLocal = typeof window !== 'undefined' && (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.protocol === 'https:'
            );
            const msg = isLocal
                ? 'Camera API is not supported by this browser.'
                : 'Camera requires HTTPS or localhost in modern browsers.';
            setCameraState('unsupported');
            setCameraErrorMessage(msg);
            if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('error');
            return;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        try {
            console.log('[CameraEngine] Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });

            streamRef.current = stream;
            setCameraState('active');
            if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('active');

            if (videoRef.current) {
                const video = videoRef.current;
                video.srcObject = stream;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;

                video.onloadedmetadata = () => {
                    video.play().catch(playErr => {
                        console.warn('[CameraEngine] Video play interrupted:', playErr);
                    });
                };

                video.play().catch(() => {});
            }
        } catch (err: any) {
            console.error('[CameraEngine] getUserMedia error:', err);
            const errName = err.name || '';
            const errMsg = err.message || '';

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                setCameraState('denied');
                setCameraErrorMessage('Camera permission was denied. Please allow camera access in your browser address bar.');
                if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('denied');
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                setCameraState('not_found');
                setCameraErrorMessage('No camera hardware was detected on this device.');
                if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('not_found');
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                setCameraState('error');
                setCameraErrorMessage('Webcam is currently in use by another application or browser tab.');
                if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('error');
            } else {
                setCameraState('error');
                setCameraErrorMessage(errMsg || 'Failed to start camera.');
                if (onCameraStatusChangeRef.current) onCameraStatusChangeRef.current('error');
            }

            onMetricsUpdateRef.current({
                isCameraActive: false,
                isFaceDetected: false,
                detectionStatus: 'offline',
                emotion: 'Camera unavailable',
                emotionConfidence: 0,
                eyeContact: false,
                eyeContactStatus: 'Unable to detect',
                posture: 'Unknown',
                engagementScore: 0,
                handVisible: false,
                gestureStatus: 'Not Visible',
                gestureScore: 0,
                stabilityScore: 0,
                stressLevel: 'Low',
                nervousnessScore: 0,
            });
        }
    }, []);

    // 2. Load Computer Vision models asynchronously
    useEffect(() => {
        let isCancelled = false;

        const initModels = async () => {
            setModelsState('loading');
            try {
                const faceApiLoaded = await loadScript(FACE_API_CDN);
                if (isCancelled) return;

                const globalFaceApi = (typeof window !== 'undefined' && (window as any).faceapi);
                if (faceApiLoaded && globalFaceApi) {
                    console.log('[CameraEngine] Face-API script loaded, fetching neural models...');

                    await Promise.race([
                        Promise.all([
                            globalFaceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                            globalFaceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                            globalFaceApi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                        ]),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Model download timeout')), 12000))
                    ]);

                    if (!isCancelled) {
                        console.log('[CameraEngine] Face-API models successfully loaded');
                        setModelsState('ready');
                    }
                } else {
                    console.warn('[CameraEngine] Face-API unavailable, using fallback');
                    if (!isCancelled) setModelsState('fallback');
                }

                // Asynchronously attempt to load MediaPipe Hands for high-precision 21 landmarks
                try {
                    const handsLoaded = await loadScript(MEDIAPIPE_HANDS_CDN);
                    if (!isCancelled && handsLoaded && typeof window !== 'undefined' && (window as any).Hands) {
                        console.log('[CameraEngine] Initializing MediaPipe Hands...');
                        const hands = new (window as any).Hands({
                            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
                        });
                        hands.setOptions({
                            maxNumHands: 2,
                            modelComplexity: 0,
                            minDetectionConfidence: 0.5,
                            minTrackingConfidence: 0.5
                        });
                        hands.onResults((results: any) => {
                            latestHandsLandmarksRef.current = results.multiHandLandmarks || [];
                        });
                        handsInstanceRef.current = hands;
                        console.log('[CameraEngine] MediaPipe Hands initialized successfully');
                    }
                } catch (handsErr) {
                    console.warn('[CameraEngine] MediaPipe Hands notice (using spatial cluster fallback):', handsErr);
                }
            } catch (cvErr) {
                console.warn('[CameraEngine] Neural models failed to load, using fallback:', cvErr);
                if (!isCancelled) setModelsState('fallback');
            }
        };

        initModels();

        return () => {
            isCancelled = true;
            if (handsInstanceRef.current && typeof handsInstanceRef.current.close === 'function') {
                try { handsInstanceRef.current.close(); } catch (_) {}
            }
        };
    }, []);

    // 3. Start Camera on Mount and clean up on unmount
    useEffect(() => {
        startCamera();

        return () => {
            console.log('[CameraEngine] Cleaning up camera tracks and timers');
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            if (processingTimerRef.current) {
                clearTimeout(processingTimerRef.current);
                processingTimerRef.current = null;
            }
        };
    }, [startCamera]);

    // 4. Connect stream to video element
    const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
        videoRef.current = element;
        if (element && streamRef.current) {
            element.srcObject = streamRef.current;
            element.muted = true;
            element.playsInline = true;
            element.autoplay = true;
            element.play().catch(() => {});
        }
    }, []);

    // 5. Detection Processing Loop
    const processFrame = useCallback(async () => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended || video.readyState < 2) {
            processingTimerRef.current = setTimeout(processFrame, 350);
            return;
        }

        const globalFaceApi = typeof window !== 'undefined' ? (window as any).faceapi : null;
        let isFaceDetected = false;
        let dominantEmotion = 'Neutral';
        let emotionConfidence = 0.5;
        let isDirectEyeContact = false;
        let eyeContactStatus: 'Direct (Screen)' | 'Looking Away' | 'Unable to detect' = 'Unable to detect';
        let postureResult: 'Straight' | 'Slouching' | 'Unknown' = 'Unknown';
        let engagement = 50;
        let gestures: 'Good' | 'Low' | 'Excessive' | 'Not Visible' | 'Unable to Detect' = 'Not Visible';
        let handIsVisible = false;
        let gestureScoreVal = 50;
        let stability = 90;
        let stress: 'Low' | 'Medium' | 'High' = 'Low';
        let nervousness = 15;

        let faceBoundingBox: { x: number; y: number; width: number; height: number } | null = null;

        try {
            // Neural Face Detection
            if (modelsState === 'ready' && globalFaceApi && globalFaceApi.nets.tinyFaceDetector.params) {
                const detection = await globalFaceApi
                    .detectSingleFace(video, new globalFaceApi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.40 }))
                    .withFaceLandmarks()
                    .withFaceExpressions();

                if (detection) {
                    isFaceDetected = true;
                    faceBoundingBox = detection.detection.box;

                    // Observable facial expression analysis
                    const expressions = detection.expressions as Record<string, number>;
                    let maxScore = 0;
                    let bestExpr = 'neutral';
                    for (const [expr, score] of Object.entries(expressions)) {
                        if (score > maxScore) {
                            maxScore = score;
                            bestExpr = expr;
                        }
                    }

                    dominantEmotion = bestExpr.charAt(0).toUpperCase() + bestExpr.slice(1);
                    emotionConfidence = Math.round(maxScore * 100) / 100;

                    // Eye Contact & Gaze Estimation
                    const landmarks = detection.landmarks;
                    const nose = landmarks.getNose();
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();
                    const jaw = landmarks.getJawOutline();

                    if (nose.length >= 4 && leftEye.length >= 6 && rightEye.length >= 6 && jaw.length >= 17) {
                        const noseTip = nose[3] || nose[0];
                        const leftEyeCenter = {
                            x: leftEye.reduce((s: number, p: any) => s + p.x, 0) / leftEye.length,
                            y: leftEye.reduce((s: number, p: any) => s + p.y, 0) / leftEye.length,
                        };
                        const rightEyeCenter = {
                            x: rightEye.reduce((s: number, p: any) => s + p.x, 0) / rightEye.length,
                            y: rightEye.reduce((s: number, p: any) => s + p.y, 0) / rightEye.length,
                        };

                        // Yaw estimation: Ratio of horizontal distance from nose to each eye
                        const distToLeftEye = Math.abs(noseTip.x - leftEyeCenter.x);
                        const distToRightEye = Math.abs(noseTip.x - rightEyeCenter.x);
                        const yawRatio = distToLeftEye / (distToRightEye || 1);

                        // Horizontal gaze alignment: Ratio should be close to 1.0 (0.68 - 1.45)
                        const isFacingHorizontally = yawRatio >= 0.68 && yawRatio <= 1.45;

                        // Pitch estimation: Vertical distance between eye level and nose tip vs nose tip and chin
                        const eyeLevelY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
                        const chinY = jaw[8].y;
                        const eyeToNose = Math.abs(noseTip.y - eyeLevelY);
                        const noseToChin = Math.abs(chinY - noseTip.y);
                        const pitchRatio = eyeToNose / (noseToChin || 1);

                        // Looking down at table/keyboard or looking up causes pitchRatio to distort (>0.85 or <0.32)
                        const isFacingVertically = pitchRatio >= 0.35 && pitchRatio <= 0.80;

                        const rawDirectEye = isFacingHorizontally && isFacingVertically;

                        // Temporal smoothing across 6 frames to prevent frame flicker
                        eyeContactHistoryRef.current.push(rawDirectEye);
                        if (eyeContactHistoryRef.current.length > 6) eyeContactHistoryRef.current.shift();

                        const directCount = eyeContactHistoryRef.current.filter(Boolean).length;
                        isDirectEyeContact = directCount >= 4;
                        eyeContactStatus = isDirectEyeContact ? 'Direct (Screen)' : 'Looking Away';
                    } else {
                        eyeContactStatus = 'Unable to detect';
                        isDirectEyeContact = false;
                    }

                    // Posture Analysis
                    const box = detection.detection.box;
                    const videoHeight = video.videoHeight || 480;
                    const relativeCenterY = (box.y + box.height / 2) / videoHeight;

                    if (relativeCenterY > 0.68) {
                        postureResult = 'Slouching';
                    } else if (relativeCenterY >= 0.15 && relativeCenterY <= 0.65) {
                        postureResult = 'Straight';
                    } else {
                        postureResult = 'Unknown';
                    }

                    // Attention / Composure calculation
                    let calculatedEngagement = 50;
                    if (isDirectEyeContact) calculatedEngagement += 30;
                    if (postureResult === 'Straight') calculatedEngagement += 15;
                    if (dominantEmotion === 'Happy' || dominantEmotion === 'Engaged') calculatedEngagement += 5;
                    if (dominantEmotion === 'Sad' || dominantEmotion === 'Angry') calculatedEngagement -= 15;
                    engagement = Math.min(100, Math.max(15, calculatedEngagement));

                    if (dominantEmotion === 'Fearful' || dominantEmotion === 'Angry') {
                        stress = 'High';
                        nervousness = 65;
                        stability = 60;
                    } else if (dominantEmotion === 'Surprised') {
                        stress = 'Medium';
                        nervousness = 40;
                        stability = 80;
                    } else {
                        stress = 'Low';
                        nervousness = 15;
                        stability = 95;
                    }
                } else {
                    isFaceDetected = false;
                    dominantEmotion = 'Unable to detect';
                    emotionConfidence = 0;
                    isDirectEyeContact = false;
                    eyeContactStatus = 'Unable to detect';
                    postureResult = 'Unknown';
                    engagement = 0;
                }
            } else {
                // When neural net is not loaded or in fallback, report truthfully:
                eyeContactStatus = 'Unable to detect';
                isDirectEyeContact = false;
                postureResult = 'Unknown';
                dominantEmotion = 'Estimating...';
            }

            // High-Precision Hand Gesture Analysis (MediaPipe Hands + Anatomical Cluster Fallback)
            try {
                let gestureResult: GestureMetrics = {
                    gestureStatus: 'Not Visible',
                    isVisible: false,
                    confidence: 0,
                    isClosed: false,
                    movementIntensity: 0,
                    gestureScore: 0,
                };

                // Priority 1: MediaPipe Hands if initialized and frame is ready
                if (handsInstanceRef.current && video.readyState >= 2) {
                    try {
                        await handsInstanceRef.current.send({ image: video });
                    } catch (_) {}

                    const detectedHands = latestHandsLandmarksRef.current;
                    if (detectedHands && detectedHands.length > 0) {
                        gestureResult = handTrackerRef.current.processLandmarks(detectedHands[0], 0.88);
                    } else if (detectedHands && detectedHands.length === 0) {
                        // MediaPipe explicitly confirmed 0 hands in the video frame
                        gestureResult = handTrackerRef.current.processLandmarks(null, 0);
                    }
                }

                // Priority 2: Anatomical Spatial Fallback when MediaPipe is loading, offline, or awaiting results
                if (!gestureResult.isVisible && gestureResult.gestureStatus !== 'Unable to Detect') {
                    if (!canvasRef.current && typeof document !== 'undefined') {
                        canvasRef.current = document.createElement('canvas');
                        canvasRef.current.width = 120;
                        canvasRef.current.height = 90;
                    }

                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, 120, 90);
                            const currentImg = ctx.getImageData(0, 0, 120, 90);
                            const curr = currentImg.data;

                            if (previousGestureFrameRef.current) {
                                const prev = previousGestureFrameRef.current.data;
                                const scaleX = 120 / (video.videoWidth || 640);
                                const scaleY = 90 / (video.videoHeight || 480);
                                const scaledFaceBox = faceBoundingBox ? {
                                    x: faceBoundingBox.x * scaleX,
                                    y: faceBoundingBox.y * scaleY,
                                    width: faceBoundingBox.width * scaleX,
                                    height: faceBoundingBox.height * scaleY,
                                } : null;

                                gestureResult = handTrackerRef.current.processCanvasFallback(
                                    curr,
                                    prev,
                                    120,
                                    90,
                                    scaledFaceBox
                                );
                            }
                            previousGestureFrameRef.current = { data: curr, time: Date.now() };
                        }
                    }
                }

                // Update live state deterministically:
                // If hands are not in camera frame, strictly report 'Not Visible' (NEVER 'Excessive')
                if (gestureResult.isVisible) {
                    handIsVisible = true;
                    gestures = gestureResult.gestureStatus;
                    gestureScoreVal = gestureResult.gestureScore;
                } else {
                    handIsVisible = false;
                    gestures = gestureResult.gestureStatus === 'Unable to Detect' ? 'Unable to Detect' : 'Not Visible';
                    gestureScoreVal = 0;
                    gestureHistoryRef.current = [];
                }
            } catch (gestErr) {
                console.warn('[CameraEngine] Hand tracking error:', gestErr);
                handIsVisible = false;
                gestures = 'Unable to Detect';
                gestureScoreVal = 0;
            }

            // Emit live verified metrics
            onMetricsUpdateRef.current({
                isCameraActive: true,
                isFaceDetected,
                detectionStatus: modelsState === 'ready' ? 'ready' : 'fallback',
                emotion: isFaceDetected ? dominantEmotion : 'Unable to detect',
                emotionConfidence,
                eyeContact: isDirectEyeContact,
                eyeContactStatus,
                posture: postureResult,
                engagementScore: isFaceDetected ? engagement : 0,
                handVisible: handIsVisible,
                gestureStatus: gestures,
                gestureScore: gestureScoreVal,
                stabilityScore: isFaceDetected ? stability : 0,
                stressLevel: stress,
                nervousnessScore: nervousness,
            });
        } catch (frameErr) {
            console.warn('[CameraEngine] Process frame error:', frameErr);
        }

        // Schedule next analysis frame
        processingTimerRef.current = setTimeout(processFrame, 350);
    }, [modelsState]);

    // Start frame loop when camera is active
    useEffect(() => {
        if (cameraState === 'active') {
            console.log('[CameraEngine] Camera active, starting frame analysis loop');
            processingTimerRef.current = setTimeout(processFrame, 400);
        }

        return () => {
            if (processingTimerRef.current) {
                clearTimeout(processingTimerRef.current);
                processingTimerRef.current = null;
            }
        };
    }, [cameraState, processFrame]);

    // Render Web DOM Video element
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {cameraState === 'loading' && (
                    <View style={styles.overlayMessage}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.overlayText}>Connecting camera feed...</Text>
                    </View>
                )}

                {cameraState === 'denied' && (
                    <View style={styles.errorOverlay}>
                        <ShieldAlert size={28} color="#EF4444" />
                        <Text style={styles.errorTitle}>Camera Permission Blocked</Text>
                        <Text style={styles.errorDesc}>{cameraErrorMessage}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={startCamera}>
                            <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.retryText}>Retry Permission</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {cameraState === 'error' && (
                    <View style={styles.errorOverlay}>
                        <AlertCircle size={28} color="#F59E0B" />
                        <Text style={styles.errorTitle}>Camera In Use or Error</Text>
                        <Text style={styles.errorDesc}>{cameraErrorMessage}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={startCamera}>
                            <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.retryText}>Reconnect Camera</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {cameraState === 'not_found' && (
                    <View style={styles.errorOverlay}>
                        <VideoOff size={28} color="#6B7280" />
                        <Text style={styles.errorTitle}>No Webcam Detected</Text>
                        <Text style={styles.errorDesc}>Plug in a webcam or enable camera permissions to use live behavioral analysis.</Text>
                    </View>
                )}

                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        display: cameraState === 'active' ? 'block' : 'none',
                    }}
                >
                    <video
                        ref={setVideoElement}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)', // Mirror video for natural user experience
                            borderRadius: '12px',
                        }}
                    />
                </div>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.overlayText}>Camera analysis is available on Web.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayMessage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        zIndex: 5,
    },
    overlayText: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        backgroundColor: '#0F172A',
        zIndex: 10,
    },
    errorTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
    },
    errorDesc: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 16,
    },
    retryButton: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
