import React from 'react';
import { Alert, Stack, AlertTitle, Collapse } from '@mui/material';

interface ValidationErrorsProps {
  errors: string[];
  title?: string;
  severity?: 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  title,
  severity = 'error',
  onClose
}) => {
  if (!errors.length) return null;

  return (
    <Collapse in={errors.length > 0}>
      <Stack spacing={1} sx={{ mt: 2 }}>
        <Alert 
          severity={severity}
          onClose={onClose}
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </Alert>
      </Stack>
    </Collapse>
  );
}; 