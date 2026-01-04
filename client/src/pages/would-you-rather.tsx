import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup, OptionButtons } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { WOULD_YOU_RATHER_SCENARIOS, GAME_CATEGORIES, type GameCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import wouldYouRatherIcon from "@assets/generated_images/would_you_rather_tile_icon.png";

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
  showPassScreen: boolean;
  passScreenTimer: number;
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
    scenarioHistory: [],
    showPassScreen: false,
    passScreenTimer: 0
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
      gameComplete,
      showPassScreen: !gameComplete,
      passScreenTimer: !gameComplete ? 6 : 0
    };

    setGameState(newGameState);

    if (gameComplete) {
      setShowResults(true);
      toast({
        title: "Round Complete!",
        description: "See what everyone chose!",
      });
    } else {
      // Start the 6-second countdown
      const timer = setInterval(() => {
        setGameState(prev => {
          if (prev.passScreenTimer <= 1) {
            clearInterval(timer);
            return {
              ...prev,
              showPassScreen: false,
              passScreenTimer: 0
            };
          }
          return {
            ...prev,
            passScreenTimer: prev.passScreenTimer - 1
          };
        });
      }, 1000);
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
      scenarioHistory: newHistory,
      showPassScreen: false,
      passScreenTimer: 0
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
      scenarioHistory: [scenario],
      showPassScreen: false,
      passScreenTimer: 0
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
      <GameSetupLayout 
        title="Would You Rather" 
        icon={wouldYouRatherIcon}
        onStart={startNewGame}
      >
        <OptionGroup label="Players">
          <OptionButtons 
            options={[2, 3, 4, 5, 6]} 
            selected={numPlayers} 
            onSelect={(v) => setNumPlayers(v as number)}
            columns={5}
          />
        </OptionGroup>

        <OptionGroup label="Category">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as GameCategory | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {[...GAME_CATEGORIES].sort().map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionGroup>
      </GameSetupLayout>
    );
  }

  if (showResults) {
    const { optionA, optionB } = parseScenario(gameState.currentScenario);
    const choiceA = gameState.playerChoices.filter(p => p.choice === 'A');
    const choiceB = gameState.playerChoices.filter(p => p.choice === 'B');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Would You Rather"  />
        
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

  // Pass Screen Component
  if (gameState.showPassScreen) {
    const nextPlayerName = PLAYER_NAMES[gameState.currentPlayerIndex];
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
        <GameHeader title="Would You Rather"  />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-green-50 border-green-200 rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-green-800 mb-3">Answer Recorded!</h2>
            <p className="text-sm text-green-700 mb-4">
              Pass to {nextPlayerName}
            </p>
            <div className="text-2xl font-bold text-green-600">
              {gameState.passScreenTimer}
            </div>
            <p className="text-xs text-gray-600 mt-1">seconds remaining</p>
          </div>
        </div>
      </div>
    );
  }

  const { optionA, optionB } = parseScenario(gameState.currentScenario);
  const currentPlayerName = PLAYER_NAMES[gameState.currentPlayerIndex];

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <GameHeader title="Would You Rather"  />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {gameState.category === 'all' ? 'All' : gameState.category}
              </Badge>
              <span className="text-xs font-semibold">
                {currentPlayerName}'s Turn
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {gameState.currentPlayerIndex + 1}/{numPlayers}
            </div>
          </div>
        </div>

        {/* Compact Question */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-3 flex flex-col">
          <h2 className="text-sm font-bold text-center mb-4">Would You Rather...</h2>
          
          <div className="flex-1 flex flex-col gap-3">
            {/* Option A */}
            <div 
              className="flex-1 cursor-pointer transition-all border-2 border-blue-200 hover:border-blue-400 rounded-lg p-3 text-center flex flex-col justify-center bg-blue-50"
              onClick={() => makeChoice('A')}
            >
              <div className="text-2xl mb-2">🅰️</div>
              <h3 className="text-sm font-bold mb-2 text-blue-600">Option A</h3>
              <p className="text-xs leading-relaxed">{optionA}</p>
            </div>

            {/* Option B */}
            <div 
              className="flex-1 cursor-pointer transition-all border-2 border-pink-200 hover:border-pink-400 rounded-lg p-3 text-center flex flex-col justify-center bg-pink-50"
              onClick={() => makeChoice('B')}
            >
              <div className="text-2xl mb-2">🅱️</div>
              <h3 className="text-sm font-bold mb-2 text-pink-600">Option B</h3>
              <p className="text-xs leading-relaxed">{optionB}</p>
            </div>
          </div>

          {/* Progress */}
          {gameState.playerChoices.length > 0 && (
            <div className="mt-3 pt-2 border-t text-center">
              <Badge variant="outline" className="text-xs px-1 py-0">
                {gameState.playerChoices.length}/{numPlayers} answered
              </Badge>
            </div>
          )}

          <div className="mt-2 text-center">
            <Button onClick={resetGame} variant="outline" size="sm" className="text-xs px-2 py-1 h-6">
              End Game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
