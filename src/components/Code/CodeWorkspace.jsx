import { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import JSZip from 'jszip';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Plus,
  Code2,
  FileCode,
  Sparkles,
  Download,
  Upload,
  Paperclip,
  FolderOpen,
  X,
  ExternalLink,
  Save,
  Undo2,
  Trash2,
  MessageSquare,
  Sliders,
  Copy,
  Check,
  WrapText,
  Play,
  Search,
  Wand2,
  Camera,
  ListTree,
  Terminal,
  FolderSearch,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  FolderTree,
  GitBranch,
} from 'lucide-react';
import { useChatStore } from '../../store/chatContext';
import { importProjectArchive, importDirectoryFiles, readAttachments } from '../../utils/projectImport';
import { commitStagedFiles, restoreFile } from '../../utils/workspaceChanges';
import { generateProject } from '../../services/codeGenerationService';
import { localAction, localStatus } from '../../services/localControlService';
import { loadCodeWorkspace, newCodeProject, saveCodeWorkspace } from '../../utils/codeProjectStorage';
import { mergeFiles, validateFilePath, validateFiles } from '../../shared/projectValidation';
import {
  DEFAULT_EDITOR_SETTINGS,
  EDITOR_THEMES,
  loadEditorSettings,
  saveEditorSettings,
} from '../../constants/editorThemes';
import { STACK_PRESETS } from '../../constants/editorConstants';
import { SIDEBAR_TABS } from '../../constants/gitConstants';
import { computeGitStatus } from '../../utils/gitService';
import CodeEditor from './CodeEditor';
import FileTree from './FileTree';
import EditorCustomizerPopover from './EditorCustomizerPopover';
import CodeTabBar from './CodeTabBar';
import FloatingAiActionBar from './FloatingAiActionBar';
import GitSourceControlSidebar from './GitSourceControlSidebar';
import GitDiffViewer from './GitDiffViewer';
import ModelSelector from '../common/ModelSelector';
import { formatCode } from '../../utils/codeFormatter';
import { runCodeSnippet, runTerminalCommand } from '../../utils/codeRunner';
import { showToast } from '../../utils/toast';

const CodeExportModal = lazy(() => import('./CodeExportModal'));
const CodeOutlineDrawer = lazy(() => import('./CodeOutlineDrawer'));
const CodeConsoleDrawer = lazy(() => import('./CodeConsoleDrawer'));

const starterFiles = [
  {
    path: 'README.md',
    content: '# Project Workspace\n\nA clean developer workspace. Edit files, leave review comments, or ask the AI to refactor and expand.\n\nRun:\n  python3 src/main.py\n\nTest:\n  python3 -m unittest discover -s tests\n',
  },
  {
    path: 'src/main.py',
    content: 'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\n\nif __name__ == "__main__":\n    print(greet("world"))\n',
  },
  {
    path: 'tests/test_main.py',
    content: 'import unittest\nfrom src.main import greet\n\n\nclass GreetingTests(unittest.TestCase):\n    def test_greeting(self):\n        self.assertEqual(greet("Ada"), "Hello, Ada!")\n\n\nif __name__ == "__main__":\n    unittest.main()\n',
  },
];

const caption = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'text.secondary',
  textTransform: 'uppercase',
};


export default function CodeWorkspace({ onModels, active = true }) {
  const { state } = useChatStore();
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [saved, setSaved] = useState(false);
  const [path, setPath] = useState('');
  const [openPaths, setOpenPaths] = useState([]);
  const [selection, setSelection] = useState({ from: 1, to: 1 });
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('Auto');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(null);
  const [reviewPath, setReviewPath] = useState('');
  const [reviewSide, setReviewSide] = useState('after');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [comment, setComment] = useState('');
  const [scope, setScope] = useState('line');
  const [rightTab, setRightTab] = useState('build'); // 'build' | 'comments'
  const [ides, setIdes] = useState([]);
  const [ide, setIde] = useState('');
  const [desktopBusy, setDesktopBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [editorSettings, setEditorSettings] = useState(loadEditorSettings);
  const [customizerAnchorEl, setCustomizerAnchorEl] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Additional developer features state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [consoleBusy, setConsoleBusy] = useState(false);
  const [executionInfo, setExecutionInfo] = useState({});
  const [floatingAiDismissed, setFloatingAiDismissed] = useState(false);

  // Fullscreen state
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  // Draggable explorer left sidebar
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const saved = localStorage.getItem('localllmmind_explorer_width');
    return saved ? Math.max(140, Math.min(420, parseInt(saved, 10))) : 200;
  });
  const [isDraggingExplorer, setIsDraggingExplorer] = useState(false);
  const explorerDragStartX = useRef(0);
  const explorerStartWidth = useRef(200);

  // Draggable and minimizable right sidebar
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('localllmmind_right_sidebar_width');
    return saved ? Math.max(280, Math.min(650, parseInt(saved, 10))) : 360;
  });
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(() => {
    return localStorage.getItem('localllmmind_right_sidebar_collapsed') === 'true';
  });
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const rightDragStartX = useRef(0);
  const rightStartWidth = useRef(360);

  // Terminal & Comments state
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [commentFilter, setCommentFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [commentScopeView, setCommentScopeView] = useState('file'); // 'file' | 'project'
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [quickOpenSearch, setQuickOpenSearch] = useState('');
  const importInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const attachmentFolderRef = useRef(null);
  const [importBusy, setImportBusy] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [importReport, setImportReport] = useState([]);
  const [contextMode, setContextMode] = useState('project');
  const [formatBusy, setFormatBusy] = useState(false);

  // Git / Source Control state
  const [sidebarTab, setSidebarTab] = useState(SIDEBAR_TABS.EXPLORER); // 'explorer' | 'source_control'
  const [stagedPaths, setStagedPaths] = useState(new Set());
  const [activeDiffPath, setActiveDiffPath] = useState(null);

  // AI Assistant attachments — external reference files included in generation context
  const [attachments, setAttachments] = useState([]);
  const attachmentInputRef = useRef(null);

  const editorRef = useRef(null);
  const controller = useRef(null);
  const storageGeneration = useRef(0);
  const project = projects.find((item) => item.id === activeId);
  const file = project?.files.find((item) => item.path === path);
  const actualModel = model || state.settings.selectedModel || state.models[0]?.name || '';
  const locked = busy || !!pending || desktopBusy || importBusy || attachmentBusy || formatBusy || consoleBusy || terminalBusy;
  const activeThemeObj = EDITOR_THEMES.find((t) => t.id === editorSettings.themeId) || EDITOR_THEMES[0];

  // Compute git status for current active project
  const gitStatus = useMemo(() => {
    if (!project) {
      return { changes: [], stagedChanges: [], unstagedChanges: [], statusByPath: {}, stats: { total: 0 } };
    }
    const base = project.baseFiles ?? [];
    return computeGitStatus(project.files, base, stagedPaths);
  }, [project, stagedPaths]);

  const selectedSnippet = useMemo(() => {
    if (!file?.content || !selection || selection.to < selection.from) return '';
    const lines = file.content.split('\n');
    return lines.slice(selection.from - 1, selection.to).join('\n');
  }, [file?.content, selection]);

  useEffect(() => {
    let alive = true;
    loadCodeWorkspace()
      .then((stored) => {
        if (!alive) return;
        const mapped = stored.map((p) => ({
          ...p,
          baseFiles: p.baseFiles ?? (p.files || []).map((f) => ({ ...f })),
          commits: p.commits || [],
        }));
        const initial = mapped.length ? mapped : [newCodeProject()];
        setProjects(initial);
        let lastId;
        try { lastId = localStorage.getItem('localllmmind_active_code_project'); } catch { /* Browser storage may be unavailable. */ }
        const selected = initial.find((item) => item.id === lastId) || initial[0];
        setActiveId(selected.id);
        const initialOpen = selected.files.slice(0, 4).map((f) => f.path);
        setOpenPaths(initialOpen);
        setPath(initialOpen[0] || '');
        setReady(true);
      })
      .catch((err) => {
        if (!alive) return;
        const initial = newCodeProject();
        setProjects([initial]);
        setActiveId(initial.id);
        const initialOpen = initial.files.slice(0, 4).map((f) => f.path);
        setOpenPaths(initialOpen);
        setPath(initialOpen[0] || '');
        setReady(true);
        setStorageError(`Browser storage is unavailable: ${err.message}. Export your work before leaving.`);
      });
    localStatus()
      .then((status) => {
        if (alive) {
          setIdes(status.ides);
          setIde(status.ides[0]?.id || '');
        }
      })
      .catch(() => { });
    return () => {
      alive = false;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const generation = ++storageGeneration.current;
    setSaved(false);
    saveCodeWorkspace(projects)
      .then(() => {
        if (generation === storageGeneration.current) {
          setSaved(true);
          setStorageError('');
        }
      })
      .catch((err) => {
        if (generation === storageGeneration.current) {
          setStorageError(`Could not save to browser: ${err.message}. Export your work before leaving.`);
        }
      });
  }, [projects, ready]);

  useEffect(() => {
    if (ready && activeId) {
      try { localStorage.setItem('localllmmind_active_code_project', activeId); } catch { /* Workspace content is saved in IndexedDB. */ }
    }
  }, [ready, activeId]);

  useEffect(() => {
    if (!project) return;
    const valid = new Set(project.files.map((file) => file.path));
    setOpenPaths((previous) => previous.filter((path) => valid.has(path)));
    if (path && !valid.has(path)) setPath('');
  }, [project, path]);

  // Global keyboard shortcuts (Cmd+P for quick open file, Escape for exiting fullscreen)
  useEffect(() => {
    function handleGlobalKeys(e) {
      if (!active) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuickOpenOpen(true);
      } else if (e.key === 'Escape' && isEditorFullscreen) {
        setIsEditorFullscreen(false);
      }
    }
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isEditorFullscreen, active]);

  // Explorer left sidebar drag resizing
  const handleExplorerDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingExplorer(true);
    explorerDragStartX.current = e.clientX;
    explorerStartWidth.current = explorerWidth;

    function handleMouseMove(moveEvent) {
      const delta = moveEvent.clientX - explorerDragStartX.current;
      const nextWidth = Math.max(140, Math.min(420, explorerStartWidth.current + delta));
      setExplorerWidth(nextWidth);
    }

    function handleMouseUp() {
      setIsDraggingExplorer(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setExplorerWidth((w) => {
        localStorage.setItem('localllmmind_explorer_width', String(Math.round(w)));
        return w;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [explorerWidth]);

  // Right sidebar drag resizing
  const handleRightDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingRight(true);
    rightDragStartX.current = e.clientX;
    rightStartWidth.current = rightSidebarWidth;

    function handleMouseMove(moveEvent) {
      const delta = rightDragStartX.current - moveEvent.clientX;
      const nextWidth = Math.max(280, Math.min(650, rightStartWidth.current + delta));
      setRightSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      setIsDraggingRight(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setRightSidebarWidth((w) => {
        localStorage.setItem('localllmmind_right_sidebar_width', String(Math.round(w)));
        return w;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rightSidebarWidth]);

  function toggleRightSidebar() {
    setRightSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('localllmmind_right_sidebar_collapsed', String(next));
      return next;
    });
  }

  function handleSettingsChange(partial) {
    setEditorSettings((prev) => {
      const next = { ...prev, ...partial };
      saveEditorSettings(next);
      return next;
    });
  }

  function handleResetSettings() {
    setEditorSettings(DEFAULT_EDITOR_SETTINGS);
    saveEditorSettings(DEFAULT_EDITOR_SETTINGS);
  }

  async function handleCopyFile() {
    if (!file?.content && file?.content !== '') return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedCode(true);
      showToast('File code copied to clipboard!', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  }

  function handleDownloadCurrentFile() {
    if (!file) return;
    try {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.path.split('/').pop() || 'file.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Downloaded ${file.path}`, 'success');
    } catch (err) {
      showToast(`Could not download file: ${err.message}`, 'error');
    }
  }

  // Universal language-independent code formatting
  async function handleFormatCode() {
    if (!file || locked) return;
    setFormatBusy(true);
    try {
      const formatted = await formatCode(file.content, file.path, editorSettings.tabSize);
      if (formatted !== file.content) {
        updateProject((current) => ({
          files: current.files.map((item) => (item.path === file.path ? { ...item, content: formatted } : item)),
        }));
        showToast('Code formatted cleanly!', 'success');
      } else {
        showToast('Code is already clean and formatted.', 'info');
      }
    } catch (err) {
      showToast(`Formatting error: ${err.message}`, 'error');
    } finally { setFormatBusy(false); }
  }

  async function handleRunCode() {
    if (!file || locked) return;
    setConsoleOpen(true);
    setConsoleBusy(true);
    try {
      const result = await runCodeSnippet({
        code: file.content,
        path: file.path,
        allFiles: project.files,
        projectId: project.id,
      });
      setConsoleLogs(result.logs || []);
      setExecutionInfo({
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        isWeb: result.isWeb,
        html: result.html,
      });
    } catch (err) {
      setConsoleLogs([{ type: 'error', text: `Execution failed: ${err.message}` }]);
      setExecutionInfo({ durationMs: 0, exitCode: 1 });
    } finally {
      setConsoleBusy(false);
    }
  }

  async function handleExecuteTerminalCommand(cmd, options = { systemAccess: true }) {
    const trimmed = String(cmd || '').trim();
    if (!trimmed || locked) return;
    setTerminalBusy(true);
    const entryId = crypto.randomUUID();
    try {
      const result = await runTerminalCommand({
        command: trimmed,
        allFiles: project?.files || [],
        projectId: project.id,
        systemAccess: options.systemAccess,
      });
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: entryId,
          command: trimmed,
          logs: result.logs || [],
          durationMs: result.durationMs,
          exitCode: result.exitCode,
        },
      ]);
    } catch (err) {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: entryId,
          command: trimmed,
          logs: [{ type: 'error', text: err.message }],
          durationMs: 0,
          exitCode: 1,
        },
      ]);
    } finally {
      setTerminalBusy(false);
    }
  }

  function acceptImport(result) {
    const imported = { ...newCodeProject(result.name, result.files), comments: result.comments, summary: result.summary };
    setProjects((previous) => [...previous, imported]);
    switchProject(imported.id, imported);
    setImportReport(result.skipped);
    setNotice(`Opened ${result.name}: ${result.files.length} source files${result.skipped.length ? `, ${result.skipped.length} skipped` : ''}. Edits are saved as a workspace copy.`);
  }

  async function handleImportFile(event) {
    const upload = event.target.files?.[0];
    event.target.value = '';
    if (!upload || locked) return;
    setImportBusy(true); setError('');
    try { acceptImport(await importProjectArchive(upload)); }
    catch (error) { setError(`Import failed: ${error.message}`); }
    finally { setImportBusy(false); }
  }

  function handleOpenFolder() {
    if (!locked) folderInputRef.current?.click();
  }

  async function handleFolderInput(event) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    setImportBusy(true); setError('');
    try { acceptImport(await importDirectoryFiles(files)); }
    catch (error) { setError(`Could not open folder: ${error.message}`); }
    finally { setImportBusy(false); }
  }

  function handleAiAction(actionId, generatedPrompt) {
    setPrompt(generatedPrompt);
    setRightTab('build');
    setRightSidebarCollapsed(false);
    setFloatingAiDismissed(true);
    showToast('AI prompt prepared! Review or click "Generate changes".', 'info');
  }

  function handleSelectLineFromOutline(line) {
    editorRef.current?.goToLine(line);
  }

  const updateProject = useCallback((change) => {
    setProjects((items) =>
      items.map((item) =>
        item.id === activeId ? { ...item, ...(typeof change === 'function' ? change(item) : change), updatedAt: Date.now() } : item
      )
    );
  }, [activeId]);

  // Git / Source Control Handlers
  const handleToggleStage = useCallback((filePath) => {
    setStagedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

  const handleStageAll = useCallback(() => {
    if (!gitStatus.changes.length) return;
    setStagedPaths(new Set(gitStatus.changes.map((c) => c.path)));
    showToast('Staged all changes', 'info');
  }, [gitStatus.changes]);

  const handleUnstageAll = useCallback(() => {
    setStagedPaths(new Set());
    showToast('Unstaged all changes', 'info');
  }, []);

  const handleDiscardFile = useCallback((filePath) => {
    if (!project || locked) return;
    const baseFiles = project.baseFiles || [];
    const baseFile = baseFiles.find((f) => f.path === filePath);
    if (baseFile) {
      updateProject((proj) => ({
        files: restoreFile(proj.files, baseFile),
      }));
    } else {
      updateProject((proj) => ({
        files: proj.files.filter((f) => f.path !== filePath),
      }));
    }
    setStagedPaths((prev) => {
      const next = new Set(prev);
      next.delete(filePath);
      return next;
    });
    if (activeDiffPath === filePath) setActiveDiffPath(null);
    showToast(`Discarded changes in ${filePath}`, 'info');
  }, [project, activeDiffPath, locked, updateProject]);

  const handleDiscardAll = useCallback(() => {
    if (!project || !project.baseFiles || locked) return;
    updateProject({
      files: project.baseFiles.map((f) => ({ ...f })),
    });
    setStagedPaths(new Set());
    setActiveDiffPath(null);
    showToast('Discarded all working tree changes', 'info');
  }, [project, locked, updateProject]);

  const handleCommit = useCallback((message) => {
    if (!project || locked || !gitStatus.stagedChanges.length) return;
    const commit = {
      id: `commit-${Date.now()}`,
      hash: Math.random().toString(36).substring(2, 9),
      message,
      timestamp: new Date().toISOString(),
      filesChanged: gitStatus.stagedChanges.length,
    };
    const updatedCommits = [commit, ...(project.commits || [])];
    updateProject({
      baseFiles: commitStagedFiles(project.files, project.baseFiles || [], stagedPaths),
      commits: updatedCommits,
    });
    setStagedPaths(new Set());
    if (activeDiffPath) setActiveDiffPath(null);
    showToast(`Committed: "${message}" (${commit.hash})`, 'success');
  }, [project, gitStatus.stagedChanges.length, activeDiffPath, stagedPaths, locked, updateProject]);

  const handleOpenDiff = useCallback((filePath) => {
    setActiveDiffPath(filePath);
    setPath(filePath);
  }, []);

  function selectFile(next) {
    setActiveDiffPath(null);
    setPath(next);
    setOpenPaths((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setSelection({ from: 1, to: 1 });
    setFloatingAiDismissed(false);
  }

  function closeTab(targetPath) {
    setOpenPaths((prev) => {
      const next = prev.filter((p) => p !== targetPath);
      if (path === targetPath) {
        setPath(next.length ? next[next.length - 1] : '');
      }
      return next;
    });
  }

  function switchProject(id, newProject) {
    const targetProj = newProject || projects.find((p) => p.id === id);
    setSidebarTab(SIDEBAR_TABS.EXPLORER);
    setStagedPaths(new Set()); setActiveDiffPath(null); setAttachments([]);
    setImportReport([]); setContextMode('project'); setConsoleLogs([]); setTerminalHistory([]); setExecutionInfo({});
    const initialPaths = targetProj?.files?.slice(0, 4).map((f) => f.path) || [];
    setOpenPaths(initialPaths);
    setActiveId(id);
    setPath(initialPaths[0] || targetProj?.files[0]?.path || '');
    setPrompt('');
    setComment('');
    setNotice('');
    setError('');
    setSelection({ from: 1, to: 1 });
    setFloatingAiDismissed(false);
  }

  function createProject(name, files = []) {
    const next = newCodeProject(name, files);
    setProjects((items) => [...items, next]);
    switchProject(next.id, next);
  }

  function askDialog(kind, value = '') {
    if (locked) return;
    setDialog(kind);
    setDialogValue(value);
    setDialogError('');
  }

  function submitDialog() {
    try {
      if (dialog === 'file') {
        validateFilePath(dialogValue);
        const files = validateFiles([...project.files, { path: dialogValue, content: '' }]);
        updateProject({ files });
        selectFile(dialogValue);
      } else if (dialog === 'new') {
        if (!dialogValue.trim()) throw new Error('Enter a project name.');
        createProject(dialogValue.trim());
      } else if (dialog === 'rename') {
        if (!dialogValue.trim()) throw new Error('Enter a project name.');
        updateProject({ name: dialogValue.trim() });
      } else if (dialog === 'delete-file') {
        updateProject({
          files: project.files.filter((item) => item.path !== file.path),
          comments: project.comments.filter((item) => item.path !== file.path),
        });
        closeTab(file.path);
      } else if (dialog === 'undo') {
        updateProject({ ...project.previous, previous: null });
        setPath('');
      }
      setDialog(null);
    } catch (err) {
      setDialogError(err.message);
    }
  }

  async function handleAttachFiles(files) {
    if (locked || !files.length) return;
    setAttachmentBusy(true);
    try {
      const result = await readAttachments(files, attachments);
      setAttachments(result.attachments);
      if (result.skipped.length) setNotice(`Attachments skipped: ${result.skipped.join('; ')}`);
    } catch (error) { setError(error.message); }
    finally { setAttachmentBusy(false); }
  }
  function handleAttachmentInputChange(event) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    handleAttachFiles(files);
  }
  function handlePromptDrop(event) {
    event.preventDefault(); event.stopPropagation();
    handleAttachFiles(Array.from(event.dataTransfer?.files || []));
  }

  // ─── Generate with attachments context ────────────────────────────────
  async function generate() {
    if (!prompt.trim() || !actualModel || locked) return;
    setError('');
    setNotice('');
    setBusy(true);
    setProgress(0);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await generateProject({
        model: actualModel,
        prompt,
        language,
        project,
        ollamaUrl: state.settings.ollamaUrl,
        signal: abort.signal,
        onProgress: setProgress,
        apiKeys: state.settings.apiKeys,
        apiEndpoints: state.settings.apiEndpoints,
        contextPaths: contextMode === 'open' ? openPaths : null,
        attachments: attachments.map((a) => ({ path: a.path, content: a.content })),
      });
      if (abort.signal.aborted) return;
      mergeFiles(project.files, result.files);
      setPending(result);
      setReviewPath(result.files[0].path);
      setReviewSide('after');
    } catch (err) {
      if (abort.signal.aborted) setNotice('Generation stopped. Your files are unchanged.');
      else setError(err.message);
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }

  function applyProposal() {
    try {
      const files = mergeFiles(project.files, pending.files);
      updateProject({
        files,
        summary: pending.summary,
        name: project.name === 'Untitled project' ? prompt.trim().slice(0, 48) : project.name,
        previous: { files: project.files, comments: project.comments, summary: project.summary },
      });
      selectFile(pending.files[0].path);
      setPending(null);
      setPrompt('');
      setNotice('Changes applied. You can restore the previous version with Undo.');
    } catch (err) {
      setError(err.message);
    }
  }

  function addComment() {
    if (!file || !comment.trim()) return;
    const lines = file.content.split('\n');
    const from = Math.min(selection.from, lines.length);
    const to = Math.min(selection.to, lines.length);
    updateProject((current) => ({
      comments: [
        ...current.comments,
        {
          id: crypto.randomUUID(),
          path: file.path,
          from: scope === 'file' ? null : from,
          to: scope === 'file' ? null : to,
          excerpt: scope === 'file' ? '' : lines.slice(from - 1, to).join('\n'),
          text: comment.trim(),
          resolved: false,
          createdAt: Date.now(),
        },
      ],
    }));
    setComment('');
    showToast('Comment added', 'success');
  }

  function deleteComment(commentId) {
    updateProject((current) => ({
      comments: current.comments.filter((item) => item.id !== commentId),
    }));
    showToast('Comment deleted', 'info');
  }

  function toggleCommentResolved(commentId) {
    updateProject((current) => ({
      comments: current.comments.map((item) =>
        item.id === commentId ? { ...item, resolved: !item.resolved } : item
      ),
    }));
  }

  function handleJumpToComment(targetComment) {
    if (targetComment.path && targetComment.path !== file?.path) {
      selectFile(targetComment.path);
    }
    if (targetComment.from) {
      setTimeout(() => {
        editorRef.current?.goToLine(targetComment.from);
      }, 50);
    }
  }

  async function exportZip() {
    try {
      validateFiles(project.files);
      const zip = new JSZip();
      project.files.forEach((item) => zip.file(item.path, item.content));
      zip.file(
        '.localllmmind.json',
        JSON.stringify({ name: project.name, comments: project.comments, summary: project.summary }, null, 2)
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || 'project'}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveToDisk(open = false) {
    setDesktopBusy(true);
    setError('');
    try {
      const snapshot = await localAction('projects/save', {
        name: project.name,
        files: project.files,
        comments: project.comments,
      });
      setNotice(`Saved snapshot: ${snapshot.path}`);
      if (open) {
        await localAction('projects/open', { id: snapshot.id, ide });
        setNotice(`Opened ${snapshot.path} in ${ides.find((item) => item.id === ide)?.label}.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDesktopBusy(false);
    }
  }

  const allProjectComments = project?.comments || [];
  const scopedComments =
    commentScopeView === 'file'
      ? allProjectComments.filter((item) => item.path === file?.path)
      : allProjectComments;

  const filteredComments = scopedComments.filter((item) => {
    if (commentFilter === 'open') return !item.resolved;
    if (commentFilter === 'resolved') return item.resolved;
    return true;
  });

  const openCount = scopedComments.filter((c) => !c.resolved).length;
  const resolvedCount = scopedComments.filter((c) => c.resolved).length;
  const unresolvedTotal = allProjectComments.filter((item) => !item.resolved).length;

  const proposedFile = pending?.files.find((item) => item.path === reviewPath);
  const previousFile = project?.files.find((item) => item.path === reviewPath);

  if (!ready || !project) {
    return (
      <Box sx={{ p: 5 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <input ref={folderInputRef} type="file" webkitdirectory="" multiple hidden onChange={handleFolderInput} />
      <input ref={attachmentInputRef} type="file" multiple hidden onChange={handleAttachmentInputChange} />
      <input ref={attachmentFolderRef} type="file" webkitdirectory="" multiple hidden onChange={handleAttachmentInputChange} />
      {/* Hidden file input for project import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {importReport.length > 0 && <Box component="details" sx={{ px: 2, py: 1, maxHeight: 160, overflow: 'auto', borderBottom: 1, borderColor: 'divider' }}>
        <summary>{importReport.length} files or folders skipped during import</summary>
        {importReport.map((item, index) => <Typography key={index} variant="caption" display="block">{item}</Typography>)}
      </Box>}
      {/* Top action toolbar (Hidden when editor is fullscreen) */}
      {!isEditorFullscreen && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', px: 2, py: 1.1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}
        >
          <Button size="small" startIcon={importBusy ? <CircularProgress size={14} /> : <FolderOpen size={15} />} disabled={locked} onClick={handleOpenFolder}>Open folder</Button>
          <Code2 size={19} color="var(--mui-palette-primary-main, #3b82f6)" />
          <TextField
            select
            size="small"
            value={activeId}
            disabled={locked}
            onChange={(event) => switchProject(event.target.value)}
            slotProps={{ select: { inputProps: { 'aria-label': 'Code project' } } }}
            sx={{ minWidth: 160, maxWidth: 240 }}
          >
            {projects.map((item) => (
              <MenuItem value={item.id} key={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>

          <Tooltip title="New project">
            <span>
              <IconButton aria-label="New code project" size="small" disabled={locked} onClick={() => askDialog('new')}>
                <Plus size={15} />
              </IconButton>
            </span>
          </Tooltip>
          <Button size="small" disabled={locked} onClick={() => askDialog('rename', project.name)} sx={{ fontSize: '0.75rem' }}>
            Rename
          </Button>

          {/* Import existing project button */}
          <Tooltip title="Import existing project archive (.zip or .json)">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Upload size={13} />}
              disabled={locked}
              onClick={() => importInputRef.current?.click()}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Import
            </Button>
          </Tooltip>

          {/* Quick Open File trigger (Cmd+P) */}
          <Tooltip title="Quick Open File (Cmd+P)">
            <span>
              <IconButton size="small" onClick={() => setQuickOpenOpen(true)} aria-label="Quick open file">
                <FolderSearch size={15} />
              </IconButton>
            </span>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          {/* Interactive Terminal Toggle */}
          <Button
            size="small"
            variant={consoleOpen ? 'contained' : 'outlined'}
            startIcon={<Terminal size={13} />}
            onClick={() => setConsoleOpen(!consoleOpen)}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            Terminal
          </Button>

          <Tooltip title="Restore files from before the last AI change">
            <span>
              <IconButton
                aria-label="Undo last AI change"
                disabled={!project.previous || locked}
                onClick={() => askDialog('undo')}
                size="small"
              >
                <Undo2 size={15} />
              </IconButton>
            </span>
          </Tooltip>

          <Button size="small" startIcon={<Download size={13} />} disabled={!project.files.length} onClick={exportZip} sx={{ fontSize: '0.75rem' }}>
            ZIP
          </Button>
          <Button
            size="small"
            startIcon={<Save size={13} />}
            disabled={!project.files.length || locked}
            onClick={() => saveToDisk()}
            sx={{ fontSize: '0.75rem' }}
          >
            Save to disk
          </Button>
          {ides.length > 0 && (
            <TextField
              select
              size="small"
              value={ide}
              onChange={(event) => setIde(event.target.value)}
              slotProps={{ select: { inputProps: { 'aria-label': 'Desktop IDE' } } }}
              sx={{ minWidth: 110 }}
            >
              {ides.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={desktopBusy ? <CircularProgress size={13} /> : <ExternalLink size={13} />}
            disabled={!project.files.length || locked || !ide}
            onClick={() => saveToDisk(true)}
            sx={{ fontSize: '0.75rem' }}
          >
            Open in IDE
          </Button>
        </Stack>
      )}

      {storageError && <Alert severity="warning">{storageError}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="info" onClose={() => setNotice('')} sx={{ '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>{notice}</Alert>}

      {/* Main Workspace Workspace Flex Panels */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Left Explorer Sidebar (Draggable width) */}
        {!isEditorFullscreen && (
          <Box
            sx={{
              width: explorerWidth,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'hidden',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: isDraggingExplorer ? 'none' : 'width 0.15s ease',
            }}
          >
            {/* Top Activity Mode Switcher: Explorer vs Source Control */}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center',
                p: 0.75,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <ButtonBase
                onClick={() => setSidebarTab(SIDEBAR_TABS.EXPLORER)}
                sx={{
                  flex: 1,
                  py: 0.6,
                  px: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.74rem',
                  fontWeight: sidebarTab === SIDEBAR_TABS.EXPLORER ? 700 : 500,
                  bgcolor: sidebarTab === SIDEBAR_TABS.EXPLORER ? 'background.paper' : 'transparent',
                  color: sidebarTab === SIDEBAR_TABS.EXPLORER ? 'text.primary' : 'text.secondary',
                  boxShadow: sidebarTab === SIDEBAR_TABS.EXPLORER ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.6,
                  transition: 'all 0.12s',
                }}
              >
                <FolderTree size={13} />
                Explorer
              </ButtonBase>

              <ButtonBase
                onClick={() => setSidebarTab(SIDEBAR_TABS.SOURCE_CONTROL)}
                sx={{
                  flex: 1,
                  py: 0.6,
                  px: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.74rem',
                  fontWeight: sidebarTab === SIDEBAR_TABS.SOURCE_CONTROL ? 700 : 500,
                  bgcolor: sidebarTab === SIDEBAR_TABS.SOURCE_CONTROL ? 'background.paper' : 'transparent',
                  color: sidebarTab === SIDEBAR_TABS.SOURCE_CONTROL ? 'primary.main' : 'text.secondary',
                  boxShadow: sidebarTab === SIDEBAR_TABS.SOURCE_CONTROL ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.6,
                  transition: 'all 0.12s',
                }}
              >
                <GitBranch size={13} />
                Git
                {gitStatus.stats.total > 0 && (
                  <Box
                    sx={{
                      px: '5px',
                      py: '1px',
                      borderRadius: '10px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      lineHeight: 1.2,
                    }}
                  >
                    {gitStatus.stats.total}
                  </Box>
                )}
              </ButtonBase>
            </Stack>

            {/* Sidebar View Body */}
            {sidebarTab === SIDEBAR_TABS.EXPLORER ? (
              <>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1.25, pb: 0.75 }}>
                  <Typography sx={caption}>Files · {project?.files?.length || 0}</Typography>
                  <IconButton size="small" aria-label="Add file" disabled={locked} onClick={() => askDialog('file')}>
                    <Plus size={14} />
                  </IconButton>
                </Stack>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {project?.files?.length ? (
                    <FileTree
                      files={project.files}
                      activePath={file?.path}
                      onSelect={(p) => {
                        setActiveDiffPath(null);
                        selectFile(p);
                      }}
                      gitStatusMap={gitStatus.statusByPath}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2, py: 1 }}>
                      Your project files will appear here.
                    </Typography>
                  )}
                </Box>

                <Divider />
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography sx={caption}>Status</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {saved ? 'Saved locally' : 'Saving…'} · {unresolvedTotal} open comment{unresolvedTotal !== 1 ? 's' : ''}
                    {gitStatus.stats.total > 0 && ` · ${gitStatus.stats.total} file change${gitStatus.stats.total !== 1 ? 's' : ''}`}
                  </Typography>
                </Box>
              </>
            ) : (
              <GitSourceControlSidebar
                key={activeId}
                disabled={locked}
                gitState={gitStatus}
                activePath={activeDiffPath || file?.path}
                onSelectFile={(p) => {
                  setPath(p);
                  setActiveDiffPath(p);
                }}
                onOpenDiff={handleOpenDiff}
                onToggleStage={handleToggleStage}
                onStageAll={handleStageAll}
                onUnstageAll={handleUnstageAll}
                onDiscardFile={handleDiscardFile}
                onDiscardAll={handleDiscardAll}
                onCommit={handleCommit}
                onRefresh={() => {
                  showToast('Git status refreshed', 'info');
                }}
              />
            )}

            {/* Drag Resize Handle for Explorer */}
            <Box
              onMouseDown={handleExplorerDragStart}
              title="Drag to resize sidebar"
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 5,
                height: '100%',
                cursor: 'col-resize',
                zIndex: 20,
                transition: 'background-color 0.15s',
                '&:hover, &:active': {
                  bgcolor: 'primary.main',
                },
              }}
            />
          </Box>
        )}

        {/* Center Code Editor Area (or Fullscreen Overlay) */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...(isEditorFullscreen
              ? {
                position: 'fixed',
                inset: 0,
                zIndex: 1400,
                width: '100vw',
                height: '100vh',
                bgcolor: activeThemeObj.bg,
              }
              : {}),
          }}
        >
          {activeDiffPath ? (
            <GitDiffViewer
              filePath={activeDiffPath}
              oldContent={(project?.baseFiles || []).find((f) => f.path === activeDiffPath)?.content || ''}
              newContent={project?.files?.find((f) => f.path === activeDiffPath)?.content || ''}
              status={gitStatus.statusByPath[activeDiffPath]?.status}
              onClose={() => setActiveDiffPath(null)}
              onOpenInEditor={() => {
                selectFile(activeDiffPath);
              }}
              onDiscard={() => handleDiscardFile(activeDiffPath)}
            />
          ) : file ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Multi-Tab File Bar */}
              <CodeTabBar
                openPaths={openPaths}
                activePath={file.path}
                onSelect={selectFile}
                onClose={closeTab}
                onNewFile={() => askDialog('file')}
                accentColor={activeThemeObj.accent}
              />

              {/* Window Frame Header */}
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between',
                  px: 2,
                  py: 0.75,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  minHeight: 44,
                }}
              >
                {/* Left: Window Controls + File Path Pill */}
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                  {editorSettings.windowControls === 'mac' && (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', pl: 0.5, flexShrink: 0 }}>
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#ff5f56', border: '1px solid rgba(0,0,0,0.1)' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#ffbd2e', border: '1px solid rgba(0,0,0,0.1)' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#27c93f', border: '1px solid rgba(0,0,0,0.1)' }} />
                    </Stack>
                  )}
                  {editorSettings.windowControls === 'monochrome' && (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', pl: 0.5, flexShrink: 0 }}>
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.5 }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.5 }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.5 }} />
                    </Stack>
                  )}

                  {/* File Pill */}
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.35,
                      borderRadius: 1.5,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      minWidth: 0,
                      maxWidth: { xs: 140, sm: 220, md: 320 },
                    }}
                  >
                    <FileCode size={14} color="var(--mui-palette-primary-main, #3b82f6)" style={{ flexShrink: 0 }} />
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {file.path}
                    </Typography>
                  </Box>
                </Stack>

                {/* Right: Actions Bar */}
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  {/* Run Code Button */}
                  <Tooltip title="Run current file locally">
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={consoleBusy ? <CircularProgress size={12} color="inherit" /> : <Play size={12} />}
                      onClick={handleRunCode}
                      disabled={locked}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        py: 0.25,
                        px: 1,
                        mr: 0.5,
                        bgcolor: '#10b981',
                        '&:hover': { bgcolor: '#059669' },
                      }}
                    >
                      Run
                    </Button>
                  </Tooltip>

                  {/* Find & Replace Trigger */}
                  <Tooltip title="Find & Replace (Cmd/Ctrl + F)">
                    <IconButton
                      size="small"
                      onClick={() => editorRef.current?.openSearch()}
                      aria-label="Find & Replace"
                      sx={{ color: 'text.secondary' }}
                    >
                      <Search size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Universal Format Code */}
                  <Tooltip title="Format Code Cleanly">
                    <IconButton
                      size="small"
                      disabled={locked}
                      onClick={handleFormatCode}
                      aria-label="Format code"
                      sx={{ color: 'text.secondary' }}
                    >
                      <Wand2 size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Carbon Snippet Export */}
                  <Tooltip title="Export Snippet (Carbon Studio)">
                    <IconButton
                      size="small"
                      onClick={() => setExportModalOpen(true)}
                      aria-label="Export code as image"
                      sx={{ color: 'text.secondary' }}
                    >
                      <Camera size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Universal Code Outline */}
                  <Tooltip title="Symbol Outline">
                    <IconButton
                      size="small"
                      onClick={() => setOutlineOpen(true)}
                      aria-label="Code symbol outline"
                      sx={{ color: 'text.secondary' }}
                    >
                      <ListTree size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Copy Code */}
                  <Tooltip title={copiedCode ? 'Copied to clipboard!' : 'Copy file contents'}>
                    <IconButton
                      size="small"
                      onClick={handleCopyFile}
                      aria-label="Copy file contents"
                      sx={{ color: copiedCode ? 'success.main' : 'text.secondary' }}
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    </IconButton>
                  </Tooltip>

                  {/* Download single file */}
                  <Tooltip title="Download this file">
                    <IconButton
                      size="small"
                      onClick={handleDownloadCurrentFile}
                      aria-label="Download file"
                      sx={{ color: 'text.secondary' }}
                    >
                      <Download size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Line Wrapping Quick Toggle */}
                  <Tooltip title={editorSettings.lineWrapping ? 'Disable line wrapping' : 'Enable line wrapping'}>
                    <IconButton
                      size="small"
                      color={editorSettings.lineWrapping ? 'primary' : 'default'}
                      onClick={() => handleSettingsChange({ lineWrapping: !editorSettings.lineWrapping })}
                      aria-label="Toggle line wrapping"
                    >
                      <WrapText size={14} />
                    </IconButton>
                  </Tooltip>

                  {/* Editor Customizer Trigger */}
                  <Tooltip title="Editor styling & themes">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Sliders size={13} />}
                      endIcon={
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: activeThemeObj.accent,
                            border: '1px solid rgba(255,255,255,0.3)',
                          }}
                        />
                      }
                      onClick={(e) => setCustomizerAnchorEl(e.currentTarget)}
                      aria-label="Customize editor appearance"
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        py: 0.25,
                        px: 0.9,
                      }}
                    >
                      {activeThemeObj.name}
                    </Button>
                  </Tooltip>

                  {/* Fullscreen Toggle Button */}
                  <Tooltip title={isEditorFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}>
                    <IconButton
                      size="small"
                      color={isEditorFullscreen ? 'primary' : 'default'}
                      onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
                      aria-label={isEditorFullscreen ? 'Exit full screen' : 'Full screen'}
                      sx={{ color: isEditorFullscreen ? 'primary.main' : 'text.secondary' }}
                    >
                      {isEditorFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </IconButton>
                  </Tooltip>

                  {/* Comments count shortcut */}
                  <Tooltip title={`Comments (${project.comments.filter((c) => c.path === file.path).length})`}>
                    <Button
                      size="small"
                      startIcon={<MessageSquare size={13} />}
                      onClick={() => {
                        setCommentScopeView('file');
                        setRightTab('comments');
                        setRightSidebarCollapsed(false);
                      }}
                      sx={{ minWidth: 38, px: 0.75, textTransform: 'none', fontSize: '0.72rem' }}
                    >
                      {project.comments.filter((c) => c.path === file.path).length}
                    </Button>
                  </Tooltip>

                  {/* Delete current file */}
                  <Tooltip title="Delete current file">
                    <IconButton
                      size="small"
                      aria-label="Delete current file"
                      disabled={locked}
                      onClick={() => askDialog('delete-file')}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* CodeMirror Surface */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  bgcolor: activeThemeObj.bg,
                  position: 'relative',
                }}
              >
                <CodeEditor
                  ref={editorRef}
                  key={`${project.id}:${file.path}`}
                  file={file}
                  readOnly={locked}
                  settings={editorSettings}
                  onSelection={setSelection}
                  onCursorChange={setCursorPos}
                  onChange={(content) =>
                    updateProject((current) => ({
                      files: current.files.map((item) =>
                        item.path === file.path ? { ...item, content } : item
                      ),
                    }))
                  }
                />

                {/* Floating AI Action Bar on Code Selection */}
                {selectedSnippet && !floatingAiDismissed && selection.to > selection.from && (
                  <FloatingAiActionBar
                    selection={selection}
                    selectedSnippet={selectedSnippet}
                    filePath={file.path}
                    onAiAction={handleAiAction}
                    onDismiss={() => setFloatingAiDismissed(true)}
                  />
                )}
              </Box>

              {/* Code Console / Interactive Terminal Drawer */}
              <Suspense fallback={null}>
                {consoleOpen && (
                  <CodeConsoleDrawer
                    open={consoleOpen}
                    onClose={() => setConsoleOpen(false)}
                    onClear={() => {
                      setConsoleLogs([]);
                      setTerminalHistory([]);
                    }}
                    onRerun={handleRunCode}
                    logs={consoleLogs}
                    executionInfo={executionInfo}
                    busy={consoleBusy}
                    fileName={file.path.split('/').pop()}
                    terminalHistory={terminalHistory}
                    onExecuteCommand={handleExecuteTerminalCommand}
                    terminalBusy={terminalBusy}
                  />
                )}
              </Suspense>

              {/* Status Bar Footer */}
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center',
                  px: 2,
                  py: 0.6,
                  borderTop: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  fontSize: '0.75rem',
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    Ln {cursorPos.line}, Col {cursorPos.col}
                  </Typography>
                  {selection.to > selection.from && (
                    <Typography variant="caption" color="primary.main" sx={{ fontFamily: 'monospace' }}>
                      ({selection.to - selection.from + 1} lines selected)
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    · {file.content.split('\n').length} lines
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    · {(new Blob([file.content]).size / 1024).toFixed(1)} KB
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Button
                    size="small"
                    color={terminalHistory.length > 0 || consoleLogs.length > 0 ? 'primary' : 'inherit'}
                    startIcon={<Terminal size={12} />}
                    onClick={() => setConsoleOpen(!consoleOpen)}
                    sx={{ py: 0.1, px: 0.8, fontSize: '0.7rem', textTransform: 'none' }}
                  >
                    Terminal / Console {terminalHistory.length > 0 ? `(${terminalHistory.length})` : ''}
                  </Button>

                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {editorSettings.fontFamily} ({editorSettings.fontSize}px)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {editorSettings.tabSize} spaces
                  </Typography>
                  <Chip
                    size="small"
                    label={activeThemeObj.name}
                    onClick={(e) => setCustomizerAnchorEl(e.currentTarget)}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.85 },
                    }}
                    icon={
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          bgcolor: activeThemeObj.accent,
                          ml: 0.5,
                        }}
                      />
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {locked ? 'Reviewing' : 'Editable'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ) : (
            /* Clean Empty Workspace State */
            <Stack spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'center', flex: 1, p: 4, textAlign: 'center' }}>
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 3, color: 'primary.main', bgcolor: 'action.hover' }}>
                <Code2 size={40} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                Code Workspace
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 420, fontSize: '0.88rem', lineHeight: 1.6 }}>
                Select a file in Explorer, open a project folder, or import a ZIP / JSON archive.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="contained" disabled={locked} startIcon={<Plus size={15} />} onClick={() => askDialog('file')}>
                  New File
                </Button>
                <Button
                  variant="outlined"
                  disabled={locked}
                  startIcon={<Upload size={15} />}
                  onClick={() => importInputRef.current?.click()}
                >
                  Import Project
                </Button>
                <Button
                  variant="text"
                  disabled={locked}
                  onClick={() => {
                    updateProject({ files: starterFiles, name: 'Python Starter' });
                    selectFile('src/main.py');
                  }}
                >
                  Starter Template
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>

        {/* Right Sidebar: Ultra-Premium Draggable & Minimizable Panel */}
        {!isEditorFullscreen && (
          <Box
            sx={{
              width: rightSidebarCollapsed ? 48 : rightSidebarWidth,
              flexShrink: 0,
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: isDraggingRight ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Left border drag handle for right sidebar */}
            {!rightSidebarCollapsed && (
              <Box
                onMouseDown={handleRightDragStart}
                title="Drag to resize panel"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 5,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 20,
                  transition: 'background-color 0.15s',
                  '&:hover, &:active': {
                    bgcolor: 'primary.main',
                  },
                }}
              />
            )}

            {/* Collapsed Rail View */}
            {rightSidebarCollapsed ? (
              <Stack spacing={2} sx={{ alignItems: 'center', pt: 1.5, height: '100%' }}>
                <Tooltip title="Expand Right Panel" placement="left">
                  <IconButton size="small" onClick={toggleRightSidebar} sx={{ color: 'text.secondary' }}>
                    <ChevronLeft size={16} />
                  </IconButton>
                </Tooltip>

                <Divider sx={{ width: '80%' }} />

                <Tooltip title="AI Assistant" placement="left">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRightTab('build');
                      setRightSidebarCollapsed(false);
                    }}
                    sx={{ color: rightTab === 'build' ? 'primary.main' : 'text.secondary' }}
                  >
                    <Sparkles size={16} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Comments (${allProjectComments.length})`} placement="left">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRightTab('comments');
                      setRightSidebarCollapsed(false);
                    }}
                    sx={{ color: rightTab === 'comments' ? 'primary.main' : 'text.secondary', position: 'relative' }}
                  >
                    <MessageSquare size={16} />
                    {unresolvedTotal > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                        }}
                      />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : (
              /* Expanded Premium Panel */
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                {/* Premium Segmented Navigation Tabs */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'background.paper', p: 0.4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Button
                      size="small"
                      startIcon={<Sparkles size={13} />}
                      onClick={() => setRightTab('build')}
                      sx={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 0.35,
                        px: 1.25,
                        borderRadius: 1.5,
                        bgcolor: rightTab === 'build' ? 'action.selected' : 'transparent',
                        color: rightTab === 'build' ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      AI Assistant
                    </Button>
                    <Button
                      size="small"
                      startIcon={<MessageSquare size={13} />}
                      onClick={() => setRightTab('comments')}
                      sx={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 0.35,
                        px: 1.25,
                        borderRadius: 1.5,
                        bgcolor: rightTab === 'comments' ? 'action.selected' : 'transparent',
                        color: rightTab === 'comments' ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      Comments ({allProjectComments.length})
                    </Button>
                  </Stack>

                  <Tooltip title="Collapse panel">
                    <IconButton size="small" onClick={toggleRightSidebar} sx={{ color: 'text.secondary' }}>
                      <ChevronRight size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Tab Contents Container */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {rightTab === 'build' ? (
                    <Stack spacing={2.25}>
                      {/* Premium Header Banner */}
                      {/* <Box
                        sx={{
                          p: 1.75,
                          borderRadius: 2.5,
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                          border: '1px solid',
                          borderColor: 'rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                          <Cpu size={15} color="var(--mui-palette-primary-main, #3b82f6)" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            Code Synthesizer
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                          Extend code, generate new files, write tests, or refactor with side-by-side review.
                        </Typography>
                      </Box> */}

                      {/* Provider-wise Model Selector */}
                      <ModelSelector
                        value={actualModel}
                        onChange={(newModel) => setModel(newModel)}
                        variant="stacked"
                        disabled={locked}
                        onOpenSettings={onModels}
                      />

                      {/* Stack selector with chips */}
                      <Box>
                        <Typography sx={{ ...caption, mb: 0.75 }}>Stack / Language</Typography>
                        <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
                          {STACK_PRESETS.map((tech) => (
                            <Chip
                              key={tech}
                              size="small"
                              label={tech}
                              disabled={locked}
                              onClick={() => setLanguage(tech)}
                              color={language === tech ? 'primary' : 'default'}
                              variant={language === tech ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer' }}
                            />
                          ))}
                        </Stack>
                        <TextField
                          size="small"
                          fullWidth
                          value={language}
                          disabled={locked}
                          onChange={(event) => setLanguage(event.target.value)}
                          placeholder="Or custom stack, e.g. Python, React..."
                        />
                      </Box>

                      {/* Prompt input with quick inspiration chips */}
                      <Box>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography sx={caption}>
                            {project.files.length ? 'Modification Prompt' : 'New Project Prompt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                            ⌘ + Enter to run
                          </Typography>
                        </Stack>

                        <Box onDragOver={(event) => event.preventDefault()} onDrop={handlePromptDrop}>
                        <TextField
                          slotProps={{ htmlInput: { 'aria-label': 'Coding assistant prompt' } }}
                          placeholder="Describe desired modifications, features, bug fixes, or new endpoints in detail..."
                          multiline
                          minRows={5}
                          value={prompt}
                          disabled={locked}
                          onChange={(event) => setPrompt(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                              event.preventDefault();
                              generate();
                            }
                          }}
                          sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.85rem',
                              lineHeight: 1.5,
                            },
                          }}
                        />

                        </Box>
                        <Box sx={{ mt: 1.5, p: 1.25, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }} onDragOver={(event) => event.preventDefault()} onDrop={handlePromptDrop}>
                          <Typography sx={caption}>Attachments · {attachments.length}/20</Typography>
                          <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                            <Button size="small" startIcon={<Paperclip size={14} />} disabled={locked} onClick={() => attachmentInputRef.current?.click()}>Attach files</Button>
                            <Button size="small" startIcon={<FolderOpen size={14} />} disabled={locked} onClick={() => attachmentFolderRef.current?.click()}>Attach folder</Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">Drop source or text files here (512 KB each). Sent as reference to the selected model.</Typography>
                          {attachments.map((item) => <Stack key={item.id} direction="row" sx={{ alignItems: 'center', mt: 1, minWidth: 0 }}>
                            <Tooltip title={item.path}><Typography variant="caption" noWrap sx={{ flex: 1 }}>{item.path} · {(item.size / 1024).toFixed(1)} KB</Typography></Tooltip>
                            <IconButton size="small" aria-label={`Remove attachment ${item.path}`} disabled={locked} onClick={() => setAttachments((previous) => previous.filter((file) => file.id !== item.id))}><X size={13} /></IconButton>
                          </Stack>)}
                          {attachments.length > 0 && <Button size="small" disabled={locked} onClick={() => setAttachments([])}>Clear attachments</Button>}
                        </Box>
                        <TextField select fullWidth size="small" label="Project context" value={contextMode} disabled={locked} onChange={(event) => setContextMode(event.target.value)} sx={{ mt: 2 }}>
                          <MenuItem value="project">All {project.files.length} files</MenuItem><MenuItem value="open">Open tabs only ({openPaths.length} files)</MenuItem>
                        </TextField>
                        <Typography variant="caption" color="text.secondary">For large projects, open the files you want to change and select open tabs only.</Typography>
                        {/* Quick prompt inspiration pills */}
                        <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                          {[
                            { label: '+ Add Unit Tests', text: 'Generate comprehensive unit tests with edge cases.' },
                            { label: '+ Refactor Code', text: 'Refactor code into clean, modular, and maintainable functions.' },
                            { label: '+ Fix Bugs', text: 'Analyze and fix any potential bugs, race conditions, or null pointers.' },
                            { label: '+ Add Type Hints', text: 'Add strict type definitions and docstrings throughout.' },
                          ].map((pill) => (
                            <Chip
                              key={pill.label}
                              size="small"
                              label={pill.label}
                              disabled={locked}
                              onClick={() => setPrompt((prev) => (prev ? `${prev}\n${pill.text}` : pill.text))}
                              sx={{
                                fontSize: '0.68rem',
                                height: 20,
                                cursor: 'pointer',
                                bgcolor: 'action.hover',
                                '&:hover': { bgcolor: 'action.selected' },
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>

                      {unresolvedTotal > 0 && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="info"
                          label={`${unresolvedTotal} unresolved comment(s) included in context`}
                        />
                      )}

                      {/* Primary Generate Button */}
                      {busy ? (
                        <Stack spacing={1}>
                          <LinearProgress />
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Synthesizing changes… {(progress / 1024).toFixed(1)} KB received
                          </Typography>
                          <Button color="error" size="small" variant="outlined" onClick={() => controller.current?.abort()}>
                            Stop generation
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          variant="contained"
                          startIcon={<Sparkles size={16} />}
                          disabled={!prompt.trim() || !actualModel || locked}
                          onClick={generate}
                          sx={{
                            py: 1,
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                          }}
                        >
                          Generate changes
                        </Button>
                      )}

                      {/* Last Change Summary */}
                      {project.summary && (
                        <Box sx={{ p: 1.75, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={caption}>Last Change</Typography>
                            {project.previous && (
                              <Button size="small" startIcon={<Undo2 size={12} />} disabled={locked} onClick={() => askDialog('undo')} sx={{ py: 0.1, px: 0.6, fontSize: '0.68rem', textTransform: 'none' }}>
                                Restore
                              </Button>
                            )}
                          </Stack>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'text.secondary' }}>
                            {project.summary}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  ) : (
                    /* Ultra-Premium Comments Panel */
                    <Stack spacing={2}>
                      {/* Scope Switch: Current file vs Project-wide */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant={commentScopeView === 'file' ? 'contained' : 'outlined'}
                          onClick={() => setCommentScopeView('file')}
                          sx={{ flex: 1, fontSize: '0.72rem', py: 0.35, textTransform: 'none' }}
                        >
                          Current file ({allProjectComments.filter((c) => c.path === file?.path).length})
                        </Button>
                        <Button
                          size="small"
                          variant={commentScopeView === 'project' ? 'contained' : 'outlined'}
                          onClick={() => setCommentScopeView('project')}
                          sx={{ flex: 1, fontSize: '0.72rem', py: 0.35, textTransform: 'none' }}
                        >
                          All project ({allProjectComments.length})
                        </Button>
                      </Box>

                      {/* Filter chips: All / Open / Resolved */}
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={`All (${scopedComments.length})`}
                          color={commentFilter === 'all' ? 'primary' : 'default'}
                          variant={commentFilter === 'all' ? 'filled' : 'outlined'}
                          onClick={() => setCommentFilter('all')}
                          sx={{ fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                        />
                        <Chip
                          size="small"
                          label={`Open (${openCount})`}
                          color={commentFilter === 'open' ? 'warning' : 'default'}
                          variant={commentFilter === 'open' ? 'filled' : 'outlined'}
                          onClick={() => setCommentFilter('open')}
                          sx={{ fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                        />
                        <Chip
                          size="small"
                          label={`Resolved (${resolvedCount})`}
                          color={commentFilter === 'resolved' ? 'success' : 'default'}
                          variant={commentFilter === 'resolved' ? 'filled' : 'outlined'}
                          onClick={() => setCommentFilter('resolved')}
                          sx={{ fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                        />
                      </Stack>

                      <Divider />

                      {/* Add Comment Card */}
                      <Box
                        sx={{
                          p: 1.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2.5,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Typography sx={{ ...caption, mb: 1 }}>Add Comment</Typography>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Target"
                          value={scope}
                          onChange={(event) => setScope(event.target.value)}
                          sx={{ mb: 1 }}
                        >
                          <MenuItem value="line">
                            Line {selection.from}{selection.to !== selection.from ? `–${selection.to}` : ''}
                            {selection.to > selection.from ? ` (${selection.to - selection.from + 1} lines)` : ''}
                          </MenuItem>
                          <MenuItem value="file">Entire file ({file?.path})</MenuItem>
                        </TextField>
                        <TextField
                          fullWidth
                          label="Comment or review note"
                          placeholder="Leave a comment or instruction for the AI..."
                          multiline
                          minRows={2}
                          value={comment}
                          disabled={!file || locked}
                          onChange={(event) => setComment(event.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              e.preventDefault();
                              addComment();
                            }
                          }}
                          sx={{ mb: 1 }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          fullWidth
                          disabled={!file || !comment.trim() || locked}
                          onClick={addComment}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Post Comment
                        </Button>
                      </Box>

                      {/* Filtered Comments List */}
                      {filteredComments.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <MessageSquare size={26} style={{ opacity: 0.25, marginBottom: 8 }} />
                          <Typography variant="body2" color="text.secondary">
                            {scopedComments.length === 0 ? 'No comments on this view yet.' : 'No matching comments.'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Select lines in the editor or write a note above.
                          </Typography>
                        </Box>
                      ) : (
                        filteredComments.map((item) => {
                          const commentFile = project.files.find((f) => f.path === item.path);
                          const stale =
                            item.from &&
                            commentFile &&
                            commentFile.content.split('\n').slice(item.from - 1, item.to).join('\n') !== item.excerpt;

                          return (
                            <Box
                              key={item.id}
                              sx={{
                                p: 1.75,
                                border: '1px solid',
                                borderColor: item.resolved ? 'divider' : 'primary.light',
                                borderRadius: 2.5,
                                bgcolor: 'background.paper',
                                opacity: item.resolved ? 0.72 : 1,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                },
                              }}
                            >
                              {/* Header: Line/file chip + status + delete icon */}
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                                  <Chip
                                    size="small"
                                    label={item.from ? `Ln ${item.from}${item.to !== item.from ? `–${item.to}` : ''}` : 'File'}
                                    onClick={() => handleJumpToComment(item)}
                                    title="Click to jump to line in editor"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.68rem',
                                      fontFamily: 'monospace',
                                      cursor: 'pointer',
                                      bgcolor: 'action.hover',
                                      fontWeight: 600,
                                      '&:hover': { bgcolor: 'action.selected' },
                                    }}
                                  />
                                  {commentScopeView === 'project' && (
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary', maxWidth: 120 }} noWrap>
                                      {item.path.split('/').pop()}
                                    </Typography>
                                  )}
                                  <Chip
                                    size="small"
                                    label={item.resolved ? 'Resolved' : 'Open'}
                                    color={item.resolved ? 'default' : 'warning'}
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                </Stack>

                                {/* Delete Comment Option */}
                                <Tooltip title="Delete comment">
                                  <IconButton
                                    size="small"
                                    aria-label="Delete comment"
                                    onClick={() => deleteComment(item.id)}
                                    sx={{
                                      p: 0.5,
                                      color: 'text.secondary',
                                      '&:hover': { color: 'error.main' },
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>

                              {/* Stale warning if underlying code changed */}
                              {stale && (
                                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                                  Code has changed since this comment was recorded.
                                </Typography>
                              )}

                              {/* Excerpt box */}
                              {item.excerpt && (
                                <Box
                                  component="pre"
                                  onClick={() => handleJumpToComment(item)}
                                  title="Click to jump to code"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.72rem',
                                    maxHeight: 70,
                                    overflow: 'auto',
                                    bgcolor: 'action.hover',
                                    p: 0.75,
                                    borderRadius: 1,
                                    my: 0.5,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {item.excerpt}
                                </Box>
                              )}

                              {/* Comment text */}
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mt: 0.75, fontSize: '0.82rem' }}>
                                {item.text}
                              </Typography>

                              {/* Card footer: timestamp & resolve/reopen button */}
                              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() => toggleCommentResolved(item.id)}
                                  sx={{ fontSize: '0.72rem', py: 0.1, px: 0.75, textTransform: 'none' }}
                                >
                                  {item.resolved ? 'Reopen' : 'Mark Resolved'}
                                </Button>
                              </Stack>
                            </Box>
                          );
                        })
                      )}
                    </Stack>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Quick Open File Switcher Dialog (Cmd+P) */}
      <Dialog
        open={quickOpenOpen}
        onClose={() => {
          setQuickOpenOpen(false);
          setQuickOpenSearch('');
        }}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ pb: 1, fontSize: '0.95rem', fontWeight: 600 }}>Quick Open File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search file name (e.g. main.py)..."
            value={quickOpenSearch}
            onChange={(e) => setQuickOpenSearch(e.target.value)}
            sx={{ mb: 1.5, mt: 0.5 }}
          />
          <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
            {project.files
              .filter((f) => f.path.toLowerCase().includes(quickOpenSearch.toLowerCase()))
              .map((f) => (
                <Box
                  key={f.path}
                  onClick={() => {
                    selectFile(f.path);
                    setQuickOpenOpen(false);
                    setQuickOpenSearch('');
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <FileCode size={14} color="var(--mui-palette-primary-main, #3b82f6)" />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }} noWrap>
                    {f.path}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(new Blob([f.content]).size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setQuickOpenOpen(false)} size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Generated Proposal Dialog */}
      <Dialog open={!!pending} fullWidth maxWidth="lg" onClose={() => { }}>
        <DialogTitle>
          Review generated changes <Chip size="small" label={`${pending?.files.length || 0} files`} sx={{ ml: 1 }} />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {pending?.summary}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label="Changed file"
              value={reviewPath}
              onChange={(event) => setReviewPath(event.target.value)}
              sx={{ flex: 1 }}
            >
              {pending?.files.map((item) => (
                <MenuItem key={item.path} value={item.path}>
                  {project.files.some((old) => old.path === item.path) ? 'Modified' : 'New'} · {item.path}
                </MenuItem>
              ))}
            </TextField>
            <Tabs value={reviewSide} onChange={(_, value) => setReviewSide(value)}>
              <Tab value="before" label="Before" />
              <Tab value="after" label="Proposed" />
            </Tabs>
          </Stack>
          <Box sx={{ height: '45vh', overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: activeThemeObj.bg }}>
            {proposedFile && (
              <CodeEditor
                key={`${reviewPath}:${reviewSide}`}
                readOnly
                settings={editorSettings}
                file={reviewSide === 'before' ? previousFile || { path: reviewPath, content: '// New file — no previous contents' } : proposedFile}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Unlisted files are preserved. Review setup and run instructions before running generated code in your IDE.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Discard</Button>
          <Button variant="contained" onClick={applyProposal}>
            Apply changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Standard Workspace Dialogs (New, Rename, File, Delete, Undo) */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {{
            new: 'New code project',
            rename: 'Rename project',
            file: 'Add a file',
            'delete-file': 'Delete file?',
            undo: 'Restore previous files?',
          }[dialog]}
        </DialogTitle>
        <DialogContent>
          {dialog === 'delete-file' ? (
            <Typography>Delete {file?.path} and its comments from this workspace?</Typography>
          ) : dialog === 'undo' ? (
            <Typography>This restores files and comments from before the last AI change. Edits made since then will be replaced.</Typography>
          ) : (
            <TextField
              autoFocus
              fullWidth
              label={dialog === 'file' ? 'Relative path, e.g. src/main.py' : 'Project name'}
              value={dialogValue}
              onChange={(event) => setDialogValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitDialog();
              }}
              sx={{ mt: 1 }}
            />
          )}
          {dialogError && <Alert severity="error" sx={{ mt: 1 }}>{dialogError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitDialog}>
            {dialog === 'delete-file' ? 'Delete file' : dialog === 'undo' ? 'Restore' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditorCustomizerPopover
        anchorEl={customizerAnchorEl}
        open={Boolean(customizerAnchorEl)}
        onClose={() => setCustomizerAnchorEl(null)}
        settings={editorSettings}
        onChange={handleSettingsChange}
        onReset={handleResetSettings}
      />
      <Suspense fallback={null}>
        {exportModalOpen && (
          <CodeExportModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            file={file}
            selectedCode={selectedSnippet}
            settings={editorSettings}
            themeObj={activeThemeObj}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {outlineOpen && (
          <CodeOutlineDrawer
            open={outlineOpen}
            onClose={() => setOutlineOpen(false)}
            content={file?.content || ''}
            filePath={file?.path || ''}
            onSelectLine={handleSelectLineFromOutline}
          />
        )}
      </Suspense>
    </Box>
  );
}
