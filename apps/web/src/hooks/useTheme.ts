'use client';

import { useEffect, useState } from 'react';

/** Returns [isDark, toggle] and persists preference in localStorage. */
export function useTheme(): [boolean, () => void] {
  const [isDark, setIsDark] = useState(false);

  // Initialise from localStorage or system preference (client-only)
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply / remove `.dark` on <html> whenever state changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return [isDark, toggle];
}
