import { useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  loadConversations,
  saveConversationsDebounced,
  loadProjects,
  saveProjectsDebounced,
  loadSettings,
  saveSettings,
  loadShortcuts,
  saveShortcuts,
} from '../utils/storage';
import {
  getStoredDirectoryHandle,
  syncToDirectory,
} from '../utils/fileSystemStorage';
import { ChatContext } from './chatContext';
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS } from '../constants/appConstants';

function generateTitle(messages) {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';
  const text = firstUserMsg.content.trim();
  return text.length > 50 ? text.substring(0, 50) + '…' : text;
}

const initialState = {
  conversations: loadConversations(),
  projects: loadProjects(),
  activeConversationId: null,
  settings: { ...DEFAULT_SETTINGS, ...loadSettings() },
  shortcuts: loadShortcuts() || DEFAULT_SHORTCUTS,
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
      const projectId = action.payload?.projectId || null;
      const persona = action.payload?.persona || state.settings.defaultPersona || 'default';
      const newConvo = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        model: state.settings.selectedModel || (state.models[0]?.name ?? '') || 'gpt-6-astra',
        projectId,
        persona,
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

    case 'CREATE_AND_ADD_MESSAGES': {
      const { conversationId, userMessage, assistantMessage, model } = action.payload;
      const existing = state.conversations.find((c) => c.id === conversationId);
      if (existing) {
        return {
          ...state,
          activeConversationId: conversationId,
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, userMessage, assistantMessage],
                  title: c.messages.length === 0 ? generateTitle([userMessage]) : c.title,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        };
      }
      const newConvo = {
        id: conversationId,
        title: generateTitle([userMessage]),
        messages: [userMessage, assistantMessage],
        model: model || state.settings.selectedModel || (state.models[0]?.name ?? '') || 'gpt-6-astra',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        conversations: [newConvo, ...state.conversations],
        activeConversationId: conversationId,
      };
    }

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

    case 'FINISH_LAST_MESSAGE': {
      const { conversationId, metrics, content, webSources, knowledgeCitations } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m, i) => {
                  if (i !== c.messages.length - 1) return m;
                  const finalContent = content !== undefined ? content : m.content;
                  const existingVersions = m.versions || [];
                  const versions = existingVersions.length > 0
                    ? [...existingVersions, finalContent]
                    : [finalContent];
                  return {
                    ...m,
                    content: finalContent,
                    ...(metrics ? { metrics } : {}),
                    ...(webSources ? { webSources } : {}),
                    ...(knowledgeCitations ? { knowledgeCitations } : {}),
                    versions,
                    activeVersionIndex: versions.length - 1,
                  };
                }),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    }

    case 'UPDATE_ARENA_MESSAGE': {
      const { conversationId, messageIndex, modelKey, patch } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const idx = messageIndex !== undefined ? messageIndex : c.messages.length - 1;
          return {
            ...c,
            messages: c.messages.map((m, i) => {
              if (i !== idx || !m.isArena) return m;
              return {
                ...m,
                [modelKey]: {
                  ...m[modelKey],
                  ...patch,
                },
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'VOTE_ARENA_MESSAGE': {
      const { conversationId, messageIndex, vote } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m, i) =>
              i === messageIndex ? { ...m, vote } : m
            ),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'REGENERATE_MESSAGE': {
      const { conversationId, messageIndex } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const targetMsg = c.messages[messageIndex];
          const existingVersions = targetMsg?.versions || (targetMsg?.content ? [targetMsg.content] : []);
          const trimmed = c.messages.slice(0, messageIndex);
          const newAssistant = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            versions: existingVersions,
            activeVersionIndex: existingVersions.length,
          };
          return {
            ...c,
            messages: [...trimmed, newAssistant],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'SWITCH_MESSAGE_VERSION': {
      const { conversationId, messageIndex, versionIndex } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m, idx) => {
              if (idx !== messageIndex || !m.versions || m.versions[versionIndex] === undefined) return m;
              return {
                ...m,
                content: m.versions[versionIndex],
                activeVersionIndex: versionIndex,
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'EDIT_AND_RESEND': {
      const { conversationId, messageIndex, newContent } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const trimmed = c.messages.slice(0, messageIndex);
          const editedUserMsg = {
            ...c.messages[messageIndex],
            content: newContent,
            timestamp: new Date().toISOString(),
          };
          const newAssistant = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
          };
          return {
            ...c,
            messages: [...trimmed, editedUserMsg, newAssistant],
            updatedAt: new Date().toISOString(),
          };
        }),
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

    case 'CLEAR_ALL_CONVERSATIONS':
      return {
        ...state,
        conversations: [],
        activeConversationId: null,
      };

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

    case 'TOGGLE_PIN_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload ? { ...c, isPinned: !c.isPinned } : c
        ),
      };

    case 'SET_CONVERSATION_PERSONA': {
      const { conversationId, persona } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, persona } : c
        ),
      };
    }

    case 'FORK_CONVERSATION': {
      const { conversationId, messageIndex } = action.payload;
      const source = state.conversations.find((c) => c.id === conversationId);
      if (!source) return state;

      const messagesToKeep = source.messages.slice(0, messageIndex + 1);
      const forkedConvo = {
        id: uuidv4(),
        title: `Branch: ${source.title.replace(/^Branch:\s*/, '')}`,
        messages: messagesToKeep,
        model: source.model,
        projectId: source.projectId,
        persona: source.persona || 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        conversations: [forkedConvo, ...state.conversations],
        activeConversationId: forkedConvo.id,
      };
    }

    case 'CREATE_PROJECT': {
      const { name, color = '#6366f1', icon = 'folder' } = action.payload;
      const newProject = {
        id: uuidv4(),
        name: name.trim(),
        color,
        icon,
        isExpanded: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        projects: [...state.projects, newProject],
      };
    }

    case 'UPDATE_PROJECT': {
      const { id, name, color, icon } = action.payload;
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(color !== undefined ? { color } : {}),
                ...(icon !== undefined ? { icon } : {}),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };
    }

    case 'DELETE_PROJECT': {
      const { id, deleteConversations } = action.payload;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== id),
        conversations: deleteConversations
          ? state.conversations.filter((c) => c.projectId !== id)
          : state.conversations.map((c) =>
              c.projectId === id ? { ...c, projectId: null } : c
            ),
        activeConversationId:
          deleteConversations &&
          state.conversations.find((c) => c.id === state.activeConversationId)?.projectId === id
            ? null
            : state.activeConversationId,
      };
    }

    case 'TOGGLE_PROJECT_EXPAND': {
      const { id } = action.payload;
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, isExpanded: !p.isExpanded } : p
        ),
      };
    }

    case 'ASSIGN_TO_PROJECT': {
      const { conversationId, projectId } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, projectId: projectId || null } : c
        ),
      };
    }

    case 'IMPORT_DATA': {
      const { conversations = [], projects = [] } = action.payload;
      const existingProjectIds = new Set(state.projects.map((p) => p.id));
      const newProjects = projects.filter((p) => !existingProjectIds.has(p.id));
      return {
        ...state,
        conversations: [...conversations, ...state.conversations],
        projects: [...state.projects, ...newProjects],
        activeConversationId: conversations[0]?.id || state.activeConversationId,
      };
    }

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

    case 'UPDATE_SHORTCUT': {
      const { id, key, modifiers } = action.payload;
      const updated = state.shortcuts.map((s) =>
        s.id === id ? { ...s, key, modifiers } : s
      );
      saveShortcuts(updated);
      return { ...state, shortcuts: updated };
    }

    case 'ADD_CUSTOM_SHORTCUT': {
      const newShortcut = {
        ...action.payload,
        id: action.payload.id || uuidv4(),
        category: 'Custom',
        customizable: true,
      };
      const updated = [...state.shortcuts, newShortcut];
      saveShortcuts(updated);
      return { ...state, shortcuts: updated };
    }

    case 'DELETE_CUSTOM_SHORTCUT': {
      const updated = state.shortcuts.filter((s) => s.id !== action.payload);
      saveShortcuts(updated);
      return { ...state, shortcuts: updated };
    }

    case 'RESET_SHORTCUTS': {
      saveShortcuts(DEFAULT_SHORTCUTS);
      return { ...state, shortcuts: DEFAULT_SHORTCUTS };
    }

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

  // Persist projects whenever they change
  useEffect(() => {
    saveProjectsDebounced(state.projects);
  }, [state.projects]);

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  // Auto-sync conversations & projects to chosen local directory when enabled
  useEffect(() => {
    if (
      state.settings?.memoryStorageMode === 'local_folder' &&
      state.settings?.autoSyncFolder !== false
    ) {
      const timer = setTimeout(async () => {
        try {
          const dirHandle = await getStoredDirectoryHandle();
          if (dirHandle) {
            await syncToDirectory(dirHandle, {
              conversations: state.conversations,
              projects: state.projects,
              settings: state.settings,
              saveMarkdown: state.settings.saveMarkdownCopies !== false,
            });
          }
        } catch {
          // If directory permission has expired or needs user prompt, fail silently
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.conversations, state.projects, state.settings]);

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
