import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
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

  const handleClick = () => {
    setLocation(route);
  };

  return (
    <Card 
      className="rounded-2xl overflow-hidden cursor-pointer border-0 shadow-card hover:shadow-card-hover transform transition-all duration-200 animate-press focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
      onClick={handleClick}
      data-testid={`game-card-${route.replace('/', '')}`}
    >
      <div className={`aspect-video ${color} relative overflow-hidden`}>
        {backgroundGraphic && (
          <div className="absolute top-0 right-0 opacity-10 transform rotate-12 translate-x-4 -translate-y-4">
            {backgroundGraphic}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-white/10"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform transition-transform duration-200 hover:scale-110">
            {icon}
          </div>
        </div>
        
        {isActive && (
          <div className="absolute top-2 right-2">
            <div className="bg-white/95 text-xs font-bold px-2 py-1 rounded-full text-violet-600 shadow-sm">
              {progress !== undefined ? `${progress}%` : 'Active'}
            </div>
          </div>
        )}
        
        {isActive && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="bg-black/20 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-white rounded-full h-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white">
        <h3 className="font-bold text-sm text-slate-800 leading-tight">{title}</h3>
        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{description}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center text-xs text-slate-400">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></div>
            <span className="font-medium">{playerInfo}</span>
          </div>
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-md transform hover:scale-110 transition-transform">
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
