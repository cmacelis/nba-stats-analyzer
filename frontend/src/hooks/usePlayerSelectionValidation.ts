import { useState, useCallback } from 'react';
import { Player } from '../types/player';

interface PlayerSelectionValidation {
  errors: string[];
  validateSelection: (player1: Player | null, player2: Player | null) => boolean;
  clearErrors: () => void;
}

export function usePlayerSelectionValidation(): PlayerSelectionValidation {
  const [errors, setErrors] = useState<string[]>([]);

  const validateSelection = useCallback((player1: Player | null, player2: Player | null): boolean => {
    const newErrors: string[] = [];

    if (!player1 && !player2) {
      newErrors.push('Please select two players to compare');
    } else {
      if (!player1) {
        newErrors.push('Please select the first player');
      }
      if (!player2) {
        newErrors.push('Please select the second player');
      }
      if (player1 && player2 && player1.id === player2.id) {
        newErrors.push('Please select different players');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    validateSelection,
    clearErrors
  };
} 