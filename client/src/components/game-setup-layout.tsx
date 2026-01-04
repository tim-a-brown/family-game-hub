import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameSetupLayoutProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  onStart: () => void;
  startLabel?: string;
  startDisabled?: boolean;
}

export function GameSetupLayout({
  title,
  icon,
  children,
  onStart,
  startLabel = "Start Game",
  startDisabled = false
}: GameSetupLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            data-testid="back-button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          {icon && (
            <img src={icon} alt="" className="w-8 h-8 rounded-lg object-cover" />
          )}
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {children}
          
          <Button 
            onClick={onStart} 
            disabled={startDisabled}
            className="w-full h-12 text-base font-medium rounded-xl"
            data-testid="start-game-button"
          >
            {startLabel}
          </Button>
        </div>
      </main>
    </div>
  );
}

interface OptionGroupProps {
  label: string;
  children: React.ReactNode;
}

export function OptionGroup({ label, children }: OptionGroupProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-500 mb-3">{label}</label>
      {children}
    </div>
  );
}

interface OptionButtonsProps {
  options: (string | number)[];
  selected: string | number;
  onSelect: (value: string | number) => void;
  columns?: 3 | 4 | 5;
}

export function OptionButtons({ options, selected, onSelect, columns = 3 }: OptionButtonsProps) {
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };
  
  return (
    <div className={`grid ${gridCols[columns]} gap-2`}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
            selected === opt
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid={`option-${opt}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
