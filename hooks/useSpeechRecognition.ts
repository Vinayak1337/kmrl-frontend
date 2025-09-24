"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

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

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStartingRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        isStartingRef.current = false;
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        isStartingRef.current = false;
      };



      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Process all results, not just from resultIndex
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcripts
        if (finalTranscript) {
          setTranscript(finalTranscript);
          onResult?.(finalTranscript, true);
          console.log('Final transcript:', finalTranscript); // Debug log
        }

        setInterimTranscript(interimTranscript);
        if (interimTranscript) {
          onResult?.(interimTranscript, false);
          console.log('Interim transcript:', interimTranscript); // Debug log
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        setIsListening(false);
        isStartingRef.current = false;
        
        // Handle different error types
        let errorMessage = 'Speech recognition failed';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder or closer to your microphone.';
            break;
          case 'aborted':
            // Don't show error for aborted - it's often normal
            console.log('Speech recognition was aborted (normal behavior)');
            return;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please use HTTPS or localhost.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        onError?.(errorMessage);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current = null;
        } catch (error) {
          console.log('Cleanup error (normal):', error);
        }
      }
    };
  }, [continuous, interimResults, language, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening || isStartingRef.current) {
      console.log('Cannot start - already listening or starting');
      return;
    }

    // First stop any existing recognition
    try {
      recognitionRef.current.abort();
    } catch (e) {
      // Ignore errors when aborting
    }

    // Wait a bit then start fresh
    setTimeout(() => {
      if (!isStartingRef.current && recognitionRef.current) {
        isStartingRef.current = true;
        setTranscript('');
        setInterimTranscript('');
        
        try {
          console.log('Starting speech recognition...');
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          setIsListening(false);
          isStartingRef.current = false;
          
          // Show specific error based on the error type
          if (error instanceof Error && error.message.includes('already started')) {
            console.log('Recognition already started, waiting for it to end...');
          } else {
            onError?.('Failed to start speech recognition. Please try again.');
          }
        }
      }
    }, 100);
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        console.log('Stopping speech recognition...');
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        // Force set listening to false if stop fails
        setIsListening(false);
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