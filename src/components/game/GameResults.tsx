import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";

interface Player {
  id: string;
  name: string;
  wpm: number;
  accuracy: number;
  completed: boolean;
}

interface GameResultsProps {
  players: Player[];
  currentPlayerId: string;
  onNewGame: () => void;
  onLeaveRoom: () => void;
  className?: string;
}

export function GameResults({
  players,
  currentPlayerId,
  onNewGame,
  onLeaveRoom,
  className = "",
}: GameResultsProps) {
  // Sort players by WPM (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.wpm - a.wpm);
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isWinner = sortedPlayers[0]?.id === currentPlayerId;

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Race Complete!</h2>
          {isWinner && (
            <div className="text-2xl font-bold text-yellow-600 mb-2">
              🏆 You Won! 🏆
            </div>
          )}
          <p className="text-gray-600">
            {isWinner 
              ? "Congratulations! You had the fastest typing speed."
              : "Great effort! Here are the final results."
            }
          </p>
        </div>

        {/* Results Table */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Final Results</h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? "bg-yellow-500" : 
                      index === 1 ? "bg-gray-400" : 
                      index === 2 ? "bg-orange-500" : "bg-gray-300"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {player.name}
                        {player.id === currentPlayerId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.completed ? "Completed" : "Did not finish"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(player.wpm)} WPM
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(player.accuracy)}% accuracy
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={onNewGame} className="flex-1">
            New Race
          </Button>
          <Button variant="outline" onClick={onLeaveRoom} className="flex-1">
            Leave Room
          </Button>
        </div>
      </Card>
    </div>
  );
} 