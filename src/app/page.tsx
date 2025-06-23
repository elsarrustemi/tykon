"use client";
import { useEffect, useState } from "react";
import { PageContainer } from "~/components/layout/PageContainer";
import { GameModeCard } from "~/components/game/GameModeCard";

function usePlayerId() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem("playerId");
    if (!id) {
      id = `player_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("playerId", id);
    }
    setPlayerId(id);
  }, []);
  return playerId;
}

export default function HomePage() {
  const playerId = usePlayerId();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    fetch("/api/trpc/rooms.getStats", {
      headers: {
        "x-player-id": playerId,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        setStats(json.result?.data);
        setLoading(false);
      });
  }, [playerId]);

  const raceModeStats = [
    {
      label: "Online Players",
      value: loading ? "-" : stats?.onlinePlayers ?? 0,
      color: "green-600",
    },
    {
      label: "Active Races",
      value: loading ? "-" : stats?.activeRaces ?? 0,
      color: "blue-600",
    },
  ];

  const practiceModeStats = [
    {
      label: "Your Best WPM",
      value: loading ? "-" : stats?.bestWpm ? Math.round(stats.bestWpm) : 0,
      color: "green-600",
    },
    {
      label: "Recent Average",
      value: loading ? "-" : stats?.recentAverage ? Math.round(stats.recentAverage) : 0,
      color: "blue-600",
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-10">
        <h2 className="text-3xl font-bold mb-8">Choose Your Game Mode</h2>
        
        <div className="flex flex-col md:flex-row gap-8">
          <GameModeCard
            title="1v1 Race"
            description="Challenge a friend or random player to a typing race. Show off your speed and accuracy!"
            icon="fa-solid fa-users"
            iconColor="blue-500"
            stats={raceModeStats}
            buttonText="Start 1v1 Race"
            buttonHref="/duel"
            buttonColor="blue"
          />

          <GameModeCard
            title="Practice Mode"
            description="Improve your typing skills at your own pace. Choose from different difficulty levels and text categories."
            icon="fa-solid fa-dumbbell"
            iconColor="green-500"
            stats={practiceModeStats}
            buttonText="Start Practice"
            buttonHref="/practice"
            buttonColor="green"
          />
        </div>
      </div>
    </PageContainer>
  );
}
