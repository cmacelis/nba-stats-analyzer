import React, { useEffect, useState } from 'react';
import { Box, BoxProps } from '@mui/material';
import { optimizedAnimations } from '../utils/animations';
import { useInView } from 'react-intersection-observer';

interface AnimatedElementProps extends BoxProps {
  children: React.ReactNode;
  animation?: keyof typeof optimizedAnimations;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  disabled?: boolean;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 500,
  threshold = 0.1,
  once = true,
  disabled = false,
  ...boxProps
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const { ref, inView } = useInView({
    threshold,
    triggerOnce: once,
  });

  useEffect(() => {
    if (inView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [inView, hasAnimated]);

  const shouldAnimate = !disabled && (inView || hasAnimated);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: shouldAnimate ? 1 : 0,
        animation: shouldAnimate
          ? `${optimizedAnimations[animation]} ${duration}ms ${delay}ms forwards ease-out`
          : 'none',
        ...boxProps.sx,
      }}
      {...boxProps}
    >
      {children}
    </Box>
  );
}; 