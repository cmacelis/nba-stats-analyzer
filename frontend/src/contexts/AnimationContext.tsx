import React, { createContext, useContext, useState, useCallback } from 'react';

interface AnimationContextType {
  isEnabled: boolean;
  toggleAnimations: () => void;
  getStaggerDelay: (index: number) => number;
  baseDelay: number;
  setBaseDelay: (delay: number) => void;
}

const AnimationContext = createContext<AnimationContextType>({
  isEnabled: true,
  toggleAnimations: () => {},
  getStaggerDelay: () => 0,
  baseDelay: 100,
  setBaseDelay: () => {},
});

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('animations-enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [baseDelay, setBaseDelay] = useState<number>(100);

  const toggleAnimations = useCallback(() => {
    setIsEnabled((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('animations-enabled', JSON.stringify(next));
      return next;
    });
  }, []);

  const getStaggerDelay = useCallback((index: number): number => {
    return isEnabled ? index * baseDelay : 0;
  }, [isEnabled, baseDelay]);

  const value = {
    isEnabled,
    toggleAnimations,
    getStaggerDelay,
    baseDelay,
    setBaseDelay
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => useContext(AnimationContext); 