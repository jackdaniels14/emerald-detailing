'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ConsoleMode = 'control' | 'sales';

interface ConsoleModeContextType {
  mode: ConsoleMode;
  setMode: (mode: ConsoleMode) => void;
  toggleMode: () => void;
}

const ConsoleModeContext = createContext<ConsoleModeContextType | undefined>(undefined);

export function ConsoleModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ConsoleMode>('control');

  const toggleMode = () => {
    setMode(prev => prev === 'control' ? 'sales' : 'control');
  };

  return (
    <ConsoleModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ConsoleModeContext.Provider>
  );
}

export function useConsoleMode() {
  const context = useContext(ConsoleModeContext);
  if (context === undefined) {
    throw new Error('useConsoleMode must be used within a ConsoleModeProvider');
  }
  return context;
}
