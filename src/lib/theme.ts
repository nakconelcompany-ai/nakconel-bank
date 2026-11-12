'use client';
import { useCallback, useEffect, useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nkc_theme');
      setDark(saved === 'dark');
    } catch { /**/ }
  }, []);

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nkc_theme', next ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
      } catch { /**/ }
      return next;
    });
  }, []);

  return { dark, toggle };
}
