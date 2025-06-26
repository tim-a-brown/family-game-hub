import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Sudoku" showSave={false} />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Choose Difficulty</h2>
              
              <div className="space-y-4">
                {(['easy', 'medium', 'hard'] as const).map(difficulty => (
                  <Button
                    key={difficulty}
                    variant={selectedDifficulty === difficulty ? "default" : "outline"}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className="w-full justify-between"
                  >
                    <span className="capitalize">{difficulty}</span>
                    <span className="text-xs">
                      {DIFFICULTY_SETTINGS[difficulty].maxHints} hints
                    </span>
                  </Button>
                ))}
                
                <Button onClick={startNewGame} className="w-full mt-6" size="lg">
                  Generate Puzzle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <GameHeader title="Sudoku" onSave={saveGame} />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="capitalize">{gameState.difficulty}</Badge>
                <span className="text-lg font-semibold">⏱️ {formatTime(gameState.timeElapsed)}</span>
                <span className="text-sm text-gray-600">
                  Hints: {gameState.hintsUsed}/{gameState.maxHints}
                </span>
                {gameState.isComplete && (
                  <Badge className="bg-green-100 text-green-800">Completed! 🎉</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={togglePause}>
                  {gameState.isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Puzzle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sudoku Grid */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-9 gap-0 w-fit mx-auto border-4 border-gray-800">
                  {gameState.grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => selectCell(rowIndex, colIndex)}
                        disabled={gameState.isPaused || gameState.isComplete}
                        className={`
                          w-12 h-12 border border-gray-400 text-lg font-bold flex items-center justify-center transition-all
                          ${cell.isOriginal ? 'bg-gray-100 text-gray-800 font-black' : 'bg-white text-blue-600'}
                          ${cell.isHighlighted ? 'bg-blue-100' : ''}
                          ${cell.isError ? 'bg-red-100 text-red-600' : ''}
                          ${gameState.selectedCell?.row === rowIndex && gameState.selectedCell?.col === colIndex ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''}
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
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <h3 className="text-2xl font-bold mb-4">Game Paused</h3>
                        <Button onClick={togglePause}>Resume</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg mb-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Numbers</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Button
                      key={num}
                      variant="outline"
                      onClick={() => enterNumber(num)}
                      disabled={!gameState.selectedCell || gameState.isPaused || gameState.isComplete}
                      className="w-full h-12 text-lg font-bold"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => enterNumber(0)}
                    disabled={!gameState.selectedCell || gameState.isPaused || gameState.isComplete}
                    className="w-full"
                  >
                    Clear
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={useHint}
                    disabled={!gameState.selectedCell || gameState.hintsUsed >= gameState.maxHints || gameState.isPaused || gameState.isComplete}
                    className="w-full"
                  >
                    Hint ({gameState.maxHints - gameState.hintsUsed})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">How to Play</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>• Click a cell to select it</p>
                  <p>• Click numbers to fill cells</p>
                  <p>• Each row, column, and 3×3 box must contain digits 1-9</p>
                  <p>• Red numbers indicate errors</p>
                  <p>• Use hints if you're stuck!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
