export interface GenericObject {
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export type ThemeData = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  [key: string]: string;
}; 