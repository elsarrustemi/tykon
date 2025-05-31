"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navigation from "./_components/Navigation";

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
    // Fetch stats from TRPC endpoint with custom header
    fetch("/api/trpc/rooms.getStats", {
      headers: {
        "x-player-id": playerId,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        // TRPC returns { result: { data: ... } }
        setStats(json.result?.data);
        setLoading(false);
      });
  }, [playerId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-10">
        <h2 className="text-3xl font-bold mb-8">Choose Your Game Mode</h2>
        <div className="flex flex-col md:flex-row gap-8">
          {/* 1v1 Race Card */}
          <div className="bg-white rounded-xl shadow-md p-8 w-96 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">1v1 Race</span>
              <span className="text-blue-500 text-2xl"><i className="fa-solid fa-users"></i></span>
            </div>
            <p className="text-gray-600">Challenge a friend or random player to a typing race. Show off your speed and accuracy!</p>
            <div className="bg-gray-100 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between text-gray-700">
                <span>Online Players</span>
                <span className="font-semibold text-green-600">{loading ? "-" : stats?.onlinePlayers ?? 0}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Active Races</span>
                <span className="font-semibold text-blue-600">{loading ? "-" : stats?.activeRaces ?? 0}</span>
              </div>
            </div>
            <Link href="/duel">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Start 1v1 Race</button>
            </Link>
          </div>

          {/* Practice Mode Card */}
          <div className="bg-white rounded-xl shadow-md p-8 w-96 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">Practice Mode</span>
              <span className="text-green-500 text-2xl"><i className="fa-solid fa-dumbbell"></i></span>
            </div>
            <p className="text-gray-600">Improve your typing skills at your own pace. Choose from different difficulty levels and text categories.</p>
            <div className="bg-gray-100 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between text-gray-700">
                <span>Your Best WPM</span>
                <span className="font-semibold text-green-600">{loading ? "-" : stats?.bestWpm ? Math.round(stats.bestWpm) : 0}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Recent Average</span>
                <span className="font-semibold text-blue-600">{loading ? "-" : stats?.recentAverage ? Math.round(stats.recentAverage) : 0}</span>
              </div>
            </div>
            <Link href="/practice">
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition">Start Practice</button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-4 px-4 gap-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <i className="fa-solid fa-keyboard"></i>
            Tykon
          </div>
          <div className="flex gap-4 text-gray-500 text-xl">
            <a href="#"><i className="fa-brands fa-twitter"></i></a>
            <a href="#"><i className="fa-brands fa-discord"></i></a>
            <a href="#"><i className="fa-brands fa-github"></i></a>
          </div>
          <div className="text-gray-400 text-sm">© 2023 SpeedType. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
