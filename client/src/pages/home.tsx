import { useState, useEffect } from "react";
import { GameCard } from "@/components/game-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameStorage } from "@/lib/game-storage";
import { Gamepad, Save, Grid3X3, List, Shuffle } from "lucide-react";

const GAMES = [
  {
    title: "Tic-Tac-Toe",
    description: "1-3 players • Multiple boards • AI opponent",
    playerInfo: "1-3 Players",
    color: "bg-gradient-to-br from-blue-400 to-blue-600",
    route: "/tic-tac-toe",
    icon: (
      <div className="grid grid-cols-3 gap-1 w-16 h-16">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white bg-opacity-30 rounded flex items-center justify-center">
            {i === 0 || i === 4 || i === 8 ? (
              <span className="text-white font-bold text-lg">X</span>
            ) : i === 1 || i === 3 ? (
              <span className="text-white font-bold text-lg">O</span>
            ) : null}
          </div>
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-blue-200 text-8xl font-bold opacity-30">#</div>
    )
  },
  {
    title: "Hangman",
    description: "Random puzzles • Two player mode • 6-10 wrong answers",
    playerInfo: "Word Puzzle",
    color: "bg-gradient-to-br from-red-400 to-red-600",
    route: "/hangman",
    icon: (
      <div className="text-white text-center">
        <div className="text-2xl font-mono">_ A _ I L Y</div>
        <div className="mt-2 text-sm opacity-80">Wrong: E, R, T (3/6)</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-red-200 text-7xl opacity-40">🎯</div>
    )
  },
  {
    title: "Mad Libs",
    description: "Family-friendly templates • Silly story creation",
    playerInfo: "Creative Fun",
    color: "bg-gradient-to-br from-purple-400 to-purple-600",
    route: "/mad-libs",
    icon: (
      <div className="text-white text-center">
        <div className="text-2xl mb-2">📝</div>
        <div className="text-sm font-semibold">Fill in the blanks!</div>
        <div className="text-xs opacity-80 mt-1">Need: ADJECTIVE</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-purple-200 text-9xl opacity-25">✏️</div>
    )
  },
  {
    title: "Would You Rather",
    description: "Pass and play • 12 categories • Family scenarios",
    playerInfo: "Group Game",
    color: "bg-gradient-to-br from-pink-400 to-pink-600",
    route: "/would-you-rather",
    icon: (
      <div className="text-white text-center">
        <div className="text-3xl mb-2">🤔</div>
        <div className="text-sm font-semibold">Option A vs B</div>
        <div className="text-xs opacity-80 mt-1">Tough choices!</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-pink-200 text-8xl opacity-30">⚖️</div>
    )
  },
  {
    title: "Word Search",
    description: "16×16 grid • 12 themed categories • All directions",
    playerInfo: "Find Words",
    color: "bg-gradient-to-br from-green-400 to-green-600",
    route: "/word-search",
    icon: (
      <div className="grid grid-cols-4 gap-1 text-white text-xs font-mono">
        {['A','N','I','M','T','I','G','A','C','G','E','L','R','E','R','S'].map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-green-200 text-7xl opacity-40">🔍</div>
    )
  },
  {
    title: "Dots and Boxes",
    description: "Classic strategy • Connect the dots • Up to 3 players",
    playerInfo: "2-3 Players",
    color: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    route: "/dots-and-boxes",
    icon: (
      <div className="grid grid-cols-3 gap-2 text-white">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="w-2 h-2 bg-white rounded-full"></div>
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-yellow-200 text-8xl opacity-35">⚬</div>
    )
  },
  {
    title: "Word Scramble",
    description: "Multiple difficulties • Timed challenges • Hints available",
    playerInfo: "Timed Game",
    color: "bg-gradient-to-br from-indigo-400 to-indigo-600",
    route: "/word-scramble",
    icon: (
      <div className="text-white text-center">
        <div className="text-lg font-mono mb-1">LPEPINPEA</div>
        <div className="text-xs opacity-80">Unscramble this!</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-indigo-200 text-8xl opacity-30">🔤</div>
    )
  },
  {
    title: "Yahtzee",
    description: "Classic dice game • Score tracking • 13 rounds",
    playerInfo: "Dice Game",
    color: "bg-gradient-to-br from-orange-400 to-orange-600",
    route: "/yahtzee",
    icon: (
      <div className="flex space-x-1 text-white">
        {['⚃','⚃','⚃','⚀','⚁'].map((die, i) => (
          <div key={i} className="w-6 h-6 bg-white bg-opacity-30 rounded flex items-center justify-center text-xs">
            {die}
          </div>
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-orange-200 text-9xl opacity-30">🎲</div>
    )
  },
  {
    title: "Dice Roller",
    description: "Customizable dice • Multiple dice types • Roll history",
    playerInfo: "Utility Tool",
    color: "bg-gradient-to-br from-teal-400 to-teal-600",
    route: "/dice-roller",
    icon: (
      <div className="flex space-x-2 text-white">
        <div className="w-8 h-8 bg-white bg-opacity-30 rounded flex items-center justify-center">⚅</div>
        <div className="w-8 h-8 bg-white bg-opacity-30 rounded flex items-center justify-center">⚁</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-teal-200 text-8xl opacity-35">⚅</div>
    )
  },
  {
    title: "Scorecard",
    description: "Multiplayer scoring • Board games • Custom games",
    playerInfo: "Score Keeper",
    color: "bg-gradient-to-br from-cyan-400 to-cyan-600",
    route: "/scorecard",
    icon: (
      <div className="text-white text-center">
        <div className="text-2xl mb-2">📊</div>
        <div className="text-sm font-semibold">Track Scores</div>
        <div className="text-xs opacity-80 mt-1">Player 1: 250pts</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-cyan-200 text-7xl opacity-40">📈</div>
    )
  },
  {
    title: "Sudoku",
    description: "Multiple difficulties • Hints available • Timer included",
    playerInfo: "Logic Puzzle",
    color: "bg-gradient-to-br from-violet-400 to-violet-600",
    route: "/sudoku",
    icon: (
      <div className="grid grid-cols-3 gap-px text-white text-xs font-mono">
        {['5','3','_','6','_','_','_','9','8'].map((num, i) => (
          <span key={i}>{num}</span>
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-violet-200 text-7xl opacity-40">🧩</div>
    )
  },
  {
    title: "Connect 4",
    description: "AI opponent • Two player mode • Classic strategy",
    playerInfo: "1-2 Players",
    color: "bg-gradient-to-br from-rose-400 to-rose-600",
    route: "/connect-four",
    icon: (
      <div className="grid grid-cols-4 gap-1">
        {[0,1,2,3,4,5,6,7].map((i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded-full ${
              i < 2 ? 'bg-red-300' : 
              i === 1 || i === 4 ? 'bg-yellow-300' : 
              i === 5 || i === 6 ? 'bg-red-300' : 
              'bg-white bg-opacity-30'
            }`}
          />
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-rose-200 text-8xl opacity-30">⭕</div>
    )
  },
  {
    title: "Battleship",
    description: "Ship placement • Strategic gameplay • Hit or miss",
    playerInfo: "Strategy Game",
    color: "bg-gradient-to-br from-slate-400 to-slate-600",
    route: "/battleship",
    icon: (
      <div className="grid grid-cols-4 gap-1 text-white text-xs">
        {[0,1,2,3,4,5,6,7].map((i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded ${
              i === 1 ? 'bg-red-400' : 
              i === 7 ? 'bg-gray-400' : 
              'bg-white bg-opacity-30'
            }`}
          />
        ))}
      </div>
    ),
    backgroundGraphic: (
      <div className="text-slate-200 text-7xl opacity-40">⚓</div>
    )
  },
  {
    title: "Shell Game",
    description: "Computer driven • Find the ball • Memory challenge",
    playerInfo: "Memory Game",
    color: "bg-gradient-to-br from-amber-400 to-amber-600",
    route: "/shell-game",
    icon: (
      <div className="text-white text-center">
        <div className="flex justify-center space-x-1 mb-2">
          <div className="text-2xl">🥥</div>
          <div className="text-2xl">🥥</div>
          <div className="text-2xl">🥥</div>
        </div>
        <div className="text-xs opacity-80">Find the ball!</div>
        <div className="text-lg">🔴</div>
      </div>
    ),
    backgroundGraphic: (
      <div className="text-amber-200 text-8xl opacity-35">🥥</div>
    )
  }
];

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const active = gameStorage.getActiveGames();
    setActiveGames(active);
  }, []);

  const getGameProgress = (gameType: string) => {
    const activeGame = activeGames.find(game => game.gameType === gameType);
    if (!activeGame) return undefined;
    
    // Calculate progress based on game type and state
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

  const handleRandomGame = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    window.location.href = randomGame.route;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center">
                <Gamepad className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Family Game Center</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                <Save className="text-primary w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">
                  {activeGames.length} Active Games
                </span>
              </div>
              
              <Button 
                size="sm" 
                className="rounded-full bg-primary text-white hover:bg-purple-600"
              >
                <i className="fas fa-user text-lg"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Access Section */}
        {activeGames.length > 0 && (
          <section className="mb-8">
            <Card className="rounded-2xl shadow-xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                  Continue Playing
                  <span className="ml-2 text-sm font-normal text-gray-600">({activeGames.length} active)</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeGames.slice(0, 3).map((game) => {
                    const gameInfo = GAMES.find(g => g.route.includes(game.gameType));
                    if (!gameInfo) return null;
                    
                    return (
                      <GameCard
                        key={game.gameType}
                        {...gameInfo}
                        isActive={true}
                        progress={getGameProgress(game.gameType)}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Games Section */}
        <section>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {GAMES.map((game) => (
              <GameCard
                key={game.title}
                {...game}
              />
            ))}
          </div>
        </section>

      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleRandomGame}
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 bg-primary hover:bg-purple-600"
        >
          <Shuffle className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
