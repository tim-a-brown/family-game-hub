import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WOULD_YOU_RATHER_SCENARIOS, GAME_CATEGORIES, type GameCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

interface PlayerChoice {
  playerName: string;
  choice: 'A' | 'B';
}

interface GameState {
  currentScenario: string;
  category: GameCategory | 'all';
  playerChoices: PlayerChoice[];
  currentPlayerIndex: number;
  gameComplete: boolean;
  scenarioHistory: string[];
}

const PLAYER_NAMES = [
  'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'
];

export default function WouldYouRather() {
  const [gameState, setGameState] = useState<GameState>({
    currentScenario: '',
    category: 'all',
    playerChoices: [],
    currentPlayerIndex: 0,
    gameComplete: false,
    scenarioHistory: []
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [numPlayers, setNumPlayers] = useState(2);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('would-you-rather');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const getRandomScenario = (category: GameCategory | 'all', excludeHistory: string[] = []) => {
    let scenarios: string[] = [];
    
    if (category === 'all') {
      scenarios = Object.values(WOULD_YOU_RATHER_SCENARIOS).flat();
    } else {
      scenarios = WOULD_YOU_RATHER_SCENARIOS[category];
    }

    // Filter out previously used scenarios
    const availableScenarios = scenarios.filter(scenario => !excludeHistory.includes(scenario));
    
    // If all scenarios used, reset history
    if (availableScenarios.length === 0) {
      return scenarios[Math.floor(Math.random() * scenarios.length)];
    }

    return availableScenarios[Math.floor(Math.random() * availableScenarios.length)];
  };

  const parseScenario = (scenario: string) => {
    const parts = scenario.split(' or ');
    if (parts.length !== 2) return { optionA: scenario, optionB: 'Something else' };
    
    return {
      optionA: parts[0].replace('Would you rather ', ''),
      optionB: parts[1].replace('?', '')
    };
  };

  const makeChoice = (choice: 'A' | 'B') => {
    const currentPlayer = PLAYER_NAMES[gameState.currentPlayerIndex];
    const newChoice: PlayerChoice = {
      playerName: currentPlayer,
      choice
    };

    const newPlayerChoices = [...gameState.playerChoices, newChoice];
    const nextPlayerIndex = gameState.currentPlayerIndex + 1;
    const gameComplete = nextPlayerIndex >= numPlayers;

    const newGameState = {
      ...gameState,
      playerChoices: newPlayerChoices,
      currentPlayerIndex: nextPlayerIndex,
      gameComplete
    };

    setGameState(newGameState);

    if (gameComplete) {
      setShowResults(true);
      toast({
        title: "Round Complete!",
        description: "See what everyone chose!",
      });
    }
  };

  const startNewRound = () => {
    const newScenario = getRandomScenario(gameState.category, gameState.scenarioHistory);
    const newHistory = [...gameState.scenarioHistory, newScenario];

    setGameState({
      ...gameState,
      currentScenario: newScenario,
      playerChoices: [],
      currentPlayerIndex: 0,
      gameComplete: false,
      scenarioHistory: newHistory
    });
    setShowResults(false);
  };

  const startNewGame = () => {
    const scenario = getRandomScenario(selectedCategory);
    
    const newGameState: GameState = {
      currentScenario: scenario,
      category: selectedCategory,
      playerChoices: [],
      currentPlayerIndex: 0,
      gameComplete: false,
      scenarioHistory: [scenario]
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('would-you-rather', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    setShowResults(false);
    gameStorage.deleteGameState('would-you-rather');
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Would You Rather" showSave={false} />
        
        <div className="max-w-2xl mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Game Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Number of Players</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4, 5, 6].map(num => (
                      <Button
                        key={num}
                        variant={numPlayers === num ? "default" : "outline"}
                        onClick={() => setNumPlayers(num)}
                        className="w-full"
                      >
                        {num}
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
                      {GAME_CATEGORIES.sort().map(category => (
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

  if (showResults) {
    const { optionA, optionB } = parseScenario(gameState.currentScenario);
    const choiceA = gameState.playerChoices.filter(p => p.choice === 'A');
    const choiceB = gameState.playerChoices.filter(p => p.choice === 'B');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Would You Rather" onSave={saveGame} />
        
        <div className="max-w-4xl mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-center mb-8">Results</h2>
              
              <div className="text-lg text-center mb-8 p-4 bg-blue-50 rounded-lg">
                Would you rather {optionA} or {optionB}?
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Option A Results */}
                <Card className="border-2 border-blue-300">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4 text-blue-600">Option A</h3>
                    <p className="mb-4">{optionA}</p>
                    <div className="space-y-2">
                      {choiceA.length > 0 ? (
                        choiceA.map((player, index) => (
                          <Badge key={index} variant="secondary">
                            {player.playerName}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No one chose this option</p>
                      )}
                    </div>
                    <div className="mt-4 text-2xl font-bold text-blue-600">
                      {choiceA.length} vote{choiceA.length !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>

                {/* Option B Results */}
                <Card className="border-2 border-pink-300">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4 text-pink-600">Option B</h3>
                    <p className="mb-4">{optionB}</p>
                    <div className="space-y-2">
                      {choiceB.length > 0 ? (
                        choiceB.map((player, index) => (
                          <Badge key={index} variant="secondary">
                            {player.playerName}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No one chose this option</p>
                      )}
                    </div>
                    <div className="mt-4 text-2xl font-bold text-pink-600">
                      {choiceB.length} vote{choiceB.length !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center space-x-4">
                <Button onClick={startNewRound} size="lg">
                  Next Question
                </Button>
                <Button onClick={resetGame} variant="outline" size="lg">
                  New Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { optionA, optionB } = parseScenario(gameState.currentScenario);
  const currentPlayerName = PLAYER_NAMES[gameState.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <GameHeader title="Would You Rather" onSave={saveGame} />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {gameState.category === 'all' ? 'All Categories' : gameState.category}
                </Badge>
                <span className="text-lg font-semibold">
                  {currentPlayerName}'s Turn
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Player {gameState.currentPlayerIndex + 1} of {numPlayers}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Question */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-center mb-12">Would You Rather...</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Option A */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-4 border-blue-200 hover:border-blue-400"
                onClick={() => makeChoice('A')}
              >
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🅰️</div>
                  <h3 className="text-xl font-bold mb-4 text-blue-600">Option A</h3>
                  <p className="text-lg leading-relaxed">{optionA}</p>
                </CardContent>
              </Card>

              {/* Option B */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-4 border-pink-200 hover:border-pink-400"
                onClick={() => makeChoice('B')}
              >
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🅱️</div>
                  <h3 className="text-xl font-bold mb-4 text-pink-600">Option B</h3>
                  <p className="text-lg leading-relaxed">{optionB}</p>
                </CardContent>
              </Card>
            </div>

            {/* Previous Choices */}
            {gameState.playerChoices.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold mb-4 text-center">Choices Made:</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.playerChoices.map((choice, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className={choice.choice === 'A' ? 'border-blue-400' : 'border-pink-400'}
                    >
                      {choice.playerName}: Option {choice.choice}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              <Button onClick={resetGame} variant="outline">
                End Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
