import { useState, useEffect } from "react";
import { GameStorage } from "@/lib/game-storage";

import ticTacToeImg from "@assets/generated_images/tic-tac-toe_game_tile_icon.png";
import hangmanImg from "@assets/generated_images/hangman_game_tile_icon.png";
import madLibsImg from "@assets/generated_images/mad_libs_game_tile_icon.png";
import wouldYouRatherImg from "@assets/generated_images/would_you_rather_tile_icon.png";
import wordSearchImg from "@assets/generated_images/word_search_game_tile_icon.png";
import dotsAndBoxesImg from "@assets/generated_images/dots_and_boxes_tile_icon.png";
import wordScrambleImg from "@assets/generated_images/word_scramble_tile_icon.png";
import yahtzeeImg from "@assets/generated_images/yahtzee_game_tile_icon.png";
import diceRollerImg from "@assets/generated_images/dice_roller_game_tile_icon.png";
import scorecardImg from "@assets/generated_images/scorecard_game_tile_icon.png";
import sudokuImg from "@assets/generated_images/sudoku_game_tile_icon.png";
import connectFourImg from "@assets/generated_images/connect_four_tile_icon.png";
import battleshipImg from "@assets/generated_images/battleship_game_tile_icon.png";
import shellGameImg from "@assets/generated_images/shell_game_tile_icon.png";

const GAMES = [
  { title: "Tic-Tac-Toe", image: ticTacToeImg, route: "/tic-tac-toe" },
  { title: "Hangman", image: hangmanImg, route: "/hangman" },
  { title: "Mad Libs", image: madLibsImg, route: "/mad-libs" },
  { title: "Would You Rather", image: wouldYouRatherImg, route: "/would-you-rather" },
  { title: "Word Search", image: wordSearchImg, route: "/word-search" },
  { title: "Dots & Boxes", image: dotsAndBoxesImg, route: "/dots-and-boxes" },
  { title: "Word Scramble", image: wordScrambleImg, route: "/word-scramble" },
  { title: "Yahtzee", image: yahtzeeImg, route: "/yahtzee" },
  { title: "Dice Roller", image: diceRollerImg, route: "/dice-roller" },
  { title: "Scorecard", image: scorecardImg, route: "/scorecard" },
  { title: "Sudoku", image: sudokuImg, route: "/sudoku" },
  { title: "Connect Four", image: connectFourImg, route: "/connect-four" },
  { title: "Battleship", image: battleshipImg, route: "/battleship" },
  { title: "Shell Game", image: shellGameImg, route: "/shell-game" }
];

export default function Home() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    setActiveGames(gameStorage.getActiveGames());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4">
          {GAMES.map((game) => {
            const isActive = activeGames.some(a => a.gameType === game.route.replace('/', ''));
            return (
              <button
                key={game.title}
                onClick={() => window.location.href = game.route}
                className="flex flex-col items-center gap-2 group"
                data-testid={`game-tile-${game.route.replace('/', '')}`}
              >
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 group-hover:shadow-md group-hover:scale-105 group-active:scale-95 transition-all">
                  <img 
                    src={game.image} 
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {game.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
