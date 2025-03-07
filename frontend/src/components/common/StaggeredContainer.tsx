import React, { Children, cloneElement, isValidElement, ReactElement } from 'react';
import { Box, BoxProps } from '@mui/material';
import { getStaggerDelay } from '../../utils/animations';

interface StaggeredContainerProps extends BoxProps {
  staggerDelay?: number;
  children: React.ReactNode;
}

export const StaggeredContainer: React.FC<StaggeredContainerProps> = ({
  staggerDelay = 100,
  children,
  ...props
}) => {
  return (
    <Box {...props}>
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child as ReactElement<any>, {
            sx: {
              ...child.props.sx,
              animationDelay: getStaggerDelay(index, staggerDelay)
            }
          });
        }
        return child;
      })}
    </Box>
  );
}; 