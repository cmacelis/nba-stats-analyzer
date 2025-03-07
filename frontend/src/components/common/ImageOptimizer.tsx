import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  quality?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width = 'auto',
  height = 'auto',
  quality = 75,
  loading = 'lazy',
  className
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');

  useEffect(() => {
    const img = new Image();
    const urlParams = new URLSearchParams();
    urlParams.set('q', quality.toString());
    
    // Add image optimization service URL here
    // const optimizedUrl = `${OPTIMIZATION_SERVICE}/${src}?${urlParams.toString()}`;
    const optimizedUrl = src; // For now, use original source

    img.src = optimizedUrl;
    setOptimizedSrc(optimizedUrl);

    img.onload = () => {
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };
  }, [src, quality]);

  if (error) {
    return (
      <Box
        component="div"
        sx={{
          width,
          height,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}
      >
        Failed to load image
      </Box>
    );
  }

  return (
    <Box position="relative">
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width={width}
          height={height}
          animation="wave"
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={className}
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </Box>
  );
}; 