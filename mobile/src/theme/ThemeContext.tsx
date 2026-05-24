import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_COLORS = {
  background: '#0D0B0A',
  surface: '#1A1513',
  card: '#231E1B',
  border: '#2E2521',
  text: '#F0EBE5',
  textSecondary: '#C0B5AC',
  textMuted: '#9A8878',
  primary: '#A0673A',
  primaryLight: '#C49070',
  primaryDark: '#7A4D2A',
  secondary: '#D4A96A',
  accent: '#C4936A',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#1A1513',
  gray100: '#231E1B',
  gray200: '#2E2521',
  gray300: '#4A3E37',
  gray400: '#7A6B61',
  gray500: '#9A8878',
  gray600: '#BFB3A8',
  gray700: '#D4CCC6',
  gray800: '#EAE4DF',
  gray900: '#F0EBE5',
  success: '#48BB78',
  warning: '#F6AD55',
  error: '#FC8181',
  info: '#63B3ED',
  urgencyLow: '#10B981',
  urgencyMedium: '#F6AD55',
  urgencyHigh: '#FC8181',
  urgencyEmergency: '#EF233C',
  xpGold: '#D4A96A',
  xpBronze: '#A0673A',
};

const LIGHT_COLORS = {
  background: '#F5F0EB',
  surface: '#FFFFFF',
  card: '#FAF7F4',
  border: '#E8DDD5',
  text: '#1A1210',
  textSecondary: '#4A3E35',
  textMuted: '#7A6B61',
  primary: '#A0673A',
  primaryLight: '#C49070',
  primaryDark: '#7A4D2A',
  secondary: '#D4A96A',
  accent: '#C4936A',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F5F0EB',
  gray100: '#EDE5DC',
  gray200: '#E0D4C8',
  gray300: '#C8B8A8',
  gray400: '#9A8878',
  gray500: '#7A6B61',
  gray600: '#5A4E47',
  gray700: '#3A322D',
  gray800: '#2A2019',
  gray900: '#1A1210',
  success: '#2D9954',
  warning: '#D4870A',
  error: '#D94040',
  info: '#2B7BB5',
  urgencyLow: '#2D9954',
  urgencyMedium: '#D4870A',
  urgencyHigh: '#D94040',
  urgencyEmergency: '#C01028',
  xpGold: '#B8860B',
  xpBronze: '#A0673A',
};

export type ThemeColors = typeof DARK_COLORS;

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((val) => {
      if (val === 'light') setIsDark(false);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { DARK_COLORS, LIGHT_COLORS };
