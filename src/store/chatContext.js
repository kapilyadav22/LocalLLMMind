import { createContext, useContext } from 'react';

export const ChatContext = createContext(null);

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
}
