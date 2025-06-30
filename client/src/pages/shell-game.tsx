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

interface ShellAnimation {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  animating: boolean;
  startX?: number;
  startY?: number;
  progress?: number;
  speed?: number;
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
  const [shellAnimations, setShellAnimations] = useState<ShellAnimation[]>([
    { id: 0, x: 0, y: 50, targetX: 0, targetY: 50, animating: false, progress: 0, speed: 0.02 },
    { id: 1, x: 120, y: 50, targetX: 120, targetY: 50, animating: false, progress: 0, speed: 0.02 },
    { id: 2, x: 240, y: 50, targetX: 240, targetY: 50, animating: false, progress: 0, speed: 0.02 }
  ]);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('shell-game');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  // High-framerate animation loop
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      setShellAnimations(prev => prev.map(shell => {
        if (!shell.animating || shell.progress === undefined || shell.startX === undefined || shell.startY === undefined) return shell;
        
        // S-curve easing with acceleration
        const baseProgress = shell.progress + (shell.speed || 0.02);
        const easedProgress = baseProgress < 0.5 
          ? 2 * baseProgress * baseProgress 
          : 1 - Math.pow(-2 * baseProgress + 2, 2) / 2;
        
        // Create curved path (S-curve motion)
        const midX = (shell.startX + shell.targetX) / 2;
        const midY = (shell.startY + shell.targetY) / 2 - 40; // Arc height for S-curve
        
        let newX, newY;
        if (easedProgress < 0.5) {
          // First half: move from start to arc peak
          const t = easedProgress * 2;
          newX = shell.startX + (midX - shell.startX) * t;
          newY = shell.startY + (midY - shell.startY) * t;
        } else {
          // Second half: move from arc peak to target
          const t = (easedProgress - 0.5) * 2;
          newX = midX + (shell.targetX - midX) * t;
          newY = midY + (shell.targetY - midY) * t;
        }
        
        if (baseProgress >= 1) {
          return {
            ...shell,
            x: shell.targetX,
            y: shell.targetY,
            animating: false,
            progress: 0
          };
        }
        
        return { 
          ...shell, 
          x: newX, 
          y: newY, 
          progress: baseProgress,
          speed: Math.min((shell.speed || 0.02) * 1.08, 0.12) // Gradually increase speed
        };
      }));
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const animateShellSwap = (shell1Id: number, shell2Id: number, speedMultiplier: number = 1): Promise<void> => {
    return new Promise((resolve) => {
      setShellAnimations(prev => {
        const shell1 = prev.find(s => s.id === shell1Id);
        const shell2 = prev.find(s => s.id === shell2Id);
        
        if (!shell1 || !shell2) {
          resolve();
          return prev;
        }
        
        // Store current positions for swapping
        const shell1X = shell1.x;
        const shell1Y = shell1.y;
        const shell2X = shell2.x;
        const shell2Y = shell2.y;
        
        // Swap target positions with S-curve parameters
        return prev.map(shell => {
          if (shell.id === shell1Id) {
            return { 
              ...shell, 
              targetX: shell2X, 
              targetY: shell2Y, 
              startX: shell1X,
              startY: shell1Y,
              animating: true,
              progress: 0,
              speed: 0.02 * speedMultiplier
            };
          }
          if (shell.id === shell2Id) {
            return { 
              ...shell, 
              targetX: shell1X, 
              targetY: shell1Y, 
              startX: shell2X,
              startY: shell2Y,
              animating: true,
              progress: 0,
              speed: 0.02 * speedMultiplier
            };
          }
          return shell;
        });
      });
      
      // Wait for animation to complete based on speed
      const duration = Math.max(1000 / speedMultiplier, 600);
      setTimeout(() => {
        resolve();
      }, duration);
    });
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowBall(false);
    
    // Perform realistic shell swaps with gradually increasing speed
    const settings = DIFFICULTY_SETTINGS[gameState.difficulty];
    let currentBallShell = gameState.ballPosition;
    
    for (let i = 0; i < settings.shuffleCount; i++) {
      // Pick two random shells to swap
      const shell1 = Math.floor(Math.random() * 3);
      let shell2 = Math.floor(Math.random() * 3);
      while (shell2 === shell1) {
        shell2 = Math.floor(Math.random() * 3);
      }
      
      // Track which shell has the ball
      if (currentBallShell === shell1) {
        currentBallShell = shell2;
      } else if (currentBallShell === shell2) {
        currentBallShell = shell1;
      }
      
      // Gradually increase speed (start slow, get faster)
      const speedMultiplier = 1 + (i / settings.shuffleCount) * 2; // 1x to 3x speed
      
      // Animate the swap with S-curve
      await animateShellSwap(shell1, shell2, speedMultiplier);
      
      // Brief pause between swaps, gets shorter as speed increases
      const pauseTime = Math.max(100, (gameState.shuffleSpeed - 200) / speedMultiplier);
      await new Promise(resolve => setTimeout(resolve, pauseTime));
    }
    
    // Update ball position
    setGameState(prev => ({
      ...prev,
      ballPosition: currentBallShell,
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
    
    // Reset shell positions to original layout
    setShellAnimations([
      { id: 0, x: 0, y: 50, targetX: 0, targetY: 50, animating: false, progress: 0, speed: 0.02 },
      { id: 1, x: 120, y: 50, targetX: 120, targetY: 50, animating: false, progress: 0, speed: 0.02 },
      { id: 2, x: 240, y: 50, targetX: 240, targetY: 50, animating: false, progress: 0, speed: 0.02 }
    ]);
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
    
    // Reset shell animations to starting positions
    setShellAnimations([
      { id: 0, x: 0, y: 50, targetX: 0, targetY: 50, animating: false },
      { id: 1, x: 120, y: 50, targetX: 120, targetY: 50, animating: false },
      { id: 2, x: 240, y: 50, targetX: 240, targetY: 50, animating: false }
    ]);
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
    // Always show shell graphic, never change based on game state
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

              {/* Shells Container */}
              <div className="relative w-80 h-32 mx-auto mb-8">
                {shellAnimations.map((shell) => {
                  const shellIndex = shell.id;
                  return (
                    <div 
                      key={shellIndex} 
                      className="absolute transition-none"
                      style={{
                        left: `${shell.x}px`,
                        top: `${shell.y}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
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
                          relative text-6xl transition-all duration-200 transform hover:scale-110
                          ${gameState.gamePhase === 'guessing' ? 'cursor-pointer hover:animate-pulse' : 'cursor-not-allowed'}
                          ${gameState.gamePhase === 'revealed' && gameState.playerGuess === shellIndex 
                            ? 'ring-4 ring-blue-400 rounded-full' : ''
                          }
                          ${gameState.gamePhase === 'revealed' && gameState.ballPosition === shellIndex 
                            ? 'ring-4 ring-green-400 rounded-full' : ''
                          }
                          ${shell.animating ? 'scale-110' : ''}
                        `}
                        style={{
                          filter: shell.animating ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'none'
                        }}
                      >
                        {getShellEmoji(shellIndex)}
                      </button>
                      
                      {/* Shell Number */}
                      <div className="text-center mt-2">
                        <Badge variant="outline">{shellIndex + 1}</Badge>
                      </div>
                    </div>
                  );
                })}
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
