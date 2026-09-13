import { useState, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Tabs,
  Tab,
  Tooltip,
  ButtonGroup,
  Paper,
  useTheme,
  alpha,
  Divider,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { showToast } from '../../utils/toast';

export default function ArtifactSandboxDrawer({
  open,
  onClose,
  artifact,
}) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);

  const code = artifact?.code || '';
  const language = (artifact?.language || 'html').toLowerCase();
  const title = artifact?.title || 'Interactive Artifact';

  const isSvg = language === 'svg' || (code.trim().startsWith('<svg') && code.trim().endsWith('</svg>'));

  // Generate safe HTML doc to inject into iframe
  const generateSrcDoc = () => {
    if (!code) return '';

    if (isSvg) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justifyContent: center;
      background: ${theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'};
      background-image: radial-gradient(${theme.palette.mode === 'dark' ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px);
      background-size: 16px 16px;
    }
    svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.15));
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }

    // If full HTML document is provided
    if (code.includes('<!DOCTYPE') || code.includes('<html')) {
      return code;
    }

    // Partial HTML/JS/CSS snippet - wrap in modern responsive shell
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      background: ${theme.palette.mode === 'dark' ? '#090d16' : '#ffffff'};
      color: ${theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast('Artifact code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleDownload = () => {
    if (!code) return;
    const ext = isSvg ? 'svg' : 'html';
    const mimeType = isSvg ? 'image/svg+xml' : 'text/html';
    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localllmmind-artifact.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded localllmmind-artifact.${ext}`, 'success');
  };

  const handleOpenExternal = () => {
    const srcDoc = generateSrcDoc();
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(srcDoc);
      newWindow.document.close();
    }
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Viewport width based on device mode
  const getViewportWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: '85vw', md: '640px', lg: '740px' },
            bgcolor: 'background.default',
            backgroundImage: 'none',
            boxShadow: `-10px 0 30px ${alpha(theme.palette.common.black, 0.3)}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1400,
          },
        },
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                {title}
              </Typography>
              <Chip
                label={isSvg ? 'SVG Vector' : 'HTML Sandbox'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Interactive Live Preview & Code Inspector
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Open in new window">
            <IconButton size="small" onClick={handleOpenExternal}>
              <OpenInNewIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download file">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
            <IconButton size="small" onClick={handleCopyCode}>
              {copied ? <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Navigation Subheader: Tabs & Device Modes */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.4),
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'none',
              gap: 0.75,
            },
          }}
        >
          <Tab value="preview" label="Live Preview" icon={<VisibilityIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab value="code" label="Source Code" icon={<CodeIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {activeTab === 'preview' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonGroup size="small" variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              <Tooltip title="Desktop View (100%)">
                <Button
                  variant={deviceMode === 'desktop' ? 'contained' : 'outlined'}
                  onClick={() => setDeviceMode('desktop')}
                  sx={{ px: 1, minWidth: 32 }}
                >
                  <DesktopWindowsIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Tablet View (768px)">
                <Button
                  variant={deviceMode === 'tablet' ? 'contained' : 'outlined'}
                  onClick={() => setDeviceMode('tablet')}
                  sx={{ px: 1, minWidth: 32 }}
                >
                  <TabletMacIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Mobile View (375px)">
                <Button
                  variant={deviceMode === 'mobile' ? 'contained' : 'outlined'}
                  onClick={() => setDeviceMode('mobile')}
                  sx={{ px: 1, minWidth: 32 }}
                >
                  <PhoneIphoneIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Tooltip title="Reload Sandbox">
              <IconButton size="small" onClick={handleRefresh} sx={{ color: 'text.secondary' }}>
                <RefreshIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          bgcolor: theme.palette.mode === 'dark' ? '#090d16' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: activeTab === 'preview' && deviceMode !== 'desktop' ? 3 : 0,
        }}
      >
        {activeTab === 'preview' ? (
          <Paper
            elevation={deviceMode !== 'desktop' ? 8 : 0}
            sx={{
              width: getViewportWidth(),
              height: '100%',
              maxWidth: '100%',
              borderRadius: deviceMode !== 'desktop' ? 3 : 0,
              overflow: 'hidden',
              border: deviceMode !== 'desktop' ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={generateSrcDoc()}
              title="Artifact Sandbox"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: theme.palette.mode === 'dark' ? '#090d16' : '#ffffff',
              }}
            />
          </Paper>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              p: 2,
            }}
          >
            <SyntaxHighlighter
              style={oneDark}
              language={language || 'html'}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '8px',
                padding: '20px',
                fontSize: '0.85rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
