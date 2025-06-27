import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  ballPosition: number;
  playerGuess: number | null;
  score: number;
  round: number;
  gamePhase: 'waiting' | 'shuffling' | 'guessing' | 'revealed' | 'finished';
  shuffleSpeed: number;
  rounds: number;
  correctGuesses: number;
  isShuffling: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DIFFICULTY_SETTINGS = {
  easy: { shuffleSpeed: 800, shuffleCount: 5, rounds: 5 },
  medium: { shuffleSpeed: 600, shuffleCount: 8, rounds: 7 },
  hard: { shuffleSpeed: 400, shuffleCount: 12, rounds: 10 }
};

export default function ShellGame() {
  const [gameState, setGameState] = useState<GameState>({
    ballPosition: 1,
    playerGuess: null,
    score: 0,
    round: 1,
    gamePhase: 'waiting',
    shuffleSpeed: 600,
    rounds: 7,
    correctGuesses: 0,
    isShuffling: false,
    difficulty: 'medium'
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [shellPositions, setShellPositions] = useState([0, 1, 2]);
  const [showBall, setShowBall] = useState(false);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('shell-game');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const shuffleArray = (array: number[]): number[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startShuffle = async () => {
    setGameState(prev => ({ 
      ...prev, 
      gamePhase: 'shuffling',
      isShuffling: true,
      playerGuess: null
    }));
    
    setShowBall(true);
    
    // Show ball briefly at start
    await new Promise(resolve => setTimeout(resolve, 1000));
    setShowBall(false);
    
    // Perform shuffles
    const settings = DIFFICULTY_SETTINGS[gameState.difficulty];
    
    for (let i = 0; i < settings.shuffleCount; i++) {
      await new Promise(resolve => setTimeout(resolve, gameState.shuffleSpeed));
      
      // Create visual shuffle effect
      const newPositions = shuffleArray(shellPositions);
      setShellPositions(newPositions);
      
      // Update ball position based on where shell 0 (original position) ended up
      const ballShellIndex = newPositions.indexOf(gameState.ballPosition);
      if (ballShellIndex !== -1) {
        // The ball follows its shell
        setGameState(prev => ({
          ...prev,
          ballPosition: ballShellIndex
        }));
      }
    }
    
    setGameState(prev => ({ 
      ...prev, 
      gamePhase: 'guessing',
      isShuffling: false
    }));
    
    toast({
      title: "Make your guess!",
      description: "Which shell is hiding the ball?",
    });
  };

  const makeGuess = (shellIndex: number) => {
    if (gameState.gamePhase !== 'guessing') return;
    
    setGameState(prev => ({ ...prev, playerGuess: shellIndex }));
    revealBall(shellIndex);
  };

  const revealBall = (guessedShell: number) => {
    setShowBall(true);
    
    const isCorrect = guessedShell === gameState.ballPosition;
    const newScore = isCorrect ? gameState.score + 10 : gameState.score;
    const newCorrectGuesses = isCorrect ? gameState.correctGuesses + 1 : gameState.correctGuesses;
    
    setGameState(prev => ({
      ...prev,
      gamePhase: 'revealed',
      score: newScore,
      correctGuesses: newCorrectGuesses
    }));
    
    if (isCorrect) {
      toast({
        title: "Correct! 🎉",
        description: "+10 points! Well done!",
      });
    } else {
      toast({
        title: "Wrong! 😞",
        description: `The ball was under shell ${gameState.ballPosition + 1}`,
        variant: "destructive"
      });
    }
    
    // Check if game is finished
    if (gameState.round >= gameState.rounds) {
      setTimeout(() => {
        finishGame(newScore, newCorrectGuesses);
      }, 2000);
    } else {
      setTimeout(() => {
        nextRound();
      }, 2000);
    }
  };

  const nextRound = () => {
    // Reset for next round
    const newBallPosition = Math.floor(Math.random() * 3);
    
    setGameState(prev => ({
      ...prev,
      round: prev.round + 1,
      ballPosition: newBallPosition,
      gamePhase: 'waiting',
      playerGuess: null
    }));
    
    setShellPositions([0, 1, 2]);
    setShowBall(false);
  };

  const finishGame = (finalScore: number, correctGuesses: number) => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'finished'
    }));
    
    const percentage = Math.round((correctGuesses / gameState.rounds) * 100);
    
    toast({
      title: "Game Complete!",
      description: `Final Score: ${finalScore} (${percentage}% correct)`,
    });
    
    gameStorage.saveScore('shell-game', 'Player', finalScore);
  };

  const startNewGame = () => {
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    
    setGameState({
      ballPosition: Math.floor(Math.random() * 3),
      playerGuess: null,
      score: 0,
      round: 1,
      gamePhase: 'waiting',
      shuffleSpeed: settings.shuffleSpeed,
      rounds: settings.rounds,
      correctGuesses: 0,
      isShuffling: false,
      difficulty: selectedDifficulty
    });
    
    setShellPositions([0, 1, 2]);
    setShowBall(false);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('shell-game', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('shell-game');
  };

  const getShellEmoji = (shellIndex: number): string => {
    if (gameState.isShuffling) {
      return '🔄'; // Spinning during shuffle
    }
    return '🥥'; // Coconut shell
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Shell Game"  />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Choose Difficulty</h2>
              
              <div className="space-y-4">
                {(['easy', 'medium', 'hard'] as const).map(difficulty => {
                  const settings = DIFFICULTY_SETTINGS[difficulty];
                  return (
                    <Button
                      key={difficulty}
                      variant={selectedDifficulty === difficulty ? "default" : "outline"}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className="w-full justify-between"
                    >
                      <span className="capitalize">{difficulty}</span>
                      <span className="text-xs">
                        {settings.rounds} rounds • {settings.shuffleCount} shuffles
                      </span>
                    </Button>
                  );
                })}
                
                <Button onClick={startNewGame} className="w-full mt-6" size="lg">
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
      <GameHeader title="Shell Game"  />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="capitalize">{gameState.difficulty}</Badge>
                <span className="text-lg font-semibold">
                  Round {gameState.round} / {gameState.rounds}
                </span>
                <span className="text-lg font-semibold">Score: {gameState.score}</span>
                <span className="text-sm text-gray-600">
                  Correct: {gameState.correctGuesses}
                </span>
                {gameState.gamePhase === 'finished' && (
                  <Badge className="bg-green-100 text-green-800">
                    Game Complete! {Math.round((gameState.correctGuesses / gameState.rounds) * 100)}%
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetGame}>
                New Game
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Game Area */}
        <Card className="shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              {/* Game Instructions */}
              <div className="mb-8">
                {gameState.gamePhase === 'waiting' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Watch Carefully!</h3>
                    <p className="text-gray-600 mb-4">The ball will be placed under a shell, then they'll be shuffled.</p>
                  </div>
                )}
                {gameState.gamePhase === 'shuffling' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Shuffling...</h3>
                    <p className="text-gray-600 mb-4">Keep your eye on the ball!</p>
                  </div>
                )}
                {gameState.gamePhase === 'guessing' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Make Your Guess!</h3>
                    <p className="text-gray-600 mb-4">Which shell is hiding the ball?</p>
                  </div>
                )}
                {gameState.gamePhase === 'revealed' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      {gameState.playerGuess === gameState.ballPosition ? '🎉 Correct!' : '😞 Wrong!'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {gameState.playerGuess === gameState.ballPosition 
                        ? 'You found the ball!' 
                        : `The ball was under shell ${gameState.ballPosition + 1}`
                      }
                    </p>
                  </div>
                )}
                {gameState.gamePhase === 'finished' && (
                  <div>
                    <h3 className="text-3xl font-bold mb-2">Game Over!</h3>
                    <p className="text-gray-600 mb-4">
                      Final Score: {gameState.score} points ({Math.round((gameState.correctGuesses / gameState.rounds) * 100)}% correct)
                    </p>
                  </div>
                )}
              </div>

              {/* Shells */}
              <div className="flex justify-center items-end space-x-8 mb-8">
                {[0, 1, 2].map((shellIndex) => (
                  <div key={shellIndex} className="relative">
                    {/* Ball */}
                    {showBall && gameState.ballPosition === shellIndex && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 z-10">
                        <div className="w-6 h-6 bg-red-500 rounded-full animate-bounce">
                          🔴
                        </div>
                      </div>
                    )}
                    
                    {/* Shell */}
                    <button
                      onClick={() => makeGuess(shellIndex)}
                      disabled={gameState.gamePhase !== 'guessing'}
                      className={`
                        relative text-6xl transition-all duration-300 transform hover:scale-110
                        ${gameState.gamePhase === 'guessing' ? 'cursor-pointer hover:animate-pulse' : 'cursor-not-allowed'}
                        ${gameState.gamePhase === 'revealed' && gameState.playerGuess === shellIndex 
                          ? 'ring-4 ring-blue-400 rounded-full' : ''
                        }
                        ${gameState.gamePhase === 'revealed' && gameState.ballPosition === shellIndex 
                          ? 'ring-4 ring-green-400 rounded-full' : ''
                        }
                        ${gameState.isShuffling ? 'animate-bounce' : ''}
                      `}
                    >
                      {getShellEmoji(shellIndex)}
                    </button>
                    
                    {/* Shell Number */}
                    <div className="text-center mt-2">
                      <Badge variant="outline">{shellIndex + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="space-y-4">
                {gameState.gamePhase === 'waiting' && (
                  <Button onClick={startShuffle} size="lg" className="px-8">
                    Start Shuffle
                  </Button>
                )}
                
                {gameState.gamePhase === 'finished' && (
                  <div className="space-y-4">
                    <div className="text-lg">
                      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Rounds</div>
                          <div className="text-xl font-bold">{gameState.rounds}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Correct</div>
                          <div className="text-xl font-bold text-green-600">{gameState.correctGuesses}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Accuracy</div>
                          <div className="text-xl font-bold text-purple-600">
                            {Math.round((gameState.correctGuesses / gameState.rounds) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={resetGame} size="lg" className="px-8">
                      Play Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Watch the ball carefully as the shells are shuffled, then guess which shell it's under. 
              The faster the shuffle, the harder it gets!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
