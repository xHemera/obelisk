"use client";

import { useState, useEffect, useRef } from "react";
import { socket } from "@/socket";
import { useRouter } from "next/navigation";
import { handleLogout } from "@/lib/logout";
import { emitGlobalError } from "@/lib/error-events";
import type { GameStatePayload } from "./types";

type UseGameSocketReturn = {
  gameState: GameStatePayload | null;
  playerId: number | null;
  socketConnected: boolean;
};

export function useGameSocket(
  userPseudo: string,
  opponent: string,
): UseGameSocketReturn {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect socket and listen for game state updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      setSocketConnected(false);
    };

    const handleConnectError = () => {};

    const handleGameState = (state: GameStatePayload) => {
      setPlayerId(state.playerId);
      setGameState(state);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("gameStateUpdate", handleGameState);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("gameStateUpdate", handleGameState);
    };
  }, []);

  // Emit login — wait for socket to connect before emitting
  useEffect(() => {
    if (!userPseudo) return;

    if (socket.connected) {
      socket.emit("login", userPseudo);
    } else {
      const onConnect = () => {
        socket.emit("login", userPseudo);
      };
      socket.on("connect", onConnect);
      return () => {
        socket.off("connect", onConnect);
      };
    }
  }, [userPseudo]);

  // Ban and disconnect listeners
  useEffect(() => {
    if (!userPseudo) return;

    const handleBan = async (banned: string) => {
      if (banned === userPseudo) {
        try {
          await handleLogout(router);
        } catch {
          emitGlobalError("Vous avez été banni");
          router.push("/");
        }
      }
    };

    const handleOpponentDisconnect = (users: Record<string, string>) => {
      if (!users[opponent]) {
        disconnectTimerRef.current = setTimeout(() => {
          socket.once("online_users", (users) => {
            if (users[opponent]) return;
            socket.off("ban", handleBan);
            socket.off("online_users", handleOpponentDisconnect);
            router.push("/home");
          });
        }, 3000);
      }
    };

    socket.off("online_users", handleOpponentDisconnect);
    socket.on("ban", handleBan);
    socket.once("online_users", handleOpponentDisconnect);

    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      socket.off("ban", handleBan);
      socket.off("online_users", handleOpponentDisconnect);
    };
  }, [userPseudo, opponent, router]);

  return { gameState, playerId, socketConnected };
}
