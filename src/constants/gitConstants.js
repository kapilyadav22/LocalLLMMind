/**
 * Git / Source Control Constants
 * Status codes, color badges, and labels matching VS Code conventions.
 */

export const GIT_STATUS_TYPES = {
  MODIFIED: 'M',
  ADDED: 'A',
  UNTRACKED: 'U',
  DELETED: 'D',
  RENAMED: 'R',
  STAGED: 'S',
};

export const GIT_STATUS_CONFIG = {
  [GIT_STATUS_TYPES.MODIFIED]: {
    code: 'M',
    label: 'Modified',
    tooltip: 'Modified file',
    color: '#d29922',
    bg: 'rgba(210, 153, 34, 0.15)',
    border: 'rgba(210, 153, 34, 0.4)',
  },
  [GIT_STATUS_TYPES.ADDED]: {
    code: 'A',
    label: 'Added',
    tooltip: 'Index added file',
    color: '#3fb950',
    bg: 'rgba(63, 185, 80, 0.15)',
    border: 'rgba(63, 185, 80, 0.4)',
  },
  [GIT_STATUS_TYPES.UNTRACKED]: {
    code: 'U',
    label: 'Untracked',
    tooltip: 'Untracked new file',
    color: '#2ea043',
    bg: 'rgba(46, 160, 67, 0.15)',
    border: 'rgba(46, 160, 67, 0.4)',
  },
  [GIT_STATUS_TYPES.DELETED]: {
    code: 'D',
    label: 'Deleted',
    tooltip: 'Deleted file',
    color: '#f85149',
    bg: 'rgba(248, 81, 73, 0.15)',
    border: 'rgba(248, 81, 73, 0.4)',
  },
  [GIT_STATUS_TYPES.RENAMED]: {
    code: 'R',
    label: 'Renamed',
    tooltip: 'Renamed file',
    color: '#a371f7',
    bg: 'rgba(163, 113, 247, 0.15)',
    border: 'rgba(163, 113, 247, 0.4)',
  },
};

export const SIDEBAR_TABS = {
  EXPLORER: 'explorer',
  SOURCE_CONTROL: 'source_control',
};
