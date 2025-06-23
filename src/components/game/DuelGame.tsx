"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Pusher from 'pusher-js';
import { CHANNELS, EVENTS } from "~/lib/constants";
import { createPusherClient } from "~/lib/pusher-client";
import { api } from "~/trpc/react";
import { Toast } from "~/components/Toast";
import { TypingArea } from "./TypingArea";
import { GameStats } from "./GameStats";
import { PlayerList } from "./PlayerList";
import { GameResults } from "./GameResults";
import { Button } from "~/components/ui/Button";
import { useTypingStats } from "~/hooks/useTypingStats";

interface Room {
  id: string;
  text: string;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "DELETED";
  players: Player[];
  performances: Performance[];
  createdBy: string;
}

interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
}

interface Performance {
  id: string;
  playerId: string;
  roomId: string;
  wpm: number;
  accuracy: number;
  completed: boolean;
  createdAt: Date;
  player: Player;
}

interface DuelGameProps {
  roomId: string;
  playerId: string;
  playerName: string;
  isRoomCreator: boolean;
  onLeaveRoom: () => void;
}

export function DuelGame({
  roomId,
  playerId,
  playerName,
  isRoomCreator,
  onLeaveRoom,
}: DuelGameProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { calculateWPM, calculateAccuracy, calculateProgress } = useTypingStats();

  const roomQuery = api.rooms.get.useQuery(
    { roomId },
    { enabled: !!roomId }
  );

  const room = roomQuery.data?.room;

  const updateProgressMutation = api.rooms.updateProgress.useMutation();
  const completeGameMutation = api.rooms.completeGame.useMutation();
  const startGameMutation = api.rooms.start.useMutation();
  const newGameMutation = api.rooms.newGame.useMutation();

  useEffect(() => {
    let pusherClient: Pusher | null = null;

    try {
      pusherClient = createPusherClient();
      setPusher(pusherClient);
    } catch (error) {
      console.error("Failed to initialize Pusher client:", error);
    }

    return () => {
      if (pusherClient) {
        pusherClient.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!pusher || !roomId) return;

    const channel = pusher.subscribe(CHANNELS.ROOM(roomId));

    const handlePlayerJoined = () => {
      void roomQuery.refetch();
    };

    const handlePlayerLeft = (data: { playerId: string; roomStatus: string; isAdmin: boolean; message: string }) => {
      if (isRoomCreator) {
        void roomQuery.refetch();
      }

      if (!isRoomCreator) {
        setToast({ message: data.message, type: 'error' });
      }
      
      if (data.roomStatus === "COMPLETED") {
        setShowResults(true);
        setIsTyping(false);
      } else if (data.roomStatus === "DELETED") {
        onLeaveRoom();
      }
    };

    const handleGameStart = () => {
      void roomQuery.refetch();
      startTimeRef.current = new Date();
      setTimeLeft(timeLimit);
      setTotalMistakes(0);
      setTotalKeystrokes(0);
    };

    const handleTypingUpdate = (data: {
      playerId: string;
      progress: number;
      wpm: number;
      accuracy: number;
      performance: Performance;
    }) => {
      setPerformances(prev => {
        const existingIndex = prev.findIndex(p => p.id === data.performance.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data.performance;
          return updated;
        }
        return [...prev, data.performance];
      });

      setPlayers(prev => {
        const updated = [...prev];
        const playerIndex = updated.findIndex(p => p.id === data.playerId);
        if (playerIndex >= 0) {
          const currentPlayer = updated[playerIndex];
          if (currentPlayer) {
            const updatedPlayer: Player = {
              id: currentPlayer.id,
              name: currentPlayer.name,
              progress: data.progress,
              wpm: data.wpm,
              accuracy: data.accuracy,
              completed: currentPlayer.completed
            };
            updated[playerIndex] = updatedPlayer;
          }
        }
        return updated;
      });
    };

    const handleGameComplete = () => {
      void roomQuery.refetch();
      setShowResults(true);
    };

    const handleNewGameCreated = (data: { newRoomId: string }) => {
      router.push(`/duel/${data.newRoomId}`);
    };

    channel.bind(EVENTS.PLAYER_JOINED, handlePlayerJoined);
    channel.bind(EVENTS.PLAYER_LEFT, handlePlayerLeft);
    channel.bind(EVENTS.GAME_START, handleGameStart);
    channel.bind(EVENTS.TYPING_UPDATE, handleTypingUpdate);
    channel.bind(EVENTS.GAME_COMPLETE, handleGameComplete);
    channel.bind(EVENTS.NEW_GAME_CREATED, handleNewGameCreated);

    return () => {
      channel.unbind(EVENTS.PLAYER_JOINED, handlePlayerJoined);
      channel.unbind(EVENTS.PLAYER_LEFT, handlePlayerLeft);
      channel.unbind(EVENTS.GAME_START, handleGameStart);
      channel.unbind(EVENTS.TYPING_UPDATE, handleTypingUpdate);
      channel.unbind(EVENTS.GAME_COMPLETE, handleGameComplete);
      channel.unbind(EVENTS.NEW_GAME_CREATED, handleNewGameCreated);
      pusher.unsubscribe(CHANNELS.ROOM(roomId));
    };
  }, [pusher, roomId, roomQuery, router, isRoomCreator, timeLimit, onLeaveRoom]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (room?.status === "IN_PROGRESS" && startTimeRef.current) {
      timer = setInterval(() => {
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000);
        const remaining = Math.max(0, timeLimit - elapsedSeconds);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          void handleGameEnd();
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [room?.status, timeLimit]);

  useEffect(() => {
    if (room) {
      setPlayers(room.players);
      setPerformances(room.performances);
    }
  }, [room]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const words = room?.text.split(" ") || [];
    const typedWords = value.split(" ");
    const isAddingSpace = value.endsWith(" ");

    if (isAddingSpace) {
      const justCompletedWord = typedWords[typedWords.length - 2] ?? "";
      const correctWord = words[typedWords.length - 2] ?? "";
      if (justCompletedWord !== correctWord) {
        return;
      }
    }

    if (!isAddingSpace) {
      const currentWord = words[typedWords.length - 1] ?? "";
      const typedWord = typedWords[typedWords.length - 1] ?? "";
      if (typedWord.length > currentWord.length) {
        return;
      }
    }

    if (value.length > input.length) {
      const newChar = value[value.length - 1];
      const correctChar = room?.text[value.length - 1];
      if (newChar !== correctChar) {
        setTotalMistakes(prev => prev + 1);
      }
      setTotalKeystrokes(prev => prev + 1);
    }

    setInput(value);
    if (!isTyping) {
      setIsTyping(true);
      startTimeRef.current = new Date();
    }

    const progress = calculateProgress(value, room?.text || "");
    const currentWpm = calculateWPM(value, startTimeRef.current);
    const currentAccuracy = calculateAccuracy(value, room?.text || "");

    if (roomId) {
      setPlayers(prev => {
        const updated = [...prev];
        const playerIndex = updated.findIndex(p => p.id === playerId);
        if (playerIndex >= 0) {
          const currentPlayer = updated[playerIndex];
          if (currentPlayer) {
            const updatedPlayer: Player = {
              id: currentPlayer.id,
              name: currentPlayer.name,
              progress,
              wpm: currentWpm,
              accuracy: currentAccuracy,
              completed: currentPlayer.completed
            };
            updated[playerIndex] = updatedPlayer;
          }
        }
        return updated;
      });

      void updateProgressMutation.mutateAsync({
        roomId,
        playerId,
        progress,
        wpm: currentWpm,
        accuracy: currentAccuracy,
      });
    }

    if (value === room?.text) {
      void handleGameEnd();
    }
  };

  const handleGameEnd = async () => {
    setIsTyping(false);
    setShowResults(true);
    
    try {
      await completeGameMutation.mutateAsync({
        roomId,
        playerId,
        wpm: calculateWPM(input, startTimeRef.current),
        accuracy: calculateAccuracy(input, room?.text || ""),
      });
    } catch (error) {
      console.error("Failed to complete game:", error);
    }
  };

  const handleStartGame = async () => {
    try {
      await startGameMutation.mutateAsync({
        roomId,
        playerId,
      });
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  const handleNewGame = async () => {
    try {
      await newGameMutation.mutateAsync({
        roomId,
        playerId,
      });
    } catch (error) {
      console.error("Failed to create new game:", error);
    }
  };

  const currentPlayer = players.find((p) => p.id === playerId);
  const wpm = currentPlayer?.wpm ?? 0;
  const accuracy = currentPlayer?.accuracy ?? 100;
  const progress = currentPlayer?.progress ?? 0;
  const text = room?.text ?? "";

  if (showResults) {
    return (
      <GameResults
        players={players}
        currentPlayerId={playerId}
        onNewGame={handleNewGame}
        onLeaveRoom={onLeaveRoom}
      />
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[90vh] bg-gray-50 w-full">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-4xl relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-2xl font-bold">1v1 Race</div>
            <div className="text-gray-500">Room: {roomId}</div>
          </div>
          <div className="flex flex-col items-center">
            {timeLeft !== null && (
              <>
                <span className="text-blue-500 text-2xl font-bold">{timeLeft}</span>
                <span className="text-xs text-gray-400">seconds</span>
              </>
            )}
            {isRoomCreator && room?.status === "WAITING" && (
              <Button onClick={handleStartGame} className="mt-2">
                Start Game
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameStats
              wpm={wpm}
              accuracy={accuracy}
              progress={progress}
              timeLeft={timeLeft || undefined}
              errors={totalMistakes}
              className="mb-6"
            />
            
            <TypingArea
              text={text}
              input={input}
              disabled={room?.status !== "IN_PROGRESS"}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          </div>
                
          <div className="lg:col-span-1">
            <PlayerList
              players={players}
              currentPlayerId={playerId}
            />
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
} 