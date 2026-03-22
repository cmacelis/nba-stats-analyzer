// Shared interfaces for multi-sport API expansion

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: any;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SportContext {
  sport: string;
  league?: string;
  season?: string;
}

export interface PlayerSearchParams {
  query: string;
  sport?: string;
  league?: string;
  position?: string;
  team?: string;
  limit?: number;
  offset?: number;
}

export interface EdgeDataParams {
  sport: string;
  league?: string;
  date?: string;
  playerId?: string;
  teamId?: string;
  metric?: string;
  threshold?: number;
}