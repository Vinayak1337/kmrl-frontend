"use client";

import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/UI/button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';


interface DocumentReaderProps {
  title?: string;
  content: string;
  className?: string;
}

export function DocumentReader({ title, content, className = '' }: DocumentReaderProps) {
  const [isReading, setIsReading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [readingRate, setReadingRate] = useState(0.9);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    cancel
  } = useSpeechSynthesis({
    rate: readingRate,
    onStart: () => setIsReading(true),
    onEnd: () => setIsReading(false),
    voice: selectedVoice
  });

  const handleRead = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      const textToRead = title ? `${title}. ${content}` : content;
      speak(textToRead);
    }
  };

  const handleStop = () => {
    cancel();
    setIsReading(false);
  };

  const handleRestart = () => {
    cancel();
    setTimeout(() => {
      const textToRead = title ? `${title}. ${content}` : content;
      speak(textToRead);
    }, 100);
  };

  if (!isSupported) {
    return null; // Don't show controls if speech synthesis isn't supported
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Document Reader</h3>
        <div className="flex items-center gap-2">
          {/* Reading Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRead}
            disabled={!content.trim()}
            className={isReading ? "bg-blue-50 border-blue-300" : ""}
          >
            {isSpeaking ? (
              isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs">
              {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Read"}
            </span>
          </Button>

          {isSpeaking && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                title="Restart reading"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="text-red-600 hover:text-red-700"
                title="Stop reading"
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Settings Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            title="Speech settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reading Status */}
      {isReading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-blue-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>{isPaused ? "Reading paused" : "Reading document..."}</span>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-3 bg-gray-50 rounded border space-y-3">
          {/* Reading Speed */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reading Speed: {readingRate}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={readingRate}
              onChange={(e) => setReadingRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Voice Selection */}
          {voices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Voice
              </label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value) || null;
                  setSelectedVoice(voice);
                }}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Default Voice</option>
                {voices
                  .filter(voice => voice.lang.startsWith('en'))
                  .map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Content Preview */}
      <div className="text-xs text-gray-500 max-h-20 overflow-hidden">
        {content.slice(0, 200)}
        {content.length > 200 && '...'}
      </div>
    </div>
  );
}