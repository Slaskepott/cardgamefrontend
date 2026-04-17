import { apiBaseUrl } from "./config";
import type {
  ActionResponse,
  BuyUpgradeResponse,
  CreateGameResponse,
  DiscardResponse,
  JoinGameResponse,
  LeaveGameResponse,
  LobbiesResponse,
  MetaProgressResponse,
  PlayHandResponse,
  PlayersResponse,
  Card,
} from "../types/game";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return data;
}

export function createGame(gameId: string) {
  return requestJson<CreateGameResponse>(`/game/create/${gameId}`, {
    method: "POST",
  });
}

export function joinGame(gameId: string, playerId: string, email?: string | null) {
  const searchParams = new URLSearchParams({
    player_id: playerId,
  });
  if (email) {
    searchParams.set("email", email);
  }
  return requestJson<JoinGameResponse>(
    `/game/join/${gameId}?${searchParams.toString()}`,
    {
      method: "POST",
    },
  );
}

export function getPlayers(gameId: string) {
  return requestJson<PlayersResponse>(`/game/${gameId}/players`);
}

export function listLobbies() {
  return requestJson<LobbiesResponse>("/games");
}

export async function getSlaskecoins(email: string) {
  const response = await fetch(
    `${apiBaseUrl}/slaskecoins/${encodeURIComponent(email)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch slaskecoins (${response.status})`);
  }

  return (await response.json()) as number;
}

export function getMetaProgress(email: string) {
  return requestJson<MetaProgressResponse>(`/meta/${encodeURIComponent(email)}`);
}

export function unlockTalent(email: string, talentId: string) {
  return requestJson<MetaProgressResponse>(
    `/meta/${encodeURIComponent(email)}/talents/${encodeURIComponent(talentId)}`,
    {
      method: "POST",
    },
  );
}

export function discardCards(gameId: string, playerId: string, cards: Card[]) {
  return requestJson<DiscardResponse>(`/game/${gameId}/discard`, {
    method: "POST",
    body: JSON.stringify({
      player_id: playerId,
      cards,
    }),
  });
}

export function playHand(gameId: string, playerId: string, cards: Card[]) {
  return requestJson<PlayHandResponse>(`/game/${gameId}/play_hand`, {
    method: "POST",
    body: JSON.stringify({
      player_id: playerId,
      cards,
    }),
  });
}

export function endTurn(gameId: string, playerId: string) {
  return requestJson<ActionResponse>(
    `/game/${gameId}/end_turn?player_id=${encodeURIComponent(playerId)}`,
    {
      method: "POST",
    },
  );
}

export function buyUpgrade(gameId: string, playerId: string, upgradeId: number) {
  return requestJson<BuyUpgradeResponse>(
    `/game/${gameId}/${playerId}/buyupgrade/${upgradeId}`,
    {
      method: "POST",
    },
  );
}

export function leaveGame(gameId: string, playerId: string) {
  return requestJson<LeaveGameResponse>(
    `/game/${gameId}/leave?player_id=${encodeURIComponent(playerId)}`,
    {
      method: "POST",
    },
  );
}
