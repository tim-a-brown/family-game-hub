import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";

interface Die {
  value: number;
  isHeld: boolean;
}

interface ScoreCategory {
  name: string;
  score: number | null;
  potential: number;
}

interface GameState {
  dice: Die[];
  rollsLeft: number;
  currentRound: number;
  totalRounds: number;
  scorecard: Record<string, number | null>;
  totalScore: number;
  gameComplete: boolean;
}

const SCORE_CATEGORIES = {
  // Upper section
  'ones': 'Ones',
  'twos': 'Twos', 
  'threes': 'Threes',
  'fours': 'Fours',
  'fives': 'Fives',
  'sixes': 'Sixes',
  // Lower section
  'three-of-kind': 'Three of a Kind',
  'four-of-kind': 'Four of a Kind',
  'full-house': 'Full House',
  'small-straight': 'Small Straight',
  'large-straight': 'Large Straight',
  'yahtzee': 'YAHTZEE',
  'chance': 'Chance'
};

export default function Yahtzee() {
  const [gameState, setGameState] = useState<GameState>({
    dice: Array(5).fill(null).map(() => ({ value: 1, isHeld: false })),
    rollsLeft: 3,
    currentRound: 1,
    totalRounds: 13,
    scorecard: Object.keys(SCORE_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: null }), {}),
    totalScore: 0,
    gameComplete: false
  });

  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('yahtzee');
    if (saved) {
      setGameState(saved);
    }
  }, []);

  const rollDice = () => {
    if (gameState.rollsLeft <= 0) return;

    const newDice = gameState.dice.map(die => 
      die.isHeld ? die : { ...die, value: Math.floor(Math.random() * 6) + 1 }
    );

    setGameState(prev => ({
      ...prev,
      dice: newDice,
      rollsLeft: prev.rollsLeft - 1
    }));
  };

  const toggleHoldDie = (index: number) => {
    if (gameState.rollsLeft === 3) return; // Can't hold before first roll

    setGameState(prev => ({
      ...prev,
      dice: prev.dice.map((die, i) => 
        i === index ? { ...die, isHeld: !die.isHeld } : die
      )
    }));
  };

  const getDiceValues = (): number[] => {
    return gameState.dice.map(die => die.value);
  };

  const countValues = (values: number[]): Record<number, number> => {
    return values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  };

  const calculateScore = (category: string, diceValues: number[]): number => {
    const counts = countValues(diceValues);
    const sum = diceValues.reduce((a, b) => a + b, 0);

    switch (category) {
      case 'ones': return diceValues.filter(v => v === 1).length * 1;
      case 'twos': return diceValues.filter(v => v === 2).length * 2;
      case 'threes': return diceValues.filter(v => v === 3).length * 3;
      case 'fours': return diceValues.filter(v => v === 4).length * 4;
      case 'fives': return diceValues.filter(v => v === 5).length * 5;
      case 'sixes': return diceValues.filter(v => v === 6).length * 6;
      
      case 'three-of-kind':
        return Object.values(counts).some(count => count >= 3) ? sum : 0;
      
      case 'four-of-kind':
        return Object.values(counts).some(count => count >= 4) ? sum : 0;
      
      case 'full-house':
        const hasThree = Object.values(counts).includes(3);
        const hasTwo = Object.values(counts).includes(2);
        return (hasThree && hasTwo) ? 25 : 0;
      
      case 'small-straight':
        const sorted = [...new Set(diceValues)].sort();
        const hasSmallStraight = 
          sorted.join('').includes('1234') ||
          sorted.join('').includes('2345') ||
          sorted.join('').includes('3456');
        return hasSmallStraight ? 30 : 0;
      
      case 'large-straight':
        const sortedLarge = [...new Set(diceValues)].sort();
        const hasLargeStraight = 
          sortedLarge.join('') === '12345' ||
          sortedLarge.join('') === '23456';
        return hasLargeStraight ? 40 : 0;
      
      case 'yahtzee':
        return Object.values(counts).includes(5) ? 50 : 0;
      
      case 'chance':
        return sum;
      
      default:
        return 0;
    }
  };

  const scoreCategory = (category: string) => {
    if (gameState.scorecard[category] !== null) return;
    if (gameState.rollsLeft === 3) return; // Must roll at least once

    const score = calculateScore(category, getDiceValues());
    
    setGameState(prev => {
      const newScorecard = { ...prev.scorecard, [category]: score };
      const newTotalScore = Object.values(newScorecard).reduce((sum, val) => sum + (val || 0), 0);
      
      // Calculate upper section bonus
      const upperSectionScore = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']
        .reduce((sum, cat) => sum + (newScorecard[cat] || 0), 0);
      const bonus = upperSectionScore >= 63 ? 35 : 0;
      
      const finalScore = newTotalScore + bonus;
      const newRound = prev.currentRound + 1;
      const gameComplete = newRound > prev.totalRounds;

      return {
        ...prev,
        scorecard: newScorecard,
        totalScore: finalScore,
        currentRound: newRound,
        gameComplete,
        rollsLeft: 3,
        dice: prev.dice.map(die => ({ ...die, isHeld: false }))
      };
    });

    if (gameState.currentRound >= gameState.totalRounds) {
      const finalScore = Object.values(gameState.scorecard).reduce((sum, val) => sum + (val || 0), 0);
      toast({
        title: "Game Complete!",
        description: `Final Score: ${finalScore}`,
      });
      gameStorage.saveScore('yahtzee', 'Player', finalScore);
    }
  };

  const getPotentialScore = (category: string): number => {
    if (gameState.scorecard[category] !== null) return 0;
    return calculateScore(category, getDiceValues());
  };

  const saveGame = () => {
    gameStorage.saveGameState('yahtzee', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setGameState({
      dice: Array(5).fill(null).map(() => ({ value: 1, isHeld: false })),
      rollsLeft: 3,
      currentRound: 1,
      totalRounds: 13,
      scorecard: Object.keys(SCORE_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: null }), {}),
      totalScore: 0,
      gameComplete: false
    });
    gameStorage.deleteGameState('yahtzee');
  };

  const getDieSymbol = (value: number): string => {
    const symbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return symbols[value - 1];
  };

  const getUpperSectionScore = (): number => {
    return ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']
      .reduce((sum, cat) => sum + (gameState.scorecard[cat] || 0), 0);
  };

  const getUpperSectionBonus = (): number => {
    return getUpperSectionScore() >= 63 ? 35 : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <GameHeader title="Yahtzee"  />
      
      <div className="max-w-6xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">Round {gameState.currentRound} / {gameState.totalRounds}</Badge>
                <span className="text-lg font-semibold">Rolls Left: {gameState.rollsLeft}</span>
                <span className="text-lg font-semibold">Score: {gameState.totalScore}</span>
                {gameState.gameComplete && (
                  <Badge className="bg-green-100 text-green-800">Game Complete! 🎉</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetGame}>
                New Game
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dice Area */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-center">Dice</h3>
                
                {/* Dice Display */}
                <div className="flex justify-center space-x-4 mb-6">
                  {gameState.dice.map((die, index) => (
                    <button
                      key={index}
                      onClick={() => toggleHoldDie(index)}
                      disabled={gameState.rollsLeft === 3}
                      className={`
                        w-16 h-16 text-3xl border-2 rounded-lg transition-all
                        ${die.isHeld 
                          ? 'bg-blue-200 border-blue-400 text-blue-800' 
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                        }
                        ${gameState.rollsLeft === 3 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                      `}
                    >
                      {getDieSymbol(die.value)}
                    </button>
                  ))}
                </div>

                {/* Hold Instructions */}
                {gameState.rollsLeft < 3 && gameState.rollsLeft > 0 && (
                  <p className="text-center text-sm text-gray-600 mb-4">
                    Click dice to hold them for the next roll
                  </p>
                )}

                {/* Roll Button */}
                <div className="text-center">
                  <Button 
                    onClick={rollDice}
                    disabled={gameState.rollsLeft <= 0 || gameState.gameComplete}
                    size="lg"
                    className="w-full"
                  >
                    {gameState.rollsLeft === 3 ? 'Roll Dice' : `Roll Again (${gameState.rollsLeft} left)`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scorecard */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-center">Scorecard</h3>
                
                <div className="space-y-1">
                  {/* Upper Section */}
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-medium text-sm text-blue-800 mb-2">Upper Section</h4>
                    {['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].map(category => (
                      <button
                        key={category}
                        onClick={() => scoreCategory(category)}
                        disabled={gameState.scorecard[category] !== null || gameState.rollsLeft === 3 || gameState.gameComplete}
                        className={`
                          w-full p-2 text-left text-sm rounded transition-colors mb-1
                          ${gameState.scorecard[category] !== null 
                            ? 'bg-green-100 text-green-800 cursor-default' 
                            : gameState.rollsLeft === 3 || gameState.gameComplete
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white hover:bg-blue-100 cursor-pointer border'
                          }
                        `}
                      >
                        <div className="flex justify-between">
                          <span>{SCORE_CATEGORIES[category as keyof typeof SCORE_CATEGORIES]}</span>
                          <span className="font-medium">
                            {gameState.scorecard[category] !== null 
                              ? gameState.scorecard[category] 
                              : getPotentialScore(category) || '—'
                            }
                          </span>
                        </div>
                      </button>
                    ))}
                    
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{getUpperSectionScore()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Bonus (if ≥63):</span>
                        <span>{getUpperSectionBonus()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lower Section */}
                  <div className="bg-orange-50 p-3 rounded">
                    <h4 className="font-medium text-sm text-orange-800 mb-2">Lower Section</h4>
                    {['three-of-kind', 'four-of-kind', 'full-house', 'small-straight', 'large-straight', 'yahtzee', 'chance'].map(category => (
                      <button
                        key={category}
                        onClick={() => scoreCategory(category)}
                        disabled={gameState.scorecard[category] !== null || gameState.rollsLeft === 3 || gameState.gameComplete}
                        className={`
                          w-full p-2 text-left text-sm rounded transition-colors mb-1
                          ${gameState.scorecard[category] !== null 
                            ? 'bg-green-100 text-green-800 cursor-default' 
                            : gameState.rollsLeft === 3 || gameState.gameComplete
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white hover:bg-orange-100 cursor-pointer border'
                          }
                        `}
                      >
                        <div className="flex justify-between">
                          <span>{SCORE_CATEGORIES[category as keyof typeof SCORE_CATEGORIES]}</span>
                          <span className="font-medium">
                            {gameState.scorecard[category] !== null 
                              ? gameState.scorecard[category] 
                              : getPotentialScore(category) || '—'
                            }
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="bg-green-50 p-3 rounded">
                    <div className="flex justify-between font-bold text-green-800">
                      <span>TOTAL SCORE:</span>
                      <span>{gameState.totalScore}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Roll dice up to 3 times per turn. Hold dice by clicking them. Choose a scoring category to end your turn.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
