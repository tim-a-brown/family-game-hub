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
      className="rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary hover:border-opacity-50 backdrop-blur-sm"
      onClick={handleClick}
    >
      <div className={`aspect-w-16 aspect-h-9 ${color} relative overflow-hidden`}>
        {/* Unique Background Graphic */}
        {backgroundGraphic && (
          <div className="absolute top-0 right-0 opacity-15 transform rotate-45 translate-x-8 -translate-y-8">
            {backgroundGraphic}
          </div>
        )}
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
        </div>
        
        {/* Icon Container */}
        <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <div className="transform transition-all duration-300 group-hover:animate-pulse">
            {icon}
          </div>
        </div>
        
        {/* Active Game Badge */}
        {isActive && (
          <div className="absolute top-3 right-3">
            <div className="bg-white bg-opacity-90 text-green-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
              ACTIVE
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {isActive && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="bg-black bg-opacity-20 rounded-full h-2 backdrop-blur-sm">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500 shadow-sm" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-white/95 backdrop-blur-sm">
        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors duration-200">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="font-medium">{playerInfo}</span>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-purple-600 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
            <Play className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </Card>
  );
}
