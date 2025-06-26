import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WORD_LISTS, type GameCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  originalWord: string;
  scrambledWord: string;
  currentGuess: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  timeRemaining: number;
  score: number;
  hintsUsed: number;
  maxHints: number;
  gameWon: boolean;
  gameLost: boolean;
  wordsCompleted: number;
  category: GameCategory;
}

const DIFFICULTY_SETTINGS = {
  easy: { timeLimit: 120, maxHints: 3, wordLength: [4, 6] },
  medium: { timeLimit: 90, maxHints: 2, wordLength: [6, 8] },
  hard: { timeLimit: 60, maxHints: 1, wordLength: [8, 12] }
};

export default function WordScramble() {
  const [gameState, setGameState] = useState<GameState>({
    originalWord: '',
    scrambledWord: '',
    currentGuess: '',
    difficulty: 'medium',
    timeLimit: 90,
    timeRemaining: 90,
    score: 0,
    hintsUsed: 0,
    maxHints: 2,
    gameWon: false,
    gameLost: false,
    wordsCompleted: 0,
    category: 'animals'
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('animals');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('word-scramble');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
      setIsTimerRunning(true);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && gameState.timeRemaining > 0 && !gameState.gameWon && !gameState.gameLost) {
      interval = setInterval(() => {
        setGameState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            setIsTimerRunning(false);
            toast({
              title: "Time's Up!",
              description: `The word was: ${prev.originalWord}`,
              variant: "destructive"
            });
            return {
              ...prev,
              timeRemaining: 0,
              gameLost: true
            };
          }
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, gameState.timeRemaining, gameState.gameWon, gameState.gameLost]);

  const scrambleWord = (word: string): string => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    
    // Ensure the scrambled word is different from the original
    const scrambled = letters.join('');
    return scrambled === word ? scrambleWord(word) : scrambled;
  };

  const getRandomWord = (category: GameCategory | 'all', difficulty: 'easy' | 'medium' | 'hard'): string => {
    let words: string[];
    
    if (category === 'all') {
      // Combine words from all categories
      words = Object.values(WORD_LISTS).flat();
    } else {
      words = WORD_LISTS[category as GameCategory];
    }
    
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const filteredWords = words.filter(word => 
      word.length >= settings.wordLength[0] && word.length <= settings.wordLength[1]
    );
    
    return filteredWords[Math.floor(Math.random() * filteredWords.length)].toUpperCase();
  };

  const generateNewWord = () => {
    const word = getRandomWord(gameState.category, gameState.difficulty);
    const scrambled = scrambleWord(word);
    
    setGameState(prev => ({
      ...prev,
      originalWord: word,
      scrambledWord: scrambled,
      currentGuess: '',
      hintsUsed: 0,
      gameWon: false,
      gameLost: false
    }));
    
    setShowHint(false);
    setIsTimerRunning(true);
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (gameState.currentGuess.toUpperCase() === gameState.originalWord) {
      const timeBonus = Math.floor(gameState.timeRemaining / 10);
      const hintPenalty = gameState.hintsUsed * 5;
      const wordScore = Math.max(10 + timeBonus - hintPenalty, 5);
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + wordScore,
        gameWon: true,
        wordsCompleted: prev.wordsCompleted + 1
      }));
      
      setIsTimerRunning(false);
      
      toast({
        title: "Correct!",
        description: `+${wordScore} points! Time for the next word.`,
      });
      
      // Auto-generate next word after a short delay
      setTimeout(() => {
        generateNewWord();
      }, 2000);
    } else {
      toast({
        title: "Incorrect",
        description: "Try again!",
        variant: "destructive"
      });
      
      setGameState(prev => ({
        ...prev,
        currentGuess: ''
      }));
    }
  };

  const useHint = () => {
    if (gameState.hintsUsed >= gameState.maxHints) return;
    
    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));
    
    setShowHint(true);
    
    toast({
      title: "Hint Used",
      description: `First letter revealed! (${gameState.maxHints - gameState.hintsUsed - 1} hints remaining)`,
    });
  };

  const getHintText = (): string => {
    if (!showHint || gameState.hintsUsed === 0) return '';
    
    const hints = [
      `First letter: ${gameState.originalWord[0]}`,
      `Length: ${gameState.originalWord.length} letters`,
      `Last letter: ${gameState.originalWord[gameState.originalWord.length - 1]}`
    ];
    
    return hints.slice(0, gameState.hintsUsed).join(' • ');
  };

  const startNewGame = () => {
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    const word = getRandomWord(selectedCategory, selectedDifficulty);
    const scrambled = scrambleWord(word);
    
    const newGameState: GameState = {
      originalWord: word,
      scrambledWord: scrambled,
      currentGuess: '',
      difficulty: selectedDifficulty,
      timeLimit: settings.timeLimit,
      timeRemaining: settings.timeLimit,
      score: 0,
      hintsUsed: 0,
      maxHints: settings.maxHints,
      gameWon: false,
      gameLost: false,
      wordsCompleted: 0,
      category: selectedCategory === 'all' ? 'animals' : selectedCategory as GameCategory
    };

    setGameState(newGameState);
    setSetupMode(false);
    setIsTimerRunning(true);
    setShowHint(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('word-scramble', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    setIsTimerRunning(false);
    gameStorage.deleteGameState('word-scramble');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Word Scramble" showSave={false} />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Game Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Difficulty</label>
                  <div className="space-y-2">
                    {(['easy', 'medium', 'hard'] as const).map(difficulty => (
                      <Button
                        key={difficulty}
                        variant={selectedDifficulty === difficulty ? "default" : "outline"}
                        onClick={() => setSelectedDifficulty(difficulty)}
                        className="w-full justify-between"
                      >
                        <span className="capitalize">{difficulty}</span>
                        <span className="text-xs">
                          {formatTime(DIFFICULTY_SETTINGS[difficulty].timeLimit)} • 
                          {DIFFICULTY_SETTINGS[difficulty].maxHints} hints
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as GameCategory | 'all')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.keys(WORD_LISTS).sort().map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      <GameHeader title="Word Scramble" onSave={saveGame} />
      
      <div className="max-w-2xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="capitalize">{gameState.difficulty}</Badge>
                <span className="text-lg font-semibold">Score: {gameState.score}</span>
                <span className="text-sm text-gray-600">Words: {gameState.wordsCompleted}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`text-lg font-bold ${gameState.timeRemaining <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                  ⏱️ {formatTime(gameState.timeRemaining)}
                </div>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Game */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {!gameState.gameLost ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Unscramble This Word:</h2>
                  <div className="text-4xl font-mono font-bold text-primary mb-4 tracking-wider">
                    {gameState.scrambledWord}
                  </div>
                  <Badge variant="outline">{gameState.scrambledWord.length} letters</Badge>
                </div>

                {/* Hints */}
                {gameState.hintsUsed > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center">
                    <p className="text-sm font-medium text-blue-800">
                      💡 {getHintText()}
                    </p>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleGuessSubmit} className="space-y-6">
                  <Input
                    value={gameState.currentGuess}
                    onChange={(e) => setGameState(prev => ({ ...prev, currentGuess: e.target.value }))}
                    placeholder="Enter your guess..."
                    className="text-center text-xl p-4 h-14"
                    autoFocus
                    disabled={gameState.gameWon || gameState.gameLost}
                  />
                  
                  <div className="flex space-x-4">
                    <Button 
                      type="submit" 
                      disabled={!gameState.currentGuess.trim() || gameState.gameWon || gameState.gameLost}
                      className="flex-1"
                    >
                      Submit Guess
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={useHint}
                      disabled={gameState.hintsUsed >= gameState.maxHints || gameState.gameWon || gameState.gameLost}
                      className="px-6"
                    >
                      Hint ({gameState.maxHints - gameState.hintsUsed})
                    </Button>
                  </div>
                </form>

                {gameState.gameWon && (
                  <div className="mt-6 text-center">
                    <p className="text-green-600 font-semibold mb-4">
                      🎉 Correct! Get ready for the next word...
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4 text-red-600">Time's Up!</h2>
                <p className="text-xl mb-4">The word was: <span className="font-bold text-primary">{gameState.originalWord}</span></p>
                <p className="text-lg mb-6">Final Score: <span className="font-bold">{gameState.score}</span></p>
                <p className="text-gray-600 mb-6">Words Completed: {gameState.wordsCompleted}</p>
                
                <div className="space-y-4">
                  <Button onClick={() => generateNewWord()} className="w-full">
                    Try Another Word
                  </Button>
                  <Button onClick={resetGame} variant="outline" className="w-full">
                    New Game
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Unscramble the letters to form a word from the {gameState.category} category. 
              Use hints if you're stuck, but they'll reduce your score!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
