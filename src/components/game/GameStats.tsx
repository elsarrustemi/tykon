interface GameStatsProps {
  wpm: number;
  accuracy: number;
  progress: number;
  timeLeft?: number;
  errors?: number;
  className?: string;
}

export function GameStats({ 
  wpm, 
  accuracy, 
  progress, 
  timeLeft, 
  errors = 0, 
  className = "" 
}: GameStatsProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{Math.round(wpm)}</div>
        <div className="text-sm text-gray-500">WPM</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{Math.round(accuracy)}%</div>
        <div className="text-sm text-gray-500">Accuracy</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{Math.round(progress)}%</div>
        <div className="text-sm text-gray-500">Progress</div>
      </div>
      
      {timeLeft !== undefined ? (
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{timeLeft}s</div>
          <div className="text-sm text-gray-500">Time Left</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{errors}</div>
          <div className="text-sm text-gray-500">Errors</div>
        </div>
      )}
    </div>
  );
} 