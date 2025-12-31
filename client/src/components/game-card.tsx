import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Play, Zap } from "lucide-react";
import { useLocation } from "wouter";

interface GameCardProps {
  title: string;
  description: string;
  playerInfo: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  progress?: number;
  isActive?: boolean;
  backgroundGraphic?: React.ReactNode;
}

export function GameCard({ title, description, playerInfo, icon, color, route, progress, isActive, backgroundGraphic }: GameCardProps) {
  const [, setLocation] = useLocation();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    setLocation(route);
  };

  return (
    <Card 
      className={`
        rounded-3xl overflow-hidden cursor-pointer border-0
        transform transition-all duration-200 ease-out
        ${isPressed ? 'scale-95' : 'hover:scale-105 active:scale-95'}
        shadow-playful hover:shadow-playful-lg
        focus:outline-none focus:ring-4 focus:ring-purple-300
      `}
      onClick={handleClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      data-testid={`game-card-${route.replace('/', '')}`}
    >
      <div className={`aspect-square ${color} relative overflow-hidden`}>
        {backgroundGraphic && (
          <div className="absolute top-0 right-0 opacity-15 transform rotate-12 translate-x-4 -translate-y-4">
            {backgroundGraphic}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform transition-all duration-200 hover:scale-110">
            {icon}
          </div>
        </div>
        
        {isActive && (
          <div className="absolute top-2 right-2">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-pulse-ring"></div>
              <div className="relative bg-white text-xs font-bold px-2 py-1 rounded-full text-purple-600 shadow-lg flex items-center gap-1">
                {progress !== undefined ? (
                  <span>{progress}%</span>
                ) : (
                  <Zap className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
        )}
        
        {isActive && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="bg-black/20 rounded-full h-1.5 backdrop-blur-sm overflow-hidden">
              <div 
                className="bg-white rounded-full h-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white">
        <h3 className="font-display font-bold text-sm text-purple-900 leading-tight">
          {title}
        </h3>
        <p className="text-purple-600/70 text-xs mt-0.5 line-clamp-1">{description}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center text-xs text-purple-500">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
            <span className="font-medium">{playerInfo}</span>
          </div>
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-md transform hover:scale-110 transition-transform">
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
