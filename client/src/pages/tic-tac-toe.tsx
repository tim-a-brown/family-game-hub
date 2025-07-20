import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/use-auto-save";

type Player = 'X' | 'O' | '△' | null;
type Board = Player[];
type GameMode = '1-player' | '2-player' | '3-player';

interface GameState {
  boards: Board[];
  currentPlayer: Player;
  players: Player[];
  gameMode: GameMode;
  scores: Record<Player, number>;
  gameWon: boolean;
  winner: Player | null;
}

const INITIAL_BOARD: Board = Array(9).fill(null);

export default function TicTacToe() {
  const [gameState, setGameState] = useState<GameState>({
    boards: [INITIAL_BOARD],
    currentPlayer: 'X',
    players: ['X', 'O'],
    gameMode: '2-player',
    scores: { 'X': 0, 'O': 0, '△': 0 },
    gameWon: false,
    winner: null
  });
  
  const [setupMode, setSetupMode] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<number>(2);
  const [selectedBoards, setSelectedBoards] = useState<number>(1);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();
  
  // Auto-save functionality
  const { saveGame: autoSave } = useAutoSave({
    gameType: 'tic-tac-toe',
    gameState,
    enabled: !setupMode && gameState.boards.some(board => board.some(cell => cell !== null))
  });

  useEffect(() => {
    const saved = gameStorage.loadGameState('tic-tac-toe');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const checkWinner = (board: Board): Player | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const isBoardFull = (board: Board): boolean => {
    return board.every(cell => cell !== null);
  };

  const makeAIMove = (boards: Board[]): { boardIndex: number; cellIndex: number } | null => {
    // Simple AI: try to win, then block opponent, then random
    for (let boardIndex = 0; boardIndex < boards.length; boardIndex++) {
      const board = boards[boardIndex];
      if (checkWinner(board) || isBoardFull(board)) continue;

      // Try to win
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          const testBoard = [...board];
          testBoard[i] = 'O';
          if (checkWinner(testBoard) === 'O') {
            return { boardIndex, cellIndex: i };
          }
        }
      }

      // Try to block
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          const testBoard = [...board];
          testBoard[i] = 'X';
          if (checkWinner(testBoard) === 'X') {
            return { boardIndex, cellIndex: i };
          }
        }
      }
    }

    // Random move
    const availableMoves = [];
    for (let boardIndex = 0; boardIndex < boards.length; boardIndex++) {
      const board = boards[boardIndex];
      if (checkWinner(board) || isBoardFull(board)) continue;
      
      for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
        if (board[cellIndex] === null) {
          availableMoves.push({ boardIndex, cellIndex });
        }
      }
    }

    return availableMoves.length > 0 
      ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
      : null;
  };

  const handleCellClick = (boardIndex: number, cellIndex: number) => {
    if (gameState.gameWon || gameState.boards[boardIndex][cellIndex] !== null) return;
    if (checkWinner(gameState.boards[boardIndex]) || isBoardFull(gameState.boards[boardIndex])) return;

    const newBoards = gameState.boards.map((board, idx) => 
      idx === boardIndex 
        ? board.map((cell, i) => i === cellIndex ? gameState.currentPlayer : cell)
        : board
    );

    const boardWinner = checkWinner(newBoards[boardIndex]);
    let newScores = { ...gameState.scores };
    
    if (boardWinner) {
      newScores[boardWinner]++;
    }

    // Check if all boards are finished (won or drawn)
    const allBoardsFinished = newBoards.every(board => checkWinner(board) || isBoardFull(board));
    
    // Determine overall winner only when all boards are finished
    let overallWinner: Player | null = null;
    if (allBoardsFinished) {
      // Find player with most wins
      const maxScore = Math.max(...Object.values(newScores));
      const winners = Object.entries(newScores).filter(([_, score]) => score === maxScore);
      
      // Only declare winner if there's no tie
      if (winners.length === 1) {
        overallWinner = winners[0][0] as Player;
      }
    }

    const nextPlayerIndex = (gameState.players.indexOf(gameState.currentPlayer) + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];

    const newGameState = {
      ...gameState,
      boards: newBoards,
      currentPlayer: overallWinner ? gameState.currentPlayer : nextPlayer,
      scores: newScores,
      gameWon: !!overallWinner,
      winner: overallWinner || null
    };

    setGameState(newGameState);

    if (overallWinner) {
      toast({
        title: "Game Over!",
        description: `Player ${overallWinner} wins with ${newScores[overallWinner]} board wins!`,
      });
    } else if (allBoardsFinished && !overallWinner) {
      toast({
        title: "Game Over!",
        description: "It's a tie game! All boards finished with equal scores.",
      });
    } else if (gameState.gameMode === '1-player' && nextPlayer === 'O') {
      // AI move
      setTimeout(() => {
        const aiMove = makeAIMove(newBoards);
        if (aiMove) {
          handleCellClick(aiMove.boardIndex, aiMove.cellIndex);
        }
      }, 500);
    }
  };

  const startNewGame = () => {
    const players: Player[] = selectedPlayers === 1 ? ['X', 'O'] : 
                             selectedPlayers === 2 ? ['X', 'O'] : 
                             ['X', 'O', '△'];
    
    const gameMode: GameMode = selectedPlayers === 1 ? '1-player' : 
                              selectedPlayers === 2 ? '2-player' : 
                              '3-player';

    const newGameState: GameState = {
      boards: Array(selectedBoards).fill(null).map(() => [...INITIAL_BOARD]),
      currentPlayer: 'X',
      players,
      gameMode,
      scores: { 'X': 0, 'O': 0, '△': 0 },
      gameWon: false,
      winner: null
    };

    setGameState(newGameState);
    setSetupMode(false);
  };



  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('tic-tac-toe');
  };

  if (setupMode) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
        <GameHeader title="Tic-Tac-Toe" />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm">
            <h2 className="text-lg font-bold text-center mb-4">Game Setup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Players</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(num => (
                    <Button
                      key={num}
                      variant={selectedPlayers === num ? "default" : "outline"}
                      onClick={() => setSelectedPlayers(num)}
                      className="w-full text-xs px-2 py-1 h-8"
                    >
                      {num} {num === 1 ? '(AI)' : ''}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Boards</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(num => (
                    <Button
                      key={num}
                      variant={selectedBoards === num ? "default" : "outline"}
                      onClick={() => setSelectedBoards(num)}
                      disabled={selectedPlayers === 3 && num === 1}
                      className="w-full text-xs px-2 py-1 h-8"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                {selectedPlayers === 3 && (
                  <p className="text-xs text-gray-500 mt-1">
                    3 players need 2+ boards
                  </p>
                )}
              </div>

              <Button onClick={startNewGame} className="w-full mt-4" size="sm">
                Start Game
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <GameHeader title="Tic-Tac-Toe" />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Game Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs px-2 py-1">{gameState.gameMode}</Badge>
              {!gameState.gameWon ? (
                <span className="font-semibold">
                  Player: <span className="text-primary">{gameState.currentPlayer}</span>
                </span>
              ) : (
                <span className="font-bold text-green-600">
                  🎉 {gameState.winner} Wins!
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={resetGame} className="text-xs px-2 py-1 h-6">
              New
            </Button>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Scores: {gameState.players.map(player => 
              `${player}:${gameState.scores[player]}`
            ).join(' | ')}
          </div>
        </div>

        {/* Compact Game Boards */}
        <div className={`flex-1 grid gap-2 ${
          gameState.boards.length === 1 ? 'grid-cols-1' :
          gameState.boards.length === 2 ? 'grid-cols-2' :
          'grid-cols-2 grid-rows-2'
        }`}>
          {gameState.boards.map((board, boardIndex) => {
            const boardWinner = checkWinner(board);
            const boardFull = isBoardFull(board);
            
            return (
              <div key={boardIndex} className={`bg-white rounded-lg shadow-sm p-2 ${boardWinner ? 'ring-2 ring-green-400' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold">Board {boardIndex + 1}</span>
                  {boardWinner && (
                    <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">
                      {boardWinner}
                    </Badge>
                  )}
                  {!boardWinner && boardFull && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">Draw</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  {board.map((cell, cellIndex) => (
                    <button
                      key={cellIndex}
                      onClick={() => handleCellClick(boardIndex, cellIndex)}
                      disabled={cell !== null || boardWinner !== null || boardFull || gameState.gameWon}
                      className="aspect-square w-full bg-gray-50 border border-gray-300 rounded text-lg font-bold hover:bg-gray-100 transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {cell && (
                        <span className={
                          cell === 'X' ? 'text-blue-600' : 
                          cell === 'O' ? 'text-red-600' : 
                          'text-green-600'
                        }>
                          {cell}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
