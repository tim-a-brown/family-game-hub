import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { HANGMAN_PUZZLES } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/use-auto-save";

interface GameState {
  puzzle: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  gameWon: boolean;
  gameLost: boolean;
  gameMode: 'single' | 'two-player';
  customPuzzle?: string;
}

// Dynamic hangman drawings based on max wrong guesses - always ends with legs
const generateHangmanDrawings = (maxWrong: number): string[] => {
  const drawings: string[] = [''];
  
  if (maxWrong === 6) {
    // 6 wrong answers: gallows, head, body, left arm, right arm, legs
    drawings.push('  +---+\n  |   |\n      |\n      |\n      |\n========='); // 1: gallows
    drawings.push('  +---+\n  |   |\n  O   |\n      |\n      |\n========='); // 2: head
    drawings.push('  +---+\n  |   |\n  O   |\n  |   |\n      |\n========='); // 3: body
    drawings.push('  +---+\n  |   |\n  O   |\n /|   |\n      |\n========='); // 4: left arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n========='); // 5: right arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n========='); // 6: legs (final)
  } else if (maxWrong === 7) {
    // 7 wrong answers: gallows, noose, head, body, left arm, right arm, legs
    drawings.push('  +---+\n  |   |\n      |\n      |\n      |\n========='); // 1: gallows
    drawings.push('  +---+\n  |   |\n  |   |\n      |\n      |\n========='); // 2: noose
    drawings.push('  +---+\n  |   |\n  O   |\n      |\n      |\n========='); // 3: head
    drawings.push('  +---+\n  |   |\n  O   |\n  |   |\n      |\n========='); // 4: body
    drawings.push('  +---+\n  |   |\n  O   |\n /|   |\n      |\n========='); // 5: left arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n========='); // 6: right arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n========='); // 7: legs (final)
  } else if (maxWrong === 8) {
    // 8 wrong answers: gallows, noose, head, body, left arm, right arm, left leg, right leg
    drawings.push('  +---+\n  |   |\n      |\n      |\n      |\n========='); // 1: gallows
    drawings.push('  +---+\n  |   |\n  |   |\n      |\n      |\n========='); // 2: noose
    drawings.push('  +---+\n  |   |\n  O   |\n      |\n      |\n========='); // 3: head
    drawings.push('  +---+\n  |   |\n  O   |\n  |   |\n      |\n========='); // 4: body
    drawings.push('  +---+\n  |   |\n  O   |\n /|   |\n      |\n========='); // 5: left arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n========='); // 6: right arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n========='); // 7: left leg
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n========='); // 8: right leg (final)
  } else if (maxWrong === 9) {
    // 9 wrong answers: base, gallows, noose, head, body, left arm, right arm, left leg, right leg
    drawings.push('========='); // 1: base
    drawings.push('  +---+\n  |   |\n      |\n      |\n      |\n========='); // 2: gallows
    drawings.push('  +---+\n  |   |\n  |   |\n      |\n      |\n========='); // 3: noose
    drawings.push('  +---+\n  |   |\n  O   |\n      |\n      |\n========='); // 4: head
    drawings.push('  +---+\n  |   |\n  O   |\n  |   |\n      |\n========='); // 5: body
    drawings.push('  +---+\n  |   |\n  O   |\n /|   |\n      |\n========='); // 6: left arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n========='); // 7: right arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n========='); // 8: left leg
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n========='); // 9: right leg (final)
  } else if (maxWrong === 10) {
    // 10 wrong answers: base, gallows, noose, head, body, left arm, right arm, left leg, right leg, face X
    drawings.push('========='); // 1: base
    drawings.push('  +---+\n  |   |\n      |\n      |\n      |\n========='); // 2: gallows
    drawings.push('  +---+\n  |   |\n  |   |\n      |\n      |\n========='); // 3: noose
    drawings.push('  +---+\n  |   |\n  O   |\n      |\n      |\n========='); // 4: head
    drawings.push('  +---+\n  |   |\n  O   |\n  |   |\n      |\n========='); // 5: body
    drawings.push('  +---+\n  |   |\n  O   |\n /|   |\n      |\n========='); // 6: left arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n========='); // 7: right arm
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n========='); // 8: left leg
    drawings.push('  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n========='); // 9: right leg
    drawings.push('  +---+\n  |   |\n  X   |\n /|\\  |\n / \\  |\n========='); // 10: face X (final)
  }
  
  return drawings;
};

export default function Hangman() {
  const [gameState, setGameState] = useState<GameState>({
    puzzle: '',
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    gameWon: false,
    gameLost: false,
    gameMode: 'single'
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'single' | 'two-player'>('single');
  const [maxWrong, setMaxWrong] = useState(6);
  const [customPuzzle, setCustomPuzzle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('hangman');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const getDisplayWord = () => {
    return gameState.puzzle
      .toUpperCase()
      .split('')
      .map(char => {
        if (char === ' ') return '   /   ';
        if (gameState.guessedLetters.includes(char)) return char;
        return '_';
      })
      .join(' ');
  };

  const makeGuess = (letter: string) => {
    const upperLetter = letter.toUpperCase();
    if (gameState.guessedLetters.includes(upperLetter)) return;

    const newGuessedLetters = [...gameState.guessedLetters, upperLetter];
    const isCorrect = gameState.puzzle.toUpperCase().includes(upperLetter);
    const newWrongGuesses = isCorrect ? gameState.wrongGuesses : gameState.wrongGuesses + 1;

    // Check if won
    const puzzleLetters = gameState.puzzle.toUpperCase().replace(/[^A-Z]/g, '').split('');
    const uniqueLetters = Array.from(new Set(puzzleLetters));
    const gameWon = uniqueLetters.every(letter => newGuessedLetters.includes(letter));
    
    // Check if lost
    const gameLost = newWrongGuesses >= gameState.maxWrongGuesses;

    const newGameState = {
      ...gameState,
      guessedLetters: newGuessedLetters,
      wrongGuesses: newWrongGuesses,
      gameWon,
      gameLost
    };

    setGameState(newGameState);

    if (gameWon) {
      toast({
        title: "Congratulations!",
        description: "You solved the puzzle!",
      });
      gameStorage.saveScore('hangman', 'Player', gameState.maxWrongGuesses - newWrongGuesses);
    } else if (gameLost) {
      toast({
        title: "Game Over",
        description: `The word was: ${gameState.puzzle}`,
        variant: "destructive"
      });
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGuess.length === 1 && /[A-Za-z]/.test(currentGuess)) {
      makeGuess(currentGuess);
      setCurrentGuess('');
    }
  };

  const validatePuzzle = (puzzle: string): { valid: boolean; message?: string } => {
    const trimmed = puzzle.trim();
    if (!trimmed) return { valid: false, message: "Please enter a puzzle" };
    
    const letterCount = trimmed.replace(/[^A-Za-z]/g, '').length;
    if (letterCount < 8) return { valid: false, message: "Puzzle must have at least 8 letters" };
    if (letterCount > 21) return { valid: false, message: "Puzzle must have no more than 21 letters" };
    
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 3) return { valid: false, message: "Puzzle must have no more than 3 words" };
    
    return { valid: true };
  };

  const startNewGame = () => {
    let puzzle = '';
    
    if (selectedMode === 'single') {
      const validPuzzles = HANGMAN_PUZZLES.filter(p => validatePuzzle(p).valid);
      puzzle = validPuzzles[Math.floor(Math.random() * validPuzzles.length)];
    } else {
      puzzle = customPuzzle.trim().toUpperCase();
      const validation = validatePuzzle(puzzle);
      if (!validation.valid) {
        toast({
          title: "Invalid Puzzle",
          description: validation.message,
          variant: "destructive"
        });
        return;
      }
    }

    const newGameState: GameState = {
      puzzle,
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrongGuesses: maxWrong,
      gameWon: false,
      gameLost: false,
      gameMode: selectedMode,
      customPuzzle: selectedMode === 'two-player' ? puzzle : undefined
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('hangman', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    setCustomPuzzle('');
    gameStorage.deleteGameState('hangman');
  };

  if (setupMode) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
        <GameHeader title="Hangman"  />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm">
            <h2 className="text-lg font-bold text-center mb-4">Game Setup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedMode === 'single' ? "default" : "outline"}
                    onClick={() => {
                      setSelectedMode('single');
                      setShowCustomInput(false);
                    }}
                    className="w-full text-xs px-2 py-1 h-8"
                  >
                    Random
                  </Button>
                  <Button
                    variant={selectedMode === 'two-player' ? "default" : "outline"}
                    onClick={() => {
                      setSelectedMode('two-player');
                      setShowCustomInput(true);
                    }}
                    className="w-full text-xs px-2 py-1 h-8"
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {showCustomInput && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Puzzle</label>
                  <Input
                    value={customPuzzle}
                    onChange={(e) => setCustomPuzzle(e.target.value)}
                    placeholder="Enter word or phrase..."
                    className="w-full text-sm h-8"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wrong Answers</label>
                <div className="grid grid-cols-5 gap-1">
                  {[6, 7, 8, 9, 10].map(num => (
                    <Button
                      key={num}
                      variant={maxWrong === num ? "default" : "outline"}
                      onClick={() => setMaxWrong(num)}
                      className="w-full text-xs px-1 py-1 h-8"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
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
      <GameHeader title="Hangman"  />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {gameState.gameMode === 'single' ? 'Random' : 'Custom'}
              </Badge>
              <span className="text-xs">
                Wrong: {gameState.wrongGuesses}/{gameState.maxWrongGuesses}
              </span>
              {gameState.gameWon && <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">Won! 🎉</Badge>}
              {gameState.gameLost && <Badge variant="destructive" className="text-xs px-1 py-0">Lost</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={resetGame} className="text-xs px-2 py-1 h-6">
              New
            </Button>
          </div>
        </div>

        {/* Hangman Drawing */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <pre className="text-xs font-mono text-center">
            {generateHangmanDrawings(gameState.maxWrongGuesses)[Math.min(gameState.wrongGuesses, gameState.maxWrongGuesses)]}
          </pre>
        </div>

        {/* Word Display */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
          <div className="text-xl font-mono text-center tracking-wider">
            {getDisplayWord()}
          </div>
        </div>

        {/* Guessed Letters */}
        {gameState.guessedLetters.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
            <div className="text-xs font-medium text-gray-700 mb-1">Guessed:</div>
            <div className="flex flex-wrap gap-1">
              {gameState.guessedLetters.map(letter => {
                const isCorrect = gameState.puzzle.toUpperCase().includes(letter);
                return (
                  <Badge 
                    key={letter}
                    variant={isCorrect ? "default" : "destructive"}
                    className="text-xs px-1 py-0"
                  >
                    {letter}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Input and Letter Grid */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-2">
          {!gameState.gameWon && !gameState.gameLost ? (
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-1">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                  <Button
                    key={letter}
                    variant="outline"
                    size="sm"
                    onClick={() => makeGuess(letter)}
                    disabled={gameState.guessedLetters.includes(letter)}
                    className="h-8 text-xs p-1"
                  >
                    {letter}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              {gameState.gameLost && (
                <div className="text-sm font-semibold text-red-600 mb-2">
                  Answer: {gameState.puzzle}
                </div>
              )}
              <Button onClick={resetGame} className="w-full text-sm h-8">
                Play Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
