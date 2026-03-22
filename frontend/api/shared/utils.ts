// Common utilities for API handlers

import type { SportContext } from './types';

/**
 * Validates sport parameter
 */
export function validateSport(sport: string): boolean {
  const validSports = ['nba', 'wnba', 'nfl', 'mlb', 'nhl', 'soccer'];
  return validSports.includes(sport.toLowerCase());
}

/**
 * Extracts sport context from request
 */
export function getSportContext(sport?: string, league?: string): SportContext {
  const defaultSport = 'nba';
  const context: SportContext = { sport: sport || defaultSport };
  
  if (league) {
    context.league = league;
  }
  
  return context;
}

/**
 * Sanitizes query parameters
 */
export function sanitizeQuery(query: string): string {
  return query.trim().replace(/[^\w\s-]/g, '').substring(0, 100);
}

/**
 * Validates pagination parameters
 */
export function validatePagination(page?: number, limit?: number): { page: number; limit: number } {
  const defaultPage = 1;
  const defaultLimit = 20;
  const maxLimit = 100;
  
  let validatedPage = page || defaultPage;
  let validatedLimit = limit || defaultLimit;
  
  if (validatedPage < 1) validatedPage = defaultPage;
  if (validatedLimit < 1) validatedLimit = defaultLimit;
  if (validatedLimit > maxLimit) validatedLimit = maxLimit;
  
  return { page: validatedPage, limit: validatedLimit };
}

/**
 * Calculates pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}