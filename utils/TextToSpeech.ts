/**
 * TextToSpeech Utility
 * Wrapper for Web Speech API (speechSynthesis) with Promise support
 */

export interface VoiceOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
    voiceIndex?: number;
}

class TextToSpeech {
    private isSpeakingInternal: boolean = false;
    private voices: SpeechSynthesisVoice[] = [];

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                    this.loadVoices();
                };
            }
        }
    }

    private loadVoices(): void {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.voices = window.speechSynthesis.getVoices() || [];
        }
    }

    public get isSupported(): boolean {
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }

    public get isSpeaking(): boolean {
        return this.isSpeakingInternal;
    }

    public speak(text: string, options: VoiceOptions = {}, onEnd?: () => void): Promise<void> {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                if (onEnd) onEnd();
                resolve();
                return;
            }

            const synth = window.speechSynthesis;
            this.stop();

            if (!text || text.trim().length === 0) {
                if (onEnd) onEnd();
                resolve();
                return;
            }

            // Ensure voices are populated
            if (this.voices.length === 0) {
                this.loadVoices();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate ?? 1.0;
            utterance.pitch = options.pitch ?? 1.0;
            utterance.volume = options.volume ?? 1.0;
            utterance.lang = options.lang || 'en-US';

            if (options.voiceIndex !== undefined && this.voices[options.voiceIndex]) {
                utterance.voice = this.voices[options.voiceIndex];
            } else if (this.voices.length > 0) {
                // Find natural English voice if available
                const preferred = this.voices.find(v =>
                    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Online'))
                ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];

                if (preferred) utterance.voice = preferred;
            }

            let finished = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                this.isSpeakingInternal = false;
                if (onEnd) onEnd();
                resolve();
            };

            utterance.onstart = () => {
                this.isSpeakingInternal = true;
            };

            utterance.onend = () => {
                finish();
            };

            utterance.onerror = (e) => {
                // If canceled by user, not an actual error
                if (e.error !== 'canceled') {
                    console.warn('[TTS] Synthesis error or interrupted:', e.error);
                }
                finish();
            };

            // Workaround for Chrome 15s utterance pause bug
            synth.speak(utterance);
        });
    }

    public stop(): void {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            this.isSpeakingInternal = false;
        }
    }

    public getVoices(): SpeechSynthesisVoice[] {
        if (this.voices.length === 0) {
            this.loadVoices();
        }
        return this.voices;
    }
}

export const tts = new TextToSpeech();

