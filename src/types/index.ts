export type ThemeMode = 'light' | 'dark';

export interface Attachment {
  name: string;
  type: string;
  size: number;
  content: string;
  previewUrl?: string;
}

export interface MessageTiming {
  totalDurationMs?: number;
  evalCount?: number;
  evalDurationMs?: number;
  tokensPerSec?: number;
}

export interface Message {
  metrics?: any;
  isArena?: boolean;
  versions?: string[];
  activeVersionIndex?: number;
  [key: string]: any;
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  model?: string;
  reasoning?: string;
  timing?: MessageTiming;
  attachments?: Attachment[];
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  projectId?: string | null;
  persona?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  isExpanded?: boolean;
  icon?: string;
  [key: string]: any;
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Settings {
  ollamaUrl?: string;
  selectedModel?: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  defaultPersona?: string;
  memoryStorageMode?: string;
  memoryDirectoryName?: string;
  customMemoryPath?: string;
  apiKeyOpenAI?: string;
  apiKeyAnthropic?: string;
  apiKeyGemini?: string;
  apiKeyGrok?: string;
  [key: string]: any;
}

export interface Shortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: string;
}

export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
  [key: string]: any;
}

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: OllamaModelDetails;
}

export interface ChatState {
  conversations: Conversation[];
  projects: Project[];
  activeConversationId: string | null;
  settings: Settings;
  shortcuts: Record<string, any>;
  isStreaming: boolean;
  models: OllamaModel[];
  isConnected: boolean;
  connectionChecked: boolean;
  connectionError: string | null;
}

export type ChatAction =
  | { type: 'SET_MODELS'; payload: OllamaModel[] }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'NEW_CONVERSATION'; payload?: { projectId?: string | null; persona?: string } }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'CREATE_AND_ADD_MESSAGES'; payload: { conversationId: string; userMessage: Message; assistantMessage: Message; model?: string } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: { conversationId: string; content: string; reasoning?: string; timing?: MessageTiming } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; messageId: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: { conversationId: string; messageId: string } }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'RENAME_CONVERSATION'; payload: { id: string; title: string } }
  | { type: 'TOGGLE_PIN_CONVERSATION'; payload: string }
  | { type: 'SET_CONVERSATION_PROJECT'; payload: { conversationId: string; projectId: string | null } }
  | { type: 'SET_CONVERSATION_MODEL'; payload: { conversationId: string; model: string } }
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: { id: string; deleteChats?: boolean } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'UPDATE_SHORTCUTS'; payload: Record<string, any> }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'IMPORT_DATA'; payload: { conversations?: Conversation[]; projects?: Project[]; settings?: Settings } };

export interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
}

export interface CodeFile {
  path: string;
  content: string;
  language?: string;
  modified?: boolean;
}

export interface CodeProject {
  id: string;
  name: string;
  files: CodeFile[];
  connectedPath?: string;
  diskConflicts?: string[];
  diskFiles?: CodeFile[];
  previous?: any;
  createdAt?: string;
  updatedAt?: string;
}
