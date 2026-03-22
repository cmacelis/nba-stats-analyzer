// Standardized response format
export function ok<T>(data: T, meta?: any) {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString()
  };
}

export function fail(code: string, message: string, status: number = 400) {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString()
  };
}