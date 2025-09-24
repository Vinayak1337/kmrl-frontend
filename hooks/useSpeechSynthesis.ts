'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisOptions {
	voice?: SpeechSynthesisVoice | null;
	rate?: number;
	pitch?: number;
	volume?: number;
	onStart?: () => void;
	onEnd?: () => void;
	onError?: (error: Event) => void;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
	const {
		voice = null,
		rate = 1,
		pitch = 1,
		volume = 1,
		onStart,
		onEnd,
		onError
	} = options;

	const [isSupported, setIsSupported] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
	const [selectedVoice, setSelectedVoice] =
		useState<SpeechSynthesisVoice | null>(voice);

	const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

	// Detect support on mount
	useEffect(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			setIsSupported(true);
		}
	}, []);

	// Load available voices
	useEffect(() => {
		if (!isSupported || typeof window === 'undefined') return;

		const loadVoices = () => {
			const availableVoices = window.speechSynthesis.getVoices();
			setVoices(availableVoices);

			// Auto-select first English voice if none selected
			if (!selectedVoice && availableVoices.length > 0) {
				const englishVoice =
					availableVoices.find(v => v.lang.startsWith('en')) ||
					availableVoices[0];
				setSelectedVoice(englishVoice);
			}
		};

		// Load voices immediately
		loadVoices();

		// Some browsers load voices asynchronously
		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			window.speechSynthesis.onvoiceschanged = loadVoices;
		}

		return () => {
			if (window.speechSynthesis.onvoiceschanged !== undefined) {
				window.speechSynthesis.onvoiceschanged = null;
			}
		};
	}, [isSupported, selectedVoice]);

	// Monitor speech synthesis state
	useEffect(() => {
		if (!isSupported || typeof window === 'undefined') return;

		const checkSpeakingState = () => {
			setIsSpeaking(window.speechSynthesis.speaking);
			setIsPaused(window.speechSynthesis.paused);
		};

		const interval = setInterval(checkSpeakingState, 100);
		return () => clearInterval(interval);
	}, [isSupported]);

	const cancelCurrentUtterance = () => {
		if (currentUtteranceRef.current) {
			currentUtteranceRef.current.onend = null;
			currentUtteranceRef.current.onerror = null;
			currentUtteranceRef.current.onpause = null;
			currentUtteranceRef.current.onresume = null;
			currentUtteranceRef.current = null;
		}
	};

	const speak = useCallback(
		(text: string) => {
			if (!isSupported || typeof window === 'undefined' || !text.trim()) return;

			// Cancel any ongoing speech
			window.speechSynthesis.cancel();
			cancelCurrentUtterance();

			const utterance = new SpeechSynthesisUtterance(text);

			// Set voice and speech parameters
			if (selectedVoice) {
				utterance.voice = selectedVoice;
			}
			utterance.rate = rate;
			utterance.pitch = pitch;
			utterance.volume = volume;

			// Set up event handlers
			utterance.onstart = () => {
				setIsSpeaking(true);
				setIsPaused(false);
				onStart?.();
			};

			utterance.onend = () => {
				setIsSpeaking(false);
				setIsPaused(false);
				cancelCurrentUtterance();
				onEnd?.();
			};

			utterance.onerror = event => {
				setIsSpeaking(false);
				setIsPaused(false);
				cancelCurrentUtterance();
				onError?.(event);
				console.error('Speech synthesis error:', event);
			};

			utterance.onpause = () => {
				setIsPaused(true);
			};

			utterance.onresume = () => {
				setIsPaused(false);
			};

			currentUtteranceRef.current = utterance;
			window.speechSynthesis.speak(utterance);
		},
		[isSupported, selectedVoice, rate, pitch, volume, onStart, onEnd, onError]
	);

	const pause = useCallback(() => {
		if (
			isSupported &&
			typeof window !== 'undefined' &&
			isSpeaking &&
			!isPaused
		) {
			window.speechSynthesis.pause();
		}
	}, [isSupported, isSpeaking, isPaused]);

	const resume = useCallback(() => {
		if (
			isSupported &&
			typeof window !== 'undefined' &&
			isSpeaking &&
			isPaused
		) {
			window.speechSynthesis.resume();
		}
	}, [isSupported, isSpeaking, isPaused]);

	const cancel = useCallback(() => {
		if (isSupported && typeof window !== 'undefined') {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
			setIsPaused(false);
			cancelCurrentUtterance();
		}
	}, [isSupported]);

	// Get voice by name (helper function)
	const getVoiceByName = useCallback(
		(name: string) => {
			return voices.find(voice => voice.name === name) || null;
		},
		[voices]
	);

	// Get voices by language
	const getVoicesByLanguage = useCallback(
		(language: string) => {
			return voices.filter(voice => voice.lang.startsWith(language));
		},
		[voices]
	);

	return {
		isSupported,
		isSpeaking,
		isPaused,
		voices,
		selectedVoice,
		speak,
		pause,
		resume,
		cancel,
		setSelectedVoice,
		getVoiceByName,
		getVoicesByLanguage
	};
}
