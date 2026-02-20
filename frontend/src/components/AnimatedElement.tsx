import React, { useEffect, useRef, useState } from 'react';
import { Box, BoxProps } from '@mui/material';
import { optimizedAnimations } from '../utils/animations';

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
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [disabled, once, threshold]);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: isVisible ? 1 : 0,
        animation: isVisible
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
