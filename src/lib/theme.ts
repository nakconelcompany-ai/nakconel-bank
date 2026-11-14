'use client';
import { useCallback, useEffect, useState } from 'react';

function applyTheme(theme: 'light' | 'dark') {
  try {
    localStorage.setItem('nkc_theme', theme);
  } catch { /* Theme still applies for this page session. */ }
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
}

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let saved: 'light' | 'dark' = 'light';
    try {
      saved = localStorage.getItem('nkc_theme') === 'dark' ? 'dark' : 'light';
    } catch { /* Use light theme when storage is unavailable. */ }
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : '');
    setDark(saved === 'dark');
  }, []);

  const toggle = useCallback(() => {
    setDark(current => {
      const next = current ? 'light' : 'dark';
      applyTheme(next);
      return next === 'dark';
    });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    applyTheme(theme);
    setDark(theme === 'dark');
  }, []);

  return { dark, toggle, setTheme };
}
