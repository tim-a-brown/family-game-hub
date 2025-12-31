import { Card } from "@/components/ui/card";
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

export function GameCard({ title, description, playerInfo, icon, color, route, progress, isActive }: GameCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card 
      className="rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-all active:scale-95"
      onClick={() => setLocation(route)}
      data-testid={`game-card-${route.replace('/', '')}`}
    >
      <div className="aspect-square flex flex-col items-center justify-center gap-2 p-4 relative">
        {isActive && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500"></div>
        )}
        <div className="text-3xl">{icon}</div>
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
    </Card>
  );
}
