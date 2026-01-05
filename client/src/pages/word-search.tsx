import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WORD_LISTS, BONUS_WORDS, WORD_SEARCH_CATEGORIES, GAME_CATEGORIES, type GameCategory, type WordSearchCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/use-auto-save";
import wordSearchIcon from "@assets/generated_images/word_search_game_tile_icon.png";

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
  const [showWordList, setShowWordList] = useState(false);
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
      // Allow placement if cell is empty OR if it contains the same letter (overlap)
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

  // Find potential intersection points between a new word and existing words
  const findIntersectionOpportunities = (grid: string[][], word: string, placedWords: PlacedWord[]) => {
    const opportunities: Array<{
      row: number;
      col: number;
      direction: { dr: number; dc: number };
      score: number;
    }> = [];

    for (const placedWord of placedWords) {
      // Get all positions of the placed word
      const placedPositions: Array<{ row: number; col: number; letter: string }> = [];
      const dr = placedWord.end.row > placedWord.start.row ? 1 : placedWord.end.row < placedWord.start.row ? -1 : 0;
      const dc = placedWord.end.col > placedWord.start.col ? 1 : placedWord.end.col < placedWord.start.col ? -1 : 0;
      
      for (let i = 0; i < placedWord.word.length; i++) {
        const row = placedWord.start.row + (dr * i);
        const col = placedWord.start.col + (dc * i);
        placedPositions.push({ row, col, letter: placedWord.word[i] });
      }

      // Check each letter in the new word for potential intersections
      for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
        const wordLetter = word[wordIndex];
        
        for (const placedPos of placedPositions) {
          if (placedPos.letter === wordLetter) {
            // Try each direction for the new word through this intersection
            for (const direction of DIRECTIONS) {
              // Calculate starting position for the new word
              const startRow = placedPos.row - (wordIndex * direction.dr);
              const startCol = placedPos.col - (wordIndex * direction.dc);
              
              // Check if this placement is valid and perpendicular to existing word
              const existingDir = { dr, dc };
              const isPerpendicular = (direction.dr === 0 && existingDir.dc === 0) || 
                                    (direction.dc === 0 && existingDir.dr === 0) ||
                                    (direction.dr !== 0 && direction.dc !== 0 && existingDir.dr === 0) ||
                                    (direction.dr !== 0 && direction.dc !== 0 && existingDir.dc === 0) ||
                                    (direction.dr === 0 && existingDir.dr !== 0 && existingDir.dc !== 0) ||
                                    (direction.dc === 0 && existingDir.dr !== 0 && existingDir.dc !== 0);
              
              if (canPlaceWord(grid, word, startRow, startCol, direction)) {
                opportunities.push({
                  row: startRow,
                  col: startCol,
                  direction,
                  score: isPerpendicular ? 10 : 5 // Prefer perpendicular intersections
                });
              }
            }
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.score - a.score);
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
    
    // Combine all words for placement, sort by length (longer words first)
    const allWordsToPlace = [...mainWords, ...selectedBonusWords]
      .sort((a, b) => b.length - a.length);
    
    const grid = createEmptyGrid();
    const placedWords: PlacedWord[] = [];
    const OVERLAP_CHANCE = 0.7; // 70% chance to try overlapping with existing words

    for (const word of allWordsToPlace) {
      let placed = false;
      let attempts = 0;
      
      // For the first word, or if no overlap opportunities exist, place randomly
      if (placedWords.length === 0 || Math.random() > OVERLAP_CHANCE) {
        // Try random placement
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
      } else {
        // Try to find intersection opportunities first
        const opportunities = findIntersectionOpportunities(grid, word, placedWords);
        
        // Try the best intersection opportunities first
        for (const opp of opportunities.slice(0, 5)) { // Try top 5 opportunities
          if (canPlaceWord(grid, word, opp.row, opp.col, opp.direction)) {
            const placedWord = placeWord(grid, word, opp.row, opp.col, opp.direction);
            placedWords.push(placedWord);
            placed = true;
            break;
          }
        }
        
        // If no intersection worked, try random placement
        attempts = 0;
        while (!placed && attempts < 50) {
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
      }
    }

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

  const isCellPartOfFoundBonusWord = (row: number, col: number): boolean => {
    return gameState.placedWords.some(placedWord => {
      if (!gameState.foundBonusWords.includes(placedWord.word)) return false;
      
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
      <GameSetupLayout 
        title="Word Search" 
        icon={wordSearchIcon}
        onStart={startNewGame}
        startLabel="Generate Puzzle"
      >
        <OptionGroup label="Theme">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as WordSearchCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {WORD_SEARCH_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'random' ? '🎲 Random' : category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionGroup>
      </GameSetupLayout>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <GameHeader title="Word Search" />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                🎯 {gameState.foundWords.length}/{gameState.wordList.length}
              </span>
              {gameState.foundBonusWords.length > 0 && (
                <span className="text-sm text-yellow-600">⭐ +{gameState.foundBonusWords.length}</span>
              )}
              {gameState.gameWon && <span className="text-sm text-green-600 font-medium">Complete! 🎉</span>}
            </div>
            <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-new-game">
              New
            </Button>
          </div>
        </div>

        {/* Words List - tap to expand */}
        <div className="bg-white rounded-lg shadow-sm mb-2 overflow-hidden">
          <button
            onClick={() => setShowWordList(!showWordList)}
            className="w-full p-3 flex items-center justify-between text-left"
            data-testid="button-toggle-words"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Words to Find
              </span>
              <span className="text-xs text-gray-400">
                ({gameState.wordList.length - gameState.foundWords.length} left)
              </span>
            </div>
            <span className="text-gray-400 text-lg">
              {showWordList ? '▲' : '▼'}
            </span>
          </button>
          
          {showWordList && (
            <div className="px-3 pb-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 pt-2">
                {gameState.wordList.map((word, index) => {
                  const isFound = gameState.foundWords.includes(word);
                  return (
                    <div
                      key={index}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-center transition-all ${
                        isFound 
                          ? 'bg-green-100 text-green-700 line-through opacity-60' 
                          : 'bg-gray-50 text-gray-800'
                      }`}
                    >
                      {word}
                    </div>
                  );
                })}
              </div>
              {gameState.foundBonusWords.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-yellow-600 mb-2">Bonus Words Found:</div>
                  <div className="flex flex-wrap gap-2">
                    {gameState.foundBonusWords.map((word, index) => (
                      <span
                        key={`bonus-${index}`}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                      >
                        ⭐ {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid - optimized for touch */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-1 overflow-hidden">
          <div className="relative w-full aspect-square max-h-full">
            <div 
              className="grid w-full h-full select-none"
              style={{ 
                gridTemplateColumns: 'repeat(16, 1fr)',
                gridTemplateRows: 'repeat(16, 1fr)',
                gap: '1px',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
            >
              {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const isFoundWord = isCellPartOfFoundWord(rowIndex, colIndex);
                      const isFoundBonusWord = isCellPartOfFoundBonusWord(rowIndex, colIndex);
                      const selectionIndex = gameState.selectedCells.findIndex(
                        pos => pos.row === rowIndex && pos.col === colIndex
                      );
                      
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          data-row={rowIndex}
                          data-col={colIndex}
                          className={`
                            aspect-square flex items-center justify-center text-xs font-bold cursor-pointer
                            relative transition-all duration-200 ease-in-out
                            ${!isSelected && !isFoundWord ? 'hover:bg-gray-100' : ''}
                          `}
                          style={{
                            backgroundColor: 'transparent',
                            color: isFoundWord || isFoundBonusWord ? 'white' : isSelected ? '#1e40af' : '#374151',
                            border: isSelected && !isFoundWord ? '2px solid #3b82f6' : '1px solid transparent',
                            borderRadius: isSelected ? '50%' : '0%',
                            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                            zIndex: isSelected ? 10 : 3,
                            position: 'relative',
                            fontWeight: isSelected || isFoundWord ? 'bold' : 'normal',
                            textShadow: isFoundWord || isFoundBonusWord ? '0 0 2px rgba(0,0,0,0.7)' : 'none'
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
                          {cell}
                        </div>
                      );
                    })
                  )}
            </div>

            {/* SVG overlay for green circles behind found words */}
            <svg 
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              style={{ zIndex: 1 }}
            >
                    {gameState.foundWords.map((word) => {
                      const placedWord = gameState.placedWords.find(pw => pw.word === word);
                      if (!placedWord) return null;
                      
                      // Create circles for each letter in the found word
                      const circles = [];
                      const dr = placedWord.end.row > placedWord.start.row ? 1 : placedWord.end.row < placedWord.start.row ? -1 : 0;
                      const dc = placedWord.end.col > placedWord.start.col ? 1 : placedWord.end.col < placedWord.start.col ? -1 : 0;
                      
                      for (let i = 0; i < word.length; i++) {
                        const row = placedWord.start.row + (dr * i);
                        const col = placedWord.start.col + (dc * i);
                        const centerX = (col + 0.5) / GRID_SIZE * 100;
                        const centerY = (row + 0.5) / GRID_SIZE * 100;
                        
                        circles.push(
                          <circle
                            key={`${word}-${i}`}
                            cx={centerX}
                            cy={centerY}
                            r="2.5"
                            fill="rgb(34, 197, 94)"
                            stroke="rgb(34, 197, 94)"
                            strokeWidth="0.2"
                          />
                        );
                      }
                      return circles;
                    })}
                    
                    {gameState.foundBonusWords.map((word) => {
                      const placedWord = gameState.placedWords.find(pw => pw.word === word);
                      if (!placedWord) return null;
                      
                      // Create circles for each letter in the found bonus word
                      const circles = [];
                      const dr = placedWord.end.row > placedWord.start.row ? 1 : placedWord.end.row < placedWord.start.row ? -1 : 0;
                      const dc = placedWord.end.col > placedWord.start.col ? 1 : placedWord.end.col < placedWord.start.col ? -1 : 0;
                      
                      for (let i = 0; i < word.length; i++) {
                        const row = placedWord.start.row + (dr * i);
                        const col = placedWord.start.col + (dc * i);
                        const centerX = (col + 0.5) / GRID_SIZE * 100;
                        const centerY = (row + 0.5) / GRID_SIZE * 100;
                        
                        circles.push(
                          <circle
                            key={`bonus-${word}-${i}`}
                            cx={centerX}
                            cy={centerY}
                            r="2.5"
                            fill="rgb(251, 191, 36)"
                            stroke="rgb(251, 191, 36)"
                            strokeWidth="0.2"
                          />
                        );
                      }
                      return circles;
                    })}
                  </svg>

                  {/* SVG overlay for drawing lines on found words - positioned after grid */}
                  <svg 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ zIndex: 2 }}
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
                          stroke="#22c55e"
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
                          stroke="#fbbf24"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity="0.8"
                        />
                      );
                    })}
                  </svg>

          </div>
        </div>
      </div>
    </div>
  );
}
