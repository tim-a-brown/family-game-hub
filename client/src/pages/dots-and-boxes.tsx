import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";

interface Line {
  start: { row: number; col: number };
  end: { row: number; col: number };
  isDrawn: boolean;
  orientation: 'horizontal' | 'vertical';
}

interface Box {
  row: number;
  col: number;
  owner: number | null;
  isComplete: boolean;
}

interface GameState {
  gridSize: number;
  horizontalLines: Line[][];
  verticalLines: Line[][];
  boxes: Box[][];
  currentPlayer: number;
  scores: number[];
  gameWon: boolean;
  winner: number | null;
  lastMove: { completedBoxes: number };
}

export default function DotsAndBoxes() {
  const [gameState, setGameState] = useState<GameState>({
    gridSize: 4,
    horizontalLines: [],
    verticalLines: [],
    boxes: [],
    currentPlayer: 1,
    scores: [0, 0],
    gameWon: false,
    winner: null,
    lastMove: { completedBoxes: 0 }
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedSize, setSelectedSize] = useState(4);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('dots-and-boxes');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const initializeGame = (size: number) => {
    // Initialize horizontal lines (rows: size+1, cols: size)
    const horizontalLines: Line[][] = [];
    for (let row = 0; row <= size; row++) {
      horizontalLines[row] = [];
      for (let col = 0; col < size; col++) {
        horizontalLines[row][col] = {
          start: { row, col },
          end: { row, col: col + 1 },
          isDrawn: false,
          orientation: 'horizontal'
        };
      }
    }

    // Initialize vertical lines (rows: size, cols: size+1)
    const verticalLines: Line[][] = [];
    for (let row = 0; row < size; row++) {
      verticalLines[row] = [];
      for (let col = 0; col <= size; col++) {
        verticalLines[row][col] = {
          start: { row, col },
          end: { row: row + 1, col },
          isDrawn: false,
          orientation: 'vertical'
        };
      }
    }

    // Initialize boxes
    const boxes: Box[][] = [];
    for (let row = 0; row < size; row++) {
      boxes[row] = [];
      for (let col = 0; col < size; col++) {
        boxes[row][col] = {
          row,
          col,
          owner: null,
          isComplete: false
        };
      }
    }

    return { horizontalLines, verticalLines, boxes };
  };

  const checkBoxComplete = (boxRow: number, boxCol: number, hLines: Line[][], vLines: Line[][]): boolean => {
    const top = hLines[boxRow][boxCol]?.isDrawn;
    const bottom = hLines[boxRow + 1][boxCol]?.isDrawn;
    const left = vLines[boxRow][boxCol]?.isDrawn;
    const right = vLines[boxRow][boxCol + 1]?.isDrawn;
    
    return top && bottom && left && right;
  };

  const handleLineClick = (row: number, col: number, orientation: 'horizontal' | 'vertical') => {
    if (gameState.gameWon) return;

    const newHorizontalLines = gameState.horizontalLines.map(r => r.map(l => ({ ...l })));
    const newVerticalLines = gameState.verticalLines.map(r => r.map(l => ({ ...l })));
    const newBoxes = gameState.boxes.map(r => r.map(b => ({ ...b })));

    // Check if line is already drawn
    const currentLine = orientation === 'horizontal' 
      ? newHorizontalLines[row][col] 
      : newVerticalLines[row][col];
    
    if (currentLine.isDrawn) return;

    // Draw the line
    currentLine.isDrawn = true;

    // Check for completed boxes
    let completedBoxes = 0;
    const boxesToCheck: { row: number; col: number }[] = [];

    if (orientation === 'horizontal') {
      // Check boxes above and below this horizontal line
      if (row > 0) boxesToCheck.push({ row: row - 1, col });
      if (row < gameState.gridSize) boxesToCheck.push({ row, col });
    } else {
      // Check boxes left and right of this vertical line
      if (col > 0) boxesToCheck.push({ row, col: col - 1 });
      if (col < gameState.gridSize) boxesToCheck.push({ row, col });
    }

    boxesToCheck.forEach(({ row: boxRow, col: boxCol }) => {
      if (boxRow >= 0 && boxRow < gameState.gridSize && boxCol >= 0 && boxCol < gameState.gridSize) {
        if (!newBoxes[boxRow][boxCol].isComplete && 
            checkBoxComplete(boxRow, boxCol, newHorizontalLines, newVerticalLines)) {
          newBoxes[boxRow][boxCol].isComplete = true;
          newBoxes[boxRow][boxCol].owner = gameState.currentPlayer;
          completedBoxes++;
        }
      }
    });

    // Update scores
    const newScores = [...gameState.scores];
    newScores[gameState.currentPlayer - 1] += completedBoxes;

    // Check if game is won
    const totalBoxes = gameState.gridSize * gameState.gridSize;
    const totalCompletedBoxes = newScores[0] + newScores[1];
    const gameWon = totalCompletedBoxes === totalBoxes;
    const winner = gameWon ? (newScores[0] > newScores[1] ? 1 : newScores[1] > newScores[0] ? 2 : null) : null;

    // Next player (if no boxes completed, switch player)
    const nextPlayer = completedBoxes > 0 ? gameState.currentPlayer : (gameState.currentPlayer === 1 ? 2 : 1);

    const newGameState = {
      ...gameState,
      horizontalLines: newHorizontalLines,
      verticalLines: newVerticalLines,
      boxes: newBoxes,
      currentPlayer: nextPlayer,
      scores: newScores,
      gameWon,
      winner,
      lastMove: { completedBoxes }
    };

    setGameState(newGameState);

    if (completedBoxes > 0) {
      toast({
        title: `Player ${gameState.currentPlayer} scored!`,
        description: `Completed ${completedBoxes} box${completedBoxes > 1 ? 'es' : ''}`,
      });
    }

    if (gameWon) {
      const message = winner ? `Player ${winner} wins!` : "It's a tie!";
      toast({
        title: "Game Over!",
        description: message,
      });
      
      if (winner) {
        gameStorage.saveScore('dots-and-boxes', `Player ${winner}`, newScores[winner - 1]);
      }
    }
  };

  const startNewGame = () => {
    const { horizontalLines, verticalLines, boxes } = initializeGame(selectedSize);
    
    const newGameState: GameState = {
      gridSize: selectedSize,
      horizontalLines,
      verticalLines,
      boxes,
      currentPlayer: 1,
      scores: [0, 0],
      gameWon: false,
      winner: null,
      lastMove: { completedBoxes: 0 }
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('dots-and-boxes', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('dots-and-boxes');
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Dots and Boxes" showSave={false} />
        
        <div className="max-w-md mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Game Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Grid Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 4, 5].map(size => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        onClick={() => setSelectedSize(size)}
                        className="w-full"
                      >
                        {size}×{size}
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
      <GameHeader title="Dots and Boxes" onSave={saveGame} />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">{gameState.gridSize}×{gameState.gridSize} Grid</Badge>
                {!gameState.gameWon && (
                  <span className="text-lg font-semibold">
                    Player <span className="text-primary">{gameState.currentPlayer}</span>'s Turn
                  </span>
                )}
                {gameState.gameWon && (
                  <span className="text-lg font-bold text-green-600">
                    {gameState.winner ? `🎉 Player ${gameState.winner} Wins!` : "🤝 It's a Tie!"}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-blue-600 font-semibold">Player 1: {gameState.scores[0]}</span>
                  <span className="mx-2">|</span>
                  <span className="text-red-600 font-semibold">Player 2: {gameState.scores[1]}</span>
                </div>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Board */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div 
                className="inline-block"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gameState.gridSize * 2 + 1}, 1fr)`,
                  gap: '0',
                  width: 'fit-content'
                }}
              >
                {/* Render grid */}
                {Array.from({ length: gameState.gridSize * 2 + 1 }, (_, row) =>
                  Array.from({ length: gameState.gridSize * 2 + 1 }, (_, col) => {
                    const isEvenRow = row % 2 === 0;
                    const isEvenCol = col % 2 === 0;

                    if (isEvenRow && isEvenCol) {
                      // Dot
                      return (
                        <div 
                          key={`${row}-${col}`}
                          className="w-3 h-3 bg-gray-800 rounded-full"
                        />
                      );
                    } else if (isEvenRow && !isEvenCol) {
                      // Horizontal line
                      const lineRow = row / 2;
                      const lineCol = (col - 1) / 2;
                      const line = gameState.horizontalLines[lineRow]?.[lineCol];
                      
                      return (
                        <div 
                          key={`${row}-${col}`}
                          className={`
                            w-8 h-1 cursor-pointer transition-colors
                            ${line?.isDrawn ? 'bg-gray-800' : 'bg-gray-300 hover:bg-gray-500'}
                          `}
                          onClick={() => handleLineClick(lineRow, lineCol, 'horizontal')}
                        />
                      );
                    } else if (!isEvenRow && isEvenCol) {
                      // Vertical line
                      const lineRow = (row - 1) / 2;
                      const lineCol = col / 2;
                      const line = gameState.verticalLines[lineRow]?.[lineCol];
                      
                      return (
                        <div 
                          key={`${row}-${col}`}
                          className={`
                            w-1 h-8 cursor-pointer transition-colors
                            ${line?.isDrawn ? 'bg-gray-800' : 'bg-gray-300 hover:bg-gray-500'}
                          `}
                          onClick={() => handleLineClick(lineRow, lineCol, 'vertical')}
                        />
                      );
                    } else {
                      // Box
                      const boxRow = (row - 1) / 2;
                      const boxCol = (col - 1) / 2;
                      const box = gameState.boxes[boxRow]?.[boxCol];
                      
                      return (
                        <div 
                          key={`${row}-${col}`}
                          className={`
                            w-8 h-8 flex items-center justify-center text-sm font-bold
                            ${box?.isComplete 
                              ? box.owner === 1 
                                ? 'bg-blue-200 text-blue-800' 
                                : 'bg-red-200 text-red-800'
                              : 'bg-transparent'
                            }
                          `}
                        >
                          {box?.isComplete && box.owner}
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center text-sm text-gray-600">
              Click on the lines between dots to draw them. Complete a box to score a point and take another turn!
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
