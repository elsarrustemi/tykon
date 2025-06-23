interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  className?: string;
}

export function PlayerList({ players, currentPlayerId, className = "" }: PlayerListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Players</h3>
      {players.map((player) => (
        <div
          key={player.id}
          className={`p-3 rounded-lg border ${
            player.id === currentPlayerId
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {player.name.charAt(0).toUpperCase()}
                </span>
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
                  {player.completed ? "Completed" : "In Progress"}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {Math.round(player.wpm)} WPM
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(player.accuracy)}% accuracy
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${player.progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(player.progress)}% complete
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 