"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// Global speech recognition instance to avoid conflicts
let globalSpeechRecognition: SpeechRecognition | null = null;
let isGlobalListening = false;

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSimpleSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const callbacksRef = useRef({ onResult, onError });
  callbacksRef.current = { onResult, onError };

  // Initialize global speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition && !globalSpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Global speech recognition started');
        isGlobalListening = true;
        setIsListening(true);
      };

      recognition.onend = () => {
        console.log('Global speech recognition ended');
        isGlobalListening = false;
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          callbacksRef.current.onResult?.(finalTranscript, true);
          console.log('Final transcript:', finalTranscript);
        }

        setInterimTranscript(interimTranscript);
        if (interimTranscript) {
          callbacksRef.current.onResult?.(interimTranscript, false);
          console.log('Interim transcript:', interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        isGlobalListening = false;
        setIsListening(false);
        
        let errorMessage = 'Speech recognition failed';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder.';
            break;
          case 'aborted':
            console.log('Speech recognition aborted (normal)');
            return; // Don't show error for aborted
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        callbacksRef.current.onError?.(errorMessage);
      };

      globalSpeechRecognition = recognition;
    }

    return () => {
      // Don't cleanup global instance on unmount
    };
  }, [continuous, interimResults, language]);

  const startListening = useCallback(() => {
    if (!globalSpeechRecognition || isGlobalListening) {
      console.log('Cannot start - not supported or already listening');
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      console.log('Starting global speech recognition...');
      globalSpeechRecognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      callbacksRef.current.onError?.('Failed to start speech recognition. Please refresh and try again.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (globalSpeechRecognition && isGlobalListening) {
      try {
        console.log('Stopping global speech recognition...');
        globalSpeechRecognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition: isSupported
  };
}