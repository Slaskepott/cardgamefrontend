import { wsBaseUrl } from "./config";
import type { GameSocketMessage } from "../types/game";

interface SocketHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  onMessage?: (message: GameSocketMessage) => void;
}

export function connectToGameSocket(
  gameId: string,
  playerId: string,
  handlers: SocketHandlers,
) {
  const socket = new WebSocket(
    `${wsBaseUrl}/game/${encodeURIComponent(gameId)}/ws/${encodeURIComponent(playerId)}`,
  );

  socket.addEventListener("open", () => handlers.onOpen?.());
  socket.addEventListener("close", () => handlers.onClose?.());
  socket.addEventListener("error", (event) => handlers.onError?.(event));
  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data) as GameSocketMessage;
      handlers.onMessage?.(payload);
    } catch {
      handlers.onMessage?.({ raw: event.data });
    }
  });

  return socket;
}

