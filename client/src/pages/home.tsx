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
      
      {/* Main bubble */}
      <div
        className={`
          relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24
          bg-gradient-to-br ${game.color}
          rounded-full shadow-xl
          flex flex-col items-center justify-center
          transform transition-all duration-300 ease-out
          animate-float
          ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
          ${isClicked ? 'scale-95' : ''}
          ${isActive ? 'ring-2 sm:ring-4 ring-white ring-opacity-50 shadow-glow' : ''}
          hover:shadow-glow
          group-hover:animate-bounce-gentle
        `}
      >
        {/* Progress indicator for active games */}
        {isActive && progress && (
          <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="text-xs sm:text-xs font-bold text-gray-700">{progress}%</div>
          </div>
        )}
        
        {/* Active game indicator */}
        {isActive && !progress && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
          </div>
        )}
        
        {/* Game emoji */}
        <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-0.5">
          {game.emoji}
        </div>
        
        {/* Game title */}
        <div className="text-white text-center px-0.5 sm:px-1">
          <div className="text-xs sm:text-xs md:text-xs font-bold leading-tight">
            {game.title}
          </div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-float-particle"
              style={{
                left: `${20 + i * 30}%`,
                top: `${15 + i * 25}%`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-full px-4 py-2 shadow-xl border-2 border-gray-200">
            <div className="text-xs font-medium text-gray-800 whitespace-nowrap">
              {game.description}
            </div>
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
    <div className="h-screen bg-gradient-to-br from-violet-400 via-pink-400 to-blue-400 relative overflow-hidden flex flex-col">
      {/* Animated background elements - fewer for mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating shapes */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-15 animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${8 + i}s`
            }}
          >
            <Star className="w-6 h-6 text-white" />
          </div>
        ))}
      </div>

      {/* Compact Header */}
      <header className="relative z-40 bg-white bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-20 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-14">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">
                  ✨ Game Center
                </h1>
                <p className="text-xs sm:text-sm text-white text-opacity-80 hidden sm:block">Choose your adventure!</p>
              </div>
            </div>
            
            <div className="flex items-center">
              {activeGames.length > 0 && (
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 border border-white border-opacity-30">
                  <div className="flex items-center space-x-1">
                    <Save className="text-white w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {activeGames.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Welcome message - more compact for mobile */}
      {showWelcome && (
        <div className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in-scale">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl px-4 py-2 sm:px-6 sm:py-3 shadow-xl border-2 border-yellow-300">
            <div className="text-center">
              <div className="text-xl sm:text-2xl mb-1">🎪</div>
              <h2 className="text-sm sm:text-lg font-bold text-gray-800 mb-0.5">Welcome!</h2>
              <p className="text-xs sm:text-sm text-gray-600">Tap any bubble to play</p>
            </div>
          </div>
        </div>
      )}

      {/* Main game selection area - flex-1 to take remaining space */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
        
        {/* Active games section - more compact */}
        {activeGames.length > 0 && (
          <section className="mb-4 sm:mb-6 flex-shrink-0">
            <div className="text-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg flex items-center justify-center mb-1">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 mr-2 animate-pulse" />
                Continue Playing
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 ml-2 animate-pulse" />
              </h2>
              <p className="text-xs sm:text-sm text-white text-opacity-80">Resume your games!</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-4 px-1">
              {activeGames.slice(0, 4).map((game) => {
                const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                if (!gameInfo) return null;
                
                return (
                  <GameBubble
                    key={game.gameType}
                    game={gameInfo}
                    index={Math.floor(Math.random() * 8)}
                    isActive={true}
                    progress={getGameProgress(game.gameType)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* All games section - scrollable content */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="text-center mb-3 sm:mb-4 flex-shrink-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg mb-1 sm:mb-2">
              🌟 Choose Your Game 🌟
            </h2>
            <p className="text-sm sm:text-base text-white text-opacity-90 drop-shadow-md">
              Tap the magical bubbles!
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 sm:gap-2 md:gap-3 max-w-xs sm:max-w-sm md:max-w-md mx-auto pb-4 px-2 sm:px-3 justify-items-center">
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