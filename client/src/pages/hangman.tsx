import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { HANGMAN_PUZZLES } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

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

const HANGMAN_DRAWINGS = [
  '', // 0 wrong
  '  +---+\n      |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n  |   |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|   |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n=========',
  '  +---+\n  |   |\n  X   |\n /|\\  |\n / \\  |\n========='
];

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
        if (char === ' ') return ' ';
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
    const uniqueLetters = [...new Set(puzzleLetters)];
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

  const startNewGame = () => {
    let puzzle = '';
    
    if (selectedMode === 'single') {
      puzzle = HANGMAN_PUZZLES[Math.floor(Math.random() * HANGMAN_PUZZLES.length)];
    } else {
      puzzle = customPuzzle.trim().toUpperCase();
      if (!puzzle) {
        toast({
          title: "Error",
          description: "Please enter a puzzle",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Hangman" showSave={false} />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Game Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Game Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedMode === 'single' ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMode('single');
                        setShowCustomInput(false);
                      }}
                      className="w-full"
                    >
                      Random Puzzle
                    </Button>
                    <Button
                      variant={selectedMode === 'two-player' ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMode('two-player');
                        setShowCustomInput(true);
                      }}
                      className="w-full"
                    >
                      Custom Puzzle
                    </Button>
                  </div>
                </div>

                {showCustomInput && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enter Puzzle</label>
                    <Input
                      value={customPuzzle}
                      onChange={(e) => setCustomPuzzle(e.target.value)}
                      placeholder="Enter word or phrase..."
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Wrong Answers Allowed</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[6, 7, 8, 9, 10].map(num => (
                      <Button
                        key={num}
                        variant={maxWrong === num ? "default" : "outline"}
                        onClick={() => setMaxWrong(num)}
                        className="w-full"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button onClick={startNewGame} className="w-full" size="lg">
                  Start Game
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
      <GameHeader title="Hangman" onSave={saveGame} />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">{gameState.gameMode === 'single' ? 'Random Puzzle' : 'Custom Puzzle'}</Badge>
                <span className="text-sm text-gray-600">
                  Wrong: {gameState.wrongGuesses}/{gameState.maxWrongGuesses}
                </span>
                {gameState.gameWon && (
                  <Badge className="bg-green-100 text-green-800">You Won! 🎉</Badge>
                )}
                {gameState.gameLost && (
                  <Badge variant="destructive">Game Over</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetGame}>
                New Game
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Hangman Drawing */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-center">Hangman</h3>
              <pre className="text-sm font-mono text-center bg-gray-50 p-4 rounded-lg">
                {HANGMAN_DRAWINGS[Math.min(gameState.wrongGuesses, HANGMAN_DRAWINGS.length - 1)]}
              </pre>
            </CardContent>
          </Card>

          {/* Game Play */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-center">Puzzle</h3>
              
              {/* Word Display */}
              <div className="text-3xl font-mono text-center mb-6 tracking-wider">
                {getDisplayWord()}
              </div>

              {/* Guessed Letters */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Guessed Letters:</h4>
                <div className="flex flex-wrap gap-2">
                  {gameState.guessedLetters.map(letter => {
                    const isCorrect = gameState.puzzle.toUpperCase().includes(letter);
                    return (
                      <Badge 
                        key={letter}
                        variant={isCorrect ? "default" : "destructive"}
                        className="text-sm"
                      >
                        {letter}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Guess Input */}
              {!gameState.gameWon && !gameState.gameLost && (
                <form onSubmit={handleGuessSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guess a Letter:
                    </label>
                    <Input
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value.slice(-1))}
                      placeholder="Enter letter..."
                      className="w-full text-center text-lg"
                      maxLength={1}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!currentGuess}>
                    Guess Letter
                  </Button>
                </form>
              )}

              {/* Quick Letter Buttons */}
              {!gameState.gameWon && !gameState.gameLost && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Select:</h4>
                  <div className="grid grid-cols-6 gap-1 text-sm">
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                      <Button
                        key={letter}
                        variant="outline"
                        size="sm"
                        onClick={() => makeGuess(letter)}
                        disabled={gameState.guessedLetters.includes(letter)}
                        className="h-8 text-xs"
                      >
                        {letter}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Over Actions */}
              {(gameState.gameWon || gameState.gameLost) && (
                <div className="mt-6 space-y-2">
                  {gameState.gameLost && (
                    <div className="text-center text-lg font-semibold text-red-600">
                      The answer was: {gameState.puzzle}
                    </div>
                  )}
                  <Button onClick={resetGame} className="w-full">
                    Play Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
