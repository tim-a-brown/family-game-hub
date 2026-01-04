import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { GameSetupLayout, OptionGroup } from "@/components/game-setup-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { RIDDLE_TEMPLATES, type RiddleTemplate } from "@/lib/game-data";
import { useToast } from "@/hooks/use-toast";
import riddleIcon from "@assets/generated_images/riddle_stories_game_tile_icon.png";

interface GameState {
  templateIndex: number;
  currentPromptIndex: number;
  answers: Record<string, string>;
  completed: boolean;
}

export default function RiddleStories() {
  const [gameState, setGameState] = useState<GameState>({
    templateIndex: 0,
    currentPromptIndex: 0,
    answers: {},
    completed: false
  });

  const [setupMode, setSetupMode] = useState(true);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const { toast } = useToast();
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('riddle-stories');
    if (saved && typeof saved.templateIndex === 'number') {
      setGameState(saved);
      setSetupMode(false);
    }
  }, []);

  const getRandomRiddles = () => {
    const shuffled = [...RIDDLE_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  };

  const currentTemplate: RiddleTemplate | null = RIDDLE_TEMPLATES[gameState.templateIndex] || null;
  const currentPrompt = currentTemplate?.prompts[gameState.currentPromptIndex];
  const progress = currentTemplate ? (Object.keys(gameState.answers).length / currentTemplate.prompts.length) * 100 : 0;

  const formatPrompt = (prompt: string) => {
    return prompt
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/\d+$/, match => ` ${match}`);
  };

  const startNewGame = (index: number) => {
    const newState = {
      templateIndex: index,
      currentPromptIndex: 0,
      answers: {},
      completed: false
    };
    setGameState(newState);
    setSetupMode(false);
    setAnswerRevealed(false);
    gameStorage.saveGameState('riddle-stories', newState);
  };

  const startRandomGame = () => {
    const randomIndex = Math.floor(Math.random() * RIDDLE_TEMPLATES.length);
    startNewGame(randomIndex);
  };

  const handleAnswerSubmit = () => {
    if (!currentAnswer.trim() || !currentPrompt) return;

    const newAnswers = { ...gameState.answers, [currentPrompt]: currentAnswer.trim() };
    const isComplete = Object.keys(newAnswers).length === currentTemplate?.prompts.length;
    
    const newState = {
      ...gameState,
      answers: newAnswers,
      currentPromptIndex: isComplete ? gameState.currentPromptIndex : gameState.currentPromptIndex + 1,
      completed: isComplete
    };
    
    setGameState(newState);
    setCurrentAnswer('');
    gameStorage.saveGameState('riddle-stories', newState);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit();
    }
  };

  const resetGame = () => {
    setSetupMode(true);
    setGameState({
      templateIndex: 0,
      currentPromptIndex: 0,
      answers: {},
      completed: false
    });
    setCurrentAnswer('');
    setAnswerRevealed(false);
  };

  const renderStory = () => {
    if (!currentTemplate) return null;
    
    let story = currentTemplate.template;
    
    currentTemplate.prompts.forEach(prompt => {
      const answer = gameState.answers[prompt];
      if (answer) {
        story = story.replace(`{${prompt}}`, `<span class="font-bold text-blue-600">${answer}</span>`);
      }
    });
    
    const sentences = story.split(/([.!?])/);
    const paragraphs: string[] = [];
    let currentParagraph = '';
    
    sentences.forEach((sentence, index) => {
      currentParagraph += sentence;
      if (sentence === '.' || sentence === '!' || sentence === '?') {
        if (index % 4 === 3) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      }
    });
    
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }
    
    return (
      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p 
            key={index} 
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: paragraph }}
          />
        ))}
      </div>
    );
  };

  if (setupMode) {
    const riddles = getRandomRiddles();
    
    return (
      <GameSetupLayout 
        title="Riddle Stories" 
        icon={riddleIcon} 
        onStart={startRandomGame}
        startLabel="🎲 Random Riddle"
      >
        <OptionGroup label="How to Play">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-700 text-center">
              🧩 Fill in the blanks to create a silly riddle, then try to guess the hidden answer!
            </p>
          </div>
        </OptionGroup>

        <OptionGroup label="Choose a Riddle">
          <div className="space-y-2">
            {riddles.map((template, index) => {
              const actualIndex = RIDDLE_TEMPLATES.findIndex(t => t.title === template.title);
              
              return (
                <button
                  key={index}
                  onClick={() => startNewGame(actualIndex)}
                  className="w-full p-3 text-left bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  data-testid={`button-riddle-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-gray-900">{template.title}</div>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">🤔</Badge>
                  </div>
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
    <div className="h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex flex-col">
      <GameHeader title="Riddle Stories" />
      
      <div className="flex-1 flex flex-col p-2 max-w-sm mx-auto w-full">
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs px-1 py-0 bg-purple-100 text-purple-700">
                Riddle
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
                  data-testid="input-answer"
                />
              </div>
              
              <Button 
                onClick={handleAnswerSubmit}
                disabled={!currentAnswer.trim()}
                className="w-full mb-4"
                data-testid="button-submit"
              >
                {gameState.currentPromptIndex === (currentTemplate?.prompts.length || 0) - 1 ? 'Finish Riddle!' : 'Next Word'}
              </Button>
              
              <p className="text-xs text-gray-600">
                Word {gameState.currentPromptIndex + 1} of {currentTemplate?.prompts.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg shadow-sm p-2 overflow-y-auto">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold mb-1">{currentTemplate?.title}</h3>
              <p className="text-xs text-gray-600">Can you guess the answer?</p>
            </div>
            
            <div className="bg-yellow-50 border-l-2 border-yellow-400 p-2 rounded-r text-sm leading-relaxed overflow-y-auto max-h-48">
              {renderStory()}
            </div>
            
            <div className="mt-3 text-center">
              {!answerRevealed ? (
                <Button 
                  onClick={() => setAnswerRevealed(true)} 
                  variant="outline"
                  className="w-full bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700"
                  size="sm"
                  data-testid="button-reveal-answer"
                >
                  🤔 Reveal the Answer!
                </Button>
              ) : (
                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 animate-in fade-in duration-500">
                  <p className="text-xs text-green-600 font-medium mb-1">The answer is...</p>
                  <p className="text-xl font-bold text-green-800" data-testid="text-riddle-answer">
                    {currentTemplate?.answer}
                  </p>
                </div>
              )}
            </div>
            
            <div className="text-center mt-3">
              <Button onClick={resetGame} className="w-full" size="sm" data-testid="button-new-riddle">
                Try Another Riddle
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
