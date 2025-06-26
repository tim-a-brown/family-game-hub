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
}

export function GameCard({ title, description, playerInfo, icon, color, route, progress, isActive }: GameCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(route);
  };

  return (
    <Card 
      className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary"
      onClick={handleClick}
    >
      <div className={`aspect-w-16 aspect-h-9 ${color} relative`}>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
        {isActive && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="bg-white bg-opacity-20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <span>{playerInfo}</span>
          </div>
          <div className={`w-8 h-8 ${color.replace('bg-gradient-to-br', 'bg-opacity-20 bg')} rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors`}>
            <Play className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Card>
  );
}
