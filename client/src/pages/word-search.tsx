import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WORD_LISTS, BONUS_WORDS, WORD_SEARCH_CATEGORIES, type GameCategory, type WordSearchCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

interface Position {
  row: number;
  col: number;
}

interface PlacedWord {
  word: string;
  start: Position;
  end: Position;
  direction: string;
}

interface GameState {
  grid: string[][];
  wordList: string[];
  placedWords: PlacedWord[];
  foundWords: string[];
  category: GameCategory;
  selectedCells: Position[];
  isSelecting: boolean;
  startPos: Position | null;
  gameWon: boolean;
}

const GRID_SIZE = 16;
const DIRECTIONS = [
  { name: 'right', dr: 0, dc: 1 },
  { name: 'down', dr: 1, dc: 0 },
  { name: 'diagonal-down', dr: 1, dc: 1 },
  { name: 'diagonal-up', dr: -1, dc: 1 },
  { name: 'left', dr: 0, dc: -1 },
  { name: 'up', dr: -1, dc: 0 },
  { name: 'diagonal-up-left', dr: -1, dc: -1 },
  { name: 'diagonal-down-left', dr: 1, dc: -1 }
];

export default function WordSearch() {
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    wordList: [],
    placedWords: [],
    foundWords: [],
    category: 'animals',
    selectedCells: [],
    isSelecting: false,
    startPos: null,
    gameWon: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('animals');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('word-search');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const createEmptyGrid = (): string[][] => {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  };

  const canPlaceWord = (grid: string[][], word: string, row: number, col: number, direction: { dr: number; dc: number }): boolean => {
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * direction.dr;
      const newCol = col + i * direction.dc;
      
      if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) {
        return false;
      }
      
      const currentCell = grid[newRow][newCol];
      if (currentCell !== '' && currentCell !== word[i]) {
        return false;
      }
    }
    return true;
  };

  const placeWord = (grid: string[][], word: string, row: number, col: number, direction: { dr: number; dc: number }): PlacedWord => {
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * direction.dr;
      const newCol = col + i * direction.dc;
      grid[newRow][newCol] = word[i];
    }
    
    return {
      word,
      start: { row, col },
      end: { 
        row: row + (word.length - 1) * direction.dr, 
        col: col + (word.length - 1) * direction.dc 
      },
      direction: direction.dr === 0 && direction.dc === 1 ? 'horizontal' : 
                 direction.dr === 1 && direction.dc === 0 ? 'vertical' : 'diagonal'
    };
  };

  const fillEmptyCells = (grid: string[][]) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === '') {
          grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  };

  const generateWordSearch = (category: GameCategory) => {
    const words = WORD_LISTS[category].slice(0, 8).map(word => word.toUpperCase());
    const grid = createEmptyGrid();
    const placedWords: PlacedWord[] = [];

    words.forEach(word => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        
        if (canPlaceWord(grid, word, row, col, direction)) {
          const placedWord = placeWord(grid, word, row, col, direction);
          placedWords.push(placedWord);
          placed = true;
        }
        attempts++;
      }
    });

    fillEmptyCells(grid);
    
    return {
      grid,
      wordList: words,
      placedWords
    };
  };

  const getSelectedWord = (): string => {
    if (gameState.selectedCells.length === 0) return '';
    
    return gameState.selectedCells
      .map(pos => gameState.grid[pos.row][pos.col])
      .join('');
  };

  const isValidSelection = (start: Position, end: Position): boolean => {
    const rowDiff = Math.abs(end.row - start.row);
    const colDiff = Math.abs(end.col - start.col);
    
    // Must be horizontal, vertical, or diagonal
    return rowDiff === 0 || colDiff === 0 || rowDiff === colDiff;
  };

  const getCellsInLine = (start: Position, end: Position): Position[] => {
    const cells: Position[] = [];
    const rowStep = end.row === start.row ? 0 : end.row > start.row ? 1 : -1;
    const colStep = end.col === start.col ? 0 : end.col > start.col ? 1 : -1;
    
    let row = start.row;
    let col = start.col;
    
    while (true) {
      cells.push({ row, col });
      if (row === end.row && col === end.col) break;
      row += rowStep;
      col += colStep;
    }
    
    return cells;
  };

  const handleCellMouseDown = (row: number, col: number) => {
    setGameState(prev => ({
      ...prev,
      isSelecting: true,
      startPos: { row, col },
      selectedCells: [{ row, col }]
    }));
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!gameState.isSelecting || !gameState.startPos) return;
    
    if (isValidSelection(gameState.startPos, { row, col })) {
      const cells = getCellsInLine(gameState.startPos, { row, col });
      setGameState(prev => ({
        ...prev,
        selectedCells: cells
      }));
    }
  };

  const handleCellMouseUp = () => {
    if (!gameState.isSelecting) return;
    
    const selectedWord = getSelectedWord();
    const reversedWord = selectedWord.split('').reverse().join('');
    
    const foundWord = gameState.wordList.find(word => 
      word === selectedWord || word === reversedWord
    );
    
    if (foundWord && !gameState.foundWords.includes(foundWord)) {
      const newFoundWords = [...gameState.foundWords, foundWord];
      const gameWon = newFoundWords.length === gameState.wordList.length;
      
      setGameState(prev => ({
        ...prev,
        foundWords: newFoundWords,
        gameWon,
        isSelecting: false,
        selectedCells: [],
        startPos: null
      }));
      
      toast({
        title: "Word Found!",
        description: `You found: ${foundWord}`,
      });
      
      if (gameWon) {
        toast({
          title: "Congratulations!",
          description: "You found all the words!",
        });
        gameStorage.saveScore('word-search', 'Player', newFoundWords.length);
      }
    } else {
      setGameState(prev => ({
        ...prev,
        isSelecting: false,
        selectedCells: [],
        startPos: null
      }));
    }
  };

  const isCellSelected = (row: number, col: number): boolean => {
    return gameState.selectedCells.some(pos => pos.row === row && pos.col === col);
  };

  const isCellPartOfFoundWord = (row: number, col: number): boolean => {
    return gameState.placedWords.some(placedWord => {
      if (!gameState.foundWords.includes(placedWord.word)) return false;
      
      const cells = getCellsInLine(placedWord.start, placedWord.end);
      return cells.some(pos => pos.row === row && pos.col === col);
    });
  };

  const startNewGame = () => {
    const { grid, wordList, placedWords } = generateWordSearch(selectedCategory);
    
    const newGameState: GameState = {
      grid,
      wordList,
      placedWords,
      foundWords: [],
      category: selectedCategory,
      selectedCells: [],
      isSelecting: false,
      startPos: null,
      gameWon: false
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('word-search', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('word-search');
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Word Search" showSave={false} />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Choose Category</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as GameCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={startNewGame} className="w-full" size="lg">
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
      <GameHeader title="Word Search" onSave={saveGame} />
      
      <div className="max-w-6xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {gameState.category.charAt(0).toUpperCase() + gameState.category.slice(1)}
                </Badge>
                <span className="text-lg font-semibold">
                  Found: {gameState.foundWords.length} / {gameState.wordList.length}
                </span>
                {gameState.gameWon && (
                  <Badge className="bg-green-100 text-green-800">Completed! 🎉</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetGame}>
                New Puzzle
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Word Search Grid */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div 
                  className="grid grid-cols-16 gap-0 max-w-2xl mx-auto select-none"
                  style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}
                >
                  {gameState.grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`
                          w-6 h-6 border border-gray-300 flex items-center justify-center text-xs font-bold cursor-pointer
                          ${isCellSelected(rowIndex, colIndex) ? 'bg-blue-200' : ''}
                          ${isCellPartOfFoundWord(rowIndex, colIndex) ? 'bg-green-200' : ''}
                          ${!isCellPartOfFoundWord(rowIndex, colIndex) && !isCellSelected(rowIndex, colIndex) ? 'hover:bg-gray-100' : ''}
                        `}
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                        onMouseUp={handleCellMouseUp}
                      >
                        {cell}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Word List */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Find These Words:</h3>
                <div className="space-y-2">
                  {gameState.wordList.map((word, index) => (
                    <div
                      key={index}
                      className={`
                        p-2 rounded text-sm font-medium
                        ${gameState.foundWords.includes(word) 
                          ? 'bg-green-100 text-green-800 line-through' 
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}
                    >
                      {word}
                    </div>
                  ))}
                </div>
                
                {gameState.gameWon && (
                  <div className="mt-6 text-center">
                    <Button onClick={resetGame} className="w-full">
                      New Puzzle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Click and drag to select words. Words can be horizontal, vertical, or diagonal in any direction.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
