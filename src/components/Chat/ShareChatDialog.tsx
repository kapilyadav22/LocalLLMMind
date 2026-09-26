import BrandText from '../common/BrandText';
import { DEVELOPER_NAME } from '../../constants/appConstants';
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  Card,
  CardActionArea,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  X,
  Copy,
  Share2,
  Image,
  FileText,
  Download,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { showToast } from '../../utils/toast';
import { exportConversationToPdf } from '../../utils/pdfExportUtils';

export default function ShareChatDialog({ open, onClose, conversation }) {
  const theme = useTheme();
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const exportPreviewRef = useRef(null);

  if (!conversation) return null;

  const title = conversation.title || 'Conversation';
  const messages = conversation.messages || [];
  const model = conversation.model || 'Local LLM';
  const fileSafeTitle = title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

  // Helper to format text/markdown
  const getFormattedChatMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `*Exported from LocalLLMMind on ${new Date().toLocaleString()} · Model: ${model}*\n\n---\n\n`;
    messages.forEach((m) => {
      const roleName = m.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
      md += `### ${roleName}\n\n`;
      if (m.images && m.images.length > 0) {
        md += `*[${m.images.length} Image${m.images.length > 1 ? 's' : ''} Attached]*\n\n`;
      }
      md += `${m.content}\n\n`;
      if (m.metrics) {
        md += `*⚡ ${m.metrics.tokPerSec} tok/s · ${m.metrics.evalCount} tokens (${m.metrics.duration}s)*\n\n`;
      }
      md += `---\n\n`;
    });
    md += `\n*Exported using LocalLLMMind · Created by Kapil Yadav*\n`;
    return md;
  };

  const getPlainText = () => {
    let txt = `${title}\n${'='.repeat(title.length)}\n`;
    txt += `Date: ${new Date().toLocaleString()} | Model: ${model}\n\n`;
    messages.forEach((m) => {
      const role = m.role === 'user' ? 'You' : 'Assistant';
      txt += `[${role}]:\n${m.content}\n\n`;
    });
    txt += `\nExported from LocalLLMMind by Kapil Yadav\n`;
    return txt;
  };

  // 1. Copy formatted markdown
  const handleCopyChat = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedChatMarkdown());
      setCopiedSuccess(true);
      showToast('Conversation copied to clipboard in Markdown format', 'success');
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to copy chat:', e);
      showToast('Could not copy chat to clipboard', 'error');
    }
  };

  // 2. Native Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: getPlainText(),
        });
        showToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          showToast('Share failed or cancelled', 'info');
        }
      }
    } else {
      // Fallback to clipboard
      await handleCopyChat();
    }
  };

  // 3. Save as Image (.png)
  const handleSaveAsImage = async () => {
    if (!exportPreviewRef.current) return;
    setIsExportingImage(true);

    try {
      // Allow rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportPreviewRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${fileSafeTitle}_chat.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Conversation exported as PNG image!', 'success');
    } catch (err) {
      console.error('Error generating chat image:', err);
      showToast('Failed to generate image. Try exporting as text or markdown.', 'error');
    } finally {
      setIsExportingImage(false);
    }
  };

  // 4. Save as Plain Text (.txt)
  const handleSaveAsText = () => {
    try {
      const text = getPlainText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileSafeTitle}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Conversation saved as .txt', 'success');
    } catch (e) {
      console.error('Failed to export text file:', e);
      showToast('Failed to export text file', 'error');
    }
  };

  // 5. Save as Markdown (.md)
  const handleSaveAsMarkdown = () => {
    try {
      const md = getFormattedChatMarkdown();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileSafeTitle}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Conversation saved as .md', 'success');
    } catch (e) {
      console.error('Failed to export markdown:', e);
      showToast('Failed to export markdown', 'error');
    }
  };

  // 6. Print / Save as PDF
  const handleExportPdf = () => {
    try {
      exportConversationToPdf(conversation);
      showToast('Opening PDF print preview...', 'info');
    } catch (e) {
      console.error('Failed to export PDF:', e);
      showToast('Failed to export PDF', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            boxShadow: 24,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={18} />
          </Box>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Share & Save Conversation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Export high-res images, markdown, plain text, or copy directly
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Chat Overview Card */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2.5,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.15),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }} noWrap>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<Bot size={13} style={{ marginLeft: 6 }} />}
              label={model}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.72rem', borderColor: alpha(theme.palette.primary.main, 0.3) }}
            />
            <Typography variant="caption" color="text.secondary">
              {messages.length} message{messages.length === 1 ? '' : 's'}
            </Typography>
            <Typography variant="caption" color="text.secondary">•</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        {/* Export Options Grid */}
        <Grid container spacing={2}>
          {/* Option 1: Copy Full Chat */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: copiedSuccess ? 'success.main' : 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea onClick={handleCopyChat} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {copiedSuccess ? (
                    <CheckCircle2 size={20} color={theme.palette.success.main} />
                  ) : (
                    <Copy size={20} color={theme.palette.primary.main} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {copiedSuccess ? 'Copied!' : 'Copy Chat'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Copy complete formatted chat to your clipboard in Markdown.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Option 2: Native OS Share */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea onClick={handleNativeShare} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Share2 size={20} color={theme.palette.primary.main} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Share Link / App
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Send via AirDrop, Messages, Mail, or native share menu.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Option 3: Save as Image (PNG) */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea
                onClick={handleSaveAsImage}
                disabled={isExportingImage}
                sx={{ p: 2, height: '100%' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {isExportingImage ? <CircularProgress size={20} /> : <Image size={20} color={theme.palette.primary.main} />}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {isExportingImage ? 'Generating Image...' : 'Save as Image (.png)'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Download high-resolution image of the conversation with styles.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Option 4: Save as Markdown (.md) */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea onClick={handleSaveAsMarkdown} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Download size={20} color={theme.palette.primary.main} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Save as Markdown (.md)
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Standard Markdown file with code fences, headers, and metadata.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Option 5: Print / Export as PDF */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea onClick={handleExportPdf} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <FileText size={20} color={theme.palette.error.main} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Print / Export as PDF
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Clean, executive printable report with print-to-PDF formatting.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Option 6: Save as Plain Text (.txt) */}
          <Grid size={{ xs: 12, sm: 6 } as any}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardActionArea onClick={handleSaveAsText} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <FileText size={20} color={theme.palette.primary.main} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Save as Plain Text (.txt)
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Unformatted text file for simple note-taking or archiving.
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Hidden Container for Image Generation via html-to-image */}
        <Box
          sx={{
            position: 'fixed',
            left: -9999,
            top: 0,
            width: 720,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <Box
            ref={exportPreviewRef}
            sx={{
              width: 720,
              p: 4,
              bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
              color: theme.palette.mode === 'dark' ? '#f8fafc' : '#0f172a',
              fontFamily: theme.typography.fontFamily,
            }}
          >
            {/* Header in Image */}
            <Box sx={{ borderBottom: '2px solid', borderColor: alpha(theme.palette.primary.main, 0.3), pb: 2, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                {title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={model}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: 'primary.main',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
                </Typography>
              </Box>
            </Box>

            {/* Conversation Messages */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {messages.map((m, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor:
                      m.role === 'user'
                        ? alpha(theme.palette.primary.main, 0.12)
                        : theme.palette.mode === 'dark'
                        ? '#1e293b'
                        : '#f1f5f9',
                    border: '1px solid',
                    borderColor:
                      m.role === 'user'
                        ? alpha(theme.palette.primary.main, 0.25)
                        : 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      display: 'block',
                      mb: 0.75,
                      color: m.role === 'user' ? 'primary.main' : 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {m.role === 'user' ? 'You' : 'Assistant'}
                  </Typography>
                  <MarkdownRenderer content={m.content} />
                </Box>
              ))}
            </Box>

            {/* Footer Watermark */}
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                Exported with <BrandText fontSize="0.74rem" fontWeight={700} /> • Designed by {DEVELOPER_NAME}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="contained" color="inherit" disableElevation>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
