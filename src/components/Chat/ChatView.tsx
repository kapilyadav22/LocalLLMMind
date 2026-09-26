import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Menu,
  MenuItem,
  Paper,
  InputBase,
  useTheme,
  alpha,
} from '@mui/material';
import Divider from '@mui/material/Divider';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  Bot,
  Folder,
  Search,
  X,
  Share2,
  Brain,
  Swords,
  PlusCircle,
  FileText,
  Clock,
  ListPlus,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';
import ArenaMessageBubble from './ArenaMessageBubble';
import ContextMeter from './ContextMeter';

const MoveToProjectDialog = lazy(() => import('../Layout/MoveToProjectDialog'));
const ProjectDialog = lazy(() => import('../Layout/ProjectDialog'));
const ShareChatDialog = lazy(() => import('./ShareChatDialog'));
const ArtifactSandboxDrawer = lazy(() => import('./ArtifactSandboxDrawer'));
const PersonaDialog = lazy(() => import('./PersonaDialog'));
const MemoryManagerDialog = lazy(() => import('../Settings/MemoryManagerDialog'));
const NotesDrawer = lazy(() => import('../Notes/NotesDrawer'));
const VoiceModeOverlay = lazy(() => import('./VoiceModeOverlay'));
import ApiKeyDialog from '../common/ApiKeyDialog';
import {
  loadMemories,
  formatMemoriesForSystemPrompt,
  detectPotentialMemories,
  addMemory,
} from '../../utils/memoryStorage';
import { computeGenerationMetrics } from '../../utils/generationMetrics';
import { useChatStore } from '../../store/chatContext';
import { generateConversationTitle } from '../../services/ollamaService';
import { streamAnyChat, MissingApiKeyError } from '../../services/aiProviderService';
import { PROVIDERS, resolveModelProvider } from '../../constants/apiProviders';
import { useSpeechSynthesis } from '../../hooks/useAudio';
import { AI_PERSONAS } from '../../constants/appConstants';
import { getAllPersonas } from '../../utils/personaStorage';
import { performWebSearch, formatSearchContext } from '../../services/webSearchService';
import { showToast } from '../../utils/toast';
import { exportConversationToPdf } from '../../utils/pdfExportUtils';
import { v4 as uuidv4 } from 'uuid';

// Format a message for Ollama /api/chat payload (including vision images and arena handling)
const formatMessageForApi = (msg) => {
  let content = msg.content || '';
  if (msg.isArena) {
    if (msg.vote === 'B' && msg.modelB?.content) {
      content = msg.modelB.content;
    } else if (msg.modelA?.content) {
      content = msg.modelA.content;
    }
  }
  const formatted: any = { role: msg.role, content };
  if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
    formatted.images = msg.images
      .map((img) =>
        typeof img === 'string'
          ? img.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '')
          : (img.base64 || img.preview?.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '') || '')
      )
      .filter(Boolean);
  }
  return formatted;
};

const EMPTY_MESSAGES = [];

export default function ChatView({ onOpenSettings }) {
  const theme = useTheme();
  const { state, dispatch, getActiveConversation } = useChatStore();
  const activeConvo = getActiveConversation();
  const activeMessages = activeConvo?.messages || EMPTY_MESSAGES;
  const activeProject = state.projects?.find((p) => p.id === activeConvo?.projectId);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const autoScrollRef = useRef(true);
  const tokenBufferRef = useRef('');
  const flushTimerRef = useRef(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);

  // Edit message dialog state
  const [editDialog, setEditDialog] = useState({ open: false, index: -1, content: '' });

  // Move to Project and Create Project dialog states
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  // In-Chat Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Quote-Reply state
  const [replyToMessage, setReplyToMessage] = useState(null);

  // Share & Save dialog state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Persona Menu state
  const [personaAnchorEl, setPersonaAnchorEl] = useState(null);

  // Missing API Key Dialog state
  const [missingKeyDialog, setMissingKeyDialog] = useState(null);

  // Centralized Speech-to-Text & Text-to-Speech
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const [speakingIndex, setSpeakingIndex] = useState(null);

  // Interactive Artifact Sandbox state
  const [sandboxArtifact, setSandboxArtifact] = useState(null);

  // Model Arena (Dual Model Comparison) state
  const [arenaMode, setArenaMode] = useState(false);
  const [arenaModelA, setArenaModelA] = useState('');
  const [arenaModelB, setArenaModelB] = useState('');
  const arenaAbortControllersRef = useRef([]);

  // Message Queueing State (Real-time message flow while streaming)
  const [queuedMessages, setQueuedMessages] = useState<any[]>([]);
  const queuedMessagesRef = useRef<any[]>([]);
  queuedMessagesRef.current = queuedMessages;
  const handleSendRef = useRef<any>(null);

  const handleRemoveQueuedMessage = useCallback((id: string) => {
    queuedMessagesRef.current = queuedMessagesRef.current.filter((m) => m.id !== id);
    setQueuedMessages([...queuedMessagesRef.current]);
    showToast('Queued message removed', 'info');
  }, []);

  const handleClearQueue = useCallback(() => {
    queuedMessagesRef.current = [];
    setQueuedMessages([]);
    showToast('Queue cleared', 'info');
  }, []);

  const checkAndProcessQueue = useCallback(() => {
    if (queuedMessagesRef.current.length > 0) {
      const nextItem = queuedMessagesRef.current.shift();
      setQueuedMessages([...queuedMessagesRef.current]);
      if (nextItem && handleSendRef.current) {
        setTimeout(() => {
          handleSendRef.current(nextItem.text, nextItem.model, nextItem.attachedImages, nextItem.options);
        }, 120);
      }
    }
  }, []);

  // Clear queue on conversation switch
  useEffect(() => {
    queuedMessagesRef.current = [];
    setQueuedMessages([]);
  }, [activeConvo?.id]);

  // Listen for open artifact events from message code blocks
  useEffect(() => {
    const handleOpenArtifact = (e) => {
      if (e.detail?.code) {
        setSandboxArtifact(e.detail);
      }
    };
    window.addEventListener('localllmmind-open-artifact', handleOpenArtifact);
    return () => window.removeEventListener('localllmmind-open-artifact', handleOpenArtifact);
  }, []);

  // Initialize default models for Arena Mode
  useEffect(() => {
    if (state.models.length > 0) {
      if (!arenaModelA) {
        setArenaModelA(activeConvo?.model || state.settings.selectedModel || state.models[0]?.name || '');
      }
      if (!arenaModelB) {
        setArenaModelB(state.models[1]?.name || state.models[0]?.name || '');
      }
    }
  }, [state.models, activeConvo?.model, state.settings.selectedModel, arenaModelA, arenaModelB]);

  // Active and custom personas
  const [allPersonas, setAllPersonas] = useState(() => getAllPersonas());
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);

  useEffect(() => {
    const handlePersonasUpdated = () => {
      setAllPersonas(getAllPersonas());
    };
    window.addEventListener('localllmmind-personas-updated', handlePersonasUpdated);
    return () => window.removeEventListener('localllmmind-personas-updated', handlePersonasUpdated);
  }, []);

  // Persistent Long-Term Memory state
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [memoriesCount, setMemoriesCount] = useState(() => loadMemories().length);

  useEffect(() => {
    const handleMemoriesUpdated = (e: any) => {
      setMemoriesCount(Array.isArray(e.detail) ? e.detail.length : loadMemories().length);
    };
    window.addEventListener('localllmmind-memories-updated', handleMemoriesUpdated);
    return () => window.removeEventListener('localllmmind-memories-updated', handleMemoriesUpdated);
  }, []);

  // Workspace Notes & Scratchpad state
  const [notesOpen, setNotesOpen] = useState(false);

  // Hands-Free Duplex Voice Mode state
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const lastAssistantMessage = useMemo(() => {
    if (!activeMessages || activeMessages.length === 0) return '';
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'assistant' && activeMessages[i].content) {
        return activeMessages[i].content;
      }
    }
    return '';
  }, [activeMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNotesOpen((prev) => !prev);
      }
    };

    const handleOpenNotesEvent = () => {
      setNotesOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('localllmmind-open-notes', handleOpenNotesEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('localllmmind-open-notes', handleOpenNotesEvent);
    };
  }, []);

  const currentPersonaKey = activeConvo?.persona || state.settings.defaultPersona || 'default';
  const currentPersona = allPersonas.find((p) => p.id === currentPersonaKey) || allPersonas[0];

  // Live Web Search Grounding state
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchWebQuery, setSearchWebQuery] = useState('');



  // In-chat search matching logic
  const matchingIndices = useMemo(() => {
    if (!searchQuery.trim() || !activeMessages.length) return [];
    const q = searchQuery.toLowerCase().trim();
    return activeMessages
      .map((msg, idx) => (msg.content.toLowerCase().includes(q) ? idx : -1))
      .filter((idx) => idx !== -1);
  }, [searchQuery, activeMessages]);

  const scrollToMatch = useCallback((msgIndex) => {
    const el = document.getElementById(`chat-turn-${msgIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleNextMatch = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const next = (searchMatchIndex + 1) % matchingIndices.length;
    setSearchMatchIndex(next);
    scrollToMatch(matchingIndices[next]);
  }, [matchingIndices, searchMatchIndex, scrollToMatch]);

  const handlePrevMatch = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const prev = (searchMatchIndex - 1 + matchingIndices.length) % matchingIndices.length;
    setSearchMatchIndex(prev);
    scrollToMatch(matchingIndices[prev]);
  }, [matchingIndices, searchMatchIndex, scrollToMatch]);

  useEffect(() => {
    if (matchingIndices.length > 0) {
      setSearchMatchIndex(0);
      scrollToMatch(matchingIndices[0]);
    } else {
      setSearchMatchIndex(0);
    }
  }, [matchingIndices, scrollToMatch]);

  // Global search shortcut Cmd+F / Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }
          return next;
        });
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Fork conversation handler
  const handleFork = useCallback(
    (messageIndex) => {
      if (!activeConvo) return;
      const newConvoId = uuidv4();
      dispatch({
        type: 'FORK_CONVERSATION',
        payload: {
          sourceConversationId: activeConvo.id,
          messageIndex,
          newConversationId: newConvoId,
        },
      });
      showToast('Branched conversation into a new chat thread', 'success');
    },
    [activeConvo, dispatch]
  );

  // Reset TTS when switching chats
  useEffect(() => {
    stop();
    setSpeakingIndex(null);
  }, [state.activeConversationId, stop]);

  // Handle TTS toggling from bubbles
  const handleToggleSpeak = useCallback(
    (index, content) => {
      if (isSpeaking && speakingIndex === index) {
        stop();
        setSpeakingIndex(null);
      } else {
        speak(content);
        setSpeakingIndex(index);
      }
    },
    [isSpeaking, speakingIndex, speak, stop]
  );

  // Track user scrolling to conditionally enable/disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    autoScrollRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom);
  }, []);

  // Ensure scroll listener is added to the scrollable container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to bottom on initial message load or active conversation change
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    setShowScrollBottom(false);
    autoScrollRef.current = true;
  }, [state.activeConversationId]);

  // Auto-scroll when messages change or stream arrives
  useEffect(() => {
    if (autoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeMessages.length, state.isStreaming]);

  const scrollToBottom = (behavior = 'smooth') => {
    autoScrollRef.current = true;
    setShowScrollBottom(false);
    if (behavior === 'instant' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helper to run stream
  const runStream = useCallback(
    async (currentConvoId, targetModel, apiMessages) => {
      dispatch({ type: 'SET_STREAMING', payload: true });
      autoScrollRef.current = true;
      tokenBufferRef.current = '';

      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      // Schedule high-performance micro-batch flushing (every 35ms)
      flushTimerRef.current = setInterval(() => {
        if (tokenBufferRef.current) {
          const chunk = tokenBufferRef.current;
          tokenBufferRef.current = '';
          dispatch({
            type: 'APPEND_TO_LAST_MESSAGE',
            payload: { conversationId: currentConvoId, content: chunk },
          });
        }
      }, 35);

      abortControllerRef.current = new AbortController();

      await streamAnyChat({
        model: targetModel,
        messages: apiMessages,
        options: {
          temperature: currentPersona?.temperature ?? state.settings.temperature,
          topP: currentPersona?.topP ?? state.settings.topP,
          maxTokens: currentPersona?.maxTokens ?? state.settings.maxTokens,
          contextWindow: currentPersona?.contextWindow ?? state.settings.contextWindow ?? 4096,
          ...(currentPersona?.repeatPenalty != null && { repeatPenalty: currentPersona.repeatPenalty }),
          ...(currentPersona?.topK != null && { topK: currentPersona.topK }),
          ...(currentPersona?.seed != null && currentPersona.seed >= 0 && { seed: currentPersona.seed }),
          ...(currentPersona?.frequencyPenalty != null && { frequencyPenalty: currentPersona.frequencyPenalty }),
          ...(currentPersona?.presencePenalty != null && { presencePenalty: currentPersona.presencePenalty }),
        },
        settings: state.settings,
        localModels: state.models,
        onToken: (token) => {
          tokenBufferRef.current += token;
        },
        onDone: (parsed: any = {}) => {
          if (flushTimerRef.current) {
            clearInterval(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          const remaining = tokenBufferRef.current;
          tokenBufferRef.current = '';

          if (remaining) {
            dispatch({
              type: 'APPEND_TO_LAST_MESSAGE',
              payload: { conversationId: currentConvoId, content: remaining },
            });
          }

          const metrics = computeGenerationMetrics(parsed, targetModel);

          dispatch({
            type: 'FINISH_LAST_MESSAGE',
            payload: { conversationId: currentConvoId, metrics },
          });
          dispatch({ type: 'SET_STREAMING', payload: false });
          abortControllerRef.current = null;
          checkAndProcessQueue();

          // Autonomous AI smart auto-titling for new chats
          const targetConvo = state.conversations.find((c) => c.id === currentConvoId);
          if (
            targetConvo &&
            (!targetConvo.title || targetConvo.title === 'New Chat' || targetConvo.title.length > 40) &&
            targetConvo.messages.length <= 2
          ) {
            const firstUserText = targetConvo.messages.find((m) => m.role === 'user')?.content;
            if (firstUserText) {
              generateConversationTitle({
                model: targetModel,
                userMessage: firstUserText,
                ollamaUrl: state.settings.ollamaUrl,
              })
                .then((smartTitle) => {
                  if (smartTitle) {
                    dispatch({
                      type: 'RENAME_CONVERSATION',
                      payload: { id: currentConvoId, title: smartTitle },
                    });
                  }
                })
                .catch(() => {});
            }
          }
        },
        onError: (error) => {
          if (flushTimerRef.current) {
            clearInterval(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          tokenBufferRef.current = '';
          if (error instanceof MissingApiKeyError || error.name === 'MissingApiKeyError') {
            setMissingKeyDialog({
              providerId: error.provider,
              modelName: error.model,
            });
          }
          dispatch({
            type: 'APPEND_TO_LAST_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              content: `\n\n⚠️ Error: ${error.message}`,
            },
          });
          dispatch({ type: 'SET_STREAMING', payload: false });
          abortControllerRef.current = null;
          checkAndProcessQueue();
        },
        signal: abortControllerRef.current.signal,
      });
    },
    [dispatch, state.settings]
  );

  // Helper to run dual parallel stream for Model Arena
  const runArenaStream = useCallback(
    async (currentConvoId, modelA, modelB, apiMessages) => {
      dispatch({ type: 'SET_STREAMING', payload: true });
      autoScrollRef.current = true;

      const abortA = new AbortController();
      const abortB = new AbortController();
      arenaAbortControllersRef.current = [abortA, abortB];

      let bufferA = '';
      let bufferB = '';
      let contentA = '';
      let contentB = '';

      const flushTimerA = setInterval(() => {
        if (bufferA) {
          contentA += bufferA;
          bufferA = '';
          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelA',
              patch: { content: contentA },
            },
          });
        }
      }, 35);

      const flushTimerB = setInterval(() => {
        if (bufferB) {
          contentB += bufferB;
          bufferB = '';
          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelB',
              patch: { content: contentB },
            },
          });
        }
      }, 35);

      const taskA = streamAnyChat({
        model: modelA,
        messages: apiMessages,
        options: {
          temperature: state.settings.temperature,
          topP: state.settings.topP,
          maxTokens: state.settings.maxTokens,
          contextWindow: state.settings.contextWindow || 4096,
        },
        settings: state.settings,
        localModels: state.models,
        onToken: (token) => {
          bufferA += token;
        },
        onDone: (parsed: any = {}) => {
          clearInterval(flushTimerA);
          if (bufferA) contentA += bufferA;
          bufferA = '';

          const metrics = computeGenerationMetrics(parsed, modelA);

          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelA',
              patch: { content: contentA, isStreaming: false, metrics },
            },
          });
        },
        onError: (error) => {
          clearInterval(flushTimerA);
          bufferA = '';
          contentA += `\n\n⚠️ Error (${modelA}): ${error.message}`;
          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelA',
              patch: { content: contentA, isStreaming: false },
            },
          });
        },
        signal: abortA.signal,
      });

      const taskB = streamAnyChat({
        model: modelB,
        messages: apiMessages,
        options: {
          temperature: state.settings.temperature,
          topP: state.settings.topP,
          maxTokens: state.settings.maxTokens,
          contextWindow: state.settings.contextWindow || 4096,
        },
        settings: state.settings,
        localModels: state.models,
        onToken: (token) => {
          bufferB += token;
        },
        onDone: (parsed: any = {}) => {
          clearInterval(flushTimerB);
          if (bufferB) contentB += bufferB;
          bufferB = '';

          const metrics = computeGenerationMetrics(parsed, modelB);

          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelB',
              patch: { content: contentB, isStreaming: false, metrics },
            },
          });
        },
        onError: (error) => {
          clearInterval(flushTimerB);
          bufferB = '';
          contentB += `\n\n⚠️ Error (${modelB}): ${error.message}`;
          dispatch({
            type: 'UPDATE_ARENA_MESSAGE',
            payload: {
              conversationId: currentConvoId,
              modelKey: 'modelB',
              patch: { content: contentB, isStreaming: false },
            },
          });
        },
        signal: abortB.signal,
      });

      try {
        await Promise.allSettled([taskA, taskB]);
      } finally {
        clearInterval(flushTimerA);
        clearInterval(flushTimerB);
        arenaAbortControllersRef.current = [];
        dispatch({ type: 'SET_STREAMING', payload: false });
        checkAndProcessQueue();
      }
    },
    [dispatch, state.settings]
  );

  const handleSend = useCallback(
    async (text, model, attachedImages = [], options = {}) => {
      const targetModel =
        model ||
        activeConvo?.model ||
        state.settings.selectedModel ||
        state.models[0]?.name ||
        'gpt-6-astra';

      // If already streaming, enqueue message instead of blocking or discarding
      if (state.isStreaming) {
        const cleanImages = (attachedImages || []).map((img: any) => ({
          id: img.id || String(Date.now() + Math.random()),
          name: img.name || 'image.png',
          size: img.size || 0,
          type: img.type || 'image/png',
          preview: img.preview || (img.base64 ? `data:image/jpeg;base64,${img.base64}` : ''),
          base64: img.base64 || (typeof img === 'string' ? img.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '') : ''),
        }));

        const promptText = text.trim() || (cleanImages.length > 0 ? 'Describe this image.' : '');
        if (!promptText && cleanImages.length === 0) return;

        const queuedItem = {
          id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          text: promptText,
          model: targetModel,
          attachedImages: cleanImages,
          options,
          timestamp: Date.now(),
        };
        queuedMessagesRef.current.push(queuedItem);
        setQueuedMessages([...queuedMessagesRef.current]);
        showToast(`Prompt queued (${queuedMessagesRef.current.length}). Will run automatically.`, 'info');
        return;
      }

      const { provider } = resolveModelProvider(targetModel, state.models);
      const isOnline = provider !== PROVIDERS.OLLAMA;

      if (!isOnline && !state.isConnected) {
        showToast('Please connect to Ollama or select an online cloud model.', 'warning');
        return;
      }

      if (isOnline) {
        const hasKey = Boolean(state.settings.apiKeys?.[provider]?.trim());
        if (!hasKey) {
          setMissingKeyDialog({
            providerId: provider,
            modelName: targetModel,
            pendingAction: () => handleSend(text, model, attachedImages, options),
          });
          return;
        }
      }

      const cleanImages = (attachedImages || []).map((img) => ({
        id: img.id || String(Date.now() + Math.random()),
        name: img.name || 'image.png',
        size: img.size || 0,
        type: img.type || 'image/png',
        preview: img.preview || (img.base64 ? `data:image/jpeg;base64,${img.base64}` : ''),
        base64: img.base64 || (typeof img === 'string' ? img.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '') : ''),
      }));

      // Live Web Search Grounding
      let webSources: any[] = [];
      if ((options as any)?.webSearch && text.trim()) {
        setIsSearchingWeb(true);
        setSearchWebQuery(text.trim());
        try {
          const searchRes = await performWebSearch(text.trim());
          if (searchRes.results && searchRes.results.length > 0) {
            webSources = searchRes.results;
          }
        } catch (searchErr) {
          console.warn('[ChatView] Web grounding error:', searchErr);
        } finally {
          setIsSearchingWeb(false);
          setSearchWebQuery('');
        }
      }

      const promptText = text.trim() || (cleanImages.length > 0 ? 'Describe this image.' : '');
      const convoId = state.activeConversationId || uuidv4();
      const userMessage = {
        role: 'user',
        content: promptText,
        timestamp: new Date().toISOString(),
        ...(cleanImages.length > 0 && { images: cleanImages }),
        ...(webSources.length > 0 && { webSources }),
      };

      // Clear any quote-reply state
      setReplyToMessage(null);

      // Auto-extract candidate facts to memory if enabled
      if (state.settings.enableLongTermMemory !== false && state.settings.autoLearnMemory !== false) {
        const discovered = detectPotentialMemories(text);
        if (discovered.length > 0) {
          discovered.forEach((item) => {
            const added = addMemory(item, 'learned', convoId);
            if (added) {
              showToast(`🧠 Learned: "${item.length > 40 ? item.slice(0, 37) + '...' : item}"`, 'success');
            }
          });
        }
      }

      // Build history for API with persona system prompt & long-term memory
      const personaKey = activeConvo?.persona || state.settings.defaultPersona || 'default';
      const personaObj = allPersonas.find((p) => p.id === personaKey);
      const memoryContext = state.settings.enableLongTermMemory !== false
        ? formatMemoriesForSystemPrompt(loadMemories())
        : '';
      const effectiveSystemPrompt = [
        personaObj?.systemPrompt,
        state.settings.systemPrompt,
        memoryContext,
      ].filter(Boolean).join('\n\n');

      const apiMessages = [];
      if (effectiveSystemPrompt) {
        apiMessages.push({ role: 'system', content: effectiveSystemPrompt });
      }
      if (activeConvo) {
        activeConvo.messages.forEach((m) => {
          apiMessages.push(formatMessageForApi(m));
        });
      }

      if (webSources.length > 0) {
        const searchContext = formatSearchContext(text.trim(), webSources);
        apiMessages.push({
          role: 'user',
          content: `${searchContext}\n\n[USER INQUIRY]\n${promptText}`,
        });
      } else {
        apiMessages.push(formatMessageForApi(userMessage));
      }

      // Handle Arena Mode (Dual Parallel Stream)
      if (arenaMode) {
        const targetModelA = arenaModelA || state.models[0]?.name || targetModel;
        const targetModelB = arenaModelB || state.models[1]?.name || state.models[0]?.name || targetModel;

        const arenaAssistantMessage = {
          role: 'assistant',
          isArena: true,
          timestamp: new Date().toISOString(),
          modelA: {
            name: targetModelA,
            content: '',
            isStreaming: true,
            metrics: null,
          },
          modelB: {
            name: targetModelB,
            content: '',
            isStreaming: true,
            metrics: null,
          },
          vote: null,
        };

        dispatch({
          type: 'CREATE_AND_ADD_MESSAGES',
          payload: {
            conversationId: convoId,
            userMessage,
            assistantMessage: arenaAssistantMessage,
            model: `${targetModelA} vs ${targetModelB}`,
          },
        });

        setTimeout(() => scrollToBottom('smooth'), 50);
        await runArenaStream(convoId, targetModelA, targetModelB, apiMessages);
        return;
      }

      // Standard single model stream
      const assistantMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
      dispatch({
        type: 'CREATE_AND_ADD_MESSAGES',
        payload: {
          conversationId: convoId,
          userMessage,
          assistantMessage,
          model: targetModel,
        },
      });

      setTimeout(() => scrollToBottom('smooth'), 50);
      await runStream(convoId, targetModel, apiMessages);
    },
    [state.isConnected, state.settings, state.models, activeConvo, state.activeConversationId, dispatch, runStream, runArenaStream, arenaMode, arenaModelA, arenaModelB, state.isStreaming]
  );

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const handleStop = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    tokenBufferRef.current = '';
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (arenaAbortControllersRef.current.length > 0) {
      arenaAbortControllersRef.current.forEach((c) => c?.abort());
      arenaAbortControllersRef.current = [];
    }
    dispatch({ type: 'SET_STREAMING', payload: false });
  }, [dispatch]);

  // Listen for global stop stream events (e.g. Escape shortcut)
  useEffect(() => {
    const onGlobalStop = () => handleStop();
    window.addEventListener('llm-stop-stream', onGlobalStop);
    return () => window.removeEventListener('llm-stop-stream', onGlobalStop);
  }, [handleStop]);

  // Cleanup active streams on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Regenerate assistant response
  const handleRegenerate = useCallback(
    async (assistantIndex) => {
      if (state.isStreaming || !activeConvo) return;

      const targetModel = activeConvo.model || state.settings.selectedModel || state.models[0]?.name;
      const convoId = activeConvo.id;

      // Slice messages before this assistant response
      const history = activeConvo.messages.slice(0, assistantIndex);
      const personaKey = activeConvo?.persona || state.settings.defaultPersona || 'default';
      const personaObj = allPersonas.find((p) => p.id === personaKey);
      const memoryContext = state.settings.enableLongTermMemory !== false
        ? formatMemoriesForSystemPrompt(loadMemories())
        : '';
      const effectiveSystemPrompt = [
        personaObj?.systemPrompt,
        state.settings.systemPrompt,
        memoryContext,
      ].filter(Boolean).join('\n\n');

      const apiMessages = [];
      if (effectiveSystemPrompt) {
        apiMessages.push({ role: 'system', content: effectiveSystemPrompt });
      }
      history.forEach((m) => apiMessages.push(formatMessageForApi(m)));

      dispatch({
        type: 'REGENERATE_MESSAGE',
        payload: { conversationId: convoId, messageIndex: assistantIndex },
      });

      await runStream(convoId, targetModel, apiMessages);
    },
    [state.isStreaming, activeConvo, state.settings, state.models, dispatch, runStream]
  );

  // Edit user message and re-run
  const handleEditOpen = (index, content) => {
    setEditDialog({ open: true, index, content });
  };

  const handleEditSaveAndSend = async () => {
    const { index, content } = editDialog;
    setEditDialog({ open: false, index: -1, content: '' });

    if (!content.trim() || !activeConvo || state.isStreaming) return;

    const targetModel = activeConvo.model || state.settings.selectedModel || state.models[0]?.name;
    const convoId = activeConvo.id;

    // Build history up to index, with modified content
    const history = activeConvo.messages.slice(0, index);
    const personaKey = activeConvo?.persona || state.settings.defaultPersona || 'default';
    const personaObj = allPersonas.find((p) => p.id === personaKey);
    const memoryContext = state.settings.enableLongTermMemory !== false
      ? formatMemoriesForSystemPrompt(loadMemories())
      : '';
    const effectiveSystemPrompt = [
      personaObj?.systemPrompt,
      state.settings.systemPrompt,
      memoryContext,
    ].filter(Boolean).join('\n\n');

    const apiMessages = [];
    if (effectiveSystemPrompt) {
      apiMessages.push({ role: 'system', content: effectiveSystemPrompt });
    }
    history.forEach((m) => apiMessages.push(formatMessageForApi(m)));

    const targetUserMsg = activeConvo.messages[index];
    apiMessages.push(
      formatMessageForApi({
        role: 'user',
        content: content.trim(),
        images: targetUserMsg?.images || [],
      })
    );

    dispatch({
      type: 'EDIT_AND_RESEND',
      payload: { conversationId: convoId, messageIndex: index, newContent: content.trim() },
    });

    await runStream(convoId, targetModel, apiMessages);
  };

  const handleSuggestionClick = useCallback(
    (text) => {
      const convo = getActiveConversation();
      handleSend(text, convo?.model);
    },
    [getActiveConversation, handleSend]
  );

  // Export current chat to Markdown (.md)
  const handleExportMarkdown = () => {
    if (!activeConvo || activeConvo.messages.length === 0) return;

    let md = `# ${activeConvo.title || 'Chat'}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()} · Model: ${activeConvo.model || 'Unknown'}*\n\n---\n\n`;

    activeConvo.messages.forEach((m) => {
      const roleName = m.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
      md += `### ${roleName}\n\n`;
      if (m.images && m.images.length > 0) {
        md += `*[${m.images.length} Image${m.images.length > 1 ? 's' : ''} Attached]*\n\n`;
      }
      md += `${m.content}\n\n`;
      if (m.metrics) {
        md += `*⚡ ${m.metrics.tokPerSec} tok/s · ${m.metrics.evalCount} tokens (${m.metrics.duration}s)*\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeConvo.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy entire chat formatted
  const handleCopyEntireChat = async () => {
    if (!activeConvo || activeConvo.messages.length === 0) return;
    let text = `${activeConvo.title}\n\n`;
    activeConvo.messages.forEach((m) => {
      text += `${m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}\n\n`;
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChat(true);
      setTimeout(() => setCopiedChat(false), 2000);
    } catch (e) {
      console.error('Failed to copy chat to clipboard:', e);
    }
  };

  // Show welcome screen if no active conversation or 0 messages
  const hasMessages = activeConvo && activeConvo.messages.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top Header / Action Bar when conversation is active */}
      {/* Top Header / Action Bar when conversation is active */}
      {hasMessages && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, md: 3 },
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: 5,
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, ml: { xs: 5, md: 0 } }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 600, maxWidth: { xs: 160, sm: 240, md: 320 } }}
            >
              {activeConvo.title}
            </Typography>

            {activeConvo.model && (
              <Chip
                icon={<Bot size={13} style={{ marginLeft: 6 }} />}
                label={activeConvo.model}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.72rem',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  color: 'primary.main',
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              />
            )}

            {/* AI Persona Selector */}
            <Tooltip title={`Current Persona: ${currentPersona.name} (Click to switch)`}>
              <Chip
                icon={<Brain size={13} style={{ marginLeft: 6, color: theme.palette.secondary.main }} />}
                label={currentPersona.name}
                size="small"
                onClick={(e) => setPersonaAnchorEl(e.currentTarget)}
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderColor: alpha(theme.palette.secondary.main, 0.4),
                  bgcolor: alpha(theme.palette.secondary.main, 0.08),
                  color: theme.palette.secondary.main,
                  display: { xs: 'none', md: 'inline-flex' },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.16),
                  },
                }}
              />
            </Tooltip>

            {/* Context Window Capacity Meter (full interactive component) */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
              <ContextMeter
                onForkConversation={
                  activeConvo ? () => handleFork(activeConvo.messages.length - 1) : null
                }
              />
            </Box>

            {/* Project Folder Badge */}
            {activeProject ? (
              <Tooltip title="Click to change or remove project folder">
                <Chip
                  icon={<Folder size={13} style={{ marginLeft: 6, color: activeProject.color }} />}
                  label={activeProject.name}
                  size="small"
                  onClick={() => setMoveModalOpen(true)}
                  variant="outlined"
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderColor: alpha(activeProject.color || theme.palette.primary.main, 0.4),
                    bgcolor: alpha(activeProject.color || theme.palette.primary.main, 0.08),
                    color: activeProject.color || 'text.primary',
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': {
                      bgcolor: alpha(activeProject.color || theme.palette.primary.main, 0.16),
                    },
                  }}
                />
              </Tooltip>
            ) : (
              (state.projects || []).length > 0 && (
                <Tooltip title="Organize into project folder">
                  <Chip
                    icon={<Folder size={13} style={{ marginLeft: 6 }} />}
                    label="+ Project"
                    size="small"
                    onClick={() => setMoveModalOpen(true)}
                    variant="outlined"
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      color: 'text.secondary',
                      display: { xs: 'none', md: 'inline-flex' },
                      '&:hover': {
                        borderColor: 'primary.main',
                        color: 'primary.main',
                      },
                    }}
                  />
                </Tooltip>
              )
            )}

            {/* Long-Term Memory Chip */}
            <Tooltip title="Long-Term Memory: Manage persistent facts and context remembered across chats">
              <Chip
                icon={<Brain size={13} style={{ marginLeft: 6, color: theme.palette.info.main }} />}
                label={memoriesCount > 0 ? `${memoriesCount} Memories` : 'Memory'}
                size="small"
                onClick={() => setMemoryModalOpen(true)}
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderColor: alpha(theme.palette.info.main, 0.4),
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  color: theme.palette.info.main,
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.info.main, 0.16),
                  },
                }}
              />
            </Tooltip>
          </Box>

          {/* Action Icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={arenaMode ? 'Exit Model Arena' : 'Model Arena: Dual Model Comparison'}>
              <IconButton
                size="small"
                onClick={() => setArenaMode((prev) => !prev)}
                sx={{
                  color: arenaMode ? 'secondary.main' : 'text.secondary',
                  bgcolor: arenaMode ? alpha(theme.palette.secondary.main, 0.14) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.22),
                  },
                }}
              >
                <Swords size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Find in chat (Cmd+F)">
              <IconButton
                size="small"
                onClick={() => {
                  setSearchOpen((prev) => {
                    const next = !prev;
                    if (next) setTimeout(() => searchInputRef.current?.focus(), 100);
                    return next;
                  });
                }}
                sx={{ color: searchOpen ? 'primary.main' : 'text.secondary' }}
              >
                <Search size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Workspace Notes & Scratchpad (Cmd+Shift+N)">
              <IconButton
                size="small"
                onClick={() => setNotesOpen((prev) => !prev)}
                sx={{
                  color: notesOpen ? 'primary.main' : 'text.secondary',
                  bgcolor: notesOpen ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                  },
                }}
              >
                <FileText size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Share & Save Chat">
              <IconButton size="small" onClick={() => setShareModalOpen(true)} sx={{ color: 'text.secondary' }}>
                <Share2 size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title={copiedChat ? 'Copied!' : 'Copy full conversation'}>
              <IconButton size="small" onClick={handleCopyEntireChat} sx={{ color: 'text.secondary' }}>
                {copiedChat ? <Check size={16} /> : <Copy size={16} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Export as Markdown (.md)">
              <IconButton size="small" onClick={handleExportMarkdown} sx={{ color: 'text.secondary' }}>
                <Download size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Print / Export as PDF">
              <IconButton
                size="small"
                onClick={() => {
                  if (activeConvo) {
                    exportConversationToPdf(activeConvo);
                    showToast('Opening PDF print preview...', 'info');
                  }
                }}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <FileText size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Arena Mode Model Selector Bar */}
      {arenaMode && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, md: 3 },
            py: 1,
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette.secondary.main, 0.25),
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Swords size={18} color={theme.palette.secondary.main} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Model Arena
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Model A:
              </Typography>
              <TextField
                select
                size="small"
                value={arenaModelA || state.models[0]?.name || ''}
                onChange={(e) => setArenaModelA(e.target.value)}
                sx={{ minWidth: 150, '& .MuiSelect-select': { py: 0.5, fontSize: '0.8rem' } }}
              >
                {state.models.map((m) => (
                  <MenuItem key={m.name} value={m.name} sx={{ fontSize: '0.8rem' }}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Chip label="VS" size="small" sx={{ fontWeight: 900, bgcolor: 'secondary.main', color: '#fff', height: 20, fontSize: '0.65rem' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                Model B:
              </Typography>
              <TextField
                select
                size="small"
                value={arenaModelB || state.models[1]?.name || state.models[0]?.name || ''}
                onChange={(e) => setArenaModelB(e.target.value)}
                sx={{ minWidth: 150, '& .MuiSelect-select': { py: 0.5, fontSize: '0.8rem' } }}
              >
                {state.models.map((m) => (
                  <MenuItem key={m.name} value={m.name} sx={{ fontSize: '0.8rem' }}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>

          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => setArenaMode(false)}
            sx={{ fontSize: '0.72rem', textTransform: 'none', color: 'text.secondary', p: 0.5 }}
          >
            Exit Arena
          </Button>
        </Box>
      )}

      {/* In-Chat Search Bar Overlay */}
      {searchOpen && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: { xs: 2, md: 3 },
            py: 0.75,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            borderBottom: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(10px)',
            zIndex: 6,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              maxWidth: 420,
              px: 1.5,
              py: 0.35,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.background.default, 0.6),
            }}
          >
            <Search size={18} style={{ color: theme.palette.text.secondary, marginRight: 8 }} />
            <InputBase
              inputRef={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                }
              }}
              placeholder="Find in conversation... (Enter for next, Shift+Enter for prev)"
              sx={{ flex: 1, fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mx: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>
                {matchingIndices.length > 0
                  ? `${searchMatchIndex + 1} of ${matchingIndices.length}`
                  : '0 matches'}
              </Typography>
            )}
          </Paper>

          <Tooltip title="Previous match (Shift+Enter)">
            <span>
              <IconButton size="small" onClick={handlePrevMatch} disabled={matchingIndices.length === 0}>
                <ChevronUp size={16} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Next match (Enter)">
            <span>
              <IconButton size="small" onClick={handleNextMatch} disabled={matchingIndices.length === 0}>
                <ChevronDown size={16} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Close search (Esc)">
            <IconButton
              size="small"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              sx={{ color: 'text.secondary' }}
            >
              <X size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Messages Scroll Area */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 2,
          scrollbarWidth: 'thin',
        }}
      >
        {!hasMessages ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          activeConvo.messages.map((msg, i) =>
            msg.isArena ? (
              <ArenaMessageBubble
                key={i}
                msg={msg}
                onVote={(vote) =>
                  dispatch({
                    type: 'VOTE_ARENA_MESSAGE',
                    payload: { conversationId: activeConvo.id, messageIndex: i, vote },
                  })
                }
              />
            ) : (
              <MessageBubble
                key={i}
                message={msg}
                index={i}
                isStreaming={
                  state.isStreaming &&
                  msg.role === 'assistant' &&
                  i === activeConvo.messages.length - 1
                }
                isLastAssistant={
                  msg.role === 'assistant' &&
                  i === activeConvo.messages.length - 1
                }
                onRegenerate={handleRegenerate}
                onEdit={handleEditOpen}
                onReply={(m) => setReplyToMessage(m)}
                onFork={handleFork}
                searchQuery={searchQuery}
                isSpeaking={isSpeaking && speakingIndex === i}
                onToggleSpeak={handleToggleSpeak}
                onSwitchVersion={(msgIndex, versionIndex) => {
                  if (activeConvo) {
                    dispatch({
                      type: 'SWITCH_MESSAGE_VERSION',
                      payload: {
                        conversationId: activeConvo.id,
                        messageIndex: msgIndex,
                        versionIndex,
                      },
                    });
                  }
                }}
              />
            )
          )
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <Fab
          size="small"
          onClick={() => scrollToBottom('smooth')}
          sx={{
            position: 'absolute',
            bottom: 95,
            right: { xs: 20, md: 32 },
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.15)}`,
            '&:hover': {
              bgcolor: 'background.paper',
            },
            zIndex: 10,
          }}
        >
          <ChevronDown size={18} />
        </Fab>
      )}

      {/* Queued Messages Flow Banner */}
      {queuedMessages.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mx: { xs: 1.5, md: 3 },
            mb: 1,
            p: 1.25,
            px: 2,
            borderRadius: 2.5,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
            <Chip
              icon={<Clock size={13} color="var(--mui-palette-primary-main, #3b82f6)" />}
              label={`Queued (${queuedMessages.length})`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.primary.main, 0.18),
                color: 'primary.main',
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflowX: 'auto', py: 0.25, minWidth: 0 }}>
              {queuedMessages.map((item, idx) => (
                <Chip
                  key={item.id}
                  label={`${idx + 1}. ${item.text.length > 35 ? item.text.substring(0, 35) + '…' : item.text}`}
                  size="small"
                  onDelete={() => handleRemoveQueuedMessage(item.id)}
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    bgcolor: alpha(theme.palette.background.paper, 0.85),
                    maxWidth: 220,
                  }}
                />
              ))}
            </Box>
          </Box>

          <Button
            size="small"
            onClick={handleClearQueue}
            sx={{
              textTransform: 'none',
              fontSize: '0.72rem',
              color: 'text.secondary',
              py: 0.25,
              px: 1,
              minWidth: 0,
              '&:hover': { color: 'error.main' },
            }}
          >
            Clear All
          </Button>
        </Paper>
      )}

      {/* Message Input */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={false}
        replyTo={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        onOpenSettings={onOpenSettings}
        queuedCount={queuedMessages.length}
        onOpenVoiceMode={() => setVoiceModeOpen(true)}
      />

      {/* AI Persona Selector Menu (built-in + custom) */}
      <Menu
        anchorEl={personaAnchorEl}
        open={Boolean(personaAnchorEl)}
        onClose={() => setPersonaAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 280,
              maxHeight: 460,
              boxShadow: 8,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
            AI Persona Presets
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Customizes system directives and conversational role
          </Typography>
        </Box>
        {allPersonas.map((p) => (
          <MenuItem
            key={p.id}
            selected={p.id === currentPersonaKey}
            onClick={() => {
              if (activeConvo) {
                dispatch({
                  type: 'SET_CONVERSATION_PERSONA',
                  payload: { conversationId: activeConvo.id, persona: p.id },
                });
                showToast(`Switched persona to ${p.name}`, 'info');
              }
              setPersonaAnchorEl(null);
            }}
            sx={{ py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: p.id === currentPersonaKey ? 700 : 500 }}>
                {p.icon} {p.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                {p.desc}
              </Typography>
            </Box>
            {p.id === currentPersonaKey && <Check size={16} color={theme.palette.primary.main} style={{ marginLeft: 12 }} />}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setPersonaAnchorEl(null);
            setPersonaDialogOpen(true);
          }}
          sx={{ py: 1, color: 'primary.main' }}
        >
          <PlusCircle size={18} style={{ marginRight: 8 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Create Custom Persona…
          </Typography>
        </MenuItem>
      </Menu>

      <Suspense fallback={null}>
        {personaDialogOpen && (
          <PersonaDialog
        open={personaDialogOpen}
        onClose={() => setPersonaDialogOpen(false)}
        onSelectPersona={(personaId) => {
          const persona = allPersonas.find((p) => p.id === personaId);
          if (activeConvo) {
            dispatch({
              type: 'SET_CONVERSATION_PERSONA',
              payload: { conversationId: activeConvo.id, persona: personaId },
            });

            // Auto-switch model if modelfile has a pinned model
            if (persona?.pinnedModel) {
              dispatch({
                type: 'SET_CONVERSATION_MODEL',
                payload: { conversationId: activeConvo.id, model: persona.pinnedModel },
              });
              showToast(`Activated "${persona.name}" → model: ${persona.pinnedModel}`, 'info');
            } else {
              showToast(`Activated "${persona.name}"`, 'info');
            }

            // Inject greeting message if the chat is fresh (no messages yet)
            if (persona?.greetingMessage && activeConvo.messages.length === 0) {
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  conversationId: activeConvo.id,
                  message: {
                    role: 'assistant',
                    content: persona.greetingMessage,
                    timestamp: new Date().toISOString(),
                    isGreeting: true,
                  },
                },
              });
            }
          }
          setPersonaDialogOpen(false);
        }}
      />
        )}

      {shareModalOpen && (
        <ShareChatDialog
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          conversation={activeConvo}
        />
      )}

      {/* Edit User Message Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, index: -1, content: '' })}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1rem' }}>
          Edit Message & Resend
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Editing this message will truncate any subsequent responses and generate a new reply from this point.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            value={editDialog.content}
            onChange={(e) => setEditDialog((prev) => ({ ...prev, content: e.target.value }))}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditDialog({ open: false, index: -1, content: '' })} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleEditSaveAndSend} variant="contained" disableElevation>
            Save & Resend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move Conversation to Project Dialog */}
      <MoveToProjectDialog
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        conversation={activeConvo}
        projects={state.projects || []}
        onSelectProject={(convoId, targetProjectId) => {
          dispatch({
            type: 'ASSIGN_TO_PROJECT',
            payload: { conversationId: convoId, projectId: targetProjectId },
          });
        }}
        onCreateNewProject={() => {
          setCreateProjectModalOpen(true);
        }}
      />

      {/* Project Creation Dialog */}
      <ProjectDialog
        open={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onSave={({ name, color }) => {
          dispatch({
            type: 'CREATE_PROJECT',
            payload: { name, color },
          });
        }}
      />

      {/* Interactive Artifact Sandbox Drawer */}
      <ArtifactSandboxDrawer
        open={Boolean(sandboxArtifact)}
        onClose={() => setSandboxArtifact(null)}
        artifact={sandboxArtifact}
      />

      {/* Missing API Key Dialog */}
      {missingKeyDialog && (
        <ApiKeyDialog
          open={Boolean(missingKeyDialog)}
          onClose={() => setMissingKeyDialog(null)}
          providerId={missingKeyDialog.providerId}
          modelName={missingKeyDialog.modelName}
          onSuccess={() => {
            const action = missingKeyDialog.pendingAction;
            setMissingKeyDialog(null);
            action?.();
          }}
          onOpenFullSettings={() => {
            setMissingKeyDialog(null);
            onOpenSettings?.(1);
          }}
        />
      )}
      {/* Long-Term Memory Manager Dialog */}
      {memoryModalOpen && (
        <MemoryManagerDialog
          open={memoryModalOpen}
          onClose={() => {
            setMemoryModalOpen(false);
            setMemoriesCount(loadMemories().length);
          }}
        />
      )}

      {/* Workspace Notes & Scratchpad Drawer */}
      {notesOpen && (
        <NotesDrawer
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          onSendToChat={(content) => {
            window.dispatchEvent(new CustomEvent('llm-insert-text', { detail: { text: content } }));
            setNotesOpen(false);
          }}
        />
      )}

      {/* Hands-Free Duplex Voice Mode Overlay */}
      {voiceModeOpen && (
        <VoiceModeOverlay
          open={voiceModeOpen}
          onClose={() => setVoiceModeOpen(false)}
          onSend={handleSend}
          isStreaming={state.isStreaming}
          lastAssistantMessage={lastAssistantMessage}
          modelName={activeConvo?.model || state.settings.selectedModel || ''}
        />
      )}
      </Suspense>
    </Box>
  );
}

