import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";
import { GameSetupLayout, OptionGroup } from "@/components/game-setup-layout";
import battleshipIcon from "@assets/generated_images/battleship_game_tile_icon.png";

type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
type GamePhase = 'setup' | 'playing' | 'finished';

interface Ship {
  name: string;
  size: number;
  placed: boolean;
  sunk: boolean;
  positions: Array<{row: number, col: number}>;
}

interface GameState {
  phase: GamePhase;
  playerBoard: CellState[][];
  opponentBoard: CellState[][];
  playerShips: Ship[];
  opponentShips: Ship[];
  currentTurn: 'player' | 'opponent';
  selectedShip: number | null;
  shipOrientation: 'horizontal' | 'vertical';
  gameWon: boolean;
  winner: 'player' | 'opponent' | null;
  playerHits: number;
  opponentHits: number;
}

const BOARD_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

export default function Battleship() {
  const [setupMode, setSetupMode] = useState(true);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
    playerBoard: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('empty')),
    opponentBoard: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('empty')),
    playerShips: SHIPS.map((ship, index) => ({ ...ship, placed: false, sunk: false, positions: [] })),
    opponentShips: SHIPS.map((ship, index) => ({ ...ship, placed: false, sunk: false, positions: [] })),
    currentTurn: 'player',
    selectedShip: 0,
    shipOrientation: 'horizontal',
    gameWon: false,
    winner: null,
    playerHits: 0,
    opponentHits: 0
  });

  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('battleship');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const createEmptyBoard = (): CellState[][] => {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('empty'));
  };

  const canPlaceShip = (board: CellState[][], ship: Ship, startRow: number, startCol: number, orientation: 'horizontal' | 'vertical'): boolean => {
    const positions = [];
    
    for (let i = 0; i < ship.size; i++) {
      const row = orientation === 'horizontal' ? startRow : startRow + i;
      const col = orientation === 'horizontal' ? startCol + i : startCol;
      
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return false;
      }
      
      if (board[row][col] !== 'empty') {
        return false;
      }
      
      positions.push({ row, col });
    }
    
    // Check adjacent cells for spacing
    for (const pos of positions) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const newRow = pos.row + dr;
          const newCol = pos.col + dc;
          
          if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            if (board[newRow][newCol] === 'ship' && !positions.some(p => p.row === newRow && p.col === newCol)) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  };

  const placeShip = (board: CellState[][], ship: Ship, startRow: number, startCol: number, orientation: 'horizontal' | 'vertical'): {board: CellState[][], positions: Array<{row: number, col: number}>} => {
    const newBoard = board.map(row => [...row]);
    const positions = [];
    
    for (let i = 0; i < ship.size; i++) {
      const row = orientation === 'horizontal' ? startRow : startRow + i;
      const col = orientation === 'horizontal' ? startCol + i : startCol;
      
      newBoard[row][col] = 'ship';
      positions.push({ row, col });
    }
    
    return { board: newBoard, positions };
  };

  const generateOpponentBoard = (): {board: CellState[][], ships: Ship[]} => {
    const board = createEmptyBoard();
    const ships = SHIPS.map(ship => ({ ...ship, placed: false, sunk: false, positions: [] }));
    
    for (let i = 0; i < ships.length; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const startRow = Math.floor(Math.random() * BOARD_SIZE);
        const startCol = Math.floor(Math.random() * BOARD_SIZE);
        
        if (canPlaceShip(board, ships[i], startRow, startCol, orientation)) {
          const result = placeShip(board, ships[i], startRow, startCol, orientation);
          // Copy the board correctly
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              board[r][c] = result.board[r][c];
            }
          }
          ships[i].positions = result.positions;
          ships[i].placed = true;
          placed = true;
        }
        attempts++;
      }
    }
    
    return { board, ships };
  };

  const handlePlayerBoardClick = (row: number, col: number) => {
    if (gameState.phase !== 'setup' || gameState.selectedShip === null) return;
    
    const ship = gameState.playerShips[gameState.selectedShip];
    if (ship.placed) return;
    
    if (canPlaceShip(gameState.playerBoard, ship, row, col, gameState.shipOrientation)) {
      const result = placeShip(gameState.playerBoard, ship, row, col, gameState.shipOrientation);
      
      const newShips = [...gameState.playerShips];
      newShips[gameState.selectedShip] = {
        ...ship,
        placed: true,
        positions: result.positions
      };
      
      const nextUnplacedShip = newShips.findIndex(s => !s.placed);
      
      setGameState(prev => ({
        ...prev,
        playerBoard: result.board,
        playerShips: newShips,
        selectedShip: nextUnplacedShip === -1 ? null : nextUnplacedShip
      }));
      
      if (nextUnplacedShip === -1) {
        toast({
          title: "All ships placed!",
          description: "Click 'Start Battle' to begin the game.",
        });
      }
    } else {
      toast({
        title: "Invalid placement",
        description: "Ships cannot overlap or be adjacent.",
        variant: "destructive"
      });
    }
  };

  const handleOpponentBoardClick = (row: number, col: number) => {
    if (gameState.phase !== 'playing' || gameState.currentTurn !== 'player') return;
    if (gameState.opponentBoard[row][col] === 'hit' || gameState.opponentBoard[row][col] === 'miss') return;
    
    const newOpponentBoard = gameState.opponentBoard.map(r => [...r]);
    const isHit = gameState.opponentBoard[row][col] === 'ship';
    
    newOpponentBoard[row][col] = isHit ? 'hit' : 'miss';
    
    let newOpponentShips = [...gameState.opponentShips];
    let newPlayerHits = gameState.playerHits;
    
    if (isHit) {
      newPlayerHits++;
      
      // Check if ship is sunk
      for (let i = 0; i < newOpponentShips.length; i++) {
        const ship = newOpponentShips[i];
        if (ship.positions.some(pos => pos.row === row && pos.col === col)) {
          const allHit = ship.positions.every(pos => newOpponentBoard[pos.row][pos.col] === 'hit');
          if (allHit) {
            newOpponentShips[i] = { ...ship, sunk: true };
            ship.positions.forEach(pos => {
              newOpponentBoard[pos.row][pos.col] = 'sunk';
            });
            
            toast({
              title: "Ship sunk!",
              description: `You sunk the opponent's ${ship.name}!`,
            });
          }
          break;
        }
      }
    }
    
    const allOpponentShipsSunk = newOpponentShips.every(ship => ship.sunk);
    
    setGameState(prev => ({
      ...prev,
      opponentBoard: newOpponentBoard,
      opponentShips: newOpponentShips,
      playerHits: newPlayerHits,
      currentTurn: isHit && !allOpponentShipsSunk ? 'player' : 'opponent',
      gameWon: allOpponentShipsSunk,
      winner: allOpponentShipsSunk ? 'player' : null
    }));
    
    if (allOpponentShipsSunk) {
      toast({
        title: "Victory!",
        description: "You sunk all enemy ships!",
      });
      gameStorage.saveScore('battleship', 'Player', newPlayerHits);
      return;
    }
    
    if (!isHit) {
      // Opponent's turn
      setTimeout(() => {
        makeOpponentMove();
      }, 1000);
    }
  };

  const makeOpponentMove = () => {
    setGameState(currentState => {
      const availableCells = [];
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (currentState.playerBoard[row][col] !== 'hit' && currentState.playerBoard[row][col] !== 'miss') {
            availableCells.push({ row, col });
          }
        }
      }
      
      if (availableCells.length === 0) return currentState;
      
      const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
      const newPlayerBoard = currentState.playerBoard.map(r => [...r]);
      const isHit = newPlayerBoard[randomCell.row][randomCell.col] === 'ship';
      
      newPlayerBoard[randomCell.row][randomCell.col] = isHit ? 'hit' : 'miss';
      
      let newPlayerShips = [...currentState.playerShips];
      let newOpponentHits = currentState.opponentHits;
      
      if (isHit) {
        newOpponentHits++;
        
        // Check if ship is sunk
        for (let i = 0; i < newPlayerShips.length; i++) {
          const ship = newPlayerShips[i];
          if (ship.positions.some(pos => pos.row === randomCell.row && pos.col === randomCell.col)) {
            const allHit = ship.positions.every(pos => newPlayerBoard[pos.row][pos.col] === 'hit');
            if (allHit) {
              newPlayerShips[i] = { ...ship, sunk: true };
              ship.positions.forEach(pos => {
                newPlayerBoard[pos.row][pos.col] = 'sunk';
              });
              
              toast({
                title: "Ship sunk!",
                description: `Opponent sunk your ${ship.name}!`,
                variant: "destructive"
              });
            }
            break;
          }
        }
      }
      
      const allPlayerShipsSunk = newPlayerShips.every(ship => ship.sunk);
      
      if (allPlayerShipsSunk) {
        toast({
          title: "Defeat!",
          description: "All your ships have been sunk!",
          variant: "destructive"
        });
      }
      
      // Schedule next opponent move if hit and game not over
      if (isHit && !allPlayerShipsSunk) {
        setTimeout(() => {
          makeOpponentMove();
        }, 1000);
      }
      
      return {
        ...currentState,
        playerBoard: newPlayerBoard,
        playerShips: newPlayerShips,
        opponentHits: newOpponentHits,
        currentTurn: isHit && !allPlayerShipsSunk ? 'opponent' : 'player',
        gameWon: allPlayerShipsSunk,
        winner: allPlayerShipsSunk ? 'opponent' : null
      };
    });
  };

  const startBattle = () => {
    const { board: opponentBoard, ships: opponentShips } = generateOpponentBoard();
    
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      opponentBoard: opponentBoard, // Keep ships on the board for hit detection
      opponentShips
    }));
    
    toast({
      title: "Battle Started!",
      description: "Click on the opponent's board to attack!",
    });
  };

  const saveGame = () => {
    gameStorage.saveGameState('battleship', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setGameState({
      phase: 'setup',
      playerBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      playerShips: SHIPS.map(ship => ({ ...ship, placed: false, sunk: false, positions: [] })),
      opponentShips: SHIPS.map(ship => ({ ...ship, placed: false, sunk: false, positions: [] })),
      currentTurn: 'player',
      selectedShip: 0,
      shipOrientation: 'horizontal',
      gameWon: false,
      winner: null,
      playerHits: 0,
      opponentHits: 0
    });
    setSetupMode(true);
    gameStorage.deleteGameState('battleship');
  };

  const startNewGame = () => {
    setSetupMode(false);
  };

  const getCellClass = (cellState: CellState, isPlayerBoard: boolean, isOpponentBoard: boolean = false): string => {
    const baseClass = "w-8 h-8 border border-gray-400 flex items-center justify-center text-xs font-bold cursor-pointer transition-all";
    
    switch (cellState) {
      case 'empty':
        return `${baseClass} bg-blue-100 hover:bg-blue-200`;
      case 'ship':
        return `${baseClass} ${isPlayerBoard ? 'bg-gray-600 text-white' : 'bg-blue-100 hover:bg-blue-200'}`;
      case 'hit':
        return `${baseClass} bg-red-500 text-white`;
      case 'miss':
        return `${baseClass} bg-gray-300 text-gray-600`;
      case 'sunk':
        return `${baseClass} bg-red-800 text-white`;
      default:
        return baseClass;
    }
  };

  const getCellContent = (cellState: CellState): string => {
    switch (cellState) {
      case 'hit': return '💥';
      case 'miss': return '💧';
      case 'sunk': return '☠️';
      default: return '';
    }
  };

  if (setupMode) {
    return (
      <GameSetupLayout title="Battleship" icon={battleshipIcon} onStart={startNewGame}>
        <OptionGroup label="How to Play">
          <div className="text-sm text-gray-600 space-y-2">
            <p>1. Place your 5 ships on the grid</p>
            <p>2. Take turns firing at the enemy's grid</p>
            <p>3. Sink all enemy ships to win!</p>
          </div>
        </OptionGroup>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Your Fleet</div>
          <div className="space-y-1">
            {SHIPS.map(ship => (
              <div key={ship.name} className="flex justify-between text-sm text-gray-500">
                <span>{ship.name}</span>
                <span>{ship.size} cells</span>
              </div>
            ))}
          </div>
        </div>
      </GameSetupLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <GameHeader title="Battleship"  />
      
      <div className="max-w-7xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {gameState.phase === 'setup' ? 'Ship Placement' : 
                   gameState.phase === 'playing' ? 'Battle' : 'Finished'}
                </Badge>
                {gameState.phase === 'playing' && (
                  <span className="text-lg font-semibold">
                    {gameState.currentTurn === 'player' ? 'Your Turn' : 'Opponent\'s Turn'}
                  </span>
                )}
                {gameState.gameWon && (
                  <span className="text-lg font-bold">
                    {gameState.winner === 'player' ? '🎉 Victory!' : '💥 Defeat!'}
                  </span>
                )}
                <span className="text-sm text-gray-600">
                  Hits: You {gameState.playerHits} | Opponent {gameState.opponentHits}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {gameState.phase === 'setup' && gameState.playerShips.every(ship => ship.placed) && (
                  <Button onClick={startBattle}>Start Battle</Button>
                )}
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {gameState.phase === 'setup' && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">Ship Orientation:</span>
                  <Button
                    variant={gameState.shipOrientation === 'horizontal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGameState(prev => ({ ...prev, shipOrientation: 'horizontal' }))}
                  >
                    Horizontal
                  </Button>
                  <Button
                    variant={gameState.shipOrientation === 'vertical' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGameState(prev => ({ ...prev, shipOrientation: 'vertical' }))}
                  >
                    Vertical
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`grid gap-6 ${gameState.phase === 'setup' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {/* Player Board */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-center">Your Fleet</h3>
              
              <div className="grid grid-cols-10 gap-0 w-fit mx-auto mb-4">
                {gameState.playerBoard.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`player-${rowIndex}-${colIndex}`}
                      onClick={() => handlePlayerBoardClick(rowIndex, colIndex)}
                      className={getCellClass(cell, true)}
                    >
                      {getCellContent(cell)}
                    </div>
                  ))
                )}
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-2">Ships Remaining:</div>
                <div className="text-sm">
                  {gameState.playerShips.filter(ship => !ship.sunk).length} / {gameState.playerShips.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ship Selection (Setup Phase) */}
          {gameState.phase === 'setup' && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-center">Ships to Place</h3>
                
                <div className="space-y-2">
                  {gameState.playerShips.map((ship, index) => (
                    <Button
                      key={index}
                      variant={gameState.selectedShip === index ? 'default' : ship.placed ? 'secondary' : 'outline'}
                      onClick={() => setGameState(prev => ({ ...prev, selectedShip: index }))}
                      disabled={ship.placed}
                      className="w-full justify-between"
                    >
                      <span>{ship.name}</span>
                      <span className="text-xs">
                        {ship.size} cells {ship.placed ? '✓' : ''}
                      </span>
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 text-xs text-gray-600 text-center">
                  Click on your board to place the selected ship
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opponent Board (Battle Phase) */}
          {gameState.phase !== 'setup' && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-center">Enemy Waters</h3>
                
                <div className="grid grid-cols-10 gap-0 w-fit mx-auto mb-4">
                  {gameState.opponentBoard.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`opponent-${rowIndex}-${colIndex}`}
                        onClick={() => handleOpponentBoardClick(rowIndex, colIndex)}
                        className={getCellClass(cell, false, true)}
                      >
                        {getCellContent(cell)}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-2">Enemy Ships Remaining:</div>
                  <div className="text-sm">
                    {gameState.opponentShips.filter(ship => !ship.sunk).length} / {gameState.opponentShips.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              {gameState.phase === 'setup' 
                ? 'Place all your ships on the grid. Ships cannot touch each other.'
                : 'Click on the enemy grid to attack. 💥 = Hit, 💧 = Miss, ☠️ = Sunk'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
