import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';

const DEFAULT_ACCENT = '#FF6B00';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert hex color to rgba string
const hexToRgba = (hex: string, alpha: number) => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(255, 107, 0, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminProfile, user } = useAuth();
  const [themeColor, setThemeColorState] = useState<string>(() => {
    return localStorage.getItem('sakay_theme_color') || DEFAULT_ACCENT;
  });

  // Apply theme CSS variables to document root
  const applyThemeVariables = (color: string) => {
    const root = document.documentElement;
    root.style.setProperty('--sakay-orange', color);
    root.style.setProperty('--sakay-orange-soft', hexToRgba(color, 0.1));
    root.style.setProperty('--sakay-orange-border', hexToRgba(color, 0.25));
    root.style.setProperty('--sakay-orange-hover', color);
  };

  useEffect(() => {
    applyThemeVariables(themeColor);
  }, [themeColor]);

  // Load stored theme color from admin profile if available
  useEffect(() => {
    if (adminProfile && (adminProfile as any).theme_color) {
      const dbColor = (adminProfile as any).theme_color;
      if (dbColor && dbColor !== themeColor) {
        setThemeColorState(dbColor);
        localStorage.setItem('sakay_theme_color', dbColor);
      }
    }
  }, [adminProfile]);

  const setThemeColor = async (newColor: string) => {
    setThemeColorState(newColor);
    localStorage.setItem('sakay_theme_color', newColor);
    applyThemeVariables(newColor);

    if (user && adminProfile) {
      try {
        await supabase
          .from('lgu_admin')
          .update({ theme_color: newColor })
          .eq('auth_user_id', user.id);
      } catch (err) {
        console.error('Failed to save theme color to database:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
