import { useState, memo } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Avatar,
  Chip,
  Button,
  Stack,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Code2,
  Sparkles,
  Container,
  Terminal,
} from 'lucide-react';
import {
  DEVELOPER_NAME,
  DEVELOPER_HANDLE,
  DEVELOPER_BIO,
  DEVELOPER_AVATAR,
  APP_NAME,
  APP_VERSION,
  DOCKERHUB_IMAGE_URL,
  DOCKERHUB_PULL_CMD,
  SOCIAL_PROFILES,
} from '../../constants/appConstants';
import { showToast } from '../../utils/toast';

// Custom Brand Icons for Social Profiles
function BrandSocialIcon({ id, size = 18, color = 'currentColor' }) {
  switch (id) {
    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    case 'x':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    default:
      return <ExternalLink size={size} color={color} />;
  }
}

function AboutMeModalComponent({ open, onClose }) {
  const theme = useTheme();
  const [copiedDocker, setCopiedDocker] = useState(false);

  const handleCopyDockerCmd = () => {
    navigator.clipboard.writeText(DOCKERHUB_PULL_CMD);
    setCopiedDocker(true);
    showToast('Copied Docker pull command to clipboard!', 'success');
    setTimeout(() => setCopiedDocker(false), 2200);
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
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          },
        },
      }}
    >
      {/* Top Banner / Graphic Header */}
      <Box
        sx={{
          height: 125,
          position: 'relative',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 40%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          p: 1.5,
        }}
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.35)',
            color: '#ffffff',
            backdropFilter: 'blur(8px)',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.55)' },
          }}
        >
          <X size={16} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 0, pb: 3, px: 3, position: 'relative', overflow: 'visible' }}>
        {/* Avatar Overlap */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: -6, mb: 2, position: 'relative', zIndex: 2 }}>
          <Avatar
            src={DEVELOPER_AVATAR}
            alt={DEVELOPER_NAME}
            sx={{
              width: 88,
              height: 88,
              border: `4px solid ${theme.palette.background.paper}`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              bgcolor: 'primary.main',
              fontSize: '1.75rem',
              fontWeight: 700,
              position: 'relative',
              zIndex: 3,
            }}
          >
            KY
          </Avatar>

          <Chip
            icon={<Code2 size={13} />}
            label="Software Engineer"
            size="small"
            sx={{
              height: 26,
              fontSize: '0.74rem',
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            }}
          />
        </Box>

        {/* Creator Name & Title */}
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.4rem' }}>
              {DEVELOPER_NAME}
            </Typography>
            <Tooltip title="Verified Creator & Maintainer">
              <CheckCircle2 size={18} color="#3b82f6" fill={alpha('#3b82f6', 0.2)} />
            </Tooltip>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem', mt: 0.25 }}>
            {DEVELOPER_HANDLE} · {DEVELOPER_BIO}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, fontSize: '0.86rem', lineHeight: 1.55 }}>
            Creator and lead engineer of <strong style={{ color: theme.palette.text.primary }}>{APP_NAME}</strong>, the high-performance local AI workspace engineered with frontier cloud model integration, private Ollama execution, and interactive code workspace tooling.
          </Typography>
        </Box>

        {/* Docker Hub Image Link Card */}
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            borderRadius: 2.5,
            bgcolor: alpha('#2496ed', 0.08),
            border: `1px solid ${alpha('#2496ed', 0.25)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Container size={18} color="#2496ed" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}>
                Docker Hub Official Image
              </Typography>
            </Box>
            <Button
              size="small"
              href={DOCKERHUB_IMAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ExternalLink size={13} />}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#2496ed',
                p: '3px 8px',
              }}
            >
              View on Docker Hub
            </Button>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.4 }}>
            Run {APP_NAME} instantly in any containerized environment with zero local configuration.
          </Typography>

          {/* Copyable pull snippet */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: '#0d1117',
              color: '#58a6ff',
              px: 1.5,
              py: 0.8,
              borderRadius: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, overflow: 'hidden' }}>
              <Terminal size={14} color="#8b949e" />
              <Typography variant="caption" noWrap sx={{ fontFamily: 'monospace', color: '#f0f6fc', fontSize: '0.78rem' }}>
                {DOCKERHUB_PULL_CMD}
              </Typography>
            </Stack>

            <Tooltip title={copiedDocker ? 'Copied!' : 'Copy command'}>
              <IconButton size="small" onClick={handleCopyDockerCmd} sx={{ color: '#8b949e', ml: 1, p: '4px' }}>
                {copiedDocker ? <Check size={14} color="#3fb950" /> : <Copy size={14} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Social Media Profiles Section (Strictly ONLY social media links) */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              display: 'block',
              mb: 1.25,
            }}
          >
            Social Media Profiles
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.25,
            }}
          >
            {SOCIAL_PROFILES.map((profile) => (
              <Box
                key={profile.id}
                component="a"
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: profile.color,
                    bgcolor: alpha(profile.color, 0.08),
                    transform: 'translateY(-1.5px)',
                    boxShadow: `0 4px 12px ${alpha(profile.color, 0.15)}`,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(profile.color, 0.15),
                      color: profile.color,
                      flexShrink: 0,
                    }}
                  >
                    <BrandSocialIcon id={profile.id} size={16} color={profile.color} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }} noWrap>
                      {profile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }} noWrap>
                      {profile.handle}
                    </Typography>
                  </Box>
                </Box>

                <ExternalLink size={13} style={{ opacity: 0.6, flexShrink: 0, marginLeft: 8 }} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer info */}
        <Box sx={{ pt: 2, mt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {APP_NAME} · Version {APP_VERSION}
          </Typography>

          <Button size="small" onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontSize: '0.75rem', textTransform: 'none' }}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const AboutMeModal = memo(AboutMeModalComponent);
export default AboutMeModal;
