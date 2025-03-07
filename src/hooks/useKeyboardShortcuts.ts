import { useEffect } from 'react';

type KeyCombo = string[];
type ShortcutHandler = () => void;

interface ShortcutMap {
  [key: string]: {
    combo: KeyCombo;
    handler: ShortcutHandler;
    description: string;
  };
}

export const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.add(event.key.toLowerCase());

      Object.values(shortcuts).forEach(({ combo, handler }) => {
        const allKeysPressed = combo.every(key => 
          pressedKeys.has(key.toLowerCase())
        );

        if (allKeysPressed) {
          event.preventDefault();
          handler();
        }
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shortcuts]);

  const getShortcutList = () => {
    return Object.entries(shortcuts).map(([name, { combo, description }]) => ({
      name,
      combo: combo.join(' + '),
      description
    }));
  };

  return { getShortcutList };
}; 