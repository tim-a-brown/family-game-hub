import { useState, useEffect, useRef } from "react";
import { GameStorage } from "@/lib/game-storage";
import { Gamepad, Save, Sparkles, Star, Zap } from "lucide-react";

const GAMES = [
  {
    title: "Tic-Tac-Toe",
    description: "Classic strategy game",
    emoji: "⭕",
    color: "from-blue-400 to-blue-600",
    route: "/tic-tac-toe",
    sparkleColor: "text-blue-300"
  },
  {
    title: "Hangman",
    description: "Word guessing puzzle",
    emoji: "🎯",
    color: "from-red-400 to-red-600",
    route: "/hangman",
    sparkleColor: "text-red-300"
  },
  {
    title: "Mad Libs",
    description: "Creative story fun",
    emoji: "📝",
    color: "from-purple-400 to-purple-600",
    route: "/mad-libs",
    sparkleColor: "text-purple-300"
  },
  {
    title: "Would You Rather",
    description: "Tough choices game",
    emoji: "🤔",
    color: "from-pink-400 to-pink-600",
    route: "/would-you-rather",
    sparkleColor: "text-pink-300"
  },
  {
    title: "Word Search",
    description: "Find hidden words",
    emoji: "🔍",
    color: "from-green-400 to-green-600",
    route: "/word-search",
    sparkleColor: "text-green-300"
  },
  {
    title: "Dots and Boxes",
    description: "Connect the dots",
    emoji: "⚬",
    color: "from-yellow-400 to-yellow-600",
    route: "/dots-and-boxes",
    sparkleColor: "text-yellow-300"
  },
  {
    title: "Word Scramble",
    description: "Unscramble letters",
    emoji: "🔤",
    color: "from-indigo-400 to-indigo-600",
    route: "/word-scramble",
    sparkleColor: "text-indigo-300"
  },
  {
    title: "Yahtzee",
    description: "Dice rolling fun",
    emoji: "🎲",
    color: "from-teal-400 to-teal-600",
    route: "/yahtzee",
    sparkleColor: "text-teal-300"
  },
  {
    title: "Dice Roller",
    description: "Custom dice games",
    emoji: "🎯",
    color: "from-orange-400 to-orange-600",
    route: "/dice-roller",
    sparkleColor: "text-orange-300"
  },
  {
    title: "Scorecard",
    description: "Track game scores",
    emoji: "📊",
    color: "from-cyan-400 to-cyan-600",
    route: "/scorecard",
    sparkleColor: "text-cyan-300"
  },
  {
    title: "Sudoku",
    description: "Number puzzle",
    emoji: "🔢",
    color: "from-rose-400 to-rose-600",
    route: "/sudoku",
    sparkleColor: "text-rose-300"
  },
  {
    title: "Connect Four",
    description: "Strategy drop game",
    emoji: "🔴",
    color: "from-red-500 to-yellow-500",
    route: "/connect-four",
    sparkleColor: "text-yellow-300"
  },
  {
    title: "Battleship",
    description: "Naval combat game",
    emoji: "⚓",
    color: "from-slate-400 to-slate-600",
    route: "/battleship",
    sparkleColor: "text-slate-300"
  },
  {
    title: "Shell Game",
    description: "Find the hidden ball",
    emoji: "🥥",
    color: "from-amber-400 to-amber-600",
    route: "/shell-game",
    sparkleColor: "text-amber-300"
  }
];

// Floating animation helper
const getFloatingAnimation = (index: number) => {
  const delay = index * 0.2;
  const duration = 3 + (index % 3);
  const amplitude = 10 + (index % 20);
  
  return {
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    '--float-y': `${amplitude}px`
  } as React.CSSProperties;
};

// Magic sparkle component
const MagicSparkles = ({ color }: { color: string }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className={`absolute ${color} animate-ping`}
        style={{
          left: `${20 + i * 15}%`,
          top: `${10 + i * 12}%`,
          animationDelay: `${i * 0.3}s`,
          animationDuration: '2s'
        }}
      >
        ✨
      </div>
    ))}
  </div>
);

// Game bubble component
const GameBubble = ({ game, index, isActive, progress }: {
  game: typeof GAMES[0];
  index: number;
  isActive?: boolean;
  progress?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  
  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => {
      window.location.href = game.route;
    }, 200);
  };

  return (
    <div
      className="relative group cursor-pointer"
      style={getFloatingAnimation(index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Magic sparkles on hover */}
      {isHovered && <MagicSparkles color={game.sparkleColor} />}
      
      {/* Properly sized modern game card */}
      <div
        className={`
          relative w-20 h-28 sm:w-24 sm:h-32
          bg-white
          rounded-2xl shadow-sm border border-gray-100
          flex flex-col items-center justify-center
          transform transition-all duration-300 ease-out
          ${isHovered ? 'scale-105 shadow-lg -translate-y-1' : 'scale-100'}
          ${isClicked ? 'scale-95' : ''}
          ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
          hover:shadow-lg hover:-translate-y-1
        `}
      >
        {/* Progress indicator for active games */}
        {isActive && progress && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
            <div className="text-xs font-semibold text-white">{progress}%</div>
          </div>
        )}
        
        {/* Active game indicator */}
        {isActive && !progress && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse shadow-md">
            <Zap className="w-2 h-2 text-white" />
          </div>
        )}
        
        {/* Game emoji with modern background */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-2 shadow-sm`}>
          <div className="text-lg sm:text-xl">
            {game.emoji}
          </div>
        </div>
        
        {/* Game title */}
        <div className="text-gray-900 text-center px-1">
          <div className="text-xs sm:text-sm font-medium leading-tight">
            {game.title}
          </div>
        </div>
        

      </div>
      
      {/* Modern hover tooltip */}
      {isHovered && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-900 text-white rounded-xl px-4 py-2 shadow-lg text-sm whitespace-nowrap">
            {game.description}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const active = gameStorage.getActiveGames();
    setActiveGames(active);
    
    // Hide welcome message after 3 seconds
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
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

  return (
    <div className="h-screen bg-gray-50 relative overflow-hidden flex flex-col">
      {/* Minimal decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-indigo-500/5 to-pink-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Compact Header */}
      <header className="relative z-40 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Sparkles className="text-white w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Game Center</h1>
              </div>
            </div>
            
            {activeGames.length > 0 && (
              <div className="bg-indigo-50 text-indigo-700 rounded-md px-2 py-1 text-xs font-medium">
                {activeGames.length} active
              </div>
            )}
          </div>
        </div>
      </header>



      {/* Main game selection area - flex-1 to take remaining space */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto px-4 py-2 min-h-0">
        
        {/* Compact Continue Playing Section */}
        {activeGames.length > 0 && (
          <section className="mb-3 flex-shrink-0">
            <div className="bg-white rounded-xl mx-2 p-3 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-3 h-3 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Continue Playing</h3>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {activeGames.slice(0, 3).map((game) => {
                    const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                    if (!gameInfo) return null;
                    
                    return (
                      <div 
                        key={game.gameType}
                        className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm"
                        onClick={() => window.location.href = gameInfo.route}
                        title={`${gameInfo.title} - ${getGameProgress(game.gameType)}%`}
                      >
                        <span className="text-sm">{gameInfo.emoji}</span>
                        {getGameProgress(game.gameType) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 shadow-sm">
                            {getGameProgress(game.gameType)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* All Games Section */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="text-center mb-3 flex-shrink-0 px-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">All Games</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pb-8 px-4">
              {GAMES.map((game, index) => {
                const isActive = activeGames.some(active => active.gameType === game.route.replace('/', ''));
                const progress = isActive ? getGameProgress(game.route.replace('/', '')) : undefined;
                
                return (
                  <GameBubble
                    key={game.title}
                    game={game}
                    index={index}
                    isActive={isActive}
                    progress={progress}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Compact Footer */}
      <footer className="relative z-10 bg-white bg-opacity-10 backdrop-blur-sm border-t border-white border-opacity-20 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 text-center">
          <p className="text-white text-opacity-70 text-xs sm:text-sm">
            ✨ Family Game Fun ✨
          </p>
        </div>
      </footer>
    </div>
  );
}