import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadConversations, saveConversations, saveConversationsDebounced, loadSettings, saveSettings } from '../utils/storage';

const ChatContext = createContext(null);

const DEFAULT_SETTINGS = {
  ollamaUrl: 'http://localhost:11434',
  systemPrompt: '',
  selectedModel: '',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 0, // 0 means no limit
};

function generateTitle(messages) {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';
  const text = firstUserMsg.content.trim();
  return text.length > 50 ? text.substring(0, 50) + '…' : text;
}

const initialState = {
  conversations: loadConversations(),
  activeConversationId: null,
  settings: { ...DEFAULT_SETTINGS, ...loadSettings() },
  isStreaming: false,
  models: [],
  isConnected: false,
  connectionChecked: false,
  connectionError: null,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, models: action.payload };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload, connectionChecked: true };

    case 'SET_CONNECTION_ERROR':
      return { ...state, connectionError: action.payload };

    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };

    case 'NEW_CONVERSATION': {
      const newConvo = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        model: state.settings.selectedModel || (state.models[0]?.name ?? ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        conversations: [newConvo, ...state.conversations],
        activeConversationId: newConvo.id,
      };
    }

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, message],
                title: c.messages.length === 0 && message.role === 'user'
                  ? generateTitle([message])
                  : c.title,
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    }

    case 'APPEND_TO_LAST_MESSAGE': {
      const { conversationId, content } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m, i) =>
                  i === c.messages.length - 1
                    ? { ...m, content: m.content + content }
                    : m
                ),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    }

    case 'DELETE_CONVERSATION': {
      const remaining = state.conversations.filter((c) => c.id !== action.payload);
      return {
        ...state,
        conversations: remaining,
        activeConversationId:
          state.activeConversationId === action.payload
            ? (remaining[0]?.id || null)
            : state.activeConversationId,
      };
    }

    case 'RENAME_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload.id
            ? { ...c, title: action.payload.title }
            : c
        ),
      };

    case 'SET_CONVERSATION_MODEL':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload.id
            ? { ...c, model: action.payload.model }
            : c
        ),
      };

    case 'IMPORT_CONVERSATIONS':
      return {
        ...state,
        conversations: [...action.payload, ...state.conversations],
        activeConversationId: action.payload[0]?.id || state.activeConversationId,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist conversations with debounce to avoid disk write lag during token streams
  useEffect(() => {
    saveConversationsDebounced(state.conversations);
  }, [state.conversations]);

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  const getActiveConversation = useCallback(() => {
    return stateRef.current.conversations.find(
      (c) => c.id === stateRef.current.activeConversationId
    );
  }, []);

  return (
    <ChatContext.Provider value={{ state, dispatch, getActiveConversation }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
}
