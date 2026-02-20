import { optimizedAnimations } from './animations';

export const animationPresets = {
  pageTransition: {
    animation: `${optimizedAnimations.fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`
  },
  listItem: {
    animation: `${optimizedAnimations.slideIn} 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards`
  },
  modal: {
    animation: `${optimizedAnimations.scaleIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards`
  }
};

export const getAnimationPreset = (preset: keyof typeof animationPresets) => {
  return animationPresets[preset];
}; 