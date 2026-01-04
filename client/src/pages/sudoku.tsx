import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup, OptionButtons } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";
import sudokuIcon from "@assets/generated_images/sudoku_game_tile_icon.png";

type Difficulty = 'easy' | 'medium' | 'hard';

interface Cell {
  value: number;
  isOriginal: boolean;
  isHighlighted: boolean;
  isError: boolean;
}

interface GameState {
  grid: Cell[][];
  solution: number[][];
  difficulty: Difficulty;
  selectedCell: { row: number; col: number } | null;
  hintsUsed: number;
  maxHints: number;
  timeElapsed: number;
  isComplete: boolean;
  isPaused: boolean;
}

const DIFFICULTY_SETTINGS = {
  easy: { cellsToRemove: 40, maxHints: 5 },
  medium: { cellsToRemove: 50, maxHints: 3 },
  hard: { cellsToRemove: 60, maxHints: 1 }
};

export default function Sudoku() {
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    solution: [],
    difficulty: 'medium',
    selectedCell: null,
    hintsUsed: 0,
    maxHints: 3,
    timeElapsed: 0,
    isComplete: false,
    isPaused: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('sudoku');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (!gameState.isPaused && !gameState.isComplete && !setupMode) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameState.isPaused, gameState.isComplete, setupMode]);

  // Auto-save game state when it changes (except initial load)
  useEffect(() => {
    if (!setupMode && gameState.grid.length > 0) {
      gameStorage.saveGameState('sudoku', gameState);
    }
  }, [gameState, setupMode]);

  const createEmptyGrid = (): number[][] => {
    return Array(9).fill(null).map(() => Array(9).fill(0));
  };

  const isValidMove = (grid: number[][], row: number, col: number, num: number): boolean => {
    // Check row
    for (let i = 0; i < 9; i++) {
      if (i !== col && grid[row][i] === num) return false;
    }
    
    // Check column
    for (let i = 0; i < 9; i++) {
      if (i !== row && grid[i][col] === num) return false;
    }
    
    // Check 3x3 box
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    
    for (let i = boxStartRow; i < boxStartRow + 3; i++) {
      for (let j = boxStartCol; j < boxStartCol + 3; j++) {
        if (!(i === row && j === col) && grid[i][j] === num) return false;
      }
    }
    
    return true;
  };

  const solveSudoku = (grid: number[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              if (solveSudoku(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const generateCompleteSudoku = (): number[][] => {
    const grid = createEmptyGrid();
    
    // Fill diagonal 3x3 boxes first
    for (let box = 0; box < 3; box++) {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const randomIndex = Math.floor(Math.random() * numbers.length);
          grid[box * 3 + i][box * 3 + j] = numbers[randomIndex];
          numbers.splice(randomIndex, 1);
        }
      }
    }
    
    solveSudoku(grid);
    return grid;
  };

  const removeCells = (grid: number[][], count: number): number[][] => {
    const puzzle = grid.map(row => [...row]);
    let removed = 0;
    
    while (removed < count) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }
    
    return puzzle;
  };

  const convertToGameGrid = (puzzle: number[][], solution: number[][]): Cell[][] => {
    return puzzle.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        value,
        isOriginal: value !== 0,
        isHighlighted: false,
        isError: false
      }))
    );
  };

  const generatePuzzle = (difficulty: Difficulty) => {
    const solution = generateCompleteSudoku();
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const puzzle = removeCells(solution.map(row => [...row]), settings.cellsToRemove);
    const grid = convertToGameGrid(puzzle, solution);

    setGameState(prev => ({
      ...prev,
      grid,
      solution,
      difficulty,
      maxHints: settings.maxHints,
      hintsUsed: 0,
      timeElapsed: 0,
      isComplete: false,
      isPaused: false,
      selectedCell: null
    }));
  };

  const selectCell = (row: number, col: number) => {
    if (gameState.grid[row][col].isOriginal) return;

    setGameState(prev => ({
      ...prev,
      selectedCell: { row, col },
      grid: prev.grid.map((gridRow, r) =>
        gridRow.map((cell, c) => ({
          ...cell,
          isHighlighted: r === row || c === col || 
            (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))
        }))
      )
    }));
  };

  const enterNumber = (num: number) => {
    if (!gameState.selectedCell) return;
    
    const { row, col } = gameState.selectedCell;
    if (gameState.grid[row][col].isOriginal) return;

    const newGrid = gameState.grid.map(row => row.map(cell => ({ ...cell })));
    
    if (newGrid[row][col].value === num) {
      newGrid[row][col].value = 0; // Clear if same number
    } else {
      newGrid[row][col].value = num;
    }

    // Check for errors
    const gridValues = newGrid.map(row => row.map(cell => cell.value));
    const isValid = num === 0 || isValidMove(gridValues, row, col, num);
    newGrid[row][col].isError = !isValid && num !== 0;

    // Check if puzzle is complete
    const isComplete = newGrid.every(row => 
      row.every(cell => cell.value !== 0 && !cell.isError)
    );

    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      isComplete
    }));

    if (isComplete) {
      toast({
        title: "Congratulations!",
        description: `Puzzle completed in ${formatTime(gameState.timeElapsed)}!`,
      });
      gameStorage.saveScore('sudoku', 'Player', Math.max(1000 - gameState.timeElapsed - gameState.hintsUsed * 60, 100));
    }
  };

  const useHint = () => {
    if (gameState.hintsUsed >= gameState.maxHints || !gameState.selectedCell) return;

    const { row, col } = gameState.selectedCell;
    if (gameState.grid[row][col].isOriginal) return;

    const correctValue = gameState.solution[row][col];
    
    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1,
      grid: prev.grid.map((gridRow, r) =>
        gridRow.map((cell, c) =>
          r === row && c === col
            ? { ...cell, value: correctValue, isError: false }
            : cell
        )
      )
    }));

    toast({
      title: "Hint Used",
      description: `Correct number revealed! (${gameState.maxHints - gameState.hintsUsed - 1} hints remaining)`,
    });
  };

  const startNewGame = () => {
    generatePuzzle(selectedDifficulty);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('sudoku', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('sudoku');
  };

  const togglePause = () => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (setupMode) {
    return (
      <GameSetupLayout 
        title="Sudoku" 
        icon={sudokuIcon} 
        onStart={startNewGame}
        startLabel="Generate Puzzle"
      >
        <OptionGroup label="Difficulty">
          <OptionButtons 
            options={['Easy', 'Medium', 'Hard']} 
            selected={selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)} 
            onSelect={(v) => setSelectedDifficulty((v as string).toLowerCase() as Difficulty)}
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            {DIFFICULTY_SETTINGS[selectedDifficulty].maxHints} hints available
          </p>
        </OptionGroup>
      </GameSetupLayout>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <GameHeader title="Sudoku"  />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs px-1 py-0 capitalize">{gameState.difficulty}</Badge>
              <span className="text-xs">⏱️ {formatTime(gameState.timeElapsed)}</span>
              <span className="text-xs">💡 {gameState.maxHints - gameState.hintsUsed}</span>
              {gameState.isComplete && <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">Won! 🎉</Badge>}
            </div>
            <div className="flex space-x-1">
              <Button variant="outline" size="sm" onClick={togglePause} className="text-xs px-1 py-0 h-6">
                {gameState.isPaused ? '▶' : '⏸'}
              </Button>
              <Button variant="outline" size="sm" onClick={resetGame} className="text-xs px-1 py-0 h-6">
                New
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Grid */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-2 mb-2 flex items-center justify-center">
          <div className="relative">
            <div className="grid grid-cols-9 gap-0 border-2 border-gray-800">
              {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => selectCell(rowIndex, colIndex)}
                    disabled={gameState.isPaused || gameState.isComplete}
                    className={`
                      w-6 h-6 border border-gray-400 text-xs font-bold flex items-center justify-center transition-all
                      ${cell.isOriginal ? 'bg-gray-100 text-gray-800' : 'bg-white text-blue-600'}
                      ${cell.isHighlighted ? 'bg-blue-100' : ''}
                      ${cell.isError ? 'bg-red-100 text-red-600' : ''}
                      ${gameState.selectedCell?.row === rowIndex && gameState.selectedCell?.col === colIndex ? 'bg-yellow-200 ring-1 ring-yellow-400' : ''}
                      ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-gray-800' : ''}
                      ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-gray-800' : ''}
                      hover:bg-blue-50 disabled:cursor-not-allowed
                    `}
                  >
                    {cell.value !== 0 ? cell.value : ''}
                  </button>
                ))
              )}
            </div>

            {gameState.isPaused && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded">
                <div className="bg-white p-3 rounded text-center">
                  <div className="text-sm font-bold mb-2">Paused</div>
                  <Button onClick={togglePause} size="sm" className="text-xs h-6">Resume</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Numbers */}
        <div className="bg-white rounded-lg shadow-sm p-2">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <Button
                key={num}
                variant="outline"
                onClick={() => enterNumber(num)}
                disabled={!gameState.selectedCell || gameState.isPaused || gameState.isComplete}
                className="w-full h-8 text-sm font-bold p-0"
              >
                {num}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="outline"
              onClick={() => enterNumber(0)}
              disabled={!gameState.selectedCell || gameState.isPaused || gameState.isComplete}
              className="w-full text-xs h-6"
            >
              Clear
            </Button>
            
            <Button
              variant="outline"
              onClick={useHint}
              disabled={!gameState.selectedCell || gameState.hintsUsed >= gameState.maxHints || gameState.isPaused || gameState.isComplete}
              className="w-full text-xs h-6"
            >
              Hint
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
