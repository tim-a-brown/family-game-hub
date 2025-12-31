import { useState, useEffect } from "react";
import { GameStorage } from "@/lib/game-storage";
import { Shuffle, Zap } from "lucide-react";

const GAMES = [
  {
    title: "Tic-Tac-Toe",
    emoji: "⭕",
    gradient: "candy-gradient-blue",
    route: "/tic-tac-toe",
    category: "versus",
    tagline: "Classic!"
  },
  {
    title: "Hangman",
    emoji: "🎯",
    gradient: "candy-gradient-red",
    route: "/hangman",
    category: "brain",
    tagline: "Guess it!"
  },
  {
    title: "Mad Libs",
    emoji: "📝",
    gradient: "candy-gradient-purple",
    route: "/mad-libs",
    category: "laughs",
    tagline: "So silly!"
  },
  {
    title: "Would You Rather",
    emoji: "🤔",
    gradient: "candy-gradient-pink",
    route: "/would-you-rather",
    category: "laughs",
    tagline: "Tough pick!"
  },
  {
    title: "Word Search",
    emoji: "🔍",
    gradient: "candy-gradient-green",
    route: "/word-search",
    category: "brain",
    tagline: "Find 'em!"
  },
  {
    title: "Dots & Boxes",
    emoji: "⬜",
    gradient: "candy-gradient-yellow",
    route: "/dots-and-boxes",
    category: "versus",
    tagline: "Claim it!"
  },
  {
    title: "Word Scramble",
    emoji: "🔤",
    gradient: "candy-gradient-purple",
    route: "/word-scramble",
    category: "brain",
    tagline: "Unscramble!"
  },
  {
    title: "Yahtzee",
    emoji: "🎲",
    gradient: "candy-gradient-teal",
    route: "/yahtzee",
    category: "versus",
    tagline: "Roll it!"
  },
  {
    title: "Dice Roller",
    emoji: "🎯",
    gradient: "candy-gradient-orange",
    route: "/dice-roller",
    category: "versus",
    tagline: "Lucky?"
  },
  {
    title: "Scorecard",
    emoji: "📊",
    gradient: "candy-gradient-blue",
    route: "/scorecard",
    category: "versus",
    tagline: "Track it!"
  },
  {
    title: "Sudoku",
    emoji: "🔢",
    gradient: "candy-gradient-pink",
    route: "/sudoku",
    category: "brain",
    tagline: "Numbers!"
  },
  {
    title: "Connect Four",
    emoji: "🔴",
    gradient: "candy-gradient-red",
    route: "/connect-four",
    category: "versus",
    tagline: "Drop it!"
  },
  {
    title: "Battleship",
    emoji: "⚓",
    gradient: "candy-gradient-blue",
    route: "/battleship",
    category: "versus",
    tagline: "Sink 'em!"
  },
  {
    title: "Shell Game",
    emoji: "🥥",
    gradient: "candy-gradient-orange",
    route: "/shell-game",
    category: "brain",
    tagline: "Watch it!"
  }
];

const CATEGORIES = [
  { id: "all", label: "All Games", icon: "🎮", color: "from-purple-500 to-pink-500" },
  { id: "laughs", label: "Giggles", icon: "😂", color: "from-pink-500 to-orange-400" },
  { id: "brain", label: "Brain Boost", icon: "🧠", color: "from-blue-500 to-teal-400" },
  { id: "versus", label: "VS Battle", icon: "⚔️", color: "from-orange-500 to-red-500" }
];

const GameTile = ({ game, index, isActive, progress, onClick }: {
  game: typeof GAMES[0];
  index: number;
  isActive?: boolean;
  progress?: number;
  onClick: () => void;
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      className={`
        relative w-full aspect-square rounded-3xl overflow-hidden
        transform transition-all duration-200 ease-out
        ${game.gradient}
        ${isPressed ? 'scale-95' : 'hover:scale-105 active:scale-95'}
        shadow-playful hover:shadow-playful-lg
        focus:outline-none focus:ring-4 focus:ring-white/50
      `}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      data-testid={`game-tile-${game.route.replace('/', '')}`}
    >
      {isActive && (
        <div className="absolute top-1 right-1 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full animate-pulse-ring"></div>
            <div className="relative bg-white text-xs font-bold px-1.5 py-0.5 rounded-full text-purple-600 shadow-lg">
              {progress ? `${progress}%` : <Zap className="w-3 h-3" />}
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
        <div className="text-3xl sm:text-4xl mb-1 transform transition-transform duration-200 group-hover:scale-110">
          {game.emoji}
        </div>
        <div className="text-white font-display font-bold text-xs sm:text-sm text-center leading-tight text-shadow-fun px-1">
          {game.title}
        </div>
        <div className="text-white/80 text-[10px] sm:text-xs font-medium mt-0.5">
          {game.tagline}
        </div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
    </button>
  );
};

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const active = gameStorage.getActiveGames();
    setActiveGames(active);
  }, []);

  const getGameProgress = (gameType: string) => {
    const activeGame = activeGames.find(game => game.gameType === gameType);
    if (!activeGame) return undefined;
    
    switch (gameType) {
      case 'tic-tac-toe':
        return activeGame.gameData?.moves?.length * 11 || 10;
      case 'word-search':
        const found = activeGame.gameData?.foundWords?.length || 0;
        const total = activeGame.gameData?.totalWords || 8;
        return Math.round((found / total) * 100);
      case 'yahtzee':
        const round = activeGame.gameData?.currentRound || 1;
        return Math.round((round / 13) * 100);
      default:
        return 33;
    }
  };

  const filteredGames = selectedCategory === "all" 
    ? GAMES 
    : GAMES.filter(game => game.category === selectedCategory);

  const handleRandomGame = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    window.location.href = randomGame.route;
  };

  const handleGameClick = (route: string) => {
    window.location.href = route;
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-blob-1 pointer-events-none"></div>
      <div className="absolute inset-0 bg-blob-2 pointer-events-none"></div>
      <div className="absolute inset-0 bg-blob-3 pointer-events-none"></div>
      
      <div className="absolute top-[10%] left-[5%] text-4xl opacity-20 animate-float-slow pointer-events-none">🌟</div>
      <div className="absolute top-[15%] right-[8%] text-3xl opacity-15 animate-float pointer-events-none" style={{ animationDelay: '1s' }}>✨</div>
      <div className="absolute bottom-[20%] left-[10%] text-2xl opacity-15 animate-float pointer-events-none" style={{ animationDelay: '2s' }}>🎈</div>
      
      <header className="relative z-20 px-3 py-2 flex-shrink-0" style={{ maxHeight: '20vh' }}>
        <div className="max-w-lg mx-auto h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🎮</span>
              <h1 className="font-display font-bold text-base text-purple-800">Family Fun</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {activeGames.length > 0 && (
                <div className="flex gap-1">
                  {activeGames.slice(0, 3).map((game) => {
                    const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                    if (!gameInfo) return null;
                    return (
                      <button
                        key={game.gameType}
                        className={`w-6 h-6 rounded-lg ${gameInfo.gradient} flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform`}
                        onClick={() => handleGameClick(gameInfo.route)}
                        data-testid={`continue-game-${game.gameType}`}
                      >
                        <span className="text-xs">{gameInfo.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              <button
                onClick={handleRandomGame}
                className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white px-2 py-1 rounded-full font-display font-bold text-xs shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 transition-all"
                data-testid="button-random-game"
              >
                <Shuffle className="w-3 h-3" />
                <span>Random</span>
              </button>
            </div>
          </div>
          
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mt-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  flex-shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-full font-display font-semibold text-[10px]
                  transition-all duration-200
                  ${selectedCategory === cat.id 
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-sm` 
                    : 'bg-white/70 text-purple-700 hover:bg-white'
                  }
                `}
                data-testid={`category-${cat.id}`}
              >
                <span className="text-xs">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filteredGames.map((game, index) => {
              const gameType = game.route.replace('/', '');
              const isActive = activeGames.some(active => active.gameType === gameType);
              const progress = isActive ? getGameProgress(gameType) : undefined;
              
              return (
                <GameTile
                  key={game.title}
                  game={game}
                  index={index}
                  isActive={isActive}
                  progress={progress}
                  onClick={() => handleGameClick(game.route)}
                />
              );
            })}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-2 text-center flex-shrink-0">
        <p className="text-purple-600/50 text-xs font-medium">
          Made with 💜 for family fun
        </p>
      </footer>
    </div>
  );
}
