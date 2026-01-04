import { useState, useEffect } from "react";
import { GameHeader } from "@/components/game-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameStorage } from "@/lib/game-storage";
import { RIDDLE_STORIES, RIDDLE_CATEGORIES, type RiddleCategory, type RiddleStory } from "@/lib/game-data";
import riddleIcon from "@assets/generated_images/riddle_stories_game_tile_icon.png";

interface GameState {
  currentRiddleId: number;
  selectedCategory: RiddleCategory | 'all';
  revealedRiddles: number[];
}

export default function RiddleStories() {
  const [gameState, setGameState] = useState<GameState>({
    currentRiddleId: RIDDLE_STORIES[0]?.id || 1,
    selectedCategory: 'all',
    revealedRiddles: []
  });
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [setupMode, setSetupMode] = useState(true);
  const gameStorage = GameStorage.getInstance();

  useEffect(() => {
    const saved = gameStorage.loadGameState('riddle-stories');
    if (saved && typeof saved.currentRiddleId === 'number') {
      setGameState(saved);
    }
  }, []);

  const filteredRiddles = gameState.selectedCategory === 'all' 
    ? RIDDLE_STORIES 
    : RIDDLE_STORIES.filter(r => r.category === gameState.selectedCategory);

  const currentRiddle = RIDDLE_STORIES.find(r => r.id === gameState.currentRiddleId) || filteredRiddles[0];

  const selectCategory = (category: RiddleCategory | 'all') => {
    const riddles = category === 'all' ? RIDDLE_STORIES : RIDDLE_STORIES.filter(r => r.category === category);
    const newState = {
      ...gameState,
      selectedCategory: category,
      currentRiddleId: riddles[0]?.id || 1
    };
    setGameState(newState);
    setAnswerRevealed(false);
    gameStorage.saveGameState('riddle-stories', newState);
  };

  const selectRiddle = (riddle: RiddleStory) => {
    const newState = { ...gameState, currentRiddleId: riddle.id };
    setGameState(newState);
    setAnswerRevealed(false);
    setSetupMode(false);
    gameStorage.saveGameState('riddle-stories', newState);
  };

  const selectRandomRiddle = () => {
    const randomRiddle = filteredRiddles[Math.floor(Math.random() * filteredRiddles.length)];
    selectRiddle(randomRiddle);
  };

  const nextRiddle = () => {
    const currentIndex = filteredRiddles.findIndex(r => r.id === gameState.currentRiddleId);
    const nextIndex = (currentIndex + 1) % filteredRiddles.length;
    selectRiddle(filteredRiddles[nextIndex]);
  };

  const prevRiddle = () => {
    const currentIndex = filteredRiddles.findIndex(r => r.id === gameState.currentRiddleId);
    const prevIndex = currentIndex === 0 ? filteredRiddles.length - 1 : currentIndex - 1;
    selectRiddle(filteredRiddles[prevIndex]);
  };

  const revealAnswer = () => {
    setAnswerRevealed(true);
    if (!gameState.revealedRiddles.includes(gameState.currentRiddleId)) {
      const newState = {
        ...gameState,
        revealedRiddles: [...gameState.revealedRiddles, gameState.currentRiddleId]
      };
      setGameState(newState);
      gameStorage.saveGameState('riddle-stories', newState);
    }
  };

  const goToSetup = () => {
    setSetupMode(true);
    setAnswerRevealed(false);
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="bg-white shadow-sm">
          <div className="flex items-center px-3 py-2">
            <a href="/" className="text-gray-600 hover:text-gray-900 p-1" data-testid="link-back">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="flex items-center gap-2 ml-2">
              <img src={riddleIcon} alt="Riddle Stories" className="w-7 h-7 rounded-lg" />
              <h1 className="text-lg font-semibold text-gray-900">Riddle Stories</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto pb-24">
          <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
            <p className="text-xs text-gray-500 mb-2">How to Play</p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
              <p className="text-xs text-purple-700 text-center">
                Read a riddle, think about it, then tap to reveal the answer!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
            <p className="text-xs text-gray-500 mb-2">Category</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => selectCategory('all')}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  gameState.selectedCategory === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="button-category-all"
              >
                All ({RIDDLE_STORIES.length})
              </button>
              {RIDDLE_CATEGORIES.map((category) => {
                const count = RIDDLE_STORIES.filter(r => r.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => selectCategory(category)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      gameState.selectedCategory === category
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500">Choose a Riddle</p>
              <Badge variant="secondary" className="text-xs">
                {filteredRiddles.length} riddles
              </Badge>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredRiddles.map((riddle) => {
                const isRevealed = gameState.revealedRiddles.includes(riddle.id);
                return (
                  <button
                    key={riddle.id}
                    onClick={() => selectRiddle(riddle)}
                    className="w-full p-2 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    data-testid={`button-riddle-${riddle.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{riddle.title}</div>
                        <div className="text-xs text-gray-500">{riddle.category}</div>
                      </div>
                      {isRevealed && (
                        <Badge className="bg-green-100 text-green-700 text-xs ml-2 shrink-0">Done</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t">
          <Button
            onClick={selectRandomRiddle}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="button-random-riddle"
          >
            🎲 Random Riddle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex flex-col">
      <GameHeader title="Riddle Stories" />

      <div className="flex-1 flex flex-col p-3 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                {currentRiddle?.category}
              </Badge>
              <span className="text-sm font-semibold text-gray-900">{currentRiddle?.title}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={goToSetup} className="text-xs h-7 px-2">
              Browse
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Riddle {filteredRiddles.findIndex(r => r.id === gameState.currentRiddleId) + 1} of {filteredRiddles.length}</span>
            <span>{gameState.revealedRiddles.length} solved</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm p-4 mb-3">
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-4">
              <span className="text-4xl">🤔</span>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-base leading-relaxed text-gray-800" data-testid="text-riddle-question">
                {currentRiddle?.question}
              </p>
            </div>

            {!answerRevealed ? (
              <Button
                onClick={revealAnswer}
                className="w-full bg-purple-600 hover:bg-purple-700 py-3 text-base"
                data-testid="button-reveal-answer"
              >
                👀 Reveal Answer
              </Button>
            ) : (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <p className="text-xs text-green-600 font-medium mb-1 text-center">Answer:</p>
                <p className="text-lg font-semibold text-green-800 text-center" data-testid="text-riddle-answer">
                  {currentRiddle?.answer}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={prevRiddle}
            className="flex-1"
            data-testid="button-prev-riddle"
          >
            ← Previous
          </Button>
          <Button
            variant="outline"
            onClick={selectRandomRiddle}
            className="px-4"
            data-testid="button-shuffle-riddle"
          >
            🎲
          </Button>
          <Button
            variant="outline"
            onClick={nextRiddle}
            className="flex-1"
            data-testid="button-next-riddle"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
