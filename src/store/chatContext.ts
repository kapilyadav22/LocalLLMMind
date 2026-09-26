import { createContext, useContext } from 'react';
import type { ChatState, ChatAction, Conversation } from '../types';

export interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction | any>;
  getActiveConversation: () => Conversation | undefined;
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function useChatStore(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
}
