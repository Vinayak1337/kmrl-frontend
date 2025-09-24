"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { useSimpleSpeechRecognition } from '@/hooks/useSimpleSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatBox({ docId }: { docId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListeningToMessage, setIsListeningToMessage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Speech Recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: speechRecognitionSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSimpleSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: 'en-US',
    onResult: (speechText: string, isFinal: boolean) => {
      console.log('Speech result:', speechText, 'Final:', isFinal); // Debug log
      if (isFinal && speechText.trim()) {
        // Add the speech text to the current input
        setInput(prev => {
          const newInput = prev ? `${prev} ${speechText}`.trim() : speechText.trim();
          console.log('Setting input to:', newInput); // Debug log
          return newInput;
        });
      }
    },
    onError: (error: string) => {
      console.error('Speech recognition error:', error);
      // Show user-friendly error message
      alert(error);
    }
  });

  // Text-to-Speech
  const {
    isSpeaking,
    isPaused,
    isSupported: speechSynthesisSupported,
    speak,
    pause,
    resume,
    cancel
  } = useSpeechSynthesis({
    rate: 0.9,
    onStart: () => {
      // Optional: Add visual feedback when speech starts
    },
    onEnd: () => {
      setIsListeningToMessage(null);
    }
  });

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const next = [...messages, { role: 'user', content: q } as Message];
    setMessages(next);
    setInput('');
    setLoading(true);
    
    // Stop any ongoing speech
    cancel();
    setIsListeningToMessage(null);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: next, docId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || '' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not answer that.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Speech control functions
  const toggleListening = async () => {
    if (isListening) {
      console.log('Stopping speech recognition...');
      stopListening();
      return;
    }

    console.log('Starting speech recognition...');
    
    try {
      // Check microphone permissions first
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      }
      
      // Clear previous results and start
      resetTranscript();
      startListening();
      
    } catch (error) {
      console.error('Microphone access error:', error);
      let message = 'Microphone access required for voice input.';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message = 'Microphone access denied. Please click the microphone icon in your address bar and allow access.';
        } else if (error.name === 'NotFoundError') {
          message = 'No microphone found. Please connect a microphone and try again.';
        }
      }
      
      alert(message);
    }
  };

  const handleSpeakMessage = (messageIndex: number, content: string) => {
    if (isListeningToMessage === messageIndex && isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      cancel(); // Stop any current speech
      setIsListeningToMessage(messageIndex);
      speak(content);
    }
  };

  const stopSpeaking = () => {
    cancel();
    setIsListeningToMessage(null);
  };

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  // Update input with interim speech results
  useEffect(() => {
    if (interimTranscript && isListening) {
      // Show interim results in the input field (but don't actually set the value)
      // This provides visual feedback during speech recognition
    }
  }, [interimTranscript, isListening]);

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-[420px]">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Ask a question about the ingested documents{docId ? ' (this document)' : ''}.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 relative group'}`}>
            {m.role === 'user' ? (
              // User message - simple layout
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            ) : (
              // Assistant message - with volume control
              <div className="space-y-2">
                <div className="whitespace-pre-wrap text-sm pr-8">{m.content}</div>
                
                {/* Volume button positioned at bottom right */}
                {speechSynthesisSupported && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 px-3 rounded-full text-xs transition-all duration-200 ${
                        isListeningToMessage === i && isSpeaking 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md' 
                          : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => handleSpeakMessage(i, m.content)}
                      title={isListeningToMessage === i && isSpeaking 
                        ? (isPaused ? "Resume reading" : "Pause reading") 
                        : "🔊 Listen to this message"}
                    >
                      {isListeningToMessage === i && isSpeaking ? (
                        <>
                          {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                          {isPaused ? "Resume" : "Pause"}
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3 mr-1" />
                          Listen
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
        
        {/* TTS Status Indicator */}
        {isSpeaking && isListeningToMessage !== null && (
          <div className="text-xs text-blue-600 flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>🔊 Reading message {isListeningToMessage + 1}...</span>
          </div>
        )}
      </div>
      <div className="border-t p-3">
        {/* Speech Recognition Status */}
        {isListening && (
          <div className="mb-2 p-3 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium">🎤 Listening for your voice...</span>
            </div>
            {interimTranscript && (
              <div className="text-sm text-green-700 mt-1 italic bg-white/50 p-1 rounded">
                "{interimTranscript}"
              </div>
            )}
            <div className="text-xs text-blue-600 mt-2 flex items-center gap-4">
              <span>• Speak clearly into your microphone</span>
              <span>• Click 🎤 again when done</span>
            </div>
          </div>
        )}
        
        {/* Browser Support Warning */}
        {!speechRecognitionSupported && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-700">
              ⚠️ Voice input not supported in this browser. Try Chrome or Edge for the best experience.
            </div>
          </div>
        )}
        
        {/* Input Controls */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder={isListening ? "🎤 Listening... Speak now!" : "Type your question…"}
              value={input}
              onChange={(e) => !isListening && setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isListening) send(); }}
              disabled={loading}
              className={isListening ? "bg-blue-50 border-blue-300 text-blue-800" : ""}
            />
            {/* Show interim results as overlay */}
            {isListening && interimTranscript && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-blue-600 text-sm italic">
                "{interimTranscript}"
              </div>
            )}
          </div>
          
          {/* Speech Recognition Button */}
          {speechRecognitionSupported && (
            <Button
              variant={isListening ? "default" : "outline"}
              onClick={toggleListening}
              disabled={loading}
              className={`transition-all duration-200 ${
                isListening 
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                  : "border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
              }`}
              title={isListening ? "Click to stop voice input" : "Click to start speaking"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Stop Speech Button */}
          {isSpeaking && (
            <Button
              variant="outline"
              onClick={stopSpeaking}
              title="Stop speech"
              className="text-red-600 hover:text-red-700"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          )}
          
          {/* Send Button */}
          <Button 
            onClick={send} 
            disabled={loading || !input.trim() || isListening} 
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Accessibility Info */}
        {!speechRecognitionSupported && !speechSynthesisSupported && (
          <div className="mt-2 text-xs text-gray-500">
            Speech features not supported in this browser. Try Chrome or Edge for voice capabilities.
          </div>
        )}
      </div>
    </div>
  );
}