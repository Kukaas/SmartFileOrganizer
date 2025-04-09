import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // Default theme
  
  // Initialize theme from Chrome storage or user preferences
  useEffect(() => {
    async function initTheme() {
      try {
        // Try to get theme from Chrome storage
        const { theme: storedTheme } = await chrome.storage.local.get(['theme']);
        
        if (storedTheme) {
          setTheme(storedTheme);
        } else {
          // Check if user prefers dark mode
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const initialTheme = prefersDark ? 'dark' : 'light';
          setTheme(initialTheme);
          
          // Save to Chrome storage
          chrome.storage.local.set({ theme: initialTheme });
        }
      } catch (error) {
        // Fallback to localStorage or default if Chrome APIs aren't available
        if (typeof window !== 'undefined' && window.localStorage) {
          const localTheme = window.localStorage.getItem('theme');
          if (localTheme) {
            setTheme(localTheme);
          } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
          }
        }
      }
    }
    
    initTheme();
  }, []);

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove the old theme class
    root.classList.remove('light', 'dark');
    
    // Add the new theme class
    root.classList.add(theme);
    
    // Save theme to storage
    try {
      chrome.storage.local.set({ theme });
    } catch (error) {
      // Fallback to localStorage if Chrome APIs aren't available
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('theme', theme);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 