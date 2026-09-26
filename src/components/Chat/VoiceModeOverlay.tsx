import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Fade,
  Chip,
  useTheme,
  alpha,
  Select,
  MenuItem,
} from '@mui/material';
import {
  X,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Settings2,
  Loader2,
} from 'lucide-react';

interface VoiceModeOverlayProps {
  open: boolean;
  onClose: () => void;
  onSend: (text: string, model?: string) => void;
  isStreaming: boolean;
  lastAssistantMessage: string;
  modelName: string;
}

const SILENCE_TIMEOUT_MS = 1800; // Auto-send after 1.8s of silence
const VAD_POLL_MS = 50; // Audio analyser polling rate

export default function VoiceModeOverlay({
  open,
  onClose,
  onSend,
  isStreaming,
  lastAssistantMessage,
  modelName,
}: VoiceModeOverlayProps) {
  const theme = useTheme();

  // Core state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusText, setStatusText] = useState('Tap to start');
  const [conversationLog, setConversationLog] = useState<Array<{ role: string; text: string }>>([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const lastTranscriptRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSpokenMessageRef = useRef('');
  const wasStreamingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available TTS voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Set default voice
      if (!selectedVoice && voices.length > 0) {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Premium'))
        );
        setSelectedVoice(preferred?.name || voices.find((v) => v.lang.startsWith('en'))?.name || voices[0]?.name || '');
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ─── Audio Visualizer ──────────────────────────────────────
  const startAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      analyserRef.current = analyser;

      // Poll audio levels for VAD
      vadIntervalRef.current = setInterval(() => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
        setAudioLevel(Math.min(avg / 128, 1));
      }, VAD_POLL_MS);
    } catch (err) {
      console.warn('[VoiceMode] Audio analyser error:', err);
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ─── Canvas Waveform Rendering ─────────────────────────────
  useEffect(() => {
    if (!sessionActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);

        const barCount = 64;
        const barWidth = w / barCount;
        const step = Math.floor(data.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = data[i * step] / 255;
          const barH = val * h * 0.8;

          // Gradient colour based on intensity
          const hue = isSpeakingTTS ? 280 : 200;
          const sat = 70 + val * 30;
          const light = 45 + val * 20;
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${0.4 + val * 0.6})`;

          const x = i * barWidth;
          const radius = barWidth * 0.3;

          // Draw rounded bar from centre
          ctx.beginPath();
          ctx.roundRect(x + 1, h / 2 - barH / 2, barWidth - 2, barH, radius);
          ctx.fill();
        }
      } else {
        // Idle: draw subtle breathing wave
        const t = Date.now() / 1000;
        ctx.strokeStyle = alpha(theme.palette.primary.main, 0.2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.02 + t * 2) * 8 * (1 + audioLevel);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sessionActive, isSpeakingTTS, audioLevel, theme]);

  // ─── Speech Recognition (STT) ─────────────────────────────
  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setStatusText('Listening…');
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimT = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interimT += t;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const sep = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + sep + finalText;
        });
        lastTranscriptRef.current += (lastTranscriptRef.current ? ' ' : '') + finalText;
      }
      setInterimText(interimT);

      // Reset silence timer on any speech activity
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (finalText || interimT) {
        silenceTimerRef.current = setTimeout(() => {
          // Silence detected → auto-send
          const pending = lastTranscriptRef.current.trim();
          if (pending) {
            handleAutoSend(pending);
          }
        }, SILENCE_TIMEOUT_MS);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setError(`Mic error: ${event.error}`);
      setStatusText('Error — tap to retry');
    };

    recognition.onend = () => {
      // Auto-restart if session is still active (browser kills recognition periodically)
      if (sessionActive && !isMuted) {
        try {
          recognition.start();
        } catch (e) {
          // Already started — ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sessionActive, isMuted]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ─── TTS (Text-to-Speech) ─────────────────────────────────
  const speakText = useCallback(
    (text: string) => {
      if (!ttsEnabled || !('speechSynthesis' in window)) return;

      // Stop any current speech
      window.speechSynthesis.cancel();

      // Clean markdown / think tags
      const cleanText = text
        .replace(/<think>[\s\S]*?<\/think>/g, ' ')
        .replace(/<think>[\s\S]*$/g, ' ')
        .replace(/```[\s\S]*?```/g, ' code block ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/!\[.*?\]\(.*?\)/g, ' image ')
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
        .replace(/[-*+]\s/g, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (selectedVoice) {
        const voice = availableVoices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        setIsSpeakingTTS(true);
        setStatusText('Speaking…');
      };
      utterance.onend = () => {
        setIsSpeakingTTS(false);
        setStatusText('Listening…');
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeakingTTS(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled, selectedVoice, availableVoices]
  );

  const stopTTS = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeakingTTS(false);
    utteranceRef.current = null;
  }, []);

  // ─── Auto-send Handler ────────────────────────────────────
  const handleAutoSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Interrupt TTS if speaking
      if (isSpeakingTTS) {
        stopTTS();
      }

      setConversationLog((prev) => [...prev, { role: 'user', text: text.trim() }]);
      setStatusText('Processing…');
      setTranscript('');
      setInterimText('');
      lastTranscriptRef.current = '';

      onSend(text.trim());
    },
    [onSend, isSpeakingTTS, stopTTS]
  );

  // ─── Watch for AI responses and auto-speak ────────────────
  useEffect(() => {
    if (!sessionActive || !ttsEnabled) return;

    // Detect streaming → done transition
    if (wasStreamingRef.current && !isStreaming && lastAssistantMessage) {
      if (lastAssistantMessage !== lastSpokenMessageRef.current) {
        lastSpokenMessageRef.current = lastAssistantMessage;
        setConversationLog((prev) => [...prev, { role: 'assistant', text: lastAssistantMessage }]);
        speakText(lastAssistantMessage);
      }
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, lastAssistantMessage, sessionActive, ttsEnabled, speakText]);

  // ─── Session Start / Stop ─────────────────────────────────
  const startSession = useCallback(() => {
    setSessionActive(true);
    setConversationLog([]);
    setTranscript('');
    setInterimText('');
    lastTranscriptRef.current = '';
    lastSpokenMessageRef.current = '';
    setError(null);
    setStatusText('Listening…');
    startAudioAnalyser();
    startRecognition();
  }, [startAudioAnalyser, startRecognition]);

  const endSession = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stopRecognition();
    stopTTS();
    stopAudioAnalyser();
    setSessionActive(false);
    setIsListening(false);
    setTranscript('');
    setInterimText('');
    setAudioLevel(0);
    setStatusText('Session ended');
    lastTranscriptRef.current = '';
  }, [stopRecognition, stopTTS, stopAudioAnalyser]);

  // ─── Mute Toggle ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute → restart recognition
      setIsMuted(false);
      startRecognition();
    } else {
      // Mute → stop recognition
      setIsMuted(true);
      stopRecognition();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [isMuted, startRecognition, stopRecognition]);

  // ─── Cleanup on close ─────────────────────────────────────
  useEffect(() => {
    if (!open) {
      endSession();
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  // ─── Pulsing ring intensity ───────────────────────────────
  const ringScale = useMemo(() => {
    if (isSpeakingTTS) return 1.15 + Math.sin(Date.now() / 300) * 0.05;
    if (isStreaming) return 1.05;
    return 1 + audioLevel * 0.35;
  }, [isSpeakingTTS, isStreaming, audioLevel]);

  // ─── Status colour ────────────────────────────────────────
  const statusColor = useMemo(() => {
    if (error) return theme.palette.error.main;
    if (isSpeakingTTS) return '#a855f7'; // purple
    if (isStreaming) return '#f59e0b'; // amber
    if (isListening) return '#22c55e'; // green
    return theme.palette.text.secondary;
  }, [error, isSpeakingTTS, isStreaming, isListening, theme]);

  if (!open) return null;

  return (
    <Fade in={open} timeout={400}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: sessionActive ? '#22c55e' : 'text.disabled',
                boxShadow: sessionActive ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                transition: 'all 0.3s',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.65rem',
              }}
            >
              Voice Mode
            </Typography>
            <Chip
              label={modelName || 'AI'}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 600,
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                ml: 1,
              }}
            />
          </Box>
          <IconButton
            onClick={() => {
              endSession();
              onClose();
            }}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <X size={20} />
          </IconButton>
        </Box>

        {/* Centre Orb */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            mt: -4,
          }}
        >
          {/* Animated rings */}
          <Box sx={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer pulsing ring */}
            <Box
              sx={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: alpha(statusColor, 0.2),
                transform: `scale(${ringScale})`,
                transition: 'transform 0.15s ease-out, border-color 0.4s',
                animation: sessionActive ? 'voicePulseOuter 3s ease-in-out infinite' : 'none',
                '@keyframes voicePulseOuter': {
                  '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                  '50%': { opacity: 0.6, transform: `scale(${1.08 + audioLevel * 0.15})` },
                },
              }}
            />
            {/* Middle ring */}
            <Box
              sx={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: '50%',
                border: '1.5px solid',
                borderColor: alpha(statusColor, 0.15),
                animation: sessionActive ? 'voicePulseMiddle 2.5s ease-in-out infinite 0.3s' : 'none',
                '@keyframes voicePulseMiddle': {
                  '0%, 100%': { opacity: 0.2, transform: 'scale(1)' },
                  '50%': { opacity: 0.5, transform: `scale(${1.04 + audioLevel * 0.1})` },
                },
              }}
            />
            {/* Core orb */}
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: sessionActive
                  ? `radial-gradient(circle at 40% 35%, ${alpha(statusColor, 0.6)}, ${alpha(statusColor, 0.15)})`
                  : `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.15), rgba(255,255,255,0.03))`,
                boxShadow: sessionActive
                  ? `0 0 60px ${alpha(statusColor, 0.3)}, inset 0 0 30px ${alpha(statusColor, 0.1)}`
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                transform: `scale(${1 + audioLevel * 0.15})`,
                '&:hover': {
                  boxShadow: `0 0 80px ${alpha(statusColor, 0.4)}`,
                },
              }}
              onClick={() => {
                if (!sessionActive) {
                  startSession();
                } else {
                  endSession();
                  onClose();
                }
              }}
            >
              {!sessionActive ? (
                <Mic size={36} color="rgba(255,255,255,0.7)" />
              ) : isStreaming ? (
                <Loader2
                  size={36}
                  color={statusColor}
                  style={{ animation: 'spin 1.5s linear infinite' }}
                />
              ) : isSpeakingTTS ? (
                <Volume2
                  size={36}
                  color={statusColor}
                  style={{ animation: 'voiceBounce 1s ease-in-out infinite' }}
                />
              ) : (
                <Mic
                  size={36}
                  color={isListening ? statusColor : 'rgba(255,255,255,0.5)'}
                />
              )}
            </Box>
          </Box>

          {/* Status text */}
          <Typography
            variant="body2"
            sx={{
              color: statusColor,
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '0.04em',
              textTransform: 'capitalize',
              transition: 'color 0.3s',
            }}
          >
            {statusText}
          </Typography>

          {/* Transcript display */}
          {(transcript || interimText) && (
            <Fade in>
              <Box
                sx={{
                  maxWidth: 520,
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    fontWeight: 400,
                  }}
                >
                  {transcript}
                  {interimText && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                      {transcript ? ' ' : ''}{interimText}
                    </span>
                  )}
                </Typography>
              </Box>
            </Fade>
          )}
        </Box>

        {/* Audio Visualizer Canvas */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 140,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            maxWidth: 600,
            height: 80,
            opacity: sessionActive ? 0.8 : 0.2,
            transition: 'opacity 0.5s',
          }}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>

        {/* Conversation scroll log */}
        {conversationLog.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 230,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '55%',
              maxWidth: 560,
              maxHeight: 140,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              px: 2,
              '&::-webkit-scrollbar': { width: 3 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: 3,
              },
            }}
          >
            {conversationLog.slice(-6).map((entry, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: entry.role === 'user' ? '#60a5fa' : '#a78bfa',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    minWidth: 32,
                    mt: '1px',
                  }}
                >
                  {entry.role === 'user' ? 'You' : 'AI'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {entry.text.length > 200 ? entry.text.slice(0, 197) + '…' : entry.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Bottom controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          {/* Mute mic */}
          <Tooltip title={isMuted ? 'Unmute mic' : 'Mute mic'}>
            <IconButton
              onClick={toggleMute}
              disabled={!sessionActive}
              sx={{
                width: 48,
                height: 48,
                bgcolor: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                color: isMuted ? '#ef4444' : 'rgba(255,255,255,0.7)',
                border: '1px solid',
                borderColor: isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </IconButton>
          </Tooltip>

          {/* Toggle TTS */}
          <Tooltip title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}>
            <IconButton
              onClick={() => {
                if (ttsEnabled) stopTTS();
                setTtsEnabled(!ttsEnabled);
              }}
              disabled={!sessionActive}
              sx={{
                width: 48,
                height: 48,
                bgcolor: !ttsEnabled ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                color: !ttsEnabled ? '#ef4444' : 'rgba(255,255,255,0.7)',
                border: '1px solid',
                borderColor: !ttsEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: !ttsEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)',
                },
                transition: 'all 0.2s',
              }}
            >
              {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </IconButton>
          </Tooltip>

          {/* End call button */}
          <Tooltip title={sessionActive ? 'End voice session' : 'Start voice session'}>
            <IconButton
              onClick={() => {
                if (sessionActive) {
                  endSession();
                } else {
                  startSession();
                }
              }}
              sx={{
                width: 56,
                height: 56,
                bgcolor: sessionActive ? '#ef4444' : '#22c55e',
                color: '#fff',
                '&:hover': {
                  bgcolor: sessionActive ? '#dc2626' : '#16a34a',
                },
                transition: 'all 0.2s',
                boxShadow: `0 4px 20px ${sessionActive ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              }}
            >
              {sessionActive ? <PhoneOff size={24} /> : <Phone size={24} />}
            </IconButton>
          </Tooltip>

          {/* Voice settings */}
          <Tooltip title="Voice settings">
            <IconButton
              onClick={() => setShowSettings(!showSettings)}
              sx={{
                width: 48,
                height: 48,
                bgcolor: showSettings ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.12)',
                },
                transition: 'all 0.2s',
              }}
            >
              <Settings2 size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Voice Settings panel */}
        {showSettings && (
          <Fade in>
            <Box
              sx={{
                position: 'absolute',
                bottom: 110,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(30,30,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                px: 3,
                py: 2,
                minWidth: 280,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '0.62rem',
                  letterSpacing: '0.08em',
                  mb: 1.5,
                  display: 'block',
                }}
              >
                Voice Settings
              </Typography>

              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', mb: 0.5, display: 'block' }}
              >
                TTS Voice
              </Typography>
              <Select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  mb: 1,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.12)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '.MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
                }}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        maxHeight: 200,
                        bgcolor: 'rgba(30,30,30,0.98)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      },
                    },
                  },
                }}
              >
                {availableVoices
                  .filter((v) => v.lang.startsWith('en'))
                  .map((v) => (
                    <MenuItem
                      key={v.name}
                      value={v.name}
                      sx={{
                        fontSize: '0.73rem',
                        color: 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      {v.name}
                    </MenuItem>
                  ))}
              </Select>

              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', display: 'block' }}
              >
                Auto-sends after {SILENCE_TIMEOUT_MS / 1000}s of silence
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Error display */}
        {error && (
          <Fade in>
            <Box
              sx={{
                position: 'absolute',
                top: 60,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 2,
                px: 2,
                py: 1,
                maxWidth: 400,
              }}
            >
              <Typography variant="caption" sx={{ color: '#f87171', fontSize: '0.72rem' }}>
                {error}
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Global keyframe animations */}
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes voiceBounce {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
          `}
        </style>
      </Box>
    </Fade>
  );
}
