import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import html from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Box, IconButton, Tooltip, Typography, Collapse, Button, Chip, alpha } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('diff', diff);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('dockerfile', docker);

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const [inlinePreview, setInlinePreview] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const lang = (language || '').toLowerCase();
  const isSvg = lang === 'svg' || (code.trim().startsWith('<svg') && code.trim().endsWith('</svg>'));
  const isHtml = lang === 'html' || lang === 'htm' || code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html');
  const isArtifact = isSvg || isHtml;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSandbox = () => {
    window.dispatchEvent(
      new CustomEvent('localmind-open-artifact', {
        detail: {
          code,
          language: isSvg ? 'svg' : 'html',
          title: isSvg ? 'SVG Vector Graphic' : 'Interactive HTML Document',
        },
      })
    );
  };

  return (
    <Box
      sx={{
        position: 'relative',
        my: 2,
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isArtifact ? alpha('#6366f1', 0.35) : 'divider',
        boxShadow: isArtifact ? `0 4px 20px ${alpha('#6366f1', 0.08)}` : 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.85,
          bgcolor: isArtifact ? alpha('#6366f1', 0.08) : 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid',
          borderColor: isArtifact ? alpha('#6366f1', 0.2) : 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: isArtifact ? 'primary.main' : 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
            {language || 'code'}
          </Typography>
          {isArtifact && (
            <Chip
              label="Artifact"
              size="small"
              icon={<AutoAwesomeIcon sx={{ fontSize: '12px !important' }} />}
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: alpha('#6366f1', 0.15),
                color: 'primary.main',
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isArtifact && (
            <>
              <Button
                size="small"
                variant="text"
                onClick={() => setInlinePreview((prev) => !prev)}
                startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                sx={{
                  py: 0.2,
                  px: 1,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  color: inlinePreview ? 'primary.main' : 'text.secondary',
                }}
              >
                {inlinePreview ? 'Hide Preview' : 'Inline Preview'}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleOpenSandbox}
                startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                sx={{
                  py: 0.2,
                  px: 1.2,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  boxShadow: 'none',
                }}
              >
                Open Sandbox
              </Button>
            </>
          )}

          <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary', p: 0.5 }}>
              {copied ? <CheckIcon fontSize="small" sx={{ color: 'success.main' }} /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Inline Preview (if toggled) */}
      {isArtifact && inlinePreview && (
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 120,
            maxHeight: 360,
            overflow: 'auto',
          }}
        >
          {isSvg ? (
            <Box
              dangerouslySetInnerHTML={{ __html: code }}
              sx={{
                maxWidth: '100%',
                display: 'flex',
                justifyContent: 'center',
                '& svg': { maxWidth: '100%', height: 'auto' },
              }}
            />
          ) : (
            <iframe
              srcDoc={code}
              title="Inline Artifact Preview"
              sandbox="allow-scripts"
              style={{
                width: '100%',
                height: 260,
                border: 'none',
                borderRadius: 6,
                background: '#fff',
              }}
            />
          )}
        </Box>
      )}

      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: '16px',
          fontSize: '0.85rem',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
}

function parseThinkContent(raw) {
  if (!raw) return { thinking: null, isThinking: false, answer: '' };

  const thinkStart = raw.indexOf('<think>');
  if (thinkStart === -1) {
    return { thinking: null, isThinking: false, answer: raw };
  }

  const thinkEnd = raw.indexOf('</think>');
  if (thinkEnd !== -1) {
    const before = raw.slice(0, thinkStart);
    const thinking = raw.slice(thinkStart + 7, thinkEnd).trim();
    const after = raw.slice(thinkEnd + 8).trimStart();
    return {
      thinking,
      isThinking: false,
      answer: (before ? before + '\n\n' : '') + after,
    };
  }

  // Still thinking (tag not closed yet)
  const before = raw.slice(0, thinkStart);
  const thinking = raw.slice(thinkStart + 7).trim();
  return {
    thinking,
    isThinking: true,
    answer: before,
  };
}

export default function MarkdownRenderer({ content }) {
  const { thinking, isThinking, answer } = useMemo(() => parseThinkContent(content), [content]);
  const [expanded, setExpanded] = useState(isThinking);

  const hasAnswer = Boolean(answer && answer.trim());

  // When model finishes thinking, auto-collapse if answer starts appearing
  useEffect(() => {
    if (isThinking) {
      setExpanded(true);
    } else if (hasAnswer) {
      setExpanded(false);
    }
  }, [isThinking, hasAnswer]);

  const components = useMemo(
    () => ({
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !match && !className;
        if (isInline) {
          return (
            <Box
              component="code"
              sx={{
                px: 0.8,
                py: 0.2,
                borderRadius: 1,
                bgcolor: 'rgba(139,92,246,0.15)',
                color: 'secondary.light',
                fontFamily: 'monospace',
                fontSize: '0.85em',
                fontWeight: 500,
              }}
              {...props}
            >
              {children}
            </Box>
          );
        }
        return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
      },
      p({ children }) {
        return (
          <Typography variant="body1" sx={{ my: 1, lineHeight: 1.8 }}>
            {children}
          </Typography>
        );
      },
      h1({ children }) {
        return (
          <Typography variant="h5" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
            {children}
          </Typography>
        );
      },
      h2({ children }) {
        return (
          <Typography variant="h6" sx={{ mt: 2.5, mb: 1, fontWeight: 600 }}>
            {children}
          </Typography>
        );
      },
      h3({ children }) {
        return (
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 0.5, fontWeight: 600 }}>
            {children}
          </Typography>
        );
      },
      ul({ children }) {
        return (
          <Box component="ul" sx={{ pl: 2.5, my: 1, '& li': { my: 0.5 } }}>
            {children}
          </Box>
        );
      },
      ol({ children }) {
        return (
          <Box component="ol" sx={{ pl: 2.5, my: 1, '& li': { my: 0.5 } }}>
            {children}
          </Box>
        );
      },
      blockquote({ children }) {
        return (
          <Box
            component="blockquote"
            sx={{
              borderLeft: 3,
              borderColor: 'primary.main',
              pl: 2,
              my: 2,
              py: 0.5,
              color: 'text.secondary',
              bgcolor: 'rgba(6,182,212,0.05)',
              borderRadius: '0 8px 8px 0',
            }}
          >
            {children}
          </Box>
        );
      },
      table({ children }) {
        return (
          <Box
            sx={{
              overflowX: 'auto',
              my: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                '& th': {
                  p: 1.5,
                  textAlign: 'left',
                  fontWeight: 600,
                  bgcolor: 'rgba(0,0,0,0.2)',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& td': {
                  p: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& tr:last-child td': {
                  borderBottom: 'none',
                },
              }}
            >
              {children}
            </Box>
          </Box>
        );
      },
      a({ href, children }) {
        return (
          <Box
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {children}
          </Box>
        );
      },
      hr() {
        return <Box component="hr" sx={{ border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 2 }} />;
      },
    }),
    []
  );

  return (
    <>
      {thinking && (
        <Box
          sx={{
            mb: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: isThinking ? 'secondary.main' : 'divider',
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.04),
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}
        >
          <Box
            onClick={() => setExpanded((prev) => !prev)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              cursor: 'pointer',
              userSelect: 'none',
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.14),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'secondary.main', fontSize: '0.78rem' }}>
                {isThinking ? 'Thinking process…' : 'Thought process'}
              </Typography>
              {isThinking && (
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    animation: 'pulse 1.2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.3, transform: 'scale(0.8)' },
                    },
                  }}
                />
              )}
            </Box>
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 18,
                color: 'text.secondary',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </Box>
          <Collapse in={expanded}>
            <Box
              sx={{
                p: 2,
                pt: 1.5,
                fontSize: '0.82rem',
                color: 'text.secondary',
                fontStyle: 'italic',
                borderTop: '1px solid',
                borderColor: 'divider',
                lineHeight: 1.6,
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
              >
                {thinking}
              </ReactMarkdown>
            </Box>
          </Collapse>
        </Box>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {answer}
      </ReactMarkdown>
    </>
  );
}
