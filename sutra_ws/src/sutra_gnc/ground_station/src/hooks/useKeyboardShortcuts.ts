import { useEffect } from 'react';

export interface ShortcutHandlers {
  onTriggerRTH?: () => void;
  onToggleFleet?: () => void;
  onSelectNavTab?: (tab: 'DASHBOARD' | 'LIVE_OPERATIONS' | 'AI_INTELLIGENCE' | 'ANALYTICS') => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside input elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'r' && handlers.onTriggerRTH) {
        e.preventDefault();
        handlers.onTriggerRTH();
      } else if (key === 'f' && handlers.onToggleFleet) {
        e.preventDefault();
        handlers.onToggleFleet();
      } else if (key === 'l' && handlers.onSelectNavTab) {
        e.preventDefault();
        handlers.onSelectNavTab('LIVE_OPERATIONS');
      } else if (key === 'a' && handlers.onSelectNavTab) {
        e.preventDefault();
        handlers.onSelectNavTab('AI_INTELLIGENCE');
      } else if (key === 'd' && handlers.onSelectNavTab) {
        e.preventDefault();
        handlers.onSelectNavTab('DASHBOARD');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
