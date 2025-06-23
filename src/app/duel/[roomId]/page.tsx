"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Pusher from 'pusher-js';
import { CHANNELS, EVENTS } from "~/lib/constants";
import { createPusherClient } from "~/lib/pusher-client";
import { api } from "~/trpc/react";
import { Toast } from "~/components/Toast";
import Navigation from "../../_components/Navigation";

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

interface Room {
  id: string;
  text: string;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "DELETED";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  players: Player[];
  performances: Performance[];
  createdBy: string;
}

const DuelRoomPage = ({ params }: { params: Promise<{ roomId: string }> }) => {
  const { roomId } = use(params);
  const router = useRouter();
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newGameRequested, setNewGameRequested] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState(60);
  const startTimeRef = useRef<Date | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const roomQuery = api.rooms.get.useQuery(
    { roomId: roomId ?? "" },
    { enabled: !!roomId }
  );

  const room = roomQuery.data?.room;

  const currentPlayer = players.find((p: Player) => p.id === playerId);
  const wpm = currentPlayer?.wpm ?? 0;
  const accuracy = currentPlayer?.accuracy ?? 100;
  const progress = currentPlayer?.progress ?? 0;
  const text = room?.text ?? "";

  const updateProgressMutation = api.rooms.updateProgress.useMutation();
  const completeGameMutation = api.rooms.completeGame.useMutation();
  const startGameMutation = api.rooms.start.useMutation();
  const newGameMutation = api.rooms.newGame.useMutation();
  const leaveRoomMutation = api.rooms.leave.useMutation();

  const calculateTimeLeft = () => {
    if (!startTimeRef.current) return timeLimit;
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    return Math.max(0, timeLimit - elapsedSeconds);
  };

  const handleGameEnd = useCallback(async () => {
    setIsTyping(false);
    setShowResults(true);
    setShowCompletionModal(true);
    
    if (roomId) {
      const finalWpm = calculateWPM(input, startTime);
      const finalAccuracy = calculateAccuracy(input, text);

      await completeGameMutation.mutateAsync({
        roomId,
        playerId,
        wpm: finalWpm,
        accuracy: finalAccuracy,
      });
    }
  }, [roomId, input, startTime, text, playerId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTyping && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        const remainingTime = calculateTimeLeft();
        setTimeLeft(remainingTime);
        
        const currentWpm = calculateWPM(input, startTime);
        if (currentPlayer) {
          currentPlayer.wpm = currentWpm;
        }

        if (remainingTime === 0) {
          void handleGameEnd();
        }
      }, 100); 
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTyping, input, startTime, currentPlayer, handleGameEnd]);

  useEffect(() => {
    if (room?.status === "IN_PROGRESS" && !countdown) {
      startTimeRef.current = new Date();
      setTimeLeft(timeLimit);
    }
  }, [room?.status, timeLimit, countdown, startTimeRef]);

  useEffect(() => {
    if (timeLeft === 0) {
      void handleGameEnd();
    }
  }, [timeLeft, handleGameEnd]);

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

    const handlePlayerLeft = (data: { 
      playerId: string; 
      roomStatus: string; 
      isAdmin: boolean; 
      message: string;
      shouldRedirect: boolean;
    }) => {
      if (data.roomStatus === "COMPLETED") {
        setShowResults(true);
        setIsTyping(false);
      }
      if (data.shouldRedirect) {
        router.push('/duel');
      }
      void roomQuery.refetch();
    };

    const handleCountdownStart = () => {
      console.log('Countdown started');
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            startTimeRef.current = new Date();
            setTimeLeft(timeLimit);
            setStartTime(new Date());
            setIsTyping(true); 
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };
  
    const handleGameStart = () => {
      console.log('Game started');
      void roomQuery.refetch();   
      setInput("");
      setIsTyping(true);
      setShowResults(false);
      
      setPlayers(prev => prev.map(player => ({
        ...player,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        completed: false
      })));

      setPerformances([]);
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
            updated[playerIndex] = {
              ...currentPlayer,
              progress: data.progress,
              wpm: data.wpm,
              accuracy: data.accuracy,
            };
          }
        }
        return updated;
      });
    };

    const handleGameComplete = () => {
      void roomQuery.refetch();
      setShowResults(true);
      setShowCompletionModal(true);
    };

    const handleNewGameCreated = (data: { newRoomId: string }) => {
      router.push(`/duel/${data.newRoomId}`);
    };

    channel.bind(EVENTS.PLAYER_JOINED, handlePlayerJoined);
    channel.bind(EVENTS.PLAYER_LEFT, handlePlayerLeft);
    channel.bind(EVENTS.COUNTDOWN_START, handleCountdownStart);
    channel.bind(EVENTS.GAME_START, handleGameStart);
    channel.bind(EVENTS.TYPING_UPDATE, handleTypingUpdate);
    channel.bind(EVENTS.GAME_COMPLETE, handleGameComplete);
    channel.bind(EVENTS.NEW_GAME_CREATED, handleNewGameCreated);

    return () => {
      channel.unbind(EVENTS.PLAYER_JOINED, handlePlayerJoined);
      channel.unbind(EVENTS.PLAYER_LEFT, handlePlayerLeft);
      channel.unbind(EVENTS.COUNTDOWN_START, handleCountdownStart);
      channel.unbind(EVENTS.GAME_START, handleGameStart);
      channel.unbind(EVENTS.TYPING_UPDATE, handleTypingUpdate);
      channel.unbind(EVENTS.GAME_COMPLETE, handleGameComplete);
      channel.unbind(EVENTS.NEW_GAME_CREATED, handleNewGameCreated);
      pusher.unsubscribe(CHANNELS.ROOM(roomId));
    };
  }, [pusher, roomId, roomQuery, router]);

  useEffect(() => {
    const storedId = localStorage.getItem('playerId');
    const storedName = localStorage.getItem('playerName');
    
    if (storedId) {
      setPlayerId(storedId);
    } else {
      router.push('/duel');
    }

    if (storedName) {
      setPlayerName(storedName);
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    if (value.length > text.length) {
      return;
    }

    if (value.length < input.length) {
      setInput(value);
      updateProgress(value);
      return;
    }

    const words = text.split(" ");
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

    setInput(value);
    updateProgress(value);
  };

  const updateProgress = (value: string) => {
    if (!isTyping) {
      setIsTyping(true);
      setStartTime(new Date());
    }

    if (roomId && currentPlayer) {
      const progress = (value.length / text.length) * 100;
      const currentWpm = calculateWPM(value, startTime);
      const currentAccuracy = calculateAccuracy(value, text);

      void updateProgressMutation.mutateAsync({
        roomId,
        playerId,
        progress,
        wpm: currentWpm,
        accuracy: currentAccuracy,
      });
    }

    if (value === text) {
      void handleGameEnd();
    }
  };

  const calculateWPM = (value: string, start: Date | null) => {
    if (!start) return 0;
    const now = new Date();
    const timeElapsed = (now.getTime() - start.getTime()) / 1000 / 60;
    const words = value.length / 5;
    return Math.round(words / timeElapsed);
  };

  const calculateAccuracy = (value: string, target: string) => {
    const correctChars = value.split("").filter((char, i) => char === target[i]).length;
    return value.length > 0 ? (correctChars / value.length) * 100 : 100;
  };

  const handleNewGame = async () => {
    if (!roomId || !playerId) return;
    setNewGameRequested(true);
    await newGameMutation.mutateAsync({
      roomId,
      playerId,
    });
  };

  const handleLeaveRoom = async () => {
    if (roomId) {
      try {
        await leaveRoomMutation.mutateAsync({
          roomId,
          playerId,
        });
        router.push('/duel');
      } catch (error) {
        console.error("Failed to leave room:", error);
      }
    }
  };

  const handleStartGame = async () => {
    if (roomId) {
      try {
        await startGameMutation.mutateAsync({
          roomId,
          playerId,
        });
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
          setShowErrorModal(true);
        }
      }
    }
  };

  useEffect(() => {
    if (room?.players) {
      setPlayers(room.players);
    }
  }, [room?.players]);

  const handleRestart = () => {
    setTimeLeft(timeLimit);
    setStartTime(null);
    setIsTyping(false);
    setInput("");
  };

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading room...</div>
        </div>
      </div>
    );
  }

  if (room.status === "WAITING") {
    console.log("AAAAAAAAAAAAAAA",countdown)
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <div className="flex justify-center items-center flex-1 bg-gray-50 ">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-2xl font-bold">1v1 Race</div>
                <div className="text-gray-500">Waiting for opponent to join...</div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 mb-1">Room Code</span>
                <span className="font-mono font-bold bg-gray-100 px-3 py-1 rounded text-blue-600 text-lg select-all">{roomId}</span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-lg mb-6 min-h-[70px] font-mono">
              {text}
            </div>
            <textarea
              value={input}
              disabled
              className="w-full rounded border p-4 mb-6 min-h-[80px] resize-none bg-gray-100 text-gray-400"
              placeholder="Waiting for opponent to join..."
            />
            <div className="flex gap-4 mt-4">
              {room.createdBy === playerId && (
                <button
                  onClick={handleStartGame}
                  className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 font-semibold text-lg"
                >
                  Start Game
                </button>
              )}
              <button
                onClick={handleLeaveRoom}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 font-semibold text-lg"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="bg-red-600 rounded-t-2xl px-6 py-4 text-white text-center">
                <div className="text-xl font-bold">Cannot Start Game</div>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-4">
                <div className="text-center text-gray-700">
                  <p className="mb-2">{errorMessage}</p>
                  <p className="text-sm text-gray-500">Please wait for another player to join the room.</p>
                </div>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
          {countdown !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50">
              <div className="text-8xl font-bold text-white animate-bounce">
                {countdown}
              </div>
            </div>
          )}
      </div>
    );
  }

  if (room.status === "IN_PROGRESS") {
    const self = players.find((p) => p.id === playerId);
    const opponent = players.find((p) => p.id !== playerId);
    const selfPerf = performances.find((p) => p.playerId === playerId);
    const oppPerf = opponent ? performances.find((p) => p.playerId === opponent.id) : undefined;

    return (
      <div className="flex justify-center items-center min-h-[90vh] bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl relative">
          {countdown !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50">
              <div className="text-8xl font-bold text-white animate-bounce">
                {countdown}
              </div>
            </div>
          )}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-2xl font-bold">1v1 Race</div>
              <div className="text-gray-500">Improve your typing speed and accuracy</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-blue-500 text-2xl font-bold">{timeLeft ?? timeLimit}</span>
              <span className="text-xs text-gray-400">seconds</span>
              <button
                onClick={handleRestart}
                className="mt-1 text-gray-400 hover:text-blue-500 transition"
                title="Restart"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-blue-50 rounded-xl p-4 flex flex-col items-center">
              <div className="font-semibold mb-2">You</div>
              <div className="flex justify-between w-full text-center">
                <div className="flex-1">
                  <div className="text-blue-600 text-xl font-bold">{selfPerf?.wpm ?? 0}</div>
                  <div className="text-xs text-gray-500">WPM</div>
                </div>
                <div className="flex-1">
                  <div className="text-blue-600 text-xl font-bold">{selfPerf ? Math.round(selfPerf.accuracy) : 100}%</div>
                  <div className="text-xs text-gray-500">Accuracy</div>
                </div>
                <div className="flex-1">
                  <div className="text-blue-600 text-xl font-bold">{self ? Math.round(self.progress) : 0}%</div>
                  <div className="text-xs text-gray-500">Progress</div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-4 flex flex-col items-center">
              <div className="font-semibold mb-2">Opponent</div>
              <div className="flex justify-between w-full text-center">
                <div className="flex-1">
                  <div className="text-red-600 text-xl font-bold">{oppPerf?.wpm ?? 0}</div>
                  <div className="text-xs text-gray-500">WPM</div>
                </div>
                <div className="flex-1">
                  <div className="text-red-600 text-xl font-bold">{oppPerf ? Math.round(oppPerf.accuracy) : 100}%</div>
                  <div className="text-xs text-gray-500">Accuracy</div>
                </div>
                <div className="flex-1">
                  <div className="text-red-600 text-xl font-bold">{opponent ? Math.round(opponent.progress) : 0}%</div>
                  <div className="text-xs text-gray-500">Progress</div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-lg mb-6 min-h-[70px]">
            <span className="font-mono">
              {text.split("").map((char, i) => (
                <span
                  key={i}
                  className={
                    i < input.length
                      ? input[i] === char
                        ? "text-blue-600"
                        : "text-red-500"
                      : "text-gray-700"
                  }
                >
                  {char}
                </span>
              ))}
            </span>
          </div>
          <textarea
            value={input}
            onChange={handleInputChange}
            disabled={showResults}
            className="w-full rounded border p-4 mb-6 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Start typing here..."
          />
        </div>
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="bg-blue-600 rounded-t-2xl px-6 py-4 text-white text-center">
                <div className="text-xl font-bold">Race Complete!</div>
                <div className="text-sm">Here's how you performed</div>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-4">
                <div className="flex w-full justify-between text-center mb-2">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-blue-700">{selfPerf?.wpm ?? 0}</div>
                    <div className="text-xs text-gray-500">WPM</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-600">{selfPerf ? Math.round(selfPerf.accuracy) : 100}%</div>
                    <div className="text-xs text-gray-500">Accuracy</div>
                  </div>
                </div>
                <div className="flex w-full justify-between text-center mb-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-800">{input.length}</div>
                    <div className="text-xs text-gray-500">Characters</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-800">
                      {(() => {
                        let errors = 0;
                        for (let i = 0; i < input.length; i++) {
                          if (input[i] !== text[i]) errors++;
                        }
                        return errors;
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">Errors</div>
                  </div>
                </div>
                <div className="w-full mt-2">
                  <div className="text-xs text-gray-500 mb-1">Race Position</div>
                  <div className="rounded-lg overflow-hidden">
                    <div className={`flex items-center px-3 py-2 ${(selfPerf?.wpm ?? 0) >= (oppPerf?.wpm ?? 0) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <span className="w-6 text-center font-bold text-green-600">1</span>
                      <span className="flex-1 font-medium">You</span>
                      <span className="font-bold text-blue-700">{selfPerf?.wpm ?? 0} WPM</span>
                    </div>
                    <div className={`flex items-center px-3 py-2 ${(selfPerf?.wpm ?? 0) < (oppPerf?.wpm ?? 0) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <span className="w-6 text-center font-bold text-gray-400">2</span>
                      <span className="flex-1 font-medium">Opponent</span>
                      <span className="font-bold text-gray-700">{oppPerf?.wpm ?? 0} WPM</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNewGame}
                  disabled={newGameRequested}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg transition disabled:bg-gray-400"
                >
                  {newGameRequested ? "Waiting for opponent..." : "New Race"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (room.status === "COMPLETED") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <div className="flex justify-center items-center flex-1">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
            <div className="text-2xl font-bold mb-4">Game Completed!</div>
            <div className="space-y-4">
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center">
                  <span>{player.name}</span>
                  <span>WPM: {player.wpm} | Accuracy: {player.accuracy}%</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleNewGame}
                disabled={newGameRequested}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {newGameRequested ? "Waiting for opponent..." : "New Game"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DuelRoomPage; 