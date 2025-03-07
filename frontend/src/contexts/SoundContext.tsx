import React, { createContext, useContext, useState, useCallback } from 'react';
import { soundManager } from '../utils/soundEffects';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (soundName: string) => void;
}

const SoundContext = createContext<SoundContextType>({
  isSoundEnabled: true,
  toggleSound: () => {},
  playSound: () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
    soundManager.toggle();
  }, []);

  const playSound = useCallback((soundName: string) => {
    if (isSoundEnabled) {
      soundManager.play(soundName);
    }
  }, [isSoundEnabled]);

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext); 