import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, RotateCcw, Users, Trophy } from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  history: number[];
}

interface GameState {
  players: Player[];
  gameName: string;
  currentRound: number;
  gameStarted: boolean;
}

export default function Scorecard() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    gameName: '',
    currentRound: 1,
    gameStarted: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [showAddScore, setShowAddScore] = useState(false);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('scorecard');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
      // Initialize score inputs
      const inputs = saved.players.reduce((acc, player) => {
        acc[player.id] = '';
        return acc;
      }, {} as Record<string, string>);
      setScoreInputs(inputs);
    }
  }, []);

  const generatePlayerId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a player name",
        variant: "destructive"
      });
      return;
    }

    const playerId = generatePlayerId();
    const newPlayer: Player = {
      id: playerId,
      name: newPlayerName.trim(),
      score: 0,
      history: []
    };

    setGameState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer]
    }));

    setScoreInputs(prev => ({
      ...prev,
      [playerId]: ''
    }));

    setNewPlayerName('');
    
    toast({
      title: "Player Added",
      description: `${newPlayer.name} joined the game!`,
    });
  };

  const removePlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== playerId)
    }));

    setScoreInputs(prev => {
      const { [playerId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const startGame = () => {
    if (gameState.players.length < 2) {
      toast({
        title: "Need More Players",
        description: "Add at least 2 players to start the game",
        variant: "destructive"
      });
      return;
    }

    if (!newGameName.trim()) {
      toast({
        title: "Game Name Required",
        description: "Please enter a name for your game",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => ({
      ...prev,
      gameName: newGameName.trim(),
      gameStarted: true
    }));

    setSetupMode(false);
    
    toast({
      title: "Game Started!",
      description: `${newGameName} has begun!`,
    });
  };

  const updateScoreInput = (playerId: string, value: string) => {
    setScoreInputs(prev => ({
      ...prev,
      [playerId]: value
    }));
  };

  const addScores = () => {
    const updates: Array<{playerId: string, score: number}> = [];
    
    for (const [playerId, input] of Object.entries(scoreInputs)) {
      const score = parseInt(input);
      if (!isNaN(score) && input.trim() !== '') {
        updates.push({ playerId, score });
      }
    }

    if (updates.length === 0) {
      toast({
        title: "No Scores",
        description: "Enter scores for at least one player",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => {
        const update = updates.find(u => u.playerId === player.id);
        if (update) {
          return {
            ...player,
            score: player.score + update.score,
            history: [...player.history, update.score]
          };
        }
        return {
          ...player,
          history: [...player.history, 0]
        };
      }),
      currentRound: prev.currentRound + 1
    }));

    // Clear inputs
    setScoreInputs(prev => 
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>)
    );

    setShowAddScore(false);

    toast({
      title: "Scores Added",
      description: `Round ${gameState.currentRound} complete!`,
    });
  };

  const undoLastRound = () => {
    if (gameState.currentRound <= 1) return;

    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => {
        if (player.history.length === 0) return player;
        
        const newHistory = player.history.slice(0, -1);
        const newScore = newHistory.reduce((sum, score) => sum + score, 0);
        
        return {
          ...player,
          score: newScore,
          history: newHistory
        };
      }),
      currentRound: Math.max(1, prev.currentRound - 1)
    }));

    toast({
      title: "Round Undone",
      description: "Last round has been removed",
    });
  };

  const adjustScore = (playerId: string, adjustment: number) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => 
        player.id === playerId 
          ? { ...player, score: Math.max(0, player.score + adjustment) }
          : player
      )
    }));
  };

  const getSortedPlayers = (): Player[] => {
    return [...gameState.players].sort((a, b) => b.score - a.score);
  };

  const getPlayerRank = (playerId: string): number => {
    const sorted = getSortedPlayers();
    return sorted.findIndex(p => p.id === playerId) + 1;
  };

  const saveGame = () => {
    gameStorage.saveGameState('scorecard', gameState);
    toast({
      title: "Game Saved",
      description: "Your scorecard has been saved!",
    });
  };

  const resetGame = () => {
    setGameState({
      players: [],
      gameName: '',
      currentRound: 1,
      gameStarted: false
    });
    setSetupMode(true);
    setNewPlayerName('');
    setNewGameName('');
    setScoreInputs({});
    gameStorage.deleteGameState('scorecard');
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Scorecard"  />
        
        <div className="max-w-2xl mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Setup Game</h2>
              
              <div className="space-y-6">
                {/* Game Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Game Name</label>
                  <Input
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    placeholder="Enter game name (e.g., Scrabble, Monopoly)"
                    className="w-full"
                  />
                </div>

                {/* Add Players */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Players</label>
                  <div className="flex space-x-2">
                    <Input
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Player name"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    />
                    <Button onClick={addPlayer}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Player List */}
                {gameState.players.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Players ({gameState.players.length})</h3>
                    <div className="space-y-2">
                      {gameState.players.map((player) => (
                        <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{player.name}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removePlayer(player.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={startGame} 
                  className="w-full" 
                  size="lg"
                  disabled={gameState.players.length < 2 || !newGameName.trim()}
                >
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
      <GameHeader title="Scorecard"  />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">{gameState.gameName}</Badge>
                <span className="text-lg font-semibold">Round {gameState.currentRound}</span>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  {gameState.players.length} Players
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Dialog open={showAddScore} onOpenChange={setShowAddScore}>
                  <DialogTrigger asChild>
                    <Button>Add Scores</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Scores - Round {gameState.currentRound}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {gameState.players.map((player) => (
                        <div key={player.id} className="flex items-center space-x-3">
                          <label className="w-24 text-sm font-medium">{player.name}:</label>
                          <Input
                            type="number"
                            value={scoreInputs[player.id] || ''}
                            onChange={(e) => updateScoreInput(player.id, e.target.value)}
                            placeholder="0"
                            className="flex-1"
                          />
                        </div>
                      ))}
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={addScores} className="flex-1">
                          Add Scores
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddScore(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" size="sm" onClick={undoLastRound} disabled={gameState.currentRound <= 1}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoreboard */}
        <Card className="shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Scoreboard</h3>
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>

            <div className="space-y-4">
              {getSortedPlayers().map((player, index) => {
                const rank = index + 1;
                return (
                  <div 
                    key={player.id} 
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${rank === 1 ? 'bg-yellow-50 border-yellow-300' : 
                        rank === 2 ? 'bg-gray-50 border-gray-300' :
                        rank === 3 ? 'bg-orange-50 border-orange-300' :
                        'bg-white border-gray-200'}
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getRankIcon(rank)}</div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg">{player.name}</span>
                            <Badge variant="outline" className="text-xs">#{rank}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {player.history.length > 0 && (
                              <span>Last: {player.history[player.history.length - 1] || 0}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-3xl font-bold">{player.score}</div>
                          <div className="text-sm text-gray-600">Total Score</div>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => adjustScore(player.id, 1)}
                            className="w-8 h-8 p-0"
                          >
                            +
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => adjustScore(player.id, -1)}
                            className="w-8 h-8 p-0"
                          >
                            -
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Score History */}
                    {player.history.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Round History:</div>
                        <div className="flex space-x-1 overflow-x-auto">
                          {player.history.map((score, roundIndex) => (
                            <Badge key={roundIndex} variant="secondary" className="text-xs whitespace-nowrap">
                              R{roundIndex + 1}: {score}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Track scores for any multiplayer game. Use "Add Scores" for round-based scoring or adjust individual scores with +/- buttons.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
