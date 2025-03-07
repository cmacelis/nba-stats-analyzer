import * as React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeSettings.css';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ThemeData } from '../../types/common';

const defaultThemes: Record<string, ThemeData> = {
  light: {
    primary: '#1e3c72',
    secondary: '#2a5298',
    background: '#ffffff',
    text: '#333333'
  },
  dark: {
    primary: '#2a5298',
    secondary: '#1e3c72',
    background: '#1a1a1a',
    text: '#ffffff'
  }
};

const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [customTheme, setCustomTheme] = React.useState<ThemeData>(defaultThemes[theme]);
  const [previewTheme, setPreviewTheme] = React.useState<ThemeData | null>(null);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as 'light' | 'dark');
    setCustomTheme(defaultThemes[newTheme]);
  };

  const handleColorChange = (key: keyof ThemeData, value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyCustomTheme = () => {
    const root = document.documentElement;
    Object.entries(customTheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const resetTheme = () => {
    setCustomTheme(defaultThemes[theme]);
    const root = document.documentElement;
    Object.entries(defaultThemes[theme]).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  React.useEffect(() => {
    const root = document.documentElement;
    const themeToApply = previewTheme || customTheme;
    
    Object.entries(themeToApply).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    return () => {
      // Reset to default theme on cleanup
      if (previewTheme) {
        Object.entries(defaultThemes[theme]).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      }
    };
  }, [previewTheme, customTheme, theme]);

  return (
    <div className="theme-settings">
      <section className="theme-mode">
        <h3>Theme Mode</h3>
        <div className="theme-options">
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => handleThemeChange('light')}
          >
            Light
          </button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => handleThemeChange('dark')}
          >
            Dark
          </button>
          <button
            className={theme === 'system' ? 'active' : ''}
            onClick={() => handleThemeChange(prefersDark ? 'dark' : 'light')}
          >
            System
          </button>
        </div>
      </section>

      <section className="color-customization">
        <h3>Customize Colors</h3>
        <div className="color-inputs">
          {Object.entries(customTheme).map(([key, value]) => (
            <div key={key} className="color-input">
              <label>{key}</label>
              <input
                type="color"
                value={value}
                onChange={(e) => handleColorChange(key as keyof ThemeData, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="theme-actions">
          <button onClick={applyCustomTheme}>Apply Theme</button>
          <button onClick={resetTheme}>Reset</button>
        </div>
      </section>
    </div>
  );
};

export default ThemeSettings; 