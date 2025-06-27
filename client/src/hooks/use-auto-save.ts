import { useEffect, useRef } from 'react';
import { GameStorage } from '@/lib/game-storage';

interface AutoSaveOptions {
  gameType: string;
  gameState: any;
  enabled?: boolean;
}

export function useAutoSave({ gameType, gameState, enabled = true }: AutoSaveOptions) {
  const gameStorage = GameStorage.getInstance();
  const savedStateRef = useRef<any>(null);

  const saveGame = () => {
    if (!enabled || !gameState) return;
    
    // Only save if the game state has actually changed
    if (JSON.stringify(gameState) !== JSON.stringify(savedStateRef.current)) {
      gameStorage.saveGameState(gameType, gameState);
      savedStateRef.current = gameState;
    }
  };

  // Auto-save on component unmount (when navigating away)
  useEffect(() => {
    return () => {
      saveGame();
    };
  }, [gameState, enabled]);

  // Auto-save on browser events (refresh, close tab, etc.)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      saveGame();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveGame();
      }
    };

    // Save when tab becomes hidden or page is about to unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState, enabled]);

  // Auto-save periodically (every 30 seconds)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      saveGame();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [gameState, enabled]);

  return { saveGame };
}