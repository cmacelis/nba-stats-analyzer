import { optimizedAnimations } from './animations';

export const animationPresets = {
  pageTransition: {
    ...optimizedAnimations.fadeIn,
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  listItem: {
    ...optimizedAnimations.slideIn,
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  modal: {
    ...optimizedAnimations.scaleIn,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

export const getAnimationPreset = (preset: keyof typeof animationPresets) => {
  return animationPresets[preset];
}; 