import { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';
import { useChatStore } from '../../store/chatStore';
import { streamChat } from '../../services/ollamaService';

export default function ChatView() {
  const { state, dispatch, getActiveConversation } = useChatStore();
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const autoScrollRef = useRef(true);
  const scrollContainerRef = useRef(null);

  const activeConvo = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConvo?.messages]);

  // Track manual scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const handleSend = useCallback(
    async (text, model) => {
      // Validate connection before sending
      if (!state.isConnected) {
        console.warn('Cannot send: not connected to Ollama');
        return;
      }

      // Validate model is selected
      if (!model && !state.settings.selectedModel && state.models.length === 0) {
        console.warn('Cannot send: no model available');
        return;
      }

      let convoId = state.activeConversationId;

      // If no active conversation, create one
      if (!convoId) {
        dispatch({ type: 'NEW_CONVERSATION' });
      }

      // We need to work with the latest state after potential NEW_CONVERSATION
      // So we use a setTimeout to let the state update
      setTimeout(async () => {
        const currentState = getActiveConversation();
        const currentConvoId = currentState?.id || state.activeConversationId;

        if (!currentConvoId) return;

        const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: currentConvoId, message: userMessage } });

        // Add empty assistant message
        const assistantMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: currentConvoId, message: assistantMessage } });

        dispatch({ type: 'SET_STREAMING', payload: true });
        autoScrollRef.current = true;

        // Build messages array for API
        const currentConvo = state.conversations.find((c) => c.id === currentConvoId);
        const apiMessages = [];

        // Add system prompt if configured
        if (state.settings.systemPrompt) {
          apiMessages.push({ role: 'system', content: state.settings.systemPrompt });
        }

        // Add existing messages
        if (currentConvo) {
          currentConvo.messages.forEach((m) => {
            apiMessages.push({ role: m.role, content: m.content });
          });
        }
        // Add the new user message
        apiMessages.push({ role: 'user', content: text });

        // Create abort controller
        abortControllerRef.current = new AbortController();

        await streamChat({
          model: model || currentConvo?.model || state.settings.selectedModel,
          messages: apiMessages,
          options: {
            temperature: state.settings.temperature,
            topP: state.settings.topP,
            maxTokens: state.settings.maxTokens,
          },
          ollamaUrl: state.settings.ollamaUrl,
          onToken: (token) => {
            dispatch({
              type: 'APPEND_TO_LAST_MESSAGE',
              payload: { conversationId: currentConvoId, content: token },
            });
          },
          onDone: () => {
            dispatch({ type: 'SET_STREAMING', payload: false });
            abortControllerRef.current = null;
          },
          onError: (error) => {
            console.error('Stream error:', error);
            dispatch({
              type: 'APPEND_TO_LAST_MESSAGE',
              payload: {
                conversationId: currentConvoId,
                content: `\n\n⚠️ Error: ${error.message}`,
              },
            });
            dispatch({ type: 'SET_STREAMING', payload: false });
            abortControllerRef.current = null;
          },
          signal: abortControllerRef.current.signal,
        });
      }, 0);
    },
    [state, dispatch, getActiveConversation]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      dispatch({ type: 'SET_STREAMING', payload: false });
    }
  }, [dispatch]);

  const handleSuggestionClick = useCallback(
    (text) => {
      // Create a new conversation and send the suggestion
      dispatch({ type: 'NEW_CONVERSATION' });
      setTimeout(() => {
        const convo = getActiveConversation();
        if (convo) {
          handleSend(text, convo.model);
        }
      }, 50);
    },
    [dispatch, getActiveConversation, handleSend]
  );

  // Show welcome screen if no active conversation
  if (!activeConvo) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        </Box>
        <MessageInput onSend={handleSend} onStop={handleStop} disabled={state.isStreaming} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
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
        {activeConvo.messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          activeConvo.messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              isStreaming={
                state.isStreaming &&
                msg.role === 'assistant' &&
                i === activeConvo.messages.length - 1
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <MessageInput onSend={handleSend} onStop={handleStop} disabled={state.isStreaming} />
    </Box>
  );
}
