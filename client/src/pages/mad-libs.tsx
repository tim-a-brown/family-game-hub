import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { MAD_LIBS_TEMPLATES } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  templateIndex: number;
  currentPromptIndex: number;
  answers: Record<string, string>;
  completed: boolean;
}

export default function MadLibs() {
  const [gameState, setGameState] = useState<GameState>({
    templateIndex: 0,
    currentPromptIndex: 0,
    answers: {},
    completed: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('mad-libs');
    if (saved) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const currentTemplate = MAD_LIBS_TEMPLATES[gameState.templateIndex];
  const currentPrompt = currentTemplate.prompts[gameState.currentPromptIndex];
  const progress = (Object.keys(gameState.answers).length / currentTemplate.prompts.length) * 100;

  const formatPrompt = (prompt: string) => {
    // Convert camelCase to readable format
    return prompt
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/\d+$/, match => ` ${match}`);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer.trim()) return;

    const newAnswers = {
      ...gameState.answers,
      [currentPrompt]: currentAnswer.trim()
    };

    const nextPromptIndex = gameState.currentPromptIndex + 1;
    const completed = nextPromptIndex >= currentTemplate.prompts.length;

    const newGameState = {
      ...gameState,
      answers: newAnswers,
      currentPromptIndex: completed ? gameState.currentPromptIndex : nextPromptIndex,
      completed
    };

    setGameState(newGameState);
    setCurrentAnswer('');

    if (completed) {
      toast({
        title: "Story Complete!",
        description: "Your Mad Lib is ready to read!",
      });
    }
  };

  const generateStory = () => {
    let story = currentTemplate.template;
    
    // Replace placeholders with answers
    currentTemplate.prompts.forEach(prompt => {
      const answer = gameState.answers[prompt] || '[MISSING]';
      story = story.replace(`{${prompt}}`, answer);
    });

    return story;
  };

  const startNewGame = () => {
    const newGameState: GameState = {
      templateIndex: selectedTemplate,
      currentPromptIndex: 0,
      answers: {},
      completed: false
    };

    setGameState(newGameState);
    setSetupMode(false);
  };

  const saveGame = () => {
    gameStorage.saveGameState('mad-libs', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const resetGame = () => {
    setSetupMode(true);
    gameStorage.deleteGameState('mad-libs');
  };

  const previousPrompt = () => {
    if (gameState.currentPromptIndex > 0) {
      setGameState({
        ...gameState,
        currentPromptIndex: gameState.currentPromptIndex - 1,
        completed: false
      });
      setCurrentAnswer(gameState.answers[currentTemplate.prompts[gameState.currentPromptIndex - 1]] || '');
    }
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Mad Libs" showSave={false} />
        
        <div className="max-w-2xl mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Choose a Story Template</h2>
              
              <div className="space-y-4">
                {MAD_LIBS_TEMPLATES.map((template, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === index ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTemplate(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-lg">{template.title}</h3>
                          <p className="text-sm text-gray-600">
                            {template.prompts.length} words needed
                          </p>
                        </div>
                        {selectedTemplate === index && (
                          <Badge className="bg-primary">Selected</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={startNewGame} className="w-full mt-6" size="lg">
                Start Mad Lib
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState.completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <GameHeader title="Mad Libs" onSave={saveGame} />
        
        <div className="max-w-4xl mx-auto pt-8 px-4">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-center mb-8">{currentTemplate.title}</h2>
              
              <div className="bg-yellow-50 p-6 rounded-lg text-lg leading-relaxed">
                {generateStory().split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <Button onClick={resetGame} variant="outline">
                  Create Another Story
                </Button>
                <Button 
                  onClick={() => {
                    const story = generateStory();
                    navigator.clipboard.writeText(story);
                    toast({
                      title: "Copied!",
                      description: "Story copied to clipboard",
                    });
                  }}
                >
                  Copy Story
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
      <GameHeader title="Mad Libs" onSave={saveGame} />
      
      <div className="max-w-2xl mx-auto pt-8 px-4">
        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{currentTemplate.title}</span>
              <span className="text-sm text-gray-600">
                {Object.keys(gameState.answers).length} / {currentTemplate.prompts.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Prompt */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                I need a {formatPrompt(currentPrompt)}
              </h2>
              <Badge variant="secondary">
                Word {gameState.currentPromptIndex + 1} of {currentTemplate.prompts.length}
              </Badge>
            </div>

            <form onSubmit={handleAnswerSubmit} className="space-y-6">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={`Enter a ${formatPrompt(currentPrompt).toLowerCase()}...`}
                className="text-center text-lg p-4 h-14"
                autoFocus
              />
              
              <div className="flex space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={previousPrompt}
                  disabled={gameState.currentPromptIndex === 0}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button 
                  type="submit" 
                  disabled={!currentAnswer.trim()}
                  className="flex-1"
                >
                  {gameState.currentPromptIndex === currentTemplate.prompts.length - 1 ? 'Finish Story' : 'Next Word'}
                </Button>
              </div>
            </form>

            {/* Previous Answers */}
            {Object.keys(gameState.answers).length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold mb-4 text-center">Your Words So Far:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(gameState.answers).map(([prompt, answer]) => (
                    <div key={prompt} className="flex justify-between">
                      <span className="text-gray-600">{formatPrompt(prompt)}:</span>
                      <span className="font-medium">{answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
