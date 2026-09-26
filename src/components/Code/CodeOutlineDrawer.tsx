import { useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  useTheme,
  Chip,
} from '@mui/material';
import { ListTree, X, Code2, Box as BoxIcon, Hash, Zap, Layers, FileCode } from 'lucide-react';

export default function CodeOutlineDrawer({
  open,
  onClose,
  content = '',
  filePath = '',
  onSelectLine,
}) {
  const theme = useTheme();

  const symbols = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const result = [];
    const seen = new Set();

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      const lineNum = index + 1;
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) return;

      // 1. Python def / class / async def
      const pyMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (pyMatch) {
        addSymbol(pyMatch[1], 'function', lineNum);
        return;
      }
      const pyClass = line.match(/^class\s+([a-zA-Z0-9_]+)/);
      if (pyClass) {
        addSymbol(pyClass[1], 'class', lineNum);
        return;
      }

      // 2. Go func / type struct / interface
      const goFunc = line.match(/^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/);
      if (goFunc) {
        addSymbol(goFunc[1], 'function', lineNum);
        return;
      }
      const goType = line.match(/^type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/);
      if (goType) {
        addSymbol(goType[1], 'class', lineNum);
        return;
      }

      // 3. Rust fn / struct / enum / impl / trait / mod
      const rustFn = line.match(/^(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/);
      if (rustFn) {
        addSymbol(rustFn[1], 'function', lineNum);
        return;
      }
      const rustStruct = line.match(/^(?:pub(?:\([^)]+\))?\s+)?(?:struct|enum|trait|impl(?:\s+<[^>]+>)?)\s+([a-zA-Z0-9_]+)/);
      if (rustStruct) {
        addSymbol(rustStruct[1], 'class', lineNum);
        return;
      }

      // 4. JS / TS functions, classes, interfaces, types
      const jsFunc = line.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
      if (jsFunc) {
        addSymbol(jsFunc[1], 'function', lineNum);
        return;
      }
      const jsArrow = line.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);
      if (jsArrow) {
        addSymbol(jsArrow[1], 'function', lineNum);
        return;
      }
      const jsClass = line.match(/^(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (jsClass) {
        addSymbol(jsClass[1], 'class', lineNum);
        return;
      }
      const tsInterface = line.match(/^(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)/);
      if (tsInterface) {
        addSymbol(tsInterface[1], 'type', lineNum);
        return;
      }

      // 5. Java / C# / C++ methods and classes
      const javaClass = line.match(/^(?:public|private|protected|static|final|\s)*class\s+([a-zA-Z0-9_]+)/);
      if (javaClass) {
        addSymbol(javaClass[1], 'class', lineNum);
        return;
      }
      const methodMatch = line.match(/^(?:public|private|protected|static|override|\s)*(?:void|int|string|bool|boolean|float|double|[A-Z][a-zA-Z0-9_<>]*)[\s*&]+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*\{?/);
      if (methodMatch && !['if', 'for', 'while', 'switch'].includes(methodMatch[1])) {
        addSymbol(methodMatch[1], 'function', lineNum);
        return;
      }

      // 6. Markdown Headings
      const mdHead = line.match(/^(#{1,4})\s+(.+)/);
      if (mdHead) {
        addSymbol(mdHead[2], 'heading', lineNum, mdHead[1].length);
        return;
      }

      // 7. CSS / SCSS Rules (@keyframes, @media, top-level selectors)
      const cssRule = line.match(/^(@keyframes|@media|[.#][a-zA-Z0-9_-]+)\s*([^{]*)\{/);
      if (cssRule) {
        addSymbol(`${cssRule[1]} ${cssRule[2]}`.trim(), 'css', lineNum);
        return;
      }

      // 8. SQL Tables & Functions
      const sqlMatch = line.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?(TABLE|FUNCTION|VIEW|PROCEDURE)\s+([a-zA-Z0-9_.]+)/i);
      if (sqlMatch) {
        addSymbol(`${sqlMatch[1].toUpperCase()} ${sqlMatch[2]}`, 'sql', lineNum);
        return;
      }

      // 9. HTML Major Landmark Tags
      const htmlMatch = line.match(/^<([a-zA-Z0-9-]+)(?:\s+id=["']([^"']+)["'])?[^>]*>/);
      if (htmlMatch && ['header', 'main', 'section', 'article', 'nav', 'footer', 'form'].includes(htmlMatch[1].toLowerCase())) {
        const desc = htmlMatch[2] ? `<${htmlMatch[1]} id="${htmlMatch[2]}">` : `<${htmlMatch[1]}>`;
        addSymbol(desc, 'html', lineNum);
        return;
      }

      // 10. Universal identifier definition fallback (e.g. `foo() {` or `module.exports =`)
      const universalFn = line.match(/^([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
      if (universalFn && !['if', 'for', 'while', 'catch', 'switch'].includes(universalFn[1])) {
        addSymbol(universalFn[1], 'function', lineNum);
      }
    });

    function addSymbol(name, type, line, level = 1) {
      const key = `${type}:${name}:${line}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ name: name.trim().slice(0, 48), type, line, level });
      }
    }

    return result;
  }, [content]);

  function getIcon(type) {
    switch (type) {
      case 'function':
        return <Code2 size={13} color="var(--mui-palette-primary-main, #3b82f6)" />;
      case 'class':
        return <BoxIcon size={13} color="#10b981" />;
      case 'type':
        return <Layers size={13} color="#8b5cf6" />;
      case 'heading':
        return <Hash size={13} color="#f59e0b" />;
      case 'css':
        return <Zap size={13} color="#ec4899" />;
      case 'html':
      case 'sql':
        return <FileCode size={13} color="#06b6d4" />;
      default:
        return <Code2 size={13} />;
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 300,
            p: 2,
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ListTree size={16} color={theme.palette.primary.main} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Code Outline
          </Typography>
          <Chip size="small" label={symbols.length} sx={{ height: 20, fontSize: '0.7rem' }} />
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Close outline">
          <X size={15} />
        </IconButton>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontFamily: 'monospace' }} noWrap>
        {filePath ? filePath.split('/').pop() : 'symbols'}
      </Typography>

      <Divider sx={{ mb: 1 }} />

      <Box sx={{ flex: 1, overflow: 'auto', mx: -1 }}>
        {symbols.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No symbols detected in this file.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Functions, classes, tags, and sections will appear here.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {symbols.map((item, idx) => (
              <ListItemButton
                key={idx}
                onClick={() => {
                  onSelectLine?.(item.line);
                  onClose?.();
                }}
                sx={{
                  py: 0.5,
                  px: 1,
                  borderRadius: 1.5,
                  my: 0.25,
                  pl: item.type === 'heading' ? 1 + item.level * 0.75 : 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 24 }}>{getIcon(item.type)}</ListItemIcon>
                <ListItemText
                  primary={item.name}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      noWrap: true,
                      sx: {
                        fontSize: '0.78rem',
                        fontFamily: item.type === 'heading' ? 'inherit' : 'monospace',
                        fontWeight: item.type === 'class' ? 600 : 500,
                      },
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', ml: 1 }}>
                  :{item.line}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
