import { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { search, openSearchPanel, highlightSelectionMatches } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '@mui/material';
import {
  EDITOR_THEMES,
  EDITOR_FONTS,
  DEFAULT_EDITOR_SETTINGS,
} from '../../constants/editorThemes';

export interface CodeEditorProps {
  file: any;
  onChange?: (val: string) => void;
  onSelection?: (sel: any) => void;
  onCursorChange?: (pos: any) => void;
  readOnly?: boolean;
  settings?: any;
}

const CodeEditor = forwardRef<any, CodeEditorProps>(function CodeEditor(
  {
    file,
    onChange,
    onSelection,
    onCursorChange,
    readOnly = false,
    settings = DEFAULT_EDITOR_SETTINGS,
  },
  ref
) {
  const theme = useTheme();
  const [language, setLanguage] = useState(null);
  const editorViewRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      openSearch() {
        if (editorViewRef.current) {
          openSearchPanel(editorViewRef.current);
          editorViewRef.current.focus();
        }
      },
      goToLine(lineNumber) {
        if (editorViewRef.current) {
          const totalLines = editorViewRef.current.state.doc.lines;
          const targetLine = Math.max(1, Math.min(lineNumber, totalLines));
          const line = editorViewRef.current.state.doc.line(targetLine);
          editorViewRef.current.dispatch({
            selection: { anchor: line.from },
            scrollIntoView: true,
          });
          editorViewRef.current.focus();
        }
      },
      focus() {
        editorViewRef.current?.focus();
      },
    }),
    []
  );

  useEffect(() => {
    let alive = true;
    setLanguage(null);
    const match = LanguageDescription.matchFilename(languages, file.path);
    match
      ?.load()
      .then((support) => {
        if (alive) setLanguage(support);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [file.path]);

  const activeTheme = useMemo(() => {
    const found = EDITOR_THEMES.find((t) => t.id === settings.themeId);
    if (found?.theme) return found.theme;
    return theme.palette.mode === 'dark' ? oneDark : 'light';
  }, [settings.themeId, theme.palette.mode]);

  const editorStyle = useMemo(() => {
    const selectedFont =
      EDITOR_FONTS.find((f) => f.id === settings.fontFamily) || EDITOR_FONTS[0];

    return EditorView.theme({
      '&': {
        height: '100%',
        fontSize: `${settings.fontSize || 13}px`,
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: selectedFont.family,
        lineHeight: '1.7',
      },
      '.cm-content': {
        padding: '16px 0',
      },
      '.cm-gutters': {
        border: 'none',
        paddingRight: '12px',
        paddingLeft: '4px',
        opacity: 0.6,
      },
      '.cm-activeLineGutter': {
        opacity: 1,
        fontWeight: 600,
      },
      '.cm-search': {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        bgcolor: 'background.paper',
      },
      '&.cm-focused': {
        outline: 'none',
      },
    });
  }, [settings.fontSize, settings.fontFamily]);

  const extensions = useMemo(() => {
    const exts = [
      editorStyle,
      search({ top: true }),
      highlightSelectionMatches(),
    ];
    if (language) exts.push(language);
    if (settings.lineWrapping) exts.push(EditorView.lineWrapping);
    return exts;
  }, [editorStyle, language, settings.lineWrapping]);

  return (
    <CodeMirror
      value={file.content}
      height="100%"
      theme={activeTheme}
      aria-label={`Code editor for ${file.path}`}
      readOnly={readOnly}
      editable={!readOnly}
      extensions={extensions}
      style={{ height: '100%', minHeight: 240 }}
      onCreateEditor={(view) => {
        editorViewRef.current = view;
      }}
      basicSetup={{
        foldGutter: true,
        highlightActiveLine: settings.highlightActiveLine !== false,
        lineNumbers: settings.lineNumbers !== false,
        tabSize: settings.tabSize || 2,
        bracketMatching: true,
      }}
      onChange={onChange}
      onUpdate={(update) => {
        if (update.selectionSet || update.docChanged) {
          const range = update.state.selection.main;
          const line = update.state.doc.lineAt(range.head);
          const col = range.head - line.from + 1;
          onCursorChange?.({ line: line.number, col });

          if (onSelection) {
            const from = update.state.doc.lineAt(range.from).number;
            const to = update.state.doc.lineAt(Math.max(range.from, range.to - 1)).number;
            onSelection({ from, to });
          }
        }
      }}
    />
  );
});

export default CodeEditor;
