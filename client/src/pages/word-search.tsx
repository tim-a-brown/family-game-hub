import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WORD_LISTS, BONUS_WORDS, WORD_SEARCH_CATEGORIES, GAME_CATEGORIES, type GameCategory, type WordSearchCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/use-auto-save";

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
  bonusWords: string[];
  placedWords: PlacedWord[];
  foundWords: string[];
  foundBonusWords: string[];
  category: WordSearchCategory;
  actualCategory: GameCategory; // The actual category chosen when random is selected
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
    bonusWords: [],
    placedWords: [],
    foundWords: [],
    foundBonusWords: [],
    category: 'random',
    actualCategory: 'animals',
    selectedCells: [],
    isSelecting: false,
    startPos: null,
    gameWon: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<WordSearchCategory>('random');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();
  
  // Auto-save functionality
  const { saveGame: autoSave } = useAutoSave({
    gameType: 'word-search',
    gameState,
    enabled: !setupMode && gameState.foundWords.length > 0
  });

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

  const generateWordSearch = (category: WordSearchCategory) => {
    // Handle random category selection
    const actualCategory = category === 'random' 
      ? GAME_CATEGORIES[Math.floor(Math.random() * GAME_CATEGORIES.length)]
      : category as GameCategory;
      
    // Get main words and bonus words
    const allWords = WORD_LISTS[actualCategory];
    const bonusWords = BONUS_WORDS[actualCategory];
    
    // Select 8-12 main words and 3 bonus words
    const mainWordCount = Math.floor(Math.random() * 5) + 8; // 8-12 words
    const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
    const mainWords = shuffledWords.slice(0, mainWordCount).map(word => word.toUpperCase());
    const selectedBonusWords = bonusWords.slice(0, 3).map(word => word.toUpperCase());
    
    // Combine all words for placement
    const allWordsToPlace = [...mainWords, ...selectedBonusWords];
    
    const grid = createEmptyGrid();
    const placedWords: PlacedWord[] = [];

    allWordsToPlace.forEach(word => {
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
      wordList: mainWords,
      bonusWords: selectedBonusWords,
      placedWords,
      actualCategory
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
    
    // Check main word list
    const foundMainWord = gameState.wordList.find(word => 
      word === selectedWord || word === reversedWord
    );
    
    // Check bonus words
    const foundBonusWord = gameState.bonusWords.find(word => 
      word === selectedWord || word === reversedWord
    );
    
    if (foundMainWord && !gameState.foundWords.includes(foundMainWord)) {
      const newFoundWords = [...gameState.foundWords, foundMainWord];
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
        description: `You found: ${foundMainWord}`,
      });
      
      if (gameWon) {
        toast({
          title: "Congratulations!",
          description: "You found all the words!",
        });
        gameStorage.saveScore('word-search', 'Player', newFoundWords.length + gameState.foundBonusWords.length);
      }
    } else if (foundBonusWord && !gameState.foundBonusWords.includes(foundBonusWord)) {
      const newFoundBonusWords = [...gameState.foundBonusWords, foundBonusWord];
      
      setGameState(prev => ({
        ...prev,
        foundBonusWords: newFoundBonusWords,
        isSelecting: false,
        selectedCells: [],
        startPos: null
      }));
      
      toast({
        title: "Bonus Word Found!",
        description: `You found a bonus word: ${foundBonusWord}`,
      });
    } else {
      setGameState(prev => ({
        ...prev,
        isSelecting: false,
        selectedCells: [],
        startPos: null
      }));
    }
  };

  const handleCellClick = (row: number, col: number) => {
    // If clicking the first selected cell, deselect everything
    if (gameState.isSelecting && gameState.startPos && 
        gameState.startPos.row === row && gameState.startPos.col === col &&
        gameState.selectedCells.length === 1) {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        startPos: null,
        isSelecting: false
      }));
      return;
    }

    // Handle letter-by-letter clicking
    if (!gameState.isSelecting) {
      // Start new selection
      setGameState(prev => ({
        ...prev,
        selectedCells: [{ row, col }],
        startPos: { row, col },
        isSelecting: true
      }));
    } else {
      // Add to existing selection if it forms a valid line
      const startPos = gameState.startPos;
      if (startPos && isValidSelection(startPos, { row, col })) {
        const newCells = getCellsInLine(startPos, { row, col });
        setGameState(prev => ({
          ...prev,
          selectedCells: newCells
        }));
      } else {
        // Start new selection from this cell
        setGameState(prev => ({
          ...prev,
          selectedCells: [{ row, col }],
          startPos: { row, col },
          isSelecting: true
        }));
      }
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
    const { grid, wordList, bonusWords, placedWords, actualCategory } = generateWordSearch(selectedCategory);
    
    const newGameState: GameState = {
      grid,
      wordList,
      bonusWords,
      placedWords,
      foundWords: [],
      foundBonusWords: [],
      category: selectedCategory,
      actualCategory,
      selectedCells: [],
      isSelecting: false,
      startPos: null,
      gameWon: false
    };

    setGameState(newGameState);
    setSetupMode(false);
  };



  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('word-search');
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Word Search" />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Choose Category</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as WordSearchCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORD_SEARCH_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category === 'random' ? '🎲 Random Category' : category.charAt(0).toUpperCase() + category.slice(1)}
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
      <GameHeader title="Word Search" />
      
      <div className="max-w-6xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {gameState.category === 'random' 
                    ? `🎲 Random (${gameState.actualCategory?.charAt(0).toUpperCase() + gameState.actualCategory?.slice(1) || 'Loading...'})` 
                    : gameState.category.charAt(0).toUpperCase() + gameState.category.slice(1)}
                </Badge>
                <span className="text-lg font-semibold">
                  Found: {gameState.foundWords.length} / {gameState.wordList.length}
                </span>
                {gameState.foundBonusWords.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Bonus: {gameState.foundBonusWords.length} / 3
                  </Badge>
                )}
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Word Bank - Top on mobile, right on desktop */}
          <div className="order-first lg:order-last w-full lg:w-64 flex-shrink-0">
            <Card className="shadow-lg h-fit">
              <CardContent className="p-3">
                <h3 className="font-bold text-sm mb-3 text-center">Words to Find</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1 text-xs">
                  {gameState.wordList.map((word, index) => {
                    const isFound = gameState.foundWords.includes(word);
                    return (
                      <div
                        key={index}
                        className={`p-1 rounded text-center transition-all ${
                          isFound 
                            ? 'bg-green-100 text-green-800 line-through' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {word}
                      </div>
                    );
                  })}
                </div>

                {/* Bonus Words */}
                {gameState.bonusWords.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-bold text-xs mb-2 text-center text-yellow-700">
                      Bonus Words ({gameState.foundBonusWords.length}/3)
                    </h4>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      {gameState.foundBonusWords.map((word, index) => (
                        <div
                          key={index}
                          className="p-1 rounded text-center bg-yellow-100 text-yellow-800"
                        >
                          {word}
                        </div>
                      ))}
                      {Array(3 - gameState.foundBonusWords.length).fill(0).map((_, index) => (
                        <div
                          key={`hidden-${index}`}
                          className="p-1 rounded text-center bg-gray-50 text-gray-400"
                        >
                          ???
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Word Search Grid */}
          <div className="flex-1 order-last lg:order-first">
            <Card className="shadow-lg">
              <CardContent className="p-2 sm:p-4">
                <div className="relative w-full max-w-md mx-auto aspect-square">
                  <div 
                    className="grid aspect-square w-full select-none relative"
                    style={{ 
                      gridTemplateColumns: 'repeat(16, 1fr)',
                      gap: '1px',
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      overflow: 'hidden'
                    }}
                    onTouchStart={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                  >
                  {gameState.grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const isFoundWord = isCellPartOfFoundWord(rowIndex, colIndex);
                      const selectionIndex = gameState.selectedCells.findIndex(
                        pos => pos.row === rowIndex && pos.col === colIndex
                      );
                      
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          data-row={rowIndex}
                          data-col={colIndex}
                          className={`
                            aspect-square flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer
                            relative transition-all duration-200 ease-in-out
                            ${!isSelected && !isFoundWord ? 'hover:bg-gray-100' : ''}
                          `}
                          style={{
                            backgroundColor: isFoundWord ? 'rgb(34, 197, 94)' : 'transparent',
                            color: isFoundWord ? 'white' : isSelected ? '#1e40af' : '#374151',
                            border: isSelected && !isFoundWord ? '2px solid #3b82f6' : isFoundWord ? '2px solid #22c55e' : '1px solid transparent',
                            borderRadius: isSelected || isFoundWord ? '50%' : '0%',
                            transform: isSelected || isFoundWord ? 'scale(1.1)' : 'scale(1)',
                            zIndex: isFoundWord ? 1 : isSelected ? 10 : 1,
                            position: 'relative',
                            fontWeight: isSelected || isFoundWord ? 'bold' : 'normal'
                          }}
                          onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                          onMouseUp={handleCellMouseUp}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            handleCellMouseDown(rowIndex, colIndex);
                          }}
                          onTouchMove={(e) => {
                            e.preventDefault();
                            const touch = e.touches[0];
                            const element = document.elementFromPoint(touch.clientX, touch.clientY);
                            if (element) {
                              const cellElement = element.closest('[data-row]');
                              if (cellElement) {
                                const row = parseInt(cellElement.getAttribute('data-row') || '0');
                                const col = parseInt(cellElement.getAttribute('data-col') || '0');
                                handleCellMouseEnter(row, col);
                              }
                            }
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            handleCellMouseUp();
                          }}
                        >
                          <span style={{ 
                            zIndex: 20, 
                            position: 'relative',
                            textShadow: isFoundWord ? '0 0 2px rgba(0,0,0,0.5)' : 'none',
                            fontWeight: isFoundWord ? 'bold' : 'normal'
                          }}>{cell}</span>
                        </div>
                      );
                    })
                  )}
                  </div>

                  {/* SVG overlay for drawing lines on found words - positioned after grid */}
                  <svg 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ zIndex: 5 }}
                  >
                    {gameState.foundWords.map((word) => {
                      const placedWord = gameState.placedWords.find(pw => pw.word === word);
                      if (!placedWord) return null;
                      
                      // Calculate line coordinates as percentages
                      const startX = (placedWord.start.col + 0.5) / GRID_SIZE * 100;
                      const startY = (placedWord.start.row + 0.5) / GRID_SIZE * 100;
                      const endX = (placedWord.end.col + 0.5) / GRID_SIZE * 100;
                      const endY = (placedWord.end.row + 0.5) / GRID_SIZE * 100;
                      
                      return (
                        <line
                          key={word}
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="#15803d"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                      );
                    })}
                    
                    {gameState.foundBonusWords.map((word) => {
                      const placedWord = gameState.placedWords.find(pw => pw.word === word);
                      if (!placedWord) return null;
                      
                      // Calculate line coordinates as percentages
                      const startX = (placedWord.start.col + 0.5) / GRID_SIZE * 100;
                      const startY = (placedWord.start.row + 0.5) / GRID_SIZE * 100;
                      const endX = (placedWord.end.col + 0.5) / GRID_SIZE * 100;
                      const endY = (placedWord.end.row + 0.5) / GRID_SIZE * 100;
                      
                      return (
                        <line
                          key={`bonus-${word}`}
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="#ca8a04"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Reset Button - appears at bottom during selection */}
                {gameState.selectedCells.length > 0 && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setGameState(prev => ({
                        ...prev,
                        selectedCells: [],
                        isSelecting: false,
                        startPos: null
                      }))}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      Reset Selection
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
            <div className="text-sm text-gray-600 text-center space-y-2">
              <p>
                <strong>How to Play:</strong> Click and drag to select words from the grid. Words can run in any direction: horizontal, vertical, or diagonal (forward or backward).
              </p>
              <p>
                <strong>Bonus Challenge:</strong> Find 3 hidden bonus words that aren't in the word list but are related to the theme for extra points!
              </p>
              <p>
                Selected from {WORD_LISTS[gameState.actualCategory]?.length || 250}+ words in the {gameState.actualCategory} category.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
