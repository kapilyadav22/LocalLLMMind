import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Chip,
  alpha,
  useTheme,
  Stack,
  Collapse,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Send,
  Square,
  Bot,
  User,
  RotateCcw,
  Sparkles,
  Zap,
  TestTube2,
  Bug,
  FileCode,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
  Copy,
  Terminal,
  Search,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { createAgentTools } from '../../agent/tools.js';
import { useAgentRuntime } from '../../hooks/useAgentRuntime';
import MarkdownRenderer from '../common/MarkdownRenderer';
import ModelSelector from '../common/ModelSelector';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileTags?: string[];
  steps?: Array<{
    type: string;
    name: string;
    status: 'running' | 'completed' | 'failed' | 'denied';
    durationMs?: number;
    output?: string;
    arguments?: any;
  }>;
  proposals?: Array<{
    path: string;
    content: string;
    applied?: boolean;
  }>;
  metrics?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
  };
}

interface CodeAgentPanelProps {
  project: any;
  activeFile?: any;
  openPaths?: string[];
  settings: any;
  models: any[];
  initialModel: string;
  onBusy: (busy: boolean) => void;
  onApplyFile: (path: string, content: string) => void;
  onSelectFile?: (path: string) => void;
  onOpenSettings?: () => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

const STORAGE_PREFIX = 'localllmmind_code_agent_chat_';

export default function CodeAgentPanel({
  project,
  activeFile,
  openPaths = [],
  settings,
  models,
  initialModel,
  onBusy,
  onApplyFile,
  onSelectFile,
  onOpenSettings,
  externalPrompt = '',
  onClearExternalPrompt,
}: CodeAgentPanelProps) {
  const theme = useTheme();
  const latestProject = useRef(project);
  latestProject.current = project;
  const applyRef = useRef(onApplyFile);
  applyRef.current = onApplyFile;

  // Local storage chat key per project
  const storageKey = `${STORAGE_PREFIX}${project?.id || 'default'}`;

  // State
  const [messages, setMessages] = useState<AgentChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentSteps, setCurrentSteps] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [includeActiveFile, setIncludeActiveFile] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);

  // Tools runtime
  const runtime = useAgentRuntime(
    createAgentTools({
      getProject: () => latestProject.current,
      applyFile: (path, content) => applyRef.current(path, content),
    })
  );

  // Sync external prompt (e.g. from FloatingAiActionBar or shortcuts)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      setInputPrompt(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt, onClearExternalPrompt]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, storageKey]);

  // Global stop listener
  useEffect(() => {
    const handleStop = () => {
      controller.current?.abort();
    };
    window.addEventListener('llm-stop-stream', handleStop);
    return () => {
      handleStop();
      onBusy(false);
      window.removeEventListener('llm-stop-stream', handleStop);
    };
  }, [onBusy]);

  // Auto-scroll down as streaming tokens and steps arrive
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, currentResponse, currentSteps, scrollToBottom]);

  // Track scroll position for "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isUp);
  };

  // Helper to extract file proposals from markdown fences
  const extractProposalsFromResponse = (text: string, currentProject: any) => {
    const proposals: Array<{ path: string; content: string; applied?: boolean }> = [];
    const fileHeaderRegex = /(?:```[\w]*\s*(?:\/\/\s*|#\s*)?(?:file:\s*|filepath:\s*|path:\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)\s*\n([\s\S]*?)```)/gi;
    let match;
    while ((match = fileHeaderRegex.exec(text)) !== null) {
      const filePath = match[1]?.trim();
      const fileContent = match[2];
      if (filePath && fileContent && !proposals.find((p) => p.path === filePath)) {
        proposals.push({
          path: filePath,
          content: fileContent,
          applied: false,
        });
      }
    }
    return proposals;
  };

  // Run or Reply (Send message)
  const handleSend = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt ?? inputPrompt).trim();
    if (!promptToSend || !model || busy) return;

    setError('');
    setBusy(true);
    onBusy(true);
    setInputPrompt('');
    setCurrentResponse('');
    setCurrentSteps([]);

    const userMessageId = crypto.randomUUID();
    const activeFilePath = includeActiveFile && activeFile ? activeFile.path : undefined;

    const newUserMessage: AgentChatMessage = {
      id: userMessageId,
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
      fileTags: activeFilePath ? [activeFilePath] : [],
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Build history for the agent runtime
    const agentMessages = [
      {
        role: 'system',
        content: `You are an expert developer pair-programmer assistant working in project "${project.name}".
Total project files: ${project.files.length}.
Active open file: ${activeFilePath || 'None'}.
Inspect files using tools before assuming structure. Propose concrete, complete code for any changes.
When outputting full file replacements, tag code blocks with the file path (e.g. \`\`\`python file:src/main.py).`,
      },
    ];

    // Append prior conversational turns
    for (const msg of messages) {
      agentMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Append the current turn with active file context
    let turnContent = promptToSend;
    if (activeFilePath && activeFile?.content) {
      turnContent = `[Active File: ${activeFilePath}]\n${promptToSend}`;
    }
    agentMessages.push({
      role: 'user',
      content: turnContent,
    });

    controller.current = new AbortController();
    let accumulatedResponse = '';
    let latestRunResult: any = null;

    try {
      latestRunResult = await runtime.stream({
        model,
        localModels: models,
        settings,
        messages: agentMessages,
        signal: controller.current.signal,
        onToken: (token: string) => {
          accumulatedResponse += token;
          setCurrentResponse(accumulatedResponse);
        },
        onError: (e: Error) => {
          setError(e.message);
        },
      });

      // Extract any proposals from response
      const proposals = extractProposalsFromResponse(accumulatedResponse, latestProject.current);

      const assistantMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulatedResponse || 'Task completed.',
        timestamp: Date.now(),
        steps: latestRunResult?.steps || runtime.trace?.steps || [],
        proposals,
        metrics: {
          inputTokens: latestRunResult?.inputTokens,
          outputTokens: latestRunResult?.outputTokens,
          durationMs: latestRunResult?.durationMs,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (!controller.current?.signal.aborted) {
        setError(err.message || 'Agent encountered an error');
      }
    } finally {
      setBusy(false);
      onBusy(false);
      setCurrentResponse('');
      setCurrentSteps([]);
      controller.current = null;
    }
  };

  const handleStop = () => {
    controller.current?.abort();
    setBusy(false);
    onBusy(false);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear conversation history for this project?')) {
      setMessages([]);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  };

  const handleApplyProposal = (proposal: { path: string; content: string }) => {
    onApplyFile(proposal.path, proposal.content);
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        proposals: msg.proposals?.map((p) =>
          p.path === proposal.path ? { ...p, applied: true } : p
        ),
      }))
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: 'background.default' }}>
      {/* Top Header Bar */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ModelSelector
            value={model}
            onChange={setModel}
            disabled={busy}
            variant="compact"
            onOpenSettings={onOpenSettings}
          />
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {messages.length > 0 && (
            <Chip
              label={`${messages.length} ${messages.length === 1 ? 'msg' : 'msgs'}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
            />
          )}

          <Tooltip title="Start New Conversation">
            <IconButton size="small" onClick={handleClearHistory} disabled={busy || messages.length === 0} sx={{ p: '4px' }}>
              <RotateCcw size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Scrollable Conversation Stream */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Welcome Empty State */}
        {messages.length === 0 && !busy && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              py: 4,
              px: 2,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                mb: 1.5,
              }}
            >
              <Bot size={26} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              IDE Developer Agent
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300, mb: 2.5, lineHeight: 1.5 }}>
              Continuous pair-programming assistant. Ask for refactors, tests, debugging, or new features with multi-turn replies.
            </Typography>

            {/* Quick Inspiration Chips */}
            <Stack spacing={1} sx={{ width: '100%', maxWidth: 320 }}>
              {[
                { label: '⚡ Refactor active function for speed', prompt: `Refactor the code in ${activeFile?.path || 'main'} for readability, best practices, and performance.` },
                { label: '🧪 Generate comprehensive unit tests', prompt: `Write a complete unit test suite covering normal inputs and edge cases for ${activeFile?.path || 'this project'}.` },
                { label: '🔍 Find subtle bugs and security issues', prompt: `Analyze ${activeFile?.path || 'this project'} for potential runtime errors, edge-case bugs, or unhandled exceptions.` },
                { label: '📝 Add docstrings and type annotations', prompt: `Add clear documentation docstrings and explicit type hints across ${activeFile?.path || 'the active file'}.` },
              ].map((chip) => (
                <Button
                  key={chip.label}
                  size="small"
                  variant="outlined"
                  onClick={() => handleSend(chip.prompt)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontSize: '0.74rem',
                    py: 0.6,
                    px: 1.25,
                    borderRadius: 2,
                    textAlign: 'left',
                  }}
                >
                  {chip.label}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* Messages List */}
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'stretch',
              maxWidth: msg.role === 'user' ? '88%' : '100%',
            }}
          >
            {/* Header: Role & Time */}
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'user' ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    You
                  </Typography>
                  <Avatar sx={{ width: 18, height: 18, bgcolor: 'primary.main', fontSize: '0.65rem' }}>
                    <User size={11} />
                  </Avatar>
                </>
              ) : (
                <>
                  <Avatar sx={{ width: 18, height: 18, bgcolor: alpha(theme.palette.primary.main, 0.15), color: 'primary.main' }}>
                    <Bot size={11} />
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Developer Agent
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </>
              )}
            </Stack>

            {/* User message bubble */}
            {msg.role === 'user' ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  borderTopRightRadius: 0.5,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {msg.content}
                </Typography>
                {msg.fileTags && msg.fileTags.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {msg.fileTags.map((tag) => (
                      <Chip
                        key={tag}
                        size="small"
                        icon={<FileCode size={11} color="inherit" />}
                        label={tag}
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          bgcolor: alpha('#fff', 0.2),
                          color: '#fff',
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            ) : (
              /* Assistant message container */
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  borderTopLeftRadius: 0.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Agent Activity Steps Accordion if tools executed */}
                {msg.steps && msg.steps.length > 0 && (
                  <Box sx={{ mb: 1.5, p: 1, borderRadius: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Terminal size={13} color="var(--mui-palette-primary-main, #3b82f6)" />
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                        Tool Activity ({msg.steps.length} {msg.steps.length === 1 ? 'step' : 'steps'})
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      {msg.steps.map((st, i) => (
                        <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', fontSize: '0.7rem' }}>
                          {st.status === 'completed' ? (
                            <CheckCircle2 size={12} color="#10b981" />
                          ) : st.status === 'failed' ? (
                            <AlertCircle size={12} color="#ef4444" />
                          ) : (
                            <CircularProgress size={10} />
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            {st.name}
                          </Typography>
                          {st.durationMs !== undefined && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              ({st.durationMs}ms)
                            </Typography>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Markdown content */}
                <Box sx={{ overflowWrap: 'anywhere' }}>
                  <MarkdownRenderer content={msg.content} />
                </Box>

                {/* Extracted File Proposals */}
                {msg.proposals && msg.proposals.length > 0 && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      Proposed Code Modifications
                    </Typography>
                    <Stack spacing={1}>
                      {msg.proposals.map((prop, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: prop.applied ? 'success.main' : 'divider',
                            bgcolor: prop.applied ? alpha(theme.palette.success.main, 0.05) : 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <FileCode size={14} color="var(--mui-palette-primary-main, #3b82f6)" />
                            <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }} noWrap>
                              {prop.path}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5}>
                            {onSelectFile && (
                              <Tooltip title="View in editor">
                                <IconButton size="small" onClick={() => onSelectFile(prop.path)} sx={{ p: '3px' }}>
                                  <ExternalLink size={13} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Button
                              size="small"
                              variant={prop.applied ? 'outlined' : 'contained'}
                              color={prop.applied ? 'success' : 'primary'}
                              disabled={prop.applied}
                              onClick={() => handleApplyProposal(prop)}
                              startIcon={<Check size={12} />}
                              sx={{ fontSize: '0.68rem', py: 0.2, px: 1, textTransform: 'none', borderRadius: 1.5 }}
                            >
                              {prop.applied ? 'Applied' : 'Apply'}
                            </Button>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Turn metrics footer */}
                {msg.metrics && (msg.metrics.outputTokens || msg.metrics.durationMs) && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25, pt: 0.75, borderTop: 1, borderColor: 'divider' }}>
                    {msg.metrics.outputTokens && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        Tokens: {msg.metrics.outputTokens}
                      </Typography>
                    )}
                    {msg.metrics.durationMs && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        Time: {(msg.metrics.durationMs / 1000).toFixed(1)}s
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        ))}

        {/* Live Streaming Turn */}
        {busy && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignSelf: 'stretch' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <CircularProgress size={12} color="primary" />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                Developer Agent is thinking & executing...
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {runtime.trace?.steps && runtime.trace.steps.length > 0 && (
                <Box sx={{ mb: 1.5, p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Running Tools...
                  </Typography>
                  <Stack spacing={0.5}>
                    {runtime.trace.steps.map((st: any, i: number) => (
                      <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', fontSize: '0.7rem' }}>
                        {st.status === 'completed' ? (
                          <CheckCircle2 size={12} color="#10b981" />
                        ) : (
                          <CircularProgress size={10} />
                        )}
                        <Typography variant="caption">{st.name}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {currentResponse ? (
                <Box sx={{ overflowWrap: 'anywhere' }}>
                  <MarkdownRenderer content={currentResponse} />
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Analyzing workspace and preparing response...
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ fontSize: '0.78rem' }}>
            {error}
          </Alert>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <Tooltip title="Scroll to latest">
          <IconButton
            size="small"
            onClick={() => scrollToBottom('smooth')}
            sx={{
              position: 'absolute',
              bottom: 120,
              right: 24,
              bgcolor: 'background.paper',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ArrowDown size={15} />
          </IconButton>
        </Tooltip>
      )}

      {/* Bottom Pinned Prompt Composer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* Context Quick-Chips Bar */}
        <Stack direction="row" spacing={0.75} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeFile && (
            <Chip
              size="small"
              icon={<FileCode size={11} />}
              label={`@${activeFile.path.split('/').pop()}`}
              color={includeActiveFile ? 'primary' : 'default'}
              variant={includeActiveFile ? 'filled' : 'outlined'}
              onClick={() => setIncludeActiveFile((prev) => !prev)}
              sx={{ height: 22, fontSize: '0.68rem', cursor: 'pointer' }}
              title={includeActiveFile ? 'Active file included in context' : 'Click to include active file'}
            />
          )}

          <Chip
            size="small"
            label="⚡ Refactor"
            onClick={() => setInputPrompt((prev) => `${prev ? prev + ' ' : ''}Refactor this code for readability and performance.`)}
            sx={{ height: 22, fontSize: '0.68rem', cursor: 'pointer' }}
          />
          <Chip
            size="small"
            label="🧪 Tests"
            onClick={() => setInputPrompt((prev) => `${prev ? prev + ' ' : ''}Write comprehensive unit tests for this module.`)}
            sx={{ height: 22, fontSize: '0.68rem', cursor: 'pointer' }}
          />
          <Chip
            size="small"
            label="🐛 Find Bugs"
            onClick={() => setInputPrompt((prev) => `${prev ? prev + ' ' : ''}Inspect this code for edge-case bugs and security pitfalls.`)}
            sx={{ height: 22, fontSize: '0.68rem', cursor: 'pointer' }}
          />
        </Stack>

        {/* Textarea Composer */}
        <TextField
          placeholder={messages.length > 0 ? "Ask follow-up or give instruction... (⌘↵ to send)" : "Describe task or question for the developer agent... (⌘↵ to run)"}
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          value={inputPrompt}
          disabled={busy}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.82rem',
              p: 1.25,
              borderRadius: 2,
              bgcolor: 'action.hover',
            },
          }}
        />

        {/* Bottom Actions Row */}
        <Stack direction="row" sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
            ⌘ + Enter to send
          </Typography>

          <Stack direction="row" spacing={1}>
            {busy ? (
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleStop}
                startIcon={<Square size={12} fill="currentColor" />}
                sx={{ fontSize: '0.74rem', textTransform: 'none', borderRadius: 1.5, py: 0.4, px: 1.5 }}
              >
                Stop
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                disabled={!inputPrompt.trim() || !model}
                onClick={() => handleSend()}
                endIcon={<Send size={13} />}
                sx={{ fontSize: '0.74rem', textTransform: 'none', borderRadius: 1.5, py: 0.4, px: 1.5 }}
              >
                {messages.length > 0 ? 'Reply' : 'Run'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
