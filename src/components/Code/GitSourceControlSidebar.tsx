import { useState, useEffect, memo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  GitBranch,
  RotateCw,
  Plus,
  Minus,
  Undo2,
  GitCompare,
  FilePlus,
  FileX,
  FileEdit,
  Check,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  UploadCloud,
  LogOut,
  ExternalLink,
  FolderGit2,
  Share2,
} from 'lucide-react';
import { GIT_STATUS_TYPES } from '../../constants/gitConstants';

function GithubIcon({ size = 16, ...props }: { size?: number; [key: string]: any }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}
import {
  getLinkedGitHubAccount,
  saveLinkedGitHubAccount,
  unlinkGitHubAccount,
  verifyGitHubToken,
  getUserRepositories,
  pushFilesToGitHubRepo,
  createGitHubRepository,
  createGitHubGist,
  GitHubAccount,
  GitHubRepo,
} from '../../utils/githubService';

// Memoized Single Git Change Row
interface GitFileRowProps {
  change: any;
  active?: boolean;
  onSelect?: (path: string) => void;
  onOpenDiff?: (change: any) => void;
  onToggleStage?: (change: any) => void;
  onDiscard?: (change: any) => void;
}

const GitFileRow = memo(function GitFileRow({
  change,
  active,
  onSelect,
  onOpenDiff,
  onToggleStage,
  onDiscard,
}: GitFileRowProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const getFileIcon = (status: string) => {
    switch (status) {
      case GIT_STATUS_TYPES.UNTRACKED:
      case GIT_STATUS_TYPES.ADDED:
        return <FilePlus size={14} color="#3fb950" />;
      case GIT_STATUS_TYPES.DELETED:
        return <FileX size={14} color="#f85149" />;
      case GIT_STATUS_TYPES.MODIFIED:
      default:
        return <FileEdit size={14} color="#d29922" />;
    }
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect?.(change.path)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.65,
        borderRadius: 1,
        cursor: 'pointer',
        bgcolor: active
          ? alpha(theme.palette.primary.main, 0.12)
          : hovered
          ? 'action.hover'
          : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        {getFileIcon(change.status)}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: '0.8rem',
              fontWeight: active ? 600 : 500,
              color: change.status === GIT_STATUS_TYPES.DELETED ? 'text.secondary' : 'text.primary',
              textDecoration: change.status === GIT_STATUS_TYPES.DELETED ? 'line-through' : 'none',
            }}
          >
            {change.name}
          </Typography>
          {change.dir && (
            <Typography
              variant="caption"
              noWrap
              sx={{ display: 'block', fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1 }}
            >
              {change.dir}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Hover action buttons or Status badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {hovered ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View Git Diff">
              <IconButton size="small" onClick={() => onOpenDiff?.(change.path)} sx={{ p: '3px' }}>
                <GitCompare size={13} />
              </IconButton>
            </Tooltip>
            {onDiscard && (
              <Tooltip title="Discard Changes">
                <IconButton size="small" onClick={() => onDiscard(change.path)} sx={{ p: '3px' }}>
                  <Undo2 size={13} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={change.staged ? 'Unstage Changes' : 'Stage Changes'}>
              <IconButton size="small" onClick={() => onToggleStage?.(change.path)} sx={{ p: '3px' }}>
                {change.staged ? <Minus size={13} /> : <Plus size={13} />}
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 700,
              bgcolor: change.config.bg,
              color: change.config.color,
              border: `1px solid ${change.config.border}`,
            }}
            title={change.config.tooltip}
          >
            {change.config.code}
          </Box>
        )}
      </Box>
    </Box>
  );
});

interface GitSourceControlSidebarProps {
  gitState: any;
  activePath?: string | null;
  project?: any;
  onSelectFile?: (path: string) => void;
  onOpenDiff?: (change: any) => void;
  onToggleStage?: (change: any) => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardFile?: (change: any) => void;
  onDiscardAll?: () => void;
  onCommit?: (message: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
}

function GitSourceControlSidebarComponent({
  gitState,
  activePath,
  project,
  onSelectFile,
  onOpenDiff,
  onToggleStage,
  onStageAll,
  onUnstageAll,
  onDiscardFile,
  onDiscardAll,
  onCommit,
  onRefresh,
  disabled = false,
}: GitSourceControlSidebarProps) {
  const theme = useTheme();
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedOpen, setStagedOpen] = useState(true);
  const [changesOpen, setChangesOpen] = useState(true);

  // GitHub Account State
  const [githubAccount, setGithubAccount] = useState<GitHubAccount | null>(getLinkedGitHubAccount);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [verifyingPat, setVerifyingPat] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Remote Push / Repo Modal State
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isNewRepo, setIsNewRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState(project?.name?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'my-project');
  const [newRepoDesc, setNewRepoDesc] = useState('Local project created with LocalLLMMind');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [pushBranch, setPushBranch] = useState('main');
  const [pushSuccessUrl, setPushSuccessUrl] = useState('');
  const [pushError, setPushError] = useState('');

  const { stagedChanges = [], unstagedChanges = [], stats = { total: 0 } } = gitState || {};

  useEffect(() => {
    setGithubAccount(getLinkedGitHubAccount());
  }, []);

  const handleCommitSubmit = (e?: any) => {
    if (e) e.preventDefault();
    if (disabled || !stagedChanges.length || !commitMessage.trim()) return;
    onCommit?.(commitMessage.trim());
    setCommitMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommitSubmit();
    }
  };

  // GitHub Account Actions
  const handleVerifyAndLink = async () => {
    if (!patInput.trim()) {
      setLinkError('Please enter a GitHub Personal Access Token');
      return;
    }
    setVerifyingPat(true);
    setLinkError('');
    try {
      const account = await verifyGitHubToken(patInput);
      saveLinkedGitHubAccount(account);
      setGithubAccount(account);
      setLinkDialogOpen(false);
      setPatInput('');
    } catch (err: any) {
      setLinkError(err.message || 'Verification failed');
    } finally {
      setVerifyingPat(false);
    }
  };

  const handleUnlink = () => {
    unlinkGitHubAccount();
    setGithubAccount(null);
  };

  const handleOpenPushDialog = async () => {
    if (!githubAccount) {
      setLinkDialogOpen(true);
      return;
    }
    setPushDialogOpen(true);
    setPushError('');
    setPushSuccessUrl('');
    setLoadingRepos(true);
    try {
      const repos = await getUserRepositories(githubAccount.token);
      setUserRepos(repos);
      if (repos.length > 0) {
        setSelectedRepo(repos[0].full_name);
        setPushBranch(repos[0].default_branch || 'main');
      } else {
        setIsNewRepo(true);
        setPushBranch('main');
      }
    } catch (err: any) {
      setIsNewRepo(true);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleExecutePush = async () => {
    if (!githubAccount) return;
    setPushBusy(true);
    setPushError('');
    try {
      let targetRepoName = selectedRepo;
      if (isNewRepo) {
        if (!newRepoName.trim()) throw new Error('Repository name is required');
        const created = await createGitHubRepository(githubAccount.token, {
          name: newRepoName.trim(),
          description: newRepoDesc,
          isPrivate: newRepoPrivate,
        });
        targetRepoName = created.full_name;
      }

      const filesToPush = project?.files || [];
      if (!filesToPush.length) {
        throw new Error('Project contains no files to push.');
      }

      const message = commitMessage.trim() || `Update project files via LocalLLMMind`;
      const result = await pushFilesToGitHubRepo(
        githubAccount.token,
        targetRepoName,
        pushBranch,
        message,
        filesToPush
      );
      setPushSuccessUrl(result.htmlUrl);
    } catch (err: any) {
      setPushError(err.message || 'Push failed');
    } finally {
      setPushBusy(false);
    }
  };

  const handleCreateGist = async () => {
    if (!githubAccount) {
      setLinkDialogOpen(true);
      return;
    }
    try {
      const filesToPush = project?.files || [];
      const gistUrl = await createGitHubGist(githubAccount.token, {
        description: `Export of ${project?.name || 'Project'} from LocalLLMMind`,
        isPublic: false,
        files: filesToPush,
      });
      window.open(gistUrl, '_blank');
    } catch (err: any) {
      alert(`Gist creation failed: ${err.message}`);
    }
  };

  return (
    <Box inert={disabled || undefined} sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', opacity: disabled ? 0.6 : 1 }}>
      {/* GitHub Account Link Banner */}
      <Box sx={{ p: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
        {githubAccount ? (
          <Stack spacing={0.75}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Avatar src={githubAccount.avatarUrl} sx={{ width: 22, height: 22 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.1 }} noWrap>
                    @{githubAccount.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    GitHub Linked
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.25}>
                <Tooltip title="Push Project to GitHub">
                  <IconButton size="small" onClick={handleOpenPushDialog} sx={{ color: 'primary.main', p: '3px' }}>
                    <UploadCloud size={14} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export as GitHub Gist">
                  <IconButton size="small" onClick={handleCreateGist} sx={{ p: '3px' }}>
                    <Share2 size={13} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Unlink GitHub Account">
                  <IconButton size="small" onClick={handleUnlink} sx={{ p: '3px', color: 'text.secondary' }}>
                    <LogOut size={13} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <GithubIcon size={14} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Link GitHub Account</Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setLinkDialogOpen(true)}
              sx={{ fontSize: '0.68rem', py: 0.2, px: 1, textTransform: 'none', borderRadius: 1.5 }}
            >
              Connect
            </Button>
          </Stack>
        )}
      </Box>

      {/* Top Header */}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1, pb: 0.75, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <GitBranch size={15} color="var(--mui-palette-primary-main, #3b82f6)" />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Workspace history
          </Typography>
          {stats.total > 0 && (
            <Chip
              label={stats.total}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Refresh Git Status">
            <IconButton size="small" onClick={onRefresh}>
              <RotateCw size={13} />
            </IconButton>
          </Tooltip>
          {stats.total > 0 && (
            <Tooltip title="Discard All Changes">
              <IconButton size="small" onClick={onDiscardAll}>
                <Undo2 size={13} />
              </IconButton>
            </Tooltip>
          )}
          {unstagedChanges.length > 0 && (
            <Tooltip title="Stage All Changes">
              <IconButton size="small" onClick={onStageAll}>
                <Plus size={13} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Commit Input Box */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <TextField
          placeholder="Commit message (⌘Enter to commit)"
          multiline
          minRows={2}
          maxRows={4}
          size="small"
          fullWidth
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.8rem',
              p: 1,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
            },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            disabled={disabled || stagedChanges.length === 0 || !commitMessage.trim()}
            onClick={handleCommitSubmit}
            startIcon={<Check size={14} />}
            sx={{
              py: 0.6,
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 1.5,
            }}
          >
            Commit
          </Button>
          {githubAccount && (
            <Tooltip title="Push project files to GitHub">
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenPushDialog}
                sx={{ minWidth: 42, px: 1, borderRadius: 1.5 }}
              >
                <UploadCloud size={14} />
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Changes List / Scrollable Container */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {stats.total === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4, px: 2, textAlign: 'center' }}>
            <CheckCircle2 size={32} color={theme.palette.success.main} style={{ opacity: 0.8, marginBottom: 12 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
              Working tree clean
            </Typography>
            <Typography variant="caption" color="text.secondary">
              No modified, untracked, or deleted files found.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {/* Staged Changes Accordion */}
            {stagedChanges.length > 0 && (
              <Box>
                <Box
                  onClick={() => setStagedOpen((prev) => !prev)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 0.75,
                    py: 0.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {stagedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Staged Changes
                    </Typography>
                    <Chip label={stagedChanges.length} size="small" sx={{ height: 16, fontSize: '0.62rem' }} />
                  </Stack>
                  <Tooltip title="Unstage All">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onUnstageAll?.(); }}>
                      <Minus size={12} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Collapse in={stagedOpen}>
                  <Stack spacing={0.25} sx={{ pl: 0.5, mt: 0.5 }}>
                    {stagedChanges.map((change) => (
                      <GitFileRow
                        key={`staged-${change.path}`}
                        change={change}
                        active={activePath === change.path}
                        onSelect={onSelectFile}
                        onOpenDiff={onOpenDiff}
                        onToggleStage={onToggleStage}
                      />
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            )}

            {/* Unstaged Changes Accordion */}
            {unstagedChanges.length > 0 && (
              <Box>
                <Box
                  onClick={() => setChangesOpen((prev) => !prev)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 0.75,
                    py: 0.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {changesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Changes
                    </Typography>
                    <Chip label={unstagedChanges.length} size="small" sx={{ height: 16, fontSize: '0.62rem' }} />
                  </Stack>
                  <Tooltip title="Stage All Changes">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onStageAll?.(); }}>
                      <Plus size={12} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Collapse in={changesOpen}>
                  <Stack spacing={0.25} sx={{ pl: 0.5, mt: 0.5 }}>
                    {unstagedChanges.map((change) => (
                      <GitFileRow
                        key={`unstaged-${change.path}`}
                        change={change}
                        active={activePath === change.path}
                        onSelect={onSelectFile}
                        onOpenDiff={onOpenDiff}
                        onToggleStage={onToggleStage}
                        onDiscard={onDiscardFile}
                      />
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {/* Bottom Summary Bar */}
      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{stats.modified || 0} modified · {stats.added || 0} added · {stats.deleted || 0} deleted</span>
        </Typography>
      </Box>

      {/* Link GitHub Account Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GithubIcon size={20} />
          Link GitHub Account
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Link your GitHub account using a Personal Access Token (classic or fine-grained) with <code>repo</code> and <code>gist</code> scopes to push code, sync commits, and create repositories.
          </Typography>
          <TextField
            autoFocus
            label="Personal Access Token (PAT)"
            type="password"
            fullWidth
            size="small"
            value={patInput}
            onChange={(e) => setPatInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            disabled={verifyingPat}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,gist&description=LocalLLMMind"
              target="_blank"
              rel="noreferrer"
              style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
            >
              Generate a token on GitHub (repo, gist scopes) ↗
            </a>
          </Typography>
          {linkError && (
            <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              {linkError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkDialogOpen(false)} disabled={verifyingPat}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleVerifyAndLink}
            disabled={verifyingPat || !patInput.trim()}
            startIcon={verifyingPat ? <CircularProgress size={14} color="inherit" /> : <Check size={14} />}
          >
            {verifyingPat ? 'Verifying...' : 'Connect Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Push to GitHub Dialog */}
      <Dialog open={pushDialogOpen} onClose={() => !pushBusy && setPushDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadCloud size={20} color={theme.palette.primary.main} />
          Push Project to GitHub
        </DialogTitle>
        <DialogContent>
          {pushSuccessUrl ? (
            <Alert severity="success" sx={{ my: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Successfully pushed to GitHub!
              </Typography>
              <Typography variant="caption">
                <a href={pushSuccessUrl} target="_blank" rel="noreferrer" style={{ color: theme.palette.primary.main }}>
                  View Commit on GitHub ↗
                </a>
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Push all {project?.files?.length || 0} source files from project <strong>{project?.name}</strong> directly to GitHub.
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isNewRepo}
                    onChange={(e) => {
                      setIsNewRepo(e.target.checked);
                      if (e.target.checked) {
                        setPushBranch('main');
                      } else if (selectedRepo) {
                        const found = userRepos.find((r) => r.full_name === selectedRepo);
                        if (found?.default_branch) setPushBranch(found.default_branch);
                      }
                    }}
                  />
                }
                label="Create a brand new GitHub repository"
              />

              {isNewRepo ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="Repository Name"
                    size="small"
                    fullWidth
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                  />
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={newRepoPrivate} onChange={(e) => setNewRepoPrivate(e.target.checked)} />}
                    label="Private repository"
                  />
                </Stack>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel id="repo-select-label">Select Repository</InputLabel>
                  <Select
                    labelId="repo-select-label"
                    value={selectedRepo}
                    label="Select Repository"
                    onChange={(e) => {
                      const repoName = e.target.value;
                      setSelectedRepo(repoName);
                      const found = userRepos.find((r) => r.full_name === repoName);
                      if (found?.default_branch) {
                        setPushBranch(found.default_branch);
                      }
                    }}
                    disabled={loadingRepos}
                  >
                    {userRepos.map((r) => (
                      <MenuItem key={r.id} value={r.full_name}>
                        {r.full_name} {r.private ? '(Private)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Target Branch"
                size="small"
                fullWidth
                value={pushBranch}
                onChange={(e) => setPushBranch(e.target.value)}
              />

              {pushError && <Alert severity="error">{pushError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPushDialogOpen(false)} disabled={pushBusy}>
            {pushSuccessUrl ? 'Close' : 'Cancel'}
          </Button>
          {!pushSuccessUrl && (
            <Button
              variant="contained"
              onClick={handleExecutePush}
              disabled={pushBusy || (!isNewRepo && !selectedRepo)}
              startIcon={pushBusy ? <CircularProgress size={14} color="inherit" /> : <UploadCloud size={14} />}
            >
              {pushBusy ? 'Pushing...' : 'Push to GitHub'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const GitSourceControlSidebar = memo(GitSourceControlSidebarComponent);
export default GitSourceControlSidebar;
