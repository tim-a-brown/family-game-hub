import { useState, useEffect } from "react";
import { GameStorage } from "@/lib/game-storage";
import { Shuffle } from "lucide-react";

const GAMES = [
  { title: "Tic-Tac-Toe", emoji: "⭕", route: "/tic-tac-toe", category: "play" },
  { title: "Hangman", emoji: "🎯", route: "/hangman", category: "think" },
  { title: "Mad Libs", emoji: "📝", route: "/mad-libs", category: "fun" },
  { title: "Would You Rather", emoji: "🤔", route: "/would-you-rather", category: "fun" },
  { title: "Word Search", emoji: "🔍", route: "/word-search", category: "think" },
  { title: "Dots & Boxes", emoji: "⬜", route: "/dots-and-boxes", category: "play" },
  { title: "Word Scramble", emoji: "🔤", route: "/word-scramble", category: "think" },
  { title: "Yahtzee", emoji: "🎲", route: "/yahtzee", category: "play" },
  { title: "Dice Roller", emoji: "🎲", route: "/dice-roller", category: "play" },
  { title: "Scorecard", emoji: "📊", route: "/scorecard", category: "play" },
  { title: "Sudoku", emoji: "🔢", route: "/sudoku", category: "think" },
  { title: "Connect Four", emoji: "🔴", route: "/connect-four", category: "play" },
  { title: "Battleship", emoji: "⚓", route: "/battleship", category: "play" },
  { title: "Shell Game", emoji: "🥥", route: "/shell-game", category: "think" }
];

const FILTERS = ["all", "fun", "think", "play"];

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    setActiveGames(gameStorage.getActiveGames());
  }, []);

  const filteredGames = filter === "all" ? GAMES : GAMES.filter(g => g.category === filter);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-5 pt-6 pb-4 flex-shrink-0">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Games</h1>
              <p className="text-sm text-gray-400">{GAMES.length} to choose from</p>
            </div>
            <button
              onClick={() => window.location.href = GAMES[Math.floor(Math.random() * GAMES.length)].route}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              data-testid="button-random-game"
            >
              <Shuffle className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                  filter === f 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid={`filter-${f}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-3">
            {filteredGames.map((game) => {
              const isActive = activeGames.some(a => a.gameType === game.route.replace('/', ''));
              return (
                <button
                  key={game.title}
                  onClick={() => window.location.href = game.route}
                  className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-1 hover:bg-gray-100 hover:border-gray-200 transition-all active:scale-95"
                  data-testid={`game-tile-${game.route.replace('/', '')}`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500"></div>
                  )}
                  <span className="text-2xl">{game.emoji}</span>
                  <span className="text-[11px] font-medium text-gray-700 text-center px-2 leading-tight">{game.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
