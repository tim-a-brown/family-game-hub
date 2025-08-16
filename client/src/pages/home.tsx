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
      
      {/* Modern game card */}
      <div
        className={`
          relative w-20 h-20 sm:w-24 sm:h-24
          bg-white/90 backdrop-blur-sm
          rounded-2xl shadow-lg border border-gray-200/50
          flex flex-col items-center justify-center
          transform transition-all duration-300 ease-out
          ${isHovered ? 'scale-105 shadow-xl bg-white' : 'scale-100'}
          ${isClicked ? 'scale-95' : ''}
          ${isActive ? 'ring-2 ring-indigo-400 ring-opacity-60' : ''}
          hover:shadow-xl
          group-hover:animate-bounce-gentle
        `}
      >
        {/* Progress indicator for active games */}
        {isActive && progress && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="text-xs font-bold text-white">{progress}%</div>
          </div>
        )}
        
        {/* Active game indicator */}
        {isActive && !progress && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-2 h-2 text-white" />
          </div>
        )}
        
        {/* Game emoji with color background */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-2 shadow-md`}>
          <div className="text-lg">
            {game.emoji}
          </div>
        </div>
        
        {/* Game title */}
        <div className="text-gray-800 text-center px-1">
          <div className="text-xs font-semibold leading-tight">
            {game.title}
          </div>
        </div>
        

      </div>
      
      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800 text-white rounded-lg px-3 py-1.5 shadow-xl text-xs whitespace-nowrap">
            {game.description}
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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden flex flex-col">
      {/* Clean decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Clean Header */}
      <header className="relative z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Game Center</h1>
                <p className="text-sm text-gray-500">15 fun games to play</p>
              </div>
            </div>
            
            {activeGames.length > 0 && (
              <div className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 text-sm font-medium">
                {activeGames.length} games in progress
              </div>
            )}
          </div>
        </div>
      </header>



      {/* Main game selection area - flex-1 to take remaining space */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
        
        {/* Active games section - clean card style */}
        {activeGames.length > 0 && (
          <section className="mb-6 flex-shrink-0">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl mx-4 p-4 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Continue Playing</h3>
                    <p className="text-sm text-gray-500">Pick up where you left off</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {activeGames.slice(0, 3).map((game) => {
                    const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                    if (!gameInfo) return null;
                    
                    return (
                      <div 
                        key={game.gameType}
                        className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-md"
                        onClick={() => window.location.href = gameInfo.route}
                        title={`${gameInfo.title} - ${getGameProgress(game.gameType)}%`}
                      >
                        <span className="text-lg">{gameInfo.emoji}</span>
                        {getGameProgress(game.gameType) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
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

        {/* All games section */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="text-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">All Games</h2>
            <p className="text-gray-600">Choose your favorite to start playing</p>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pb-8 px-6">
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