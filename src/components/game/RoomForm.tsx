import { useState } from "react";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";

interface RoomFormProps {
  onCreateRoom: (playerName: string) => Promise<void>;
  onJoinRoom: (roomId: string, playerName: string) => Promise<void>;
  creatingRoom: boolean;
  joiningRoom: boolean;
  joinError?: string | null;
}

export function RoomForm({
  onCreateRoom,
  onJoinRoom,
  creatingRoom,
  joiningRoom,
  joinError,
}: RoomFormProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    await onCreateRoom(playerName);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    await onJoinRoom(roomCode, playerName);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {showJoinForm ? "Join a Race" : "Create a Race"}
          </h2>
          <p className="text-gray-600">
            {showJoinForm
              ? "Enter the room code to join an existing race"
              : "Start a new typing race and invite friends"}
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            required
          />

          {showJoinForm && (
            <Input
              label="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
              error={joinError || undefined}
              required
            />
          )}

          <div className="space-y-3">
            {showJoinForm ? (
              <Button
                onClick={handleJoinRoom}
                loading={joiningRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full"
              >
                Join Race
              </Button>
            ) : (
              <Button
                onClick={handleCreateRoom}
                loading={creatingRoom}
                disabled={!playerName.trim()}
                className="w-full"
              >
                Create Race
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="w-full"
            >
              {showJoinForm ? "Create New Race" : "Join Existing Race"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 