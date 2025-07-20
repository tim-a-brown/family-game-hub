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
          relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36
          bg-gradient-to-br ${game.color}
          rounded-full shadow-2xl
          flex flex-col items-center justify-center
          transform transition-all duration-300 ease-out
          animate-float
          ${isHovered ? 'scale-110 shadow-3xl' : 'scale-100'}
          ${isClicked ? 'scale-95' : ''}
          ${isActive ? 'ring-4 ring-white ring-opacity-50 shadow-glow' : ''}
          hover:shadow-glow
          group-hover:animate-bounce-gentle
        `}
      >
        {/* Progress indicator for active games */}
        {isActive && progress && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="text-xs font-bold text-gray-700">{progress}%</div>
          </div>
        )}
        
        {/* Active game indicator */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Game emoji */}
        <div className="text-4xl sm:text-5xl md:text-6xl mb-1 animate-pulse-gentle">
          {game.emoji}
        </div>
        
        {/* Game title */}
        <div className="text-white text-center px-2">
          <div className="text-xs sm:text-sm md:text-base font-bold leading-tight">
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
    <div className="min-h-screen bg-gradient-to-br from-violet-400 via-pink-400 to-blue-400 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating shapes */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-20 animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${8 + i}s`
            }}
          >
            <Star className="w-8 h-8 text-white" />
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-40 bg-white bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg animate-bounce-gentle">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                  ✨ Magical Game Center ✨
                </h1>
                <p className="text-sm text-white text-opacity-80">Choose your adventure!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {activeGames.length > 0 && (
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-4 py-2 border border-white border-opacity-30">
                  <div className="flex items-center space-x-2">
                    <Save className="text-white w-4 h-4" />
                    <span className="text-sm font-medium text-white">
                      {activeGames.length} Active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Welcome message */}
      {showWelcome && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in-scale">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-3xl px-8 py-4 shadow-2xl border-4 border-yellow-300">
            <div className="text-center">
              <div className="text-3xl mb-2">🎪</div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome to the Magic!</h2>
              <p className="text-gray-600">Tap any bubble to start your adventure</p>
            </div>
          </div>
        </div>
      )}

      {/* Main game selection area */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        
        {/* Active games section */}
        {activeGames.length > 0 && (
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white drop-shadow-lg flex items-center justify-center mb-2">
                <Zap className="w-8 h-8 text-yellow-300 mr-3 animate-pulse" />
                Continue Your Adventure
                <Zap className="w-8 h-8 text-yellow-300 ml-3 animate-pulse" />
              </h2>
              <p className="text-white text-opacity-80">Pick up where you left off!</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              {activeGames.slice(0, 6).map((game) => {
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

        {/* All games section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-4">
              🌟 Choose Your Game 🌟
            </h2>
            <p className="text-xl text-white text-opacity-90 drop-shadow-md">
              Tap the magical bubbles below!
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-5xl mx-auto">
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
        </section>
      </main>

      {/* Footer with magical elements */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-10 backdrop-blur-sm border-t border-white border-opacity-20 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white text-opacity-80 text-sm">
            ✨ Made with magic and love for family fun ✨
          </p>
        </div>
      </footer>
    </div>
  );
}