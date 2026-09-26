import { Box, SxProps, Theme } from '@mui/material';
import React, { memo } from 'react';

export interface BrandTextProps {
  fontSize?: string | number | Record<string, string | number>;
  fontWeight?: number;
  component?: React.ElementType;
  sx?: SxProps<Theme>;
  textColor?: string;
  llmColor?: string;
}

function BrandTextComponent({
  fontSize = 'inherit',
  fontWeight = 700,
  component = 'span',
  sx = {},
  textColor = 'text.primary',
  llmColor = 'primary.main',
}: BrandTextProps) {
  const llmWeight = typeof fontWeight === 'number' ? Math.min(900, fontWeight + 100) : 800;

  return (
    <Box
      component={component}
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0,
        verticalAlign: 'baseline',
        userSelect: 'none',
        ...sx,
      }}
    >
      <Box
        component="span"
        sx={{
          fontWeight,
          fontSize,
          lineHeight: 'inherit',
          letterSpacing: '-0.025em',
          color: textColor,
        }}
      >
        Local
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight: llmWeight,
          fontSize,
          lineHeight: 'inherit',
          letterSpacing: '-0.025em',
          color: llmColor,
        }}
      >
        LLM
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight,
          fontSize,
          lineHeight: 'inherit',
          letterSpacing: '-0.025em',
          color: textColor,
        }}
      >
        Mind
      </Box>
    </Box>
  );
}

const BrandText = memo(BrandTextComponent);
export default BrandText;
