"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Pusher from 'pusher-js';
import { CHANNELS, EVENTS } from "~/lib/constants";
import { createPusherClient } from "~/lib/pusher-client";
import { api } from "~/trpc/react";
import { Toast } from "~/components/Toast";
import Link from "next/link";
import Navigation from "../_components/Navigation";

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

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

const DuelRoom = () => {
  console.log('DuelRoom component rendering');
  const router = useRouter();
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newGameRequested, setNewGameRequested] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Query to get room data
  const roomQuery = api.rooms.get.useQuery(
    { roomId: roomId ?? "" },
    { enabled: !!roomId }
  );

  const room = roomQuery.data?.room;

  const calculateTimeLeft = () => {
    if (!startTimeRef.current) return timeLimit;
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    return Math.max(0, timeLimit - elapsedSeconds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  // Calculate current player's stats
  const currentPlayer = players.find((p) => p.id === playerId);
  const wpm = currentPlayer?.wpm ?? 0;
  const accuracy = currentPlayer?.accuracy ?? 100;
  const progress = currentPlayer?.progress ?? 0;
  const text = room?.text ?? "";

  // Mutations
  const createRoomMutation = api.rooms.create.useMutation({
    onSuccess: (data) => {
      setCreatedRoomCode(data.roomId);
      setRoomId(data.roomId);
      setIsRoomCreator(true);
    },
    onError: (error) => {
      setJoinError(error.message);
    },
  });

  const joinRoomMutation = api.rooms.join.useMutation({
    onSuccess: (data) => {
      setRoomId(data.room.id);
      setIsRoomCreator(false);
    },
    onError: (error) => {
      setJoinError(error.message);
    },
  });

  const leaveRoomMutation = api.rooms.leave.useMutation({
    onSuccess: () => {
      setRoomId(null);
      setCreatedRoomCode(null);
    },
    onError: (error) => {
      console.error("Failed to leave room:", error);
    },
  });

  const updateProgressMutation = api.rooms.updateProgress.useMutation();
  const completeGameMutation = api.rooms.completeGame.useMutation();
  const startGameMutation = api.rooms.start.useMutation();

  // Add new game mutation
  const newGameMutation = api.rooms.newGame.useMutation({
    onSuccess: (data) => {
      if (data.newRoomId) {
        router.push(`/duel/${data.newRoomId}`);
      }
    },
  });

  // Add timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (room?.status === "IN_PROGRESS" && startTimeRef.current) {
      timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [room?.status, timeLimit]);

  // Reset timer when game starts
  useEffect(() => {
    if (room?.status === "IN_PROGRESS") {
      startTimeRef.current = new Date();
      setTimeLeft(timeLimit);
      setTotalMistakes(0);
      setTotalKeystrokes(0);
    }
  }, [room?.status, timeLimit]);

  // Handle game end when time runs out
  useEffect(() => {
    if (timeLeft === 0) {
      void handleGameEnd();
    }
  }, [timeLeft]);

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

      console.log(data, "data");
      console.log(isRoomCreator, "isRoomCreator")
      if (isRoomCreator) {
        void roomQuery.refetch();
      }

      // Show notification only to non-admin players when admin leaves
      if (!isRoomCreator) {
        setToast({ message: data.message, type: 'error' });
      }
      if (data.roomStatus === "COMPLETED") {
        setShowResults(true);
        setIsTyping(false);
      } else if (data.roomStatus === "DELETED") {
        setRoomId(null);
        setCreatedRoomCode(null);
        setInput("");
        setIsTyping(false);
        setShowResults(false);
        setStartTime(null);
      }
    };

    const handleGameStart = () => {
      void roomQuery.refetch();
    };

    const handleTypingUpdate = (data: {
      playerId: string;
      progress: number;
      wpm: number;
      accuracy: number;
      performance: Performance;
    }) => {
      // Update performances state with the new performance data
      setPerformances(prev => {
        const existingIndex = prev.findIndex(p => p.id === data.performance.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data.performance;
          return updated;
        }
        return [...prev, data.performance];
      });

      // Update local player state immediately
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
  }, [pusher, roomId, roomQuery, router]);

  // Initialize player ID and name from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('playerId');
    const storedName = localStorage.getItem('playerName');
    let newId = '';

    if (storedId) {
      setPlayerId(storedId);
    } else {
      newId = `player_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('playerId', newId);
      setPlayerId(newId);
    }

    if (storedName) {
      setPlayerName(storedName);
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setPlayerName(newName);
    localStorage.setItem('playerName', newName);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
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

    // Check for new mistakes
    if (value.length > input.length) {
      const newChar = value[value.length - 1];
      const correctChar = text[value.length - 1];
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

    // Calculate progress based on characters typed
    const progress = Math.min((value.length / text.length) * 100, 100);
    const currentWpm = calculateWPM(value);
    const currentAccuracy = calculateAccuracy(value, text);

    // Update local state immediately for smooth UI
    if (roomId && currentPlayer) {
      currentPlayer.progress = progress;
      currentPlayer.wpm = currentWpm;
      currentPlayer.accuracy = currentAccuracy;

      // Send update to server immediately
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

  // Load saved input when joining a room
  useEffect(() => {
    if (roomId && playerId) {
      const savedInput = localStorage.getItem(`input_${roomId}_${playerId}`);
      if (savedInput) {
        setInput(savedInput);
        // If there's saved input, we should also update the typing state
        if (savedInput.length > 0) {
          setIsTyping(true);
          setStartTime(new Date());
        }
      }
    }
  }, [roomId, playerId]);

  const calculateWPM = (value: string) => {
    if (!startTimeRef.current) return 0;
    const now = new Date();
    const timeElapsed = (now.getTime() - startTimeRef.current.getTime()) / 1000 / 60; // in minutes
    const words = value.split(" ").length - 1;
    return Math.round(words / timeElapsed);
  };

  const calculateAccuracy = (value: string, target: string) => {
    return totalKeystrokes > 0 
      ? Math.max(0, ((totalKeystrokes - totalMistakes) / totalKeystrokes) * 100)
      : 100;
  };

  const handleGameEnd = async () => {
    setIsTyping(false);
    setShowResults(true);

    if (roomId) {
      const finalWpm = calculateWPM(input);
      const finalAccuracy = calculateAccuracy(input, text);

      await completeGameMutation.mutateAsync({
        roomId,
        playerId,
        wpm: finalWpm,
        accuracy: finalAccuracy,
      });
    }
  };

  const handleRestart = () => {
    setInput("");
    setIsTyping(false);
    setShowResults(false);
    setStartTime(null);
    // Clear saved input from localStorage
    if (roomId) {
      localStorage.removeItem(`input_${roomId}_${playerId}`);
    }
  };

  const handleCreateRoom = async () => {
    setCreatingRoom(true);
    setJoinError(null);
    try {
      const result = await createRoomMutation.mutateAsync({
        playerId,
        playerName,
      });
      router.push(`/duel/${result.roomId}`);
    } catch (error) {
      // Error is handled in the mutation
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput || !playerId || !playerName) return;
    try {
      await joinRoomMutation.mutateAsync({
        roomId: roomCodeInput,
        playerId,
        playerName,
      });
      router.push(`/duel/${roomCodeInput}`);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setShowErrorModal(true);
      }
    }
  };

  const handleLeaveRoom = async () => {
    if (roomId) {
      // Clear saved input from localStorage
      localStorage.removeItem(`input_${roomId}_${playerId}`);
      try {
        await leaveRoomMutation.mutateAsync({
          roomId,
          playerId,
        });
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
        console.error("Failed to start game:", error);
      }
    }
  };

  // Update players when room data changes
  useEffect(() => {
    if (room?.players) {
      setPlayers(room.players);
    }
  }, [room?.players]);

  // Add new game handler
  const handleNewGame = async () => {
    if (!roomId || !playerId) return;
    setNewGameRequested(true);
    await newGameMutation.mutateAsync({
      roomId,
      playerId,
    });
  };

  console.log('showResults', showResults);

  // Debug log for timer
  console.log('timeLeft', timeLeft, 'room?.status', room?.status);

  if (showResults) {
    // Calculate stats
    const self = players.find((p) => p.id === playerId);
    const opponent = players.find((p) => p.id !== playerId);
    const selfPerf = performances.find((p) => p.playerId === playerId);
    const oppPerf = opponent ? performances.find((p) => p.playerId === opponent.id) : undefined;
    const selfWpm = selfPerf?.wpm ?? 0;
    const selfAcc = selfPerf ? Math.round(selfPerf.accuracy) : 100;
    const selfChars = input.length;
    const selfErrors = (() => {
      if (!selfPerf) return 0;
      let errors = 0;
      for (let i = 0; i < input.length; i++) {
        if (input[i] !== text[i]) errors++;
      }
      return errors;
    })();
    const oppWpm = oppPerf?.wpm ?? 0;
    // Determine winner
    const winnerIsSelf = selfWpm >= oppWpm;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div className="bg-blue-600 rounded-t-2xl px-6 py-4 text-white text-center">
            <div className="text-xl font-bold">Race Complete!</div>
            <div className="text-sm">Here's how you performed</div>
          </div>
          <div className="px-6 py-6 flex flex-col items-center gap-4">
            <div className="flex w-full justify-between text-center mb-2">
              <div className="flex-1">
                <div className="text-2xl font-bold text-blue-700">{selfWpm}</div>
                <div className="text-xs text-gray-500">WPM</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-600">{selfAcc}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
            </div>
            <div className="flex w-full justify-between text-center mb-2">
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800">{selfChars}</div>
                <div className="text-xs text-gray-500">Characters</div>
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800">{selfErrors}</div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
            </div>
            <div className="w-full mt-2">
              <div className="text-xs text-gray-500 mb-1">Race Position</div>
              <div className="rounded-lg overflow-hidden">
                <div className={`flex items-center px-3 py-2 ${winnerIsSelf ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <span className="w-6 text-center font-bold text-green-600">1</span>
                  <img src="/avatar.png" alt="You" className="w-7 h-7 rounded-full border-2 border-blue-500 mx-2" />
                  <span className="flex-1 font-medium">You</span>
                  <span className="font-bold text-blue-700">{selfWpm} WPM</span>
                </div>
                <div className={`flex items-center px-3 py-2 ${!winnerIsSelf ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <span className="w-6 text-center font-bold text-gray-400">2</span>
                  <img src="/avatar2.png" alt="Opponent" className="w-7 h-7 rounded-full border-2 border-gray-400 mx-2" />
                  <span className="flex-1 font-medium">Opponent</span>
                  <span className="font-bold text-gray-700">{oppWpm} WPM</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg transition"
            >
              <i className="fa-solid fa-rotate-right"></i> New Race
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl mx-auto bg-transparent">
            {/* Left: Icon, Title, Description */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg p-8">
              <div className="flex flex-col items-center mb-6">
                <div className="bg-blue-100 rounded-full p-6 mb-4">
                  <i className="fa-solid fa-handshake text-5xl text-blue-500"></i>
                </div>
                <div className="text-2xl font-bold mb-2">1v1 Duel</div>
                <div className="text-gray-600 text-center max-w-xs">
                  Challenge a player in a private duel. You can create your own room and invite, or join an existing one!
                </div>
              </div>
            </div>
            {/* Right: Tabbed Form */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg p-8">
              <div className="flex border-b mb-6 w-full">
                <button
                  className={`flex-1 text-lg font-semibold pb-2 border-b-2 transition-colors ${showCreateForm ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                  onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }}
                >
                  Create Room
                </button>
                <button
                  className={`flex-1 text-lg font-semibold pb-2 border-b-2 transition-colors ${showJoinForm ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                  onClick={() => { setShowJoinForm(true); setShowCreateForm(false); }}
                >
                  Join Room
                </button>
              </div>
              {/* Create Room Form */}
              {showCreateForm && (
                <form className="w-full flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleCreateRoom(); }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={handleNameChange}
                      className="w-full rounded border p-3 text-lg"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
                    <select 
                      className="w-full rounded border p-3 text-lg"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                    >
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg mt-2 transition"
                    disabled={creatingRoom || !playerName.trim()}
                  >
                    <i className="fa-solid fa-plus"></i> Create Room
                  </button>
                </form>
              )}
              {/* Join Room Form */}
              {showJoinForm && (
                <form className="w-full flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleJoinRoom(); }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={handleNameChange}
                      className="w-full rounded border p-3 text-lg"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={e => setRoomCodeInput(e.target.value)}
                      className="w-full rounded border p-3 text-lg"
                      placeholder="ABCDE"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg mt-2 transition"
                    disabled={joiningRoom || !roomCodeInput || !playerName.trim()}
                  >
                    <i className="fa-solid fa-right-to-bracket"></i> Join Room
                  </button>
                  <div className="text-center text-sm text-gray-500 mt-2">
                    Don't have a code? <button type="button" className="text-blue-600 underline" onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }}>Create a room</button>
                  </div>
                </form>
              )}
              {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                    <div className="bg-red-600 rounded-t-2xl px-6 py-4 text-white text-center">
                      <div className="text-xl font-bold">Cannot Join Room</div>
                    </div>
                    <div className="px-6 py-6 flex flex-col items-center gap-4">
                      <div className="text-center text-gray-700">
                        <p className="mb-2">{errorMessage}</p>
                        <p className="text-sm text-gray-500">
                          {errorMessage === "Room is full"
                            ? "This room already has 2 players. Please try another room."
                            : "Please check the room code and try again."}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowErrorModal(false);
                          setErrorMessage(null);
                        }}
                        className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-400 text-sm flex items-center justify-center gap-2 mt-6">
            <i className="fa-solid fa-lock"></i>
            Private & secure: Only players with the room code can join.
          </div>
          {/* Show timer for debug */}
          <div className="mt-4 text-lg text-blue-600">Timer: {timeLeft ?? timeLimit}</div>
        </main>
      </div>
    );
  }

  if (room?.status === "WAITING") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <div className="flex justify-center items-center flex-1">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl relative">
            {/* Header and Room Code */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-2xl font-bold">1v1 Race</div>
                <div className="text-gray-500">Waiting for opponent to join...</div>
              </div>
              {createdRoomCode && (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-400 mb-1">Room Code</span>
                  <span className="font-mono font-bold bg-gray-100 px-3 py-1 rounded text-blue-600 text-lg select-all">{createdRoomCode}</span>
                </div>
              )}
            </div>
            {/* Text to type */}
            <div className="rounded-lg bg-gray-50 p-4 text-lg mb-6 min-h-[70px] font-mono">
              {text}
            </div>
            {/* Disabled typing area */}
            <textarea
              value={input}
              disabled
              className="w-full rounded border p-4 mb-6 min-h-[80px] resize-none bg-gray-100 text-gray-400"
              placeholder="Waiting for opponent to join..."
            />
            {/* Buttons */}
            <div className="flex gap-4 mt-4">
              {isRoomCreator && (
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
            {/* Show timer for debug */}
            <div className="mt-4 text-lg text-blue-600">Timer: {timeLeft ?? timeLimit}</div>
          </div>
        </div>
      </div>
    );
  }

  if (room?.status === "IN_PROGRESS") {
    // Find self and opponent
    const self = players.find((p) => p.id === playerId);
    const opponent = players.find((p) => p.id !== playerId);
    const selfPerf = performances.find((p) => p.playerId === playerId);
    const oppPerf = opponent ? performances.find((p) => p.playerId === opponent.id) : undefined;

    return (
      <div className="flex justify-center items-center min-h-[90vh] bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl relative">
          {/* Header and Timer */}
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
          {/* Player Cards */}
          <div className="flex gap-4 mb-6">
            {/* You */}
            <div className="flex-1 bg-blue-50 rounded-xl p-4 flex flex-col items-center">
              <img src="/avatar.png" alt="You" className="w-10 h-10 rounded-full border-2 border-blue-500 mb-2" />
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
            {/* Opponent */}
            <div className="flex-1 bg-red-50 rounded-xl p-4 flex flex-col items-center">
              <img src="/avatar2.png" alt="Opponent" className="w-10 h-10 rounded-full border-2 border-red-500 mb-2" />
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
          {/* Text to type */}
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
          {/* Typing area */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={showResults}
            className="w-full h-32 p-4 text-lg font-mono bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start typing..."
          />
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg py-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-800">{selfPerf?.wpm ?? 0}</span>
              <span className="text-gray-500 mt-1">WPM</span>
            </div>
            <div className="bg-gray-50 rounded-lg py-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-800">{selfPerf ? Math.round(selfPerf.accuracy) : 100}%</span>
              <span className="text-gray-500 mt-1">Accuracy</span>
            </div>
            <div className="bg-gray-50 rounded-lg py-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-800">{self ? Math.round(self.progress) : 0}%</span>
              <span className="text-gray-500 mt-1">Progress</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (room?.status === "COMPLETED") {
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
            {/* Show timer for debug */}
            <div className="mt-4 text-lg text-blue-600">Timer: {timeLeft ?? timeLimit}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="mb-4 flex justify-between">
        <div className="text-2xl font-bold">Duel Room</div>
        {showResults && (
          <div className="space-x-4">
            <span>WPM: {wpm}</span>
            <span>Accuracy: {accuracy.toFixed(1)}%</span>
            {room?.status === "COMPLETED" && (
              <span className="text-red-500">Game Terminated - Opponent Left</span>
            )}
          </div>
        )}
      </div>

      {/* Opponents Progress */}
      <div className="mb-4 space-y-4">
        {players.map((player: Player) => {
          const playerPerformance = performances.find(p => p.playerId === player.id);
          return (
            <div key={player.id} className="rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${player.id === playerId ? 'text-blue-600' : 'text-gray-700'}`}>
                    {player.name} {player.id === playerId && '(You)'}
                  </span>
                  {player.completed && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                      Completed
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {showResults ? (
                    <>
                      <span className="text-sm text-gray-600">WPM: {playerPerformance?.wpm ?? player.wpm}</span>
                      <span className="text-sm text-gray-600">Accuracy: {(playerPerformance?.accuracy ?? player.accuracy).toFixed(1)}%</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600">{player.progress.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${player.id === playerId ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${player.progress}%` }}
                />
                {player.completed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">✓</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 rounded-lg bg-gray-100 p-4 text-lg">
        <div className="mb-2 font-mono">
          {text.split("").map((char: string, i: number) => (
            <span
              key={i}
              className={`${i < input.length
                  ? input[i] === char
                    ? "text-green-500"
                    : "text-red-500"
                  : "text-gray-700"
                }`}
            >
              {char}
            </span>
          ))}
        </div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={showResults}
          className="w-full h-32 p-4 text-lg font-mono bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start typing..."
          autoFocus
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleRestart}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          {showResults ? "New Game" : "Restart"}
        </button>
        <button
          onClick={handleLeaveRoom}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Leave Room
        </button>
      </div>

    </div>
  );
};

export default DuelRoom;