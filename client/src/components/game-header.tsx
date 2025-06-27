import { ArrowLeft, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface GameHeaderProps {
  title: string;
  onSave?: () => void;
  onSettings?: () => void;
  showSave?: boolean;
  showSettings?: boolean;
}

export function GameHeader({ title, onSave, onSettings, showSave = true, showSettings = false }: GameHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    // Auto-save before navigating away
    if (onSave) {
      onSave();
    }
    setLocation("/");
  };

  return (
    <header className="bg-white shadow-lg border-b-4 border-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hover:bg-primary hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">{title[0]}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {showSave && onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
            {showSettings && onSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSettings}
                className="hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
