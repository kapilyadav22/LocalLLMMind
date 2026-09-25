import { useState, useCallback, memo } from 'react';
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
  Divider,
  Collapse,
} from '@mui/material';
import {
  GitBranch,
  GitCommit,
  RotateCw,
  Plus,
  Minus,
  Undo2,
  GitCompare,
  FileCode,
  FilePlus,
  FileX,
  FileEdit,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  CheckCircle2,
} from 'lucide-react';
import { GIT_STATUS_TYPES } from '../../constants/gitConstants';

// Memoized Single Git Change Row
const GitFileRow = memo(function GitFileRow({
  change,
  active,
  onSelect,
  onOpenDiff,
  onToggleStage,
  onDiscard,
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const getFileIcon = (status) => {
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
      onClick={() => onSelect(change.path)}
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
              <IconButton size="small" onClick={() => onOpenDiff(change.path)} sx={{ p: '3px' }}>
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
              <IconButton size="small" onClick={() => onToggleStage(change.path)} sx={{ p: '3px' }}>
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

function GitSourceControlSidebarComponent({
  gitState,
  activePath,
  onSelectFile,
  onOpenDiff,
  onToggleStage,
  onStageAll,
  onUnstageAll,
  onDiscardFile,
  onDiscardAll,
  onCommit,
  onRefresh,
}) {
  const theme = useTheme();
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedOpen, setStagedOpen] = useState(true);
  const [changesOpen, setChangesOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { changes = [], stagedChanges = [], unstagedChanges = [], stats = { total: 0 } } = gitState || {};

  const handleCommitSubmit = (e) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommitSubmit();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1.5, pt: 1.25, pb: 0.75, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <GitBranch size={15} color="var(--mui-palette-primary-main, #3b82f6)" />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            main
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
          placeholder="Message (⌘Enter to commit)"
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
        <Button
          fullWidth
          variant="contained"
          size="small"
          disabled={stats.total === 0 || !commitMessage.trim()}
          onClick={handleCommitSubmit}
          startIcon={<Check size={14} />}
          sx={{
            mt: 1,
            py: 0.6,
            fontSize: '0.78rem',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 1.5,
          }}
        >
          Commit to main
        </Button>
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
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {stagedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Staged Changes
                    </Typography>
                    <Chip label={stagedChanges.length} size="small" sx={{ height: 16, fontSize: '0.62rem' }} />
                  </Stack>
                  <Tooltip title="Unstage All">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onUnstageAll(); }}>
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
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {changesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Changes
                    </Typography>
                    <Chip label={unstagedChanges.length} size="small" sx={{ height: 16, fontSize: '0.62rem' }} />
                  </Stack>
                  <Tooltip title="Stage All Changes">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onStageAll(); }}>
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
          <span>{stats.modified} modified · {stats.added} added · {stats.deleted} deleted</span>
        </Typography>
      </Box>
    </Box>
  );
}

const GitSourceControlSidebar = memo(GitSourceControlSidebarComponent);
export default GitSourceControlSidebar;
