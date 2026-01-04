import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStorage } from "@/lib/game-storage";
import { MAD_LIBS_TEMPLATES, GAME_CATEGORIES, type GameCategory } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import madLibsIcon from "@assets/generated_images/mad_libs_game_tile_icon.png";

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
    const stories = getRandomStories(selectedCategory);
    
    return (
      <GameSetupLayout 
        title="Mad Libs" 
        icon={madLibsIcon} 
        onStart={startRandomGame}
        startLabel="🎲 Random Story"
      >
        <OptionGroup label="Category">
          <Select value={selectedCategory} onValueChange={(value: GameCategory) => setSelectedCategory(value)}>
            <SelectTrigger className="w-full" data-testid="select-category">
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent>
              {GAME_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionGroup>

        <OptionGroup label="Choose a Story">
          <div className="space-y-2">
            {stories.map((template, index) => {
              const allStories = getAvailableStories(selectedCategory);
              const actualIndex = allStories.findIndex(t => t.title === template.title);
              
              return (
                <button
                  key={index}
                  onClick={() => startNewGame(selectedCategory, actualIndex)}
                  className="w-full p-3 text-left bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  data-testid={`button-story-${index}`}
                >
                  <div className="font-medium text-sm text-gray-900">{template.title}</div>
                  <div className="text-xs text-gray-500">{template.prompts.length} words to fill</div>
                </button>
              );
            })}
          </div>
        </OptionGroup>
      </GameSetupLayout>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col">
      <GameHeader title="Mad Libs"  />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        {/* Compact Status */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {gameState.category.charAt(0).toUpperCase() + gameState.category.slice(1)}
              </Badge>
              <span className="text-xs font-semibold truncate max-w-32">{currentTemplate?.title}</span>
              {gameState.completed && <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">Done! 🎉</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={resetGame} className="text-xs px-1 py-0 h-6">
              New
            </Button>
          </div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-purple-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!gameState.completed ? (
          /* Compact Input */
          <div className="flex-1 bg-white rounded-lg shadow-sm p-3 flex flex-col justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                Enter a {currentPrompt ? formatPrompt(currentPrompt) : 'word'}:
              </h3>
              
              <div className="mb-4">
                <Input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`${currentPrompt ? formatPrompt(currentPrompt).toLowerCase() : 'word'}...`}
                  className="text-center text-base"
                  autoFocus
                />
              </div>
              
              <Button 
                onClick={handleAnswerSubmit}
                disabled={!currentAnswer.trim()}
                className="w-full mb-4"
              >
                {gameState.currentPromptIndex === (currentTemplate?.prompts.length || 0) - 1 ? 'Finish Story!' : 'Next Word'}
              </Button>
              
              <p className="text-xs text-gray-600">
                Word {gameState.currentPromptIndex + 1} of {currentTemplate?.prompts.length}
              </p>
            </div>
          </div>
        ) : (
          /* Compact Story Display */
          <div className="flex-1 bg-white rounded-lg shadow-sm p-2 overflow-y-auto">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold mb-1">{currentTemplate?.title}</h3>
              <p className="text-xs text-gray-600">Your completed story!</p>
            </div>
            
            <div className="bg-yellow-50 border-l-2 border-yellow-400 p-2 rounded-r text-xs leading-relaxed overflow-y-auto max-h-96">
              {renderStory()}
            </div>
            
            <div className="text-center mt-2">
              <Button onClick={resetGame} className="w-full" size="sm">
                Create Another Story
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}