import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import html from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', html);
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

function CodeBlock({ language, children }) {
  const [copied, setCopied] = React.useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        my: 2,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.75,
          bgcolor: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {language || 'code'}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary' }}>
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
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

export default function MarkdownRenderer({ content }) {
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
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
