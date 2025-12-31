import { useState, useEffect } from "react";
import { GameStorage } from "@/lib/game-storage";
import { Shuffle, Zap, Play } from "lucide-react";

const GAMES = [
  { title: "Tic-Tac-Toe", emoji: "⭕", tile: "tile-blue", route: "/tic-tac-toe", category: "versus" },
  { title: "Hangman", emoji: "🎯", tile: "tile-red", route: "/hangman", category: "brain" },
  { title: "Mad Libs", emoji: "📝", tile: "tile-purple", route: "/mad-libs", category: "laughs" },
  { title: "Would You Rather", emoji: "🤔", tile: "tile-pink", route: "/would-you-rather", category: "laughs" },
  { title: "Word Search", emoji: "🔍", tile: "tile-green", route: "/word-search", category: "brain" },
  { title: "Dots & Boxes", emoji: "⬜", tile: "tile-yellow", route: "/dots-and-boxes", category: "versus" },
  { title: "Word Scramble", emoji: "🔤", tile: "tile-indigo", route: "/word-scramble", category: "brain" },
  { title: "Yahtzee", emoji: "🎲", tile: "tile-teal", route: "/yahtzee", category: "versus" },
  { title: "Dice Roller", emoji: "🎯", tile: "tile-orange", route: "/dice-roller", category: "versus" },
  { title: "Scorecard", emoji: "📊", tile: "tile-blue", route: "/scorecard", category: "versus" },
  { title: "Sudoku", emoji: "🔢", tile: "tile-pink", route: "/sudoku", category: "brain" },
  { title: "Connect Four", emoji: "🔴", tile: "tile-red", route: "/connect-four", category: "versus" },
  { title: "Battleship", emoji: "⚓", tile: "tile-slate", route: "/battleship", category: "versus" },
  { title: "Shell Game", emoji: "🥥", tile: "tile-orange", route: "/shell-game", category: "brain" }
];

const CATEGORIES = [
  { id: "all", label: "All", icon: "🎮" },
  { id: "laughs", label: "Fun", icon: "😂" },
  { id: "brain", label: "Think", icon: "🧠" },
  { id: "versus", label: "Play", icon: "⚔️" }
];

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    setActiveGames(gameStorage.getActiveGames());
  }, []);

  const getGameProgress = (gameType: string) => {
    const activeGame = activeGames.find(game => game.gameType === gameType);
    if (!activeGame) return undefined;
    switch (gameType) {
      case 'tic-tac-toe': return activeGame.gameData?.moves?.length * 11 || 10;
      case 'word-search':
        const found = activeGame.gameData?.foundWords?.length || 0;
        const total = activeGame.gameData?.totalWords || 8;
        return Math.round((found / total) * 100);
      case 'yahtzee': return Math.round(((activeGame.gameData?.currentRound || 1) / 13) * 100);
      default: return 33;
    }
  };

  const filteredGames = selectedCategory === "all" 
    ? GAMES 
    : GAMES.filter(game => game.category === selectedCategory);

  const handleRandomGame = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    window.location.href = randomGame.route;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex-shrink-0" style={{ maxHeight: '18vh' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-lg">🎮</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">Family Games</h1>
                <p className="text-xs text-slate-500">{GAMES.length} games to play</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeGames.length > 0 && (
                <div className="flex -space-x-1">
                  {activeGames.slice(0, 3).map((game) => {
                    const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                    if (!gameInfo) return null;
                    return (
                      <button
                        key={game.gameType}
                        className={`w-7 h-7 rounded-lg ${gameInfo.tile} flex items-center justify-center shadow-sm ring-2 ring-white animate-press`}
                        onClick={() => window.location.href = gameInfo.route}
                        data-testid={`continue-game-${game.gameType}`}
                      >
                        <span className="text-sm">{gameInfo.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              <button
                onClick={handleRandomGame}
                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md animate-press"
                data-testid="button-random-game"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Random</span>
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl font-semibold text-xs transition-all animate-press
                  ${selectedCategory === cat.id 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
                data-testid={`category-${cat.id}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filteredGames.map((game, index) => {
              const gameType = game.route.replace('/', '');
              const isActive = activeGames.some(active => active.gameType === gameType);
              const progress = isActive ? getGameProgress(gameType) : undefined;
              
              return (
                <button
                  key={game.title}
                  onClick={() => window.location.href = game.route}
                  className={`
                    relative aspect-square rounded-2xl overflow-hidden
                    ${game.tile} shadow-card hover:shadow-card-hover
                    transform transition-all duration-200 animate-press
                    focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                  data-testid={`game-tile-${gameType}`}
                >
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <div className="bg-white/95 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-violet-600 shadow-sm">
                        {progress}%
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="text-2xl sm:text-3xl mb-1">{game.emoji}</div>
                    <div className="text-white font-bold text-[11px] sm:text-xs text-center leading-tight px-1 drop-shadow-sm">
                      {game.title}
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-white/10 pointer-events-none"></div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-2 text-center flex-shrink-0">
        <p className="text-slate-400 text-xs">Made for family fun 💜</p>
      </footer>
    </div>
  );
}
