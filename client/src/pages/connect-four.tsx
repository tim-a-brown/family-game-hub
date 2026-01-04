import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup, OptionButtons } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";
import connectFourIcon from "@assets/generated_images/connect_four_tile_icon.png";

type Player = 1 | 2;
type Cell = Player | null;

interface GameState {
  grid: Cell[][];
  currentPlayer: Player;
  gameMode: '1-player' | '2-player';
  gameWon: boolean;
  winner: Player | null;
  isDraw: boolean;
  winningCells: Array<{row: number, col: number}>;
  isThinking: boolean;
}

const ROWS = 6;
const COLS = 7;

export default function ConnectFour() {
  const [gameState, setGameState] = useState<GameState>({
    grid: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
    currentPlayer: 1,
    gameMode: '2-player',
    gameWon: false,
    winner: null,
    isDraw: false,
    winningCells: [],
    isThinking: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'1-player' | '2-player'>('2-player');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('connect-four');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const checkWinner = (grid: Cell[][], row: number, col: number, player: Player): Array<{row: number, col: number}> | null => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1]   // diagonal down-left
    ];

    for (const [dRow, dCol] of directions) {
      const cells = [{row, col}];
      
      // Check in positive direction
      for (let i = 1; i < 4; i++) {
        const newRow = row + dRow * i;
        const newCol = col + dCol * i;
        if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && grid[newRow][newCol] === player) {
          cells.push({row: newRow, col: newCol});
        } else {
          break;
        }
      }
      
      // Check in negative direction
      for (let i = 1; i < 4; i++) {
        const newRow = row - dRow * i;
        const newCol = col - dCol * i;
        if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && grid[newRow][newCol] === player) {
          cells.unshift({row: newRow, col: newCol});
        } else {
          break;
        }
      }
      
      if (cells.length >= 4) {
        return cells;
      }
    }
    
    return null;
  };

  const getLowestAvailableRow = (grid: Cell[][], col: number): number | null => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (grid[row][col] === null) {
        return row;
      }
    }
    return null;
  };

  const evaluatePosition = (grid: Cell[][], player: Player): number => {
    let score = 0;
    
    // Check all possible windows of 4
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Horizontal
        if (col <= COLS - 4) {
          const window = [grid[row][col], grid[row][col+1], grid[row][col+2], grid[row][col+3]];
          score += evaluateWindow(window, player);
        }
        
        // Vertical
        if (row <= ROWS - 4) {
          const window = [grid[row][col], grid[row+1][col], grid[row+2][col], grid[row+3][col]];
          score += evaluateWindow(window, player);
        }
        
        // Diagonal
        if (row <= ROWS - 4 && col <= COLS - 4) {
          const window = [grid[row][col], grid[row+1][col+1], grid[row+2][col+2], grid[row+3][col+3]];
          score += evaluateWindow(window, player);
        }
        
        if (row <= ROWS - 4 && col >= 3) {
          const window = [grid[row][col], grid[row+1][col-1], grid[row+2][col-2], grid[row+3][col-3]];
          score += evaluateWindow(window, player);
        }
      }
    }
    
    return score;
  };

  const evaluateWindow = (window: Cell[], player: Player): number => {
    const opponent = player === 1 ? 2 : 1;
    let score = 0;
    
    const playerCount = window.filter(cell => cell === player).length;
    const opponentCount = window.filter(cell => cell === opponent).length;
    const emptyCount = window.filter(cell => cell === null).length;
    
    if (playerCount === 4) {
      score += 100;
    } else if (playerCount === 3 && emptyCount === 1) {
      score += 10;
    } else if (playerCount === 2 && emptyCount === 2) {
      score += 2;
    }
    
    if (opponentCount === 3 && emptyCount === 1) {
      score -= 80;
    }
    
    return score;
  };

  const minimax = (grid: Cell[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): number => {
    const validCols = [];
    for (let col = 0; col < COLS; col++) {
      if (getLowestAvailableRow(grid, col) !== null) {
        validCols.push(col);
      }
    }
    
    if (depth === 0 || validCols.length === 0) {
      return evaluatePosition(grid, 2);
    }
    
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const col of validCols) {
        const row = getLowestAvailableRow(grid, col);
        if (row !== null) {
          const newGrid = grid.map(r => [...r]);
          newGrid[row][col] = 2;
          
          const winningCells = checkWinner(newGrid, row, col, 2);
          if (winningCells) {
            return 1000;
          }
          
          const eval_ = minimax(newGrid, depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, eval_);
          alpha = Math.max(alpha, eval_);
          if (beta <= alpha) {
            break;
          }
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of validCols) {
        const row = getLowestAvailableRow(grid, col);
        if (row !== null) {
          const newGrid = grid.map(r => [...r]);
          newGrid[row][col] = 1;
          
          const winningCells = checkWinner(newGrid, row, col, 1);
          if (winningCells) {
            return -1000;
          }
          
          const eval_ = minimax(newGrid, depth - 1, alpha, beta, true);
          minEval = Math.min(minEval, eval_);
          beta = Math.min(beta, eval_);
          if (beta <= alpha) {
            break;
          }
        }
      }
      return minEval;
    }
  };

  const getAIMove = (grid: Cell[][]): number => {
    let bestMove = 3; // Default to center
    let bestScore = -Infinity;
    
    for (let col = 0; col < COLS; col++) {
      const row = getLowestAvailableRow(grid, col);
      if (row !== null) {
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = 2;
        
        // Check for immediate win
        const winningCells = checkWinner(newGrid, row, col, 2);
        if (winningCells) {
          return col;
        }
        
        const score = minimax(newGrid, 4, -Infinity, Infinity, false);
        if (score > bestScore) {
          bestScore = score;
          bestMove = col;
        }
      }
    }
    
    return bestMove;
  };

  const makeMove = (col: number) => {
    if (gameState.gameWon || gameState.isDraw || gameState.isThinking) return;
    
    const row = getLowestAvailableRow(gameState.grid, col);
    if (row === null) return;

    const newGrid = gameState.grid.map(r => [...r]);
    newGrid[row][col] = gameState.currentPlayer;

    const winningCells = checkWinner(newGrid, row, col, gameState.currentPlayer);
    const gameWon = !!winningCells;
    const isDraw = !gameWon && newGrid.every(row => row.every(cell => cell !== null));

    const newGameState = {
      ...gameState,
      grid: newGrid,
      currentPlayer: gameWon || isDraw ? gameState.currentPlayer : (gameState.currentPlayer === 1 ? 2 : 1) as Player,
      gameWon,
      winner: gameWon ? gameState.currentPlayer : null,
      isDraw,
      winningCells: winningCells || []
    };

    setGameState(newGameState);

    if (gameWon) {
      toast({
        title: "Game Over!",
        description: `Player ${gameState.currentPlayer} wins!`,
      });
      gameStorage.saveScore('connect-four', `Player ${gameState.currentPlayer}`, 1);
    } else if (isDraw) {
      toast({
        title: "Draw!",
        description: "The game ended in a draw.",
      });
    } else if (gameState.gameMode === '1-player' && gameState.currentPlayer === 1) {
      // AI move
      setGameState(prev => ({ ...prev, isThinking: true }));
      
      setTimeout(() => {
        const aiCol = getAIMove(newGrid);
        const aiRow = getLowestAvailableRow(newGrid, aiCol);
        
        if (aiRow !== null) {
          const aiGrid = newGrid.map(r => [...r]);
          aiGrid[aiRow][aiCol] = 2;

          const aiWinningCells = checkWinner(aiGrid, aiRow, aiCol, 2);
          const aiGameWon = !!aiWinningCells;
          const aiIsDraw = !aiGameWon && aiGrid.every(row => row.every(cell => cell !== null));

          setGameState(prev => ({
            ...prev,
            grid: aiGrid,
            currentPlayer: aiGameWon || aiIsDraw ? 2 : 1,
            gameWon: aiGameWon,
            winner: aiGameWon ? 2 : null,
            isDraw: aiIsDraw,
            winningCells: aiWinningCells || [],
            isThinking: false
          }));

          if (aiGameWon) {
            toast({
              title: "Game Over!",
              description: "AI wins!",
            });
            gameStorage.saveScore('connect-four', 'AI', 1);
          } else if (aiIsDraw) {
            toast({
              title: "Draw!",
              description: "The game ended in a draw.",
            });
          }
        }
      }, 1000);
    }
  };

  const startNewGame = () => {
    const newGameState: GameState = {
      grid: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
      currentPlayer: 1,
      gameMode: selectedMode,
      gameWon: false,
      winner: null,
      isDraw: false,
      winningCells: [],
      isThinking: false
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('connect-four', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('connect-four');
  };

  const isWinningCell = (row: number, col: number): boolean => {
    return gameState.winningCells.some(cell => cell.row === row && cell.col === col);
  };

  if (setupMode) {
    return (
      <GameSetupLayout 
        title="Connect Four" 
        icon={connectFourIcon} 
        onStart={startNewGame}
      >
        <OptionGroup label="Game Mode">
          <OptionButtons 
            options={['vs AI', '2 Players']} 
            selected={selectedMode === '1-player' ? 'vs AI' : '2 Players'} 
            onSelect={(v) => setSelectedMode(v === 'vs AI' ? '1-player' : '2-player')}
            columns={3}
          />
        </OptionGroup>
      </GameSetupLayout>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <GameHeader title="Connect Four"  />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {gameState.gameMode === '1-player' ? 'vs AI' : '2 Players'}
              </Badge>
              {!gameState.gameWon && !gameState.isDraw ? (
                <span className="text-xs font-semibold">
                  {gameState.isThinking ? 'AI thinking...' : 
                   `Player ${gameState.currentPlayer}`}
                </span>
              ) : gameState.gameWon ? (
                <span className="text-xs font-bold text-green-600">
                  🎉 {gameState.gameMode === '1-player' && gameState.winner === 2 ? 'AI' : `P${gameState.winner}`} Wins!
                </span>
              ) : (
                <span className="text-xs font-bold text-yellow-600">🤝 Draw!</span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={resetGame} className="text-xs px-2 py-1 h-6">
              New
            </Button>
          </div>
        </div>

        {/* Compact Game Board */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-2 flex items-center justify-center">
          <div className="bg-blue-600 p-2 rounded-lg">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  const cell = gameState.grid[row][col];
                  const isWinning = isWinningCell(row, col);
                  
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center border transition-all
                        ${cell === null ? 'bg-white border-gray-300' :
                          cell === 1 ? 'bg-red-500 border-red-600' : 'bg-yellow-400 border-yellow-500'}
                        ${isWinning ? 'ring-2 ring-green-400 ring-opacity-75' : ''}
                      `}
                    />
                  );
                })
              )}
            </div>
            
            {/* Compact Column buttons */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: COLS }, (_, col) => (
                <Button
                  key={col}
                  onClick={() => makeMove(col)}
                  disabled={gameState.gameWon || gameState.isDraw || gameState.isThinking || getLowestAvailableRow(gameState.grid, col) === null}
                  className="w-8 h-6 text-xs font-bold p-0"
                  variant="outline"
                >
                  ↓
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
