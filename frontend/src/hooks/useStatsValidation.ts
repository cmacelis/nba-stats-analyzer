import { useState, useCallback } from 'react';
import { PlayerStats } from '../types/player';
import { ValidationResult } from '../types/validation';
import { validateStats } from '../utils/validationUtils';
import { statValidations } from '../validations/statValidations';

export function useStatsValidation() {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validatePlayerStats = useCallback((stats: PlayerStats): boolean => {
    const result = validateStats(stats, statValidations);
    setValidationErrors(result.errors);
    return result.isValid;
  }, []);

  return {
    validationErrors,
    validatePlayerStats,
    clearErrors: () => setValidationErrors([])
  };
} 