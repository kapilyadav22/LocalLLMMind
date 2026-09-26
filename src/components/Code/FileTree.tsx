import { useState, useMemo, memo } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { CodeFile } from '../../types';

export interface FileTreeNode {
  path?: string;
  children?: Record<string, FileTreeNode>;
  [key: string]: any;
}

export interface BranchProps {
  nodes: Record<string, FileTreeNode>;
  activePath?: string;
  onSelect: (path: string) => void;
  depth?: number;
  gitStatusMap?: Record<string, any>;
}

export interface FileTreeProps {
  files: CodeFile[];
  activePath?: string;
  onSelect: (path: string) => void;
  gitStatusMap?: Record<string, any>;
}

const Branch = memo(function Branch({ nodes, activePath, onSelect, depth = 0, gitStatusMap = {} }: BranchProps) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  return (
    <>
      {Object.entries(nodes)
        .sort(([a, av], [b, bv]) => Number(!!bv.children) - Number(!!av.children) || a.localeCompare(b))
        .map(([name, node]) => {
          const gitInfo = node.path ? gitStatusMap[node.path] : null;

          return (
            <Box key={name}>
              <ButtonBase
                onClick={() =>
                  node.children
                    ? setClosed((prev) => ({ ...prev, [name]: !prev[name] }))
                    : (node.path && onSelect(node.path))
                }
                aria-expanded={node.children ? !closed[name] : undefined}
                aria-current={activePath === node.path ? 'page' : undefined}
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 0.75,
                  pl: 1.25 + depth * 1.5,
                  pr: 1,
                  py: 0.75,
                  color: activePath === node.path ? 'primary.main' : 'text.secondary',
                  bgcolor: activePath === node.path ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {node.children ? (
                  closed[name] ? <ChevronRight size={13} /> : <ChevronDown size={13} />
                ) : (
                  <Box sx={{ width: 13 }} />
                )}
                {node.children ? <Folder size={15} /> : <FileText size={14} />}
                <Typography variant="caption" noWrap title={node.path || name} sx={{ flex: 1, textAlign: 'left' }}>
                  {name}
                </Typography>

                {/* VS Code style Git Status Badge */}
                {gitInfo && (
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: gitInfo.config?.color,
                      bgcolor: gitInfo.config?.bg,
                      borderRadius: '3px',
                      px: '4px',
                      lineHeight: '14px',
                      flexShrink: 0,
                    }}
                    title={gitInfo.config?.tooltip}
                  >
                    {gitInfo.config?.code}
                  </Box>
                )}
              </ButtonBase>
              {node.children && !closed[name] && (
                <Branch
                  nodes={node.children}
                  activePath={activePath}
                  onSelect={onSelect}
                  depth={depth + 1}
                  gitStatusMap={gitStatusMap}
                />
              )}
            </Box>
          );
        })}
    </>
  );
});

function FileTreeComponent({ files, activePath, onSelect, gitStatusMap = {} }: FileTreeProps) {
  const nodes = useMemo(() => {
    const root: Record<string, FileTreeNode> = Object.create(null);
    for (const file of files) {
      let current = root;
      const parts = file.path.split('/');
      parts.forEach((part, index) => {
        if (index === parts.length - 1) current[part] = { path: file.path };
        else {
          current[part] ||= { children: Object.create(null) };
          current = current[part].children!;
        }
      });
    }
    return root;
  }, [files]);

  return <Branch nodes={nodes} activePath={activePath} onSelect={onSelect} gitStatusMap={gitStatusMap} />;
}

const FileTree = memo(FileTreeComponent);
export default FileTree;
