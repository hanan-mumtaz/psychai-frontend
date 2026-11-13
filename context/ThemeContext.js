import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';

// Define our strict monochrome & clinical palettes
const darkTheme = {
  isDark: true,
  background: '#09090B', // Deep obsidian
  surface: '#141417',    // Elevated card surface
  primary: '#FAFAFA',    // Pure crisp white text/icons
  secondary: '#A1A1AA',  // Sleek zinc grey
  border: 'rgba(255, 255, 255, 0.12)', // Crisp subtle white corner/outline
  statusBg: '#18181B',
  favicon: require('../assets/favicondark.png'),
};

const lightTheme = {
  isDark: false,
  background: '#F5F7FA', // Anti-glare soft clinical canvas (low eye strain)
  surface: '#FFFFFF',    // Crisp elevated white cards with high contrast
  primary: '#09090B',    // Deep slate obsidian (readable, no harsh stark black)
  secondary: '#64748B',  // Calming slate metadata text
  border: '#E2E8F0',     // Subtle, crisp card outline
  statusBg: '#EEF2F6',
  favicon: require('../assets/faviconlight.png'),
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Defaulting to Dark Mode as requested
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Dynamically update favicon in web browser tabs based on theme
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        const faviconSrc = isDarkMode 
          ? require('../assets/favicondark.png')
          : require('../assets/faviconlight.png');
        
        link.href = typeof faviconSrc === 'string' ? faviconSrc : (faviconSrc.default || faviconSrc.uri || faviconSrc);
      } catch (e) {
        console.warn("Could not dynamically update web favicon", e);
      }
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);