import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for Speech-to-Text using the Web Speech API.
 * Uses SpeechRecognition (Chrome/Edge) or webkitSpeechRecognition (Safari).
 */
export function useVoiceInput({ onResult, onInterim, continuous = true, language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResult?.(finalTranscript);
      }
      if (interimTranscript) {
        onInterim?.(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        // Silently handle common non-errors
        return;
      }
      
      let friendlyError = `Speech recognition error: ${event.error}`;
      if (event.error === 'not-allowed') {
        friendlyError = 'Microphone access denied. Please enable microphone permission in your browser address bar/settings.';
      } else if (event.error === 'audio-capture') {
        friendlyError = 'No microphone detected. Please plug in a microphone and try again.';
      } else if (event.error === 'network') {
        friendlyError = 'Network error. Speech recognition requires an internet connection in some browsers.';
      }
      
      setError(friendlyError);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [continuous, language, onResult, onInterim]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}

/**
 * Hook for Text-to-Speech using the SpeechSynthesis API.
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      // Voices may load asynchronously in some browsers
      window.speechSynthesis.onvoiceschanged = loadVoices;
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const speak = useCallback((text, { voice, rate = 1, pitch = 1, volume = 1 } = {}) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' code block ')  // Code blocks
      .replace(/`([^`]+)`/g, '$1')                  // Inline code
      .replace(/#{1,6}\s/g, '')                      // Headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')             // Bold
      .replace(/\*([^*]+)\*/g, '$1')                 // Italic
      .replace(/!\[.*?\]\(.*?\)/g, ' image ')        // Images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')         // Links
      .replace(/[-*+]\s/g, '')                       // List items
      .replace(/\n{2,}/g, '. ')                      // Paragraph breaks
      .replace(/\n/g, ' ')                           // Line breaks
      .replace(/\s+/g, ' ')                          // Extra whitespace
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (voice) {
      const selectedVoice = voices.find((v) => v.name === voice);
      if (selectedVoice) utterance.voice = selectedVoice;
    } else {
      // Prefer a natural-sounding English voice
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Premium'))
      );
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    speak,
    stop,
    pause,
    resume,
  };
}
