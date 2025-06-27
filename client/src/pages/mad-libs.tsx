import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { MAD_LIBS_TEMPLATES, GAME_CATEGORIES, type GameCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  category: GameCategory;
  templateIndex: number;
  currentPromptIndex: number;
  answers: Record<string, string>;
  completed: boolean;
}

export default function MadLibs() {
  const [gameState, setGameState] = useState<GameState>({
    category: 'animals',
    templateIndex: 0,
    currentPromptIndex: 0,
    answers: {},
    completed: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('animals');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('mad-libs');
    if (saved && saved.category) {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  // Get available stories for the current category
  const getAvailableStories = (category: GameCategory) => {
    return MAD_LIBS_TEMPLATES[category] || [];
  };

  // Get random category for random selection
  const getRandomCategory = (): GameCategory => {
    return GAME_CATEGORIES[Math.floor(Math.random() * GAME_CATEGORIES.length)];
  };

  // Get 3 random stories from a category
  const getRandomStories = (category: GameCategory) => {
    const stories = getAvailableStories(category);
    const shuffled = [...stories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const currentTemplate = gameState.category && MAD_LIBS_TEMPLATES[gameState.category] 
    ? MAD_LIBS_TEMPLATES[gameState.category][gameState.templateIndex]
    : null;
  const currentPrompt = currentTemplate?.prompts[gameState.currentPromptIndex];
  const progress = currentTemplate ? (Object.keys(gameState.answers).length / currentTemplate.prompts.length) * 100 : 0;

  const formatPrompt = (prompt: string) => {
    // Convert camelCase to readable format
    return prompt
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/\d+$/, match => ` ${match}`);
  };

  const startNewGame = (category: GameCategory, templateIndex: number) => {
    const newGameState: GameState = {
      category,
      templateIndex,
      currentPromptIndex: 0,
      answers: {},
      completed: false
    };
    
    setGameState(newGameState);
    setSetupMode(false);
    setCurrentAnswer('');
    
    const template = MAD_LIBS_TEMPLATES[category][templateIndex];
    toast({
      title: "Game Started!",
      description: `Let's create "${template.title}"!`,
    });
  };

  const startRandomGame = () => {
    const randomCategory = getRandomCategory();
    const stories = getAvailableStories(randomCategory);
    const randomIndex = Math.floor(Math.random() * stories.length);
    startNewGame(randomCategory, randomIndex);
  };

  const handleAnswerSubmit = () => {
    if (currentAnswer.trim() && currentPrompt) {
      const newAnswers = {
        ...gameState.answers,
        [currentPrompt]: currentAnswer.trim()
      };
      
      const isLastPrompt = gameState.currentPromptIndex === (currentTemplate?.prompts.length || 0) - 1;
      
      setGameState(prev => ({
        ...prev,
        answers: newAnswers,
        currentPromptIndex: isLastPrompt ? prev.currentPromptIndex : prev.currentPromptIndex + 1,
        completed: isLastPrompt
      }));
      
      setCurrentAnswer('');
      
      if (isLastPrompt) {
        toast({
          title: "Story Complete!",
          description: "Your Mad Libs story is ready!",
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit();
    }
  };

  const resetGame = () => {
    setSetupMode(true);
    setGameState({
      category: 'animals',
      templateIndex: 0,
      currentPromptIndex: 0,
      answers: {},
      completed: false
    });
    setCurrentAnswer('');
  };

  const saveGame = () => {
    gameStorage.saveGameState('mad-libs', gameState);
    toast({
      title: "Game Saved",
      description: "Your progress has been saved!",
    });
  };

  const renderStory = () => {
    if (!currentTemplate) return null;
    
    let story = currentTemplate.template;
    
    // Replace all prompts with answers
    currentTemplate.prompts.forEach(prompt => {
      const answer = gameState.answers[prompt];
      if (answer) {
        story = story.replace(`{${prompt}}`, `<span class="font-bold text-blue-600">${answer}</span>`);
      }
    });
    
    // Split by periods and exclamation marks for paragraphs
    const sentences = story.split(/([.!])/);
    const paragraphs: string[] = [];
    let currentParagraph = '';
    
    sentences.forEach((sentence, index) => {
      currentParagraph += sentence;
      if (sentence === '.' || sentence === '!') {
        if (index % 6 === 5) { // New paragraph every 3 sentences
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      }
    });
    
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }
    
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p 
            key={index} 
            className="text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: paragraph }}
          />
        ))}
      </div>
    );
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <GameHeader title="Mad Libs" />
        
        <div className="max-w-4xl mx-auto pt-8 px-4">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Your Mad Libs Adventure!</h2>
                <p className="text-gray-600">Pick a category and select from 3 stories, or try a random surprise!</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Category:</label>
                <Select value={selectedCategory} onValueChange={(value: GameCategory) => setSelectedCategory(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 mb-6">
                <h3 className="font-semibold text-lg">Choose Your Story:</h3>
                {getRandomStories(selectedCategory).map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="p-4 h-auto text-left justify-start"
                    onClick={() => {
                      const allStories = getAvailableStories(selectedCategory);
                      const actualIndex = allStories.findIndex(t => t.title === template.title);
                      startNewGame(selectedCategory, actualIndex);
                    }}
                  >
                    <div>
                      <div className="font-semibold">{template.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.prompts.length} words needed
                      </div>
                    </div>
                  </Button>
                ))}
                
                <Button
                  variant="secondary"
                  className="p-4 h-auto bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200"
                  onClick={startRandomGame}
                >
                  <div className="text-center w-full">
                    <div className="font-semibold">🎲 Random Surprise Story!</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Let us pick a story from any category
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <GameHeader title="Mad Libs"  />
      
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Game Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {gameState.category.charAt(0).toUpperCase() + gameState.category.slice(1)}
                </Badge>
                <span className="text-lg font-semibold">{currentTemplate?.title}</span>
                {gameState.completed && (
                  <Badge className="bg-green-100 text-green-800">Story Complete! 🎉</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Progress: {Math.round(progress)}%
                </span>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  New Story
                </Button>
              </div>
            </div>
            
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {!gameState.completed ? (
          /* Input Section */
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">
                  Enter a {currentPrompt ? formatPrompt(currentPrompt) : 'word'}:
                </h3>
                
                <div className="max-w-md mx-auto mb-4">
                  <Input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Type your ${currentPrompt ? formatPrompt(currentPrompt).toLowerCase() : 'word'} here...`}
                    className="text-center text-lg"
                    autoFocus
                  />
                </div>
                
                <Button 
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  className="px-8"
                >
                  {gameState.currentPromptIndex === (currentTemplate?.prompts.length || 0) - 1 ? 'Finish Story!' : 'Next Word'}
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Word {gameState.currentPromptIndex + 1} of {currentTemplate?.prompts.length}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Story Display */
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{currentTemplate?.title}</h3>
                <p className="text-gray-600">Your completed Mad Libs story!</p>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
                {renderStory()}
              </div>
              
              <div className="text-center mt-6">
                <Button onClick={resetGame} className="px-8">
                  Create Another Story
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}