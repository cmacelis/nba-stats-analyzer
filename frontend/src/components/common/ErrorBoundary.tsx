import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Box, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="error"
            action={
              <Button color="inherit" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            }
          >
            Something went wrong. Please try again.
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
} 