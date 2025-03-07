import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { fadeIn, slideIn, pulse, bounce } from '../../utils/animations';

interface TransitionComponentProps extends BoxProps {
  animation?: 'fadeIn' | 'slideIn' | 'pulse' | 'bounce';
  delay?: number;
  children: React.ReactNode;
}

const animations = {
  fadeIn,
  slideIn,
  pulse,
  bounce
};

export const TransitionComponent: React.FC<TransitionComponentProps> = ({
  animation = 'fadeIn',
  delay = 0,
  children,
  sx,
  ...props
}) => {
  return (
    <Box
      sx={{
        animation: `${animations[animation]} 0.5s ease-out ${delay}s`,
        animationFillMode: 'backwards',
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default TransitionComponent; 