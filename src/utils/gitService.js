/**
 * Git Service
 * In-memory & local workspace git status tracker, diff generator, and commit manager.
 */

import { GIT_STATUS_TYPES, GIT_STATUS_CONFIG } from '../constants/gitConstants.js';

/**
 * Compute line-by-line unified diff between oldContent and newContent
 */
export function computeUnifiedDiff(oldContent = '', newContent = '', filePath = 'file') {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  const diffLines = [];
  diffLines.push({ type: 'header', text: `--- a/${filePath}` });
  diffLines.push({ type: 'header', text: `+++ b/${filePath}` });

  // Simple and robust LCS diff
  const m = oldLines.length;
  const n = newLines.length;

  // For small to medium files, compute exact LCS
  if (m * n < 250000) {
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (oldLines[i] === newLines[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    let i = m;
    let j = n;
    const lcs = [];
    while (i > 0 && j > 0) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs.unshift({ type: 'context', text: oldLines[i - 1], oldNum: i, newNum: j });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        lcs.unshift({ type: 'remove', text: oldLines[i - 1], oldNum: i, newNum: null });
        i--;
      } else {
        lcs.unshift({ type: 'add', text: newLines[j - 1], oldNum: null, newNum: j });
        j--;
      }
    }
    while (i > 0) {
      lcs.unshift({ type: 'remove', text: oldLines[i - 1], oldNum: i, newNum: null });
      i--;
    }
    while (j > 0) {
      lcs.unshift({ type: 'add', text: newLines[j - 1], oldNum: null, newNum: j });
      j--;
    }

    return [...diffLines, ...lcs];
  }

  // Fast line comparison for very large files
  const max = Math.max(m, n);
  for (let idx = 0; idx < max; idx++) {
    const o = oldLines[idx];
    const nLine = newLines[idx];
    if (o === undefined) {
      diffLines.push({ type: 'add', text: nLine, oldNum: null, newNum: idx + 1 });
    } else if (nLine === undefined) {
      diffLines.push({ type: 'remove', text: o, oldNum: idx + 1, newNum: null });
    } else if (o !== nLine) {
      diffLines.push({ type: 'remove', text: o, oldNum: idx + 1, newNum: null });
      diffLines.push({ type: 'add', text: nLine, oldNum: null, newNum: idx + 1 });
    } else {
      diffLines.push({ type: 'context', text: o, oldNum: idx + 1, newNum: idx + 1 });
    }
  }

  return diffLines;
}

/**
 * Compute git changes between current files and baseline snapshot
 */
export function computeGitStatus(currentFiles = [], baseFiles = [], stagedPaths = new Set()) {
  const baseMap = new Map();
  (baseFiles || []).forEach((f) => baseMap.set(f.path, f.content));

  const currentMap = new Map();
  (currentFiles || []).forEach((f) => currentMap.set(f.path, f.content));

  const changes = [];
  const statusByPath = {};

  // Check current files against base
  for (const file of currentFiles) {
    const isStaged = stagedPaths.has(file.path);

    if (!baseMap.has(file.path)) {
      // Untracked / Added
      const change = {
        path: file.path,
        name: file.path.split('/').pop(),
        dir: file.path.split('/').slice(0, -1).join('/'),
        status: GIT_STATUS_TYPES.UNTRACKED,
        config: GIT_STATUS_CONFIG[GIT_STATUS_TYPES.UNTRACKED],
        staged: isStaged,
        oldContent: '',
        newContent: file.content,
      };
      changes.push(change);
      statusByPath[file.path] = change;
    } else {
      const baseContent = baseMap.get(file.path);
      if (baseContent !== file.content) {
        // Modified
        const change = {
          path: file.path,
          name: file.path.split('/').pop(),
          dir: file.path.split('/').slice(0, -1).join('/'),
          status: GIT_STATUS_TYPES.MODIFIED,
          config: GIT_STATUS_CONFIG[GIT_STATUS_TYPES.MODIFIED],
          staged: isStaged,
          oldContent: baseContent,
          newContent: file.content,
        };
        changes.push(change);
        statusByPath[file.path] = change;
      }
    }
  }

  // Check for deleted files (in base but missing in current)
  for (const [basePath, baseContent] of baseMap.entries()) {
    if (!currentMap.has(basePath)) {
      const isStaged = stagedPaths.has(basePath);
      const change = {
        path: basePath,
        name: basePath.split('/').pop(),
        dir: basePath.split('/').slice(0, -1).join('/'),
        status: GIT_STATUS_TYPES.DELETED,
        config: GIT_STATUS_CONFIG[GIT_STATUS_TYPES.DELETED],
        staged: isStaged,
        oldContent: baseContent,
        newContent: '',
      };
      changes.push(change);
      statusByPath[basePath] = change;
    }
  }

  // Sort changes alphabetically by path
  changes.sort((a, b) => a.path.localeCompare(b.path));

  const stagedChanges = changes.filter((c) => c.staged);
  const unstagedChanges = changes.filter((c) => !c.staged);

  const stats = {
    modified: changes.filter((c) => c.status === GIT_STATUS_TYPES.MODIFIED).length,
    added: changes.filter((c) => c.status === GIT_STATUS_TYPES.UNTRACKED || c.status === GIT_STATUS_TYPES.ADDED).length,
    deleted: changes.filter((c) => c.status === GIT_STATUS_TYPES.DELETED).length,
    total: changes.length,
  };

  return {
    changes,
    stagedChanges,
    unstagedChanges,
    statusByPath,
    stats,
  };
}
