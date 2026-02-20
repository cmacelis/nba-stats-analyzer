import React, { useEffect, useRef, useState } from 'react';
import { Box, BoxProps } from '@mui/material';
import { optimizedAnimations } from '../../utils/animations';
import { useAnimation } from '../../contexts/AnimationContext';

interface AnimatedElementProps extends BoxProps {
  animation: keyof typeof optimizedAnimations;
  delay?: number;
  threshold?: number;
  children: React.ReactNode;
  disableAnimation?: boolean;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  animation,
  delay = 0,
  threshold = 0.1,
  children,
  sx,
  disableAnimation = false,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const { isEnabled: areAnimationsEnabled } = useAnimation();

  const shouldAnimate = areAnimationsEnabled && !disableAnimation;

  useEffect(() => {
    if (!shouldAnimate) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, shouldAnimate]);

  const keyframe = optimizedAnimations[animation];

  return (
    <Box
      ref={elementRef}
      sx={{
        ...(shouldAnimate ? {
          opacity: isVisible ? 1 : 0,
          animation: isVisible ? `${keyframe} 0.3s ease-out ${delay}ms forwards` : 'none',
          willChange: 'transform, opacity',
        } : {}),
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
}; 