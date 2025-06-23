"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "~/components/layout/PageContainer";
import { RoomForm } from "~/components/game/RoomForm";
import { DuelGame } from "~/components/game/DuelGame";
import { usePlayer } from "~/hooks/usePlayer";
import { api } from "~/trpc/react";

export default function DuelPage() {
  const router = useRouter();
  const { player, loading: playerLoading } = usePlayer();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isRoomCreator, setIsRoomCreator] = useState(false);

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

  const handleCreateRoom = async (playerName: string) => {
    if (!player?.id) return;
    
    setCreatingRoom(true);
    setJoinError(null);
    
    try {
      await createRoomMutation.mutateAsync({
        playerId: player.id,
        playerName,
      });
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomId: string, playerName: string) => {
    if (!player?.id) return;
    
    setJoiningRoom(true);
    setJoinError(null);
    
    try {
      await joinRoomMutation.mutateAsync({
        roomId,
        playerId: player.id,
        playerName,
      });
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId || !player?.id) return;
    
    try {
      await leaveRoomMutation.mutateAsync({
        roomId,
        playerId: player.id,
      });
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  if (playerLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (roomId && player) {
    return (
      <PageContainer showFooter={false}>
        <DuelGame
          roomId={roomId}
          playerId={player.id}
          playerName={player.name}
          isRoomCreator={isRoomCreator}
          onLeaveRoom={handleLeaveRoom}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex justify-center items-center min-h-[80vh] py-10">
        <RoomForm
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          creatingRoom={creatingRoom}
          joiningRoom={joiningRoom}
          joinError={joinError}
        />
      </div>
    </PageContainer>
  );
}