export class GameStorage {
  private static instance: GameStorage;
  
  static getInstance(): GameStorage {
    if (!GameStorage.instance) {
      GameStorage.instance = new GameStorage();
    }
    return GameStorage.instance;
  }

  saveGameState(gameType: string, gameData: any): void {
    try {
      const key = `game_${gameType}`;
      localStorage.setItem(key, JSON.stringify({
        gameData,
        lastPlayed: new Date().toISOString(),
        isActive: true
      }));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  loadGameState(gameType: string): any {
    try {
      const key = `game_${gameType}`;
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      return parsed.isActive ? parsed.gameData : null;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  deleteGameState(gameType: string): void {
    try {
      const key = `game_${gameType}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete game state:', error);
    }
  }

  getActiveGames(): Array<{gameType: string, lastPlayed: string, gameData: any}> {
    const activeGames = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('game_')) {
          const gameType = key.replace('game_', '');
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.isActive) {
              activeGames.push({
                gameType,
                lastPlayed: parsed.lastPlayed,
                gameData: parsed.gameData
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get active games:', error);
    }
    
    return activeGames.sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
  }

  saveScore(gameType: string, playerName: string, score: number): void {
    try {
      const key = `scores_${gameType}`;
      const existing = localStorage.getItem(key);
      const scores = existing ? JSON.parse(existing) : [];
      
      scores.push({
        playerName,
        score,
        completedAt: new Date().toISOString()
      });
      
      // Keep only top 10 scores
      scores.sort((a: any, b: any) => b.score - a.score);
      localStorage.setItem(key, JSON.stringify(scores.slice(0, 10)));
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  }

  getHighScores(gameType: string): Array<{playerName: string, score: number, completedAt: string}> {
    try {
      const key = `scores_${gameType}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to get high scores:', error);
      return [];
    }
  }
}
