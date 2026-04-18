import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { User } from "firebase/auth";
import { makeCardKey } from "../components/GameBoard";
import {
  buyUpgrade,
  continueFromShop,
  createGame,
  discardCards,
  endTurn,
  getPlayers,
  joinGame,
  leaveGame,
  playHand,
} from "../lib/api";
import { generateLobbyId, generatePlayerName } from "../lib/nameGenerator";
import { connectToGameSocket } from "../lib/ws";
import type {
  ApplyUpgradesMessage,
  BattleMoment,
  Card,
  DiscardMoment,
  GameSocketMessage,
  HandPlayedMessage,
  HandUpdatedMessage,
  NewHandMessage,
  OpenStoreMessage,
  PlayersUpdatedMessage,
  ShopStatusMessage,
  Upgrade,
} from "../types/game";

type SelectedCard = Card & { key: string };
type DraftSetter = Dispatch<SetStateAction<string>>;

function formatSocketMessage(message: GameSocketMessage) {
  if ("type" in message && typeof message.type === "string") {
    return `socket:${message.type} ${JSON.stringify(message)}`;
  }

  if ("message" in message && typeof message.message === "string") {
    return `server:${message.message}`;
  }

  return JSON.stringify(message);
}

function isPlayersUpdatedMessage(
  message: GameSocketMessage,
): message is PlayersUpdatedMessage {
  return "type" in message && message.type === "players_updated";
}

function isNewHandMessage(message: GameSocketMessage): message is NewHandMessage {
  return "type" in message && message.type === "new_hand";
}

function isHandUpdatedMessage(
  message: GameSocketMessage,
): message is HandUpdatedMessage {
  return "type" in message && message.type === "hand_updated";
}

function isHandPlayedMessage(
  message: GameSocketMessage,
): message is HandPlayedMessage {
  return "type" in message && message.type === "hand_played";
}

function isOpenStoreMessage(
  message: GameSocketMessage,
): message is OpenStoreMessage {
  return "type" in message && message.type === "open_store";
}

function isApplyUpgradesMessage(
  message: GameSocketMessage,
): message is ApplyUpgradesMessage {
  return "type" in message && message.type === "apply_upgrades";
}

function isShopStatusMessage(
  message: GameSocketMessage,
): message is ShopStatusMessage {
  return "type" in message && message.type === "shop_status";
}

function clearWindowTimeout(timeoutRef: MutableRefObject<number | null>) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

export function useGameSession(currentUser: User | null) {
  const [busy, setBusy] = useState(false);
  const [draftGameId, setDraftGameId] = useState("");
  const [gameIdError, setGameIdError] = useState<string | null>(null);
  const [draftPlayerId, setDraftPlayerId] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({});
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [playerHealth, setPlayerHealth] = useState<Record<string, number>>({});
  const [playerMaxHealth, setPlayerMaxHealth] = useState<Record<string, number>>({});
  const [playerWins, setPlayerWins] = useState<Record<string, number>>({});
  const [remainingDiscards, setRemainingDiscards] = useState(1);
  const [playerGold, setPlayerGold] = useState(0);
  const [goldAttentionActive, setGoldAttentionActive] = useState(false);
  const [battleMoment, setBattleMoment] = useState<BattleMoment | null>(null);
  const [discardMoment, setDiscardMoment] = useState<DiscardMoment | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopUpgrades, setShopUpgrades] = useState<Upgrade[]>([]);
  const [shopWaitingPlayers, setShopWaitingPlayers] = useState<string[]>([]);
  const [ownedUpgrades, setOwnedUpgrades] = useState<Upgrade[]>([]);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [feedEntries, setFeedEntries] = useState<string[]>([
    "React migration shell is ready.",
  ]);

  const socketRef = useRef<WebSocket | null>(null);
  const goldAttentionTimeoutRef = useRef<number | null>(null);
  const battleMomentTimeoutRef = useRef<number | null>(null);
  const discardMomentTimeoutRef = useRef<number | null>(null);
  const shopOpenTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      clearWindowTimeout(goldAttentionTimeoutRef);
      clearWindowTimeout(battleMomentTimeoutRef);
      clearWindowTimeout(discardMomentTimeoutRef);
      clearWindowTimeout(shopOpenTimeoutRef);
    };
  }, []);

  function pushFeedEntry(entry: string) {
    setFeedEntries((current) => [
      `${new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })} ${entry}`,
      ...current,
    ].slice(0, 12));
  }

  function resolveLobbyDetails(preferredGameId?: string, preferredPlayerId?: string) {
    const normalizedGameId = (preferredGameId ?? draftGameId).trim() || generateLobbyId();
    const authPlayerName =
      currentUser?.displayName?.trim() || currentUser?.email?.split("@")[0] || "";
    const normalizedPlayerId =
      (authPlayerName || preferredPlayerId || draftPlayerId).trim() || generatePlayerName();

    setDraftGameId(normalizedGameId);
    setDraftPlayerId(normalizedPlayerId);
    return { normalizedGameId, normalizedPlayerId };
  }

  function buildBattleMoment(message: HandPlayedMessage): BattleMoment {
    const target =
      Object.keys(message.health_update).find((playerName) => playerName !== message.player) ??
      null;
    const suitCounts = message.cards.reduce<Record<string, number>>((counts, card) => {
      counts[card.suit] = (counts[card.suit] ?? 0) + 1;
      return counts;
    }, {});
    const accentSuit =
      (Object.entries(suitCounts).sort((left, right) => right[1] - left[1])[0]?.[0] as
        | Card["suit"]
        | undefined) ?? null;

    return {
      attacker: message.player,
      target,
      damage: message.damage,
      handType: message.hand_type,
      multiplier: message.multiplier,
      accentSuit,
      winner: message.winner,
    };
  }

  function showBattleMoment(message: HandPlayedMessage) {
    clearWindowTimeout(battleMomentTimeoutRef);
    setBattleMoment(buildBattleMoment(message));
    battleMomentTimeoutRef.current = window.setTimeout(() => {
      setBattleMoment(null);
      battleMomentTimeoutRef.current = null;
    }, 3200);
  }

  function showDiscardMoment(nextCards: Card[], nextRemainingDiscards: number) {
    clearWindowTimeout(discardMomentTimeoutRef);
    setDiscardMoment({
      cards: nextCards,
      remainingDiscards: nextRemainingDiscards,
    });
    discardMomentTimeoutRef.current = window.setTimeout(() => {
      setDiscardMoment(null);
      discardMomentTimeoutRef.current = null;
    }, 1500);
  }

  function triggerGoldAttention() {
    clearWindowTimeout(goldAttentionTimeoutRef);
    setGoldAttentionActive(false);
    window.requestAnimationFrame(() => {
      setGoldAttentionActive(true);
      goldAttentionTimeoutRef.current = window.setTimeout(() => {
        setGoldAttentionActive(false);
        goldAttentionTimeoutRef.current = null;
      }, 820);
    });
  }

  function scheduleShopOpen(upgrades: Upgrade[], delayMs = 0) {
    clearWindowTimeout(shopOpenTimeoutRef);

    if (delayMs <= 0) {
      setShopUpgrades(upgrades);
      setShopOpen(true);
      return;
    }

    shopOpenTimeoutRef.current = window.setTimeout(() => {
      setShopUpgrades(upgrades);
      setShopOpen(true);
      shopOpenTimeoutRef.current = null;
    }, delayMs);
  }

  function syncPlayers(nextPlayers: string[], nextAvatars?: Record<string, string>) {
    setPlayers(nextPlayers);
    if (nextAvatars) {
      setPlayerAvatars(nextAvatars);
    }
    setPlayerHealth((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= 100;
      });
      return next;
    });
    setPlayerMaxHealth((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= 100;
      });
      return next;
    });
    setPlayerWins((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= 0;
      });
      return next;
    });
  }

  async function refreshPlayers(nextGameId: string) {
    const response = await getPlayers(nextGameId);
    syncPlayers(response.players ?? [], response.avatars ?? {});
    setCurrentTurn(response.next_player ?? null);
  }

  function openSocket(nextGameId: string, nextPlayerId: string) {
    socketRef.current?.close();
    socketRef.current = connectToGameSocket(nextGameId, nextPlayerId, {
      onOpen: () => {
        setWebsocketConnected(true);
        pushFeedEntry(`Connected to game ${nextGameId} as ${nextPlayerId}.`);
      },
      onClose: () => {
        setWebsocketConnected(false);
        pushFeedEntry("WebSocket closed.");
      },
      onError: () => {
        pushFeedEntry("WebSocket error received.");
      },
      onMessage: (message) => {
        pushFeedEntry(formatSocketMessage(message));
        if ("next_player" in message && typeof message.next_player === "string") {
          setCurrentTurn(message.next_player);
        }
        if (isPlayersUpdatedMessage(message)) {
          syncPlayers(message.players, message.avatars ?? {});
          setCurrentTurn(message.next_player ?? null);
        }
        if (isNewHandMessage(message) && message.player === nextPlayerId) {
          setPlayerHand(message.cards);
          setShopOpen(false);
          setSelectedCards([]);
        }
        if (isHandUpdatedMessage(message) && message.player === nextPlayerId) {
          setPlayerHand(message.cards);
          setRemainingDiscards(message.remaining_discards);
          setSelectedCards([]);
        }
        if (isHandPlayedMessage(message)) {
          showBattleMoment(message);
          setPlayerHealth((current) => ({
            ...current,
            ...message.health_update,
          }));
          setPlayerMaxHealth((current) => ({
            ...current,
            ...message.max_health_update,
          }));
          setPlayerWins((current) => ({
            ...current,
            ...message.score_update,
          }));
          if (message.player === nextPlayerId) {
            setPlayerHand(message.new_hand);
            setRemainingDiscards(message.remaining_discards);
            setPlayerGold((current) => current + message.gold);
            setSelectedCards([]);
          }
          if (message.winner) {
            pushFeedEntry(`Game over. ${message.winner} wins the round.`);
          }
        }
        if (isOpenStoreMessage(message) && message.player === nextPlayerId) {
          setShopWaitingPlayers(message.waiting_players ?? []);
          scheduleShopOpen(message.upgrades, 1400);
        }
        if (isShopStatusMessage(message)) {
          setShopWaitingPlayers(message.waiting_players);
        }
        if (isApplyUpgradesMessage(message)) {
          setPlayerHealth((current) => ({
            ...current,
            [message.player]: message.health,
          }));
          setPlayerMaxHealth((current) => ({
            ...current,
            [message.player]: message.max_health,
          }));
          if (message.player === nextPlayerId) {
            setRemainingDiscards(message.max_discards);
          }
        }
      },
    });
  }

  async function joinResolvedGame(normalizedGameId: string, normalizedPlayerId: string) {
    setBusy(true);
    setGameIdError(null);
    try {
      const response = await joinGame(
        normalizedGameId,
        normalizedPlayerId,
        currentUser?.email ?? null,
        currentUser?.photoURL ?? null,
      );
      if (response.error) {
        throw new Error(response.error);
      }

      setGameId(normalizedGameId);
      setPlayerId(normalizedPlayerId);
      pushFeedEntry(response.message ?? `Joined ${normalizedGameId}.`);
      await refreshPlayers(normalizedGameId);
      openSocket(normalizedGameId, normalizedPlayerId);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join the game.";
      if (message.toLowerCase().includes("game not found")) {
        setGameIdError("Invalid game ID");
      }
      pushFeedEntry(message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateGame(nextGameId: string, nextPlayerId: string) {
    const { normalizedGameId, normalizedPlayerId } = resolveLobbyDetails(
      nextGameId,
      nextPlayerId,
    );

    setBusy(true);
    setGameIdError(null);
    try {
      const response = await createGame(normalizedGameId);
      if (response.error) {
        throw new Error(response.error);
      }
      pushFeedEntry(response.message ?? `Game ${normalizedGameId} created.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create the game.";
      pushFeedEntry(message);
      setBusy(false);
      return false;
    }

    setBusy(false);
    return joinResolvedGame(normalizedGameId, normalizedPlayerId);
  }

  async function handleJoinGame(nextGameId: string, nextPlayerId: string) {
    const { normalizedGameId, normalizedPlayerId } = resolveLobbyDetails(
      nextGameId,
      nextPlayerId,
    );
    return joinResolvedGame(normalizedGameId, normalizedPlayerId);
  }

  function handleToggleCard(card: Card, index: number) {
    const cardKey = makeCardKey(card, index);
    setSelectedCards((current) => {
      const existing = current.find((entry) => entry.key === cardKey);
      if (existing) {
        return current.filter((entry) => entry.key !== cardKey);
      }

      if (current.length >= 5) {
        pushFeedEntry("You can only select up to 5 cards.");
        return current;
      }

      return [...current, { ...card, key: cardKey }];
    });
  }

  async function handleDiscard() {
    if (!gameId || !playerId || selectedCards.length === 0) {
      return;
    }

    const discardedCards = selectedCards.map(({ rank, suit }) => ({ rank, suit }));
    setBusy(true);
    try {
      const response = await discardCards(gameId, playerId, discardedCards);
      if (response.error) {
        throw new Error(response.error);
      }
      showDiscardMoment(
        discardedCards,
        typeof response.remaining_discards === "number"
          ? response.remaining_discards
          : remainingDiscards,
      );
      if (response.new_hand) {
        setPlayerHand(response.new_hand);
      }
      if (typeof response.remaining_discards === "number") {
        setRemainingDiscards(response.remaining_discards);
      }
      setSelectedCards([]);
      pushFeedEntry(`${playerId} discarded cards.`);
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Discard failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePlayHand() {
    if (!gameId || !playerId || selectedCards.length === 0) {
      return;
    }

    setBusy(true);
    try {
      const response = await playHand(
        gameId,
        playerId,
        selectedCards.map(({ rank, suit }) => ({ rank, suit })),
      );
      if (response.error) {
        throw new Error(response.error);
      }
      setSelectedCards([]);
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Play hand failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEndTurn() {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await endTurn(gameId, playerId);
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.message) {
        pushFeedEntry(response.message);
      }
      setSelectedCards([]);
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "End turn failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBuyUpgrade(upgrade: Upgrade) {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await buyUpgrade(gameId, playerId, upgrade.id);
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.message === "Not enough gold") {
        triggerGoldAttention();
        pushFeedEntry("Not enough gold for that upgrade.");
        return;
      }
      setOwnedUpgrades((current) => [...current, upgrade]);
      setShopUpgrades((current) => current.filter((entry) => entry.id !== upgrade.id));
      setPlayerGold((current) =>
        typeof response.price === "number" ? current - response.price : current,
      );
      pushFeedEntry(`${upgrade.name} purchased.`);
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Upgrade purchase failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueFromShop() {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await continueFromShop(gameId, playerId);
      if (response.error) {
        throw new Error(response.error);
      }
      setShopWaitingPlayers(response.waiting_players ?? []);
      setShopOpen(false);
      pushFeedEntry("Ready for the next game.");
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Failed to continue from shop.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveLobby() {
    const activeGameId = gameId;
    const activePlayerId = playerId;

    setBusy(true);
    try {
      if (activeGameId && activePlayerId) {
        await leaveGame(activeGameId, activePlayerId);
      }
    } catch (error) {
      pushFeedEntry(
        error instanceof Error ? error.message : "Failed to leave lobby cleanly.",
      );
    } finally {
      socketRef.current?.close();
      socketRef.current = null;
      setDraftGameId("");
      setGameId(null);
      setDraftPlayerId("");
      setPlayerId(null);
      setPlayers([]);
      setPlayerAvatars({});
      setPlayerHand([]);
      setSelectedCards([]);
      setCurrentTurn(null);
      setPlayerHealth({});
      setPlayerMaxHealth({});
      setPlayerWins({});
      setRemainingDiscards(1);
      setPlayerGold(0);
      setGoldAttentionActive(false);
      setBattleMoment(null);
      setDiscardMoment(null);
      clearWindowTimeout(shopOpenTimeoutRef);
      setShopOpen(false);
      setShopUpgrades([]);
      setShopWaitingPlayers([]);
      setOwnedUpgrades([]);
      setWebsocketConnected(false);
      setFeedEntries(["Returned to lobby."]);
      setBusy(false);
    }
  }

  const selectedCardKeys = selectedCards.map((card) => card.key);
  const isMatchReady = players.length > 1;
  const isPlayersTurn = Boolean(
    isMatchReady && currentTurn && playerId && currentTurn === playerId,
  );
  const canPlayActions = isPlayersTurn && selectedCards.length > 0;
  const canEndTurn = isPlayersTurn;
  const battlePlayers = players.map((name) => ({
    id: name,
    avatar: playerAvatars[name] ?? "ðŸ‘¤",
    health: playerHealth[name] ?? 100,
    maxHealth: playerMaxHealth[name] ?? 100,
    wins: playerWins[name] ?? 0,
  }));
  const shopOtherPlayers = shopWaitingPlayers.filter((id) => id !== playerId);
  const shopWaitingOnYou = Boolean(
    playerId &&
      shopWaitingPlayers.includes(playerId) &&
      shopOtherPlayers.length === 0,
  );
  const shopStatusText = shopWaitingOnYou
    ? "The game is waiting on you"
    : shopOtherPlayers.length > 0
      ? `Waiting for these players: ${shopOtherPlayers.join(", ")}`
      : "Waiting for other players";

  function handleDraftGameIdChange(value: string) {
    setDraftGameId(value);
    if (gameIdError) {
      setGameIdError(null);
    }
  }

  return {
    busy,
    draftGameId,
    draftPlayerId,
    gameIdError,
    gameId,
    playerId,
    players,
    playerHand,
    remainingDiscards,
    playerGold,
    goldAttentionActive,
    battleMoment,
    discardMoment,
    shopOpen,
    shopUpgrades,
    ownedUpgrades,
    websocketConnected,
    feedEntries,
    selectedCards,
    selectedCardKeys,
    currentTurn,
    battlePlayers,
    canPlayActions,
    canEndTurn,
    isPlayersTurn,
    shopStatusText,
    shopWaitingOnYou,
    setDraftPlayerId: setDraftPlayerId as DraftSetter,
    handleDraftGameIdChange,
    handleCreateGame,
    handleJoinGame,
    handleToggleCard,
    handleDiscard,
    handlePlayHand,
    handleEndTurn,
    handleBuyUpgrade,
    handleContinueFromShop,
    handleLeaveLobby,
  };
}

