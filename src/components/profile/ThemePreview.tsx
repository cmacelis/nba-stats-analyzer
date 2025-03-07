import React from 'react';
import './ThemePreview.css';

interface ThemePreviewProps {
  theme: 'light' | 'dark';
  onSelect: () => void;
  isActive: boolean;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  onSelect,
  isActive
}) => {
  return (
    <button
      className={`theme-preview theme-preview--${theme} ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`Select ${theme} theme`}
    >
      <div className="theme-preview__header">
        <div className="theme-preview__nav"></div>
      </div>
      <div className="theme-preview__content">
        <div className="theme-preview__sidebar"></div>
        <div className="theme-preview__main"></div>
      </div>
    </button>
  );
};

export default ThemePreview; 