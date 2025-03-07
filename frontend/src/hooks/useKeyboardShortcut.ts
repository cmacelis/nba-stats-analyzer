import { useEffect, useCallback } from 'react';

type KeyCombination = string | string[];
type ShortcutCallback = (event: KeyboardEvent) => void;

interface ShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export function useKeyboardShortcut(
  keyCombination: KeyCombination,
  callback: ShortcutCallback,
  options: ShortcutOptions = {}
) {
  const {
    preventDefault = true,
    stopPropagation = true,
    disabled = false
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const keys = Array.isArray(keyCombination) ? keyCombination : [keyCombination];
      const isMatch = keys.some(key => {
        const parts = key.toLowerCase().split('+');
        
        const modifiersMatch = {
          ctrl: parts.includes('ctrl') === event.ctrlKey,
          alt: parts.includes('alt') === event.altKey,
          shift: parts.includes('shift') === event.shiftKey,
          meta: parts.includes('meta') === event.metaKey
        };

        const mainKey = parts.filter(part => 
          !['ctrl', 'alt', 'shift', 'meta'].includes(part)
        )[0];

        return (
          modifiersMatch.ctrl &&
          modifiersMatch.alt &&
          modifiersMatch.shift &&
          modifiersMatch.meta &&
          event.key.toLowerCase() === mainKey
        );
      });

      if (isMatch) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        callback(event);
      }
    },
    [keyCombination, callback, disabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
} 