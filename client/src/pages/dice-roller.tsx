import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { useToast } from "@/hooks/use-toast";

interface Die {
  id: string;
  sides: number;
  value: number;
  color: string;
}

interface RollHistory {
  timestamp: Date;
  dice: Die[];
  total: number;
  formula: string;
}

interface GameState {
  dice: Die[];
  rollHistory: RollHistory[];
  isRolling: boolean;
}

const DIE_TYPES = [
  { sides: 4, name: 'D4', color: 'bg-red-100 text-red-800' },
  { sides: 6, name: 'D6', color: 'bg-blue-100 text-blue-800' },
  { sides: 8, name: 'D8', color: 'bg-green-100 text-green-800' },
  { sides: 10, name: 'D10', color: 'bg-yellow-100 text-yellow-800' },
  { sides: 12, name: 'D12', color: 'bg-purple-100 text-purple-800' },
  { sides: 20, name: 'D20', color: 'bg-pink-100 text-pink-800' },
  { sides: 100, name: 'D100', color: 'bg-gray-100 text-gray-800' }
];

export default function DiceRoller() {
  const [gameState, setGameState] = useState<GameState>({
    dice: [{ id: '1', sides: 6, value: 1, color: 'bg-blue-100 text-blue-800' }],
    rollHistory: [],
    isRolling: false
  });

  const [numberOfDice, setNumberOfDice] = useState('1');
  const [selectedDieType, setSelectedDieType] = useState(6);
  const [modifier, setModifier] = useState('');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('dice-roller');
    if (saved && saved.dice && saved.rollHistory) {
      setGameState(saved);
    }
  }, []);

  const getDieSymbol = (value: number, sides: number): string => {
    if (sides === 6) {
      const symbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      return symbols[value - 1] || value.toString();
    }
    return value.toString();
  };

  const generateDieId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const addDie = () => {
    const dieType = DIE_TYPES.find(d => d.sides === selectedDieType);
    if (!dieType) return;

    const count = parseInt(numberOfDice) || 1;
    const newDice: Die[] = [];

    for (let i = 0; i < count; i++) {
      newDice.push({
        id: generateDieId(),
        sides: selectedDieType,
        value: 1,
        color: dieType.color
      });
    }

    setGameState(prev => ({
      ...prev,
      dice: [...prev.dice, ...newDice]
    }));

    toast({
      title: "Dice Added",
      description: `Added ${count} ${dieType.name} ${count > 1 ? 'dice' : 'die'}`,
    });
  };

  const removeDie = (id: string) => {
    setGameState(prev => ({
      ...prev,
      dice: prev.dice.filter(die => die.id !== id)
    }));
  };

  const clearAllDice = () => {
    setGameState(prev => ({
      ...prev,
      dice: []
    }));
  };

  const rollDice = async () => {
    if (gameState.dice.length === 0) {
      toast({
        title: "No Dice",
        description: "Add some dice first!",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => ({ ...prev, isRolling: true }));

    // Animate rolling
    const rollAnimationSteps = 10;
    for (let step = 0; step < rollAnimationSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setGameState(prev => ({
        ...prev,
        dice: prev.dice.map(die => ({
          ...die,
          value: Math.floor(Math.random() * die.sides) + 1
        }))
      }));
    }

    // Final roll
    const finalDice = gameState.dice.map(die => ({
      ...die,
      value: Math.floor(Math.random() * die.sides) + 1
    }));

    const total = finalDice.reduce((sum, die) => sum + die.value, 0);
    const modifierValue = parseInt(modifier) || 0;
    const finalTotal = total + modifierValue;

    // Create formula string
    const diceGroups = finalDice.reduce((groups, die) => {
      const key = `d${die.sides}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(die.value);
      return groups;
    }, {} as Record<string, number[]>);

    const formulaParts = Object.entries(diceGroups).map(([type, values]) => 
      `${values.length}${type}: ${values.join(', ')}`
    );
    
    let formula = formulaParts.join(' + ');
    if (modifierValue !== 0) {
      formula += ` ${modifierValue >= 0 ? '+' : ''}${modifierValue}`;
    }
    formula += ` = ${finalTotal}`;

    const rollRecord: RollHistory = {
      timestamp: new Date(),
      dice: [...finalDice],
      total: finalTotal,
      formula
    };

    setGameState(prev => ({
      ...prev,
      dice: finalDice,
      rollHistory: [rollRecord, ...prev.rollHistory.slice(0, 9)], // Keep last 10 rolls
      isRolling: false
    }));

    toast({
      title: "Dice Rolled!",
      description: `Total: ${finalTotal}`,
    });
  };

  const saveGame = () => {
    gameStorage.saveGameState('dice-roller', gameState);
    toast({
      title: "Game Saved",
      description: "Your dice setup has been saved!",
    });
  };

  const resetGame = () => {
    setGameState({
      dice: [],
      rollHistory: [],
      isRolling: false
    });
    gameStorage.deleteGameState('dice-roller');
  };

  const getCurrentTotal = (): number => {
    const diceTotal = gameState.dice.reduce((sum, die) => sum + die.value, 0);
    const modifierValue = parseInt(modifier) || 0;
    return diceTotal + modifierValue;
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <GameHeader title="Dice Roller"  />
      
      <div className="max-w-6xl mx-auto pt-8 px-4">
        {/* Dice Management */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Add Dice</h3>
            
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Dice</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfDice}
                  onChange={(e) => setNumberOfDice(e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Die Type</label>
                <Select value={selectedDieType.toString()} onValueChange={(value) => setSelectedDieType(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIE_TYPES.map(die => (
                      <SelectItem key={die.sides} value={die.sides.toString()}>
                        {die.name} ({die.sides} sides)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modifier</label>
                <Input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(e.target.value)}
                  placeholder="+0"
                />
              </div>

              <Button onClick={addDie} className="h-10">
                Add Dice
              </Button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Current dice: {gameState.dice.length} • Total: {getCurrentTotal()}
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={clearAllDice}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Dice */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold">Current Dice</h3>
                  <Button 
                    onClick={rollDice}
                    disabled={gameState.dice.length === 0 || gameState.isRolling}
                    size="lg"
                    className="min-w-[120px]"
                  >
                    {gameState.isRolling ? 'Rolling...' : 'Roll All'}
                  </Button>
                </div>

                {gameState.dice.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg mb-2">No dice added yet</p>
                    <p className="text-sm">Add some dice above to get started!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 mb-6">
                      {gameState.dice.map((die) => (
                        <div key={die.id} className="relative group">
                          <div className={`
                            w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold border-2
                            ${die.color} border-gray-300 transition-all
                            ${gameState.isRolling ? 'animate-bounce' : ''}
                          `}>
                            {getDieSymbol(die.value, die.sides)}
                          </div>
                          
                          <button
                            onClick={() => removeDie(die.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          
                          <div className="text-center mt-1">
                            <Badge variant="outline" className="text-xs">
                              D{die.sides}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current Total */}
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-gray-600 mb-1">Current Total</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {getCurrentTotal()}
                      </div>
                      {parseInt(modifier) !== 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          Dice: {gameState.dice.reduce((sum, die) => sum + die.value, 0)} + Modifier: {modifier}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Roll History */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Roll History</h3>
                
                {gameState.rollHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No rolls yet</p>
                    <p className="text-xs">Roll some dice to see history!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {gameState.rollHistory.map((roll, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-lg">{roll.total}</span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(roll.timestamp)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono">
                          {roll.formula}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Add dice of different types, set modifiers, and roll! Perfect for tabletop games and random number generation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
