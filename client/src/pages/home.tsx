import { useState, useEffect } from "react";
import { GameStorage } from "@/lib/game-storage";

import ticTacToeImg from "@assets/generated_images/tic-tac-toe_game_tile_icon.png";
import hangmanImg from "@assets/generated_images/hangman_game_tile_icon.png";
import madLibsImg from "@assets/generated_images/mad_libs_game_tile_icon.png";
import wouldYouRatherImg from "@assets/generated_images/would_you_rather_tile_icon.png";
import wordSearchImg from "@assets/generated_images/word_search_game_tile_icon.png";
import dotsAndBoxesImg from "@assets/generated_images/dots_and_boxes_tile_icon.png";
import wordScrambleImg from "@assets/generated_images/word_scramble_tile_icon.png";
import yahtzeeImg from "@assets/generated_images/yahtzee_five_dice_icon.png";
import diceRollerImg from "@assets/generated_images/dice_roller_canister_icon.png";
import scorecardImg from "@assets/generated_images/scorecard_game_tile_icon.png";
import sudokuImg from "@assets/generated_images/sudoku_game_tile_icon.png";
import connectFourImg from "@assets/generated_images/connect_four_tile_icon.png";
import battleshipImg from "@assets/generated_images/battleship_game_tile_icon.png";
import shellGameImg from "@assets/generated_images/shell_game_tile_icon.png";

const GAMES = [
  { title: "Tic-Tac-Toe", image: ticTacToeImg, route: "/tic-tac-toe", slug: "tic-tac-toe" },
  { title: "Hangman", image: hangmanImg, route: "/hangman", slug: "hangman" },
  { title: "Mad Libs", image: madLibsImg, route: "/mad-libs", slug: "mad-libs" },
  { title: "Would You Rather", image: wouldYouRatherImg, route: "/would-you-rather", slug: "would-you-rather" },
  { title: "Word Search", image: wordSearchImg, route: "/word-search", slug: "word-search" },
  { title: "Dots & Boxes", image: dotsAndBoxesImg, route: "/dots-and-boxes", slug: "dots-and-boxes" },
  { title: "Word Scramble", image: wordScrambleImg, route: "/word-scramble", slug: "word-scramble" },
  { title: "Yahtzee", image: yahtzeeImg, route: "/yahtzee", slug: "yahtzee" },
  { title: "Dice Roller", image: diceRollerImg, route: "/dice-roller", slug: "dice-roller" },
  { title: "Scorecard", image: scorecardImg, route: "/scorecard", slug: "scorecard" },
  { title: "Sudoku", image: sudokuImg, route: "/sudoku", slug: "sudoku" },
  { title: "Connect Four", image: connectFourImg, route: "/connect-four", slug: "connect-four" },
  { title: "Battleship", image: battleshipImg, route: "/battleship", slug: "battleship" },
  { title: "Shell Game", image: shellGameImg, route: "/shell-game", slug: "shell-game" }
];

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    setActiveGames(gameStorage.getActiveGames());
  }, []);

  const isGameActive = (slug: string) => {
    return activeGames.some(a => a.gameType === slug);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex-shrink-0" style={{ maxHeight: '15vh' }}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Games</h1>
            {activeGames.length > 0 && (
              <p className="text-xs text-gray-500">{activeGames.length} in progress</p>
            )}
          </div>
          {activeGames.length > 0 && (
            <div className="flex -space-x-2">
              {activeGames.slice(0, 3).map((active) => {
                const game = GAMES.find(g => g.slug === active.gameType);
                if (!game) return null;
                return (
                  <button
                    key={active.gameType}
                    onClick={() => window.location.href = game.route}
                    className="w-8 h-8 rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    data-testid={`continue-${active.gameType}`}
                  >
                    <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-4">
            {GAMES.map((game) => {
              const isActive = isGameActive(game.slug);
              return (
                <button
                  key={game.title}
                  onClick={() => window.location.href = game.route}
                  className="flex flex-col items-center gap-1.5 group"
                  data-testid={`game-tile-${game.slug}`}
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white shadow-sm group-hover:shadow-md group-hover:scale-105 group-active:scale-95 transition-all">
                    <img 
                      src={game.image} 
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 text-center leading-tight px-1">
                    {game.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
