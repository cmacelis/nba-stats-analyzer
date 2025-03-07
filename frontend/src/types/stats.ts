import { PlayerStats } from './player';

export interface StatConfig {
  key: keyof PlayerStats;
  label: string;
  format: '0' | '0.0' | '0.00';
  suffix?: '%' | '+/-';
  isInverse?: boolean;
  baseline?: number;
  description?: string;
}

export interface StatCategory {
  category: string;
  stats: StatConfig[];
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
} 