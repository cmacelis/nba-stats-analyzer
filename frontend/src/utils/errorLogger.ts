type ErrorSeverity = 'low' | 'medium' | 'high';

interface ErrorContext {
  [key: string]: unknown;
}

class ErrorLoggerClass {
  static log(error: Error, severity: ErrorSeverity = 'medium') {
    // In production, this would send to a logging service
    console.error(`[${severity.toUpperCase()}] Error:`, error);

    if (severity === 'high') {
      // Could trigger alerts or notifications
    }
  }

  static logApiError(error: Error, endpoint: string) {
    this.log(error, 'high');
    // Additional API-specific logging
  }
}

export const ErrorLogger = ErrorLoggerClass; 