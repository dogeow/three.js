'use client';

import { useEffect, useState, useCallback } from 'react';

const KEY = 'threejs-gallery-theme';

function readInitialTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(readInitialTheme);

  useEffect(() => {
    const current = readInitialTheme();
    if (current !== theme) setTheme(current);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return (
    <button className="theme-toggle" onClick={toggle} title={theme === 'dark' ? '切换到浅色' : '切换到深色'} aria-label="切换主题">
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
