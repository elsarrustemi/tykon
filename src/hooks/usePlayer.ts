import { useState, useEffect } from "react";

interface Player {
  id: string;
  name: string;
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem("playerId");
    const storedName = localStorage.getItem("playerName");
    
    let playerId = storedId;
    if (!playerId) {
      playerId = `player_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("playerId", playerId);
    }

    setPlayer({
      id: playerId,
      name: storedName || "",
    });
    setLoading(false);
  }, []);

  const updatePlayerName = (name: string) => {
    localStorage.setItem("playerName", name);
    setPlayer(prev => prev ? { ...prev, name } : null);
  };

  return {
    player,
    loading,
    updatePlayerName,
  };
} 