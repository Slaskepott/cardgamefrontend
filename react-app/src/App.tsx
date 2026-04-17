import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { AchievementsPage } from "./components/AchievementsPage";
import { BattleStatus } from "./components/BattleStatus";
import { AvailableLobbies } from "./components/AvailableLobbies";
import { AuthPanel } from "./components/AuthPanel";
import { EventFeed } from "./components/EventFeed";
import { GameBoard, makeCardKey } from "./components/GameBoard";
import { GameSetupForm } from "./components/GameSetupForm";
import { StatusPanel } from "./components/StatusPanel";
import { TalentTreePage } from "./components/TalentTreePage";
import { UpgradePanel } from "./components/UpgradePanel";
import { apiBaseUrl } from "./lib/config";
import {
  buyUpgrade,
  createGame,
  discardCards,
  endTurn,
  getMetaProgress,
  getPlayers,
  joinGame,
  leaveGame,
  listLobbies,
  playHand,
  unlockTalent,
} from "./lib/api";
import { generateLobbyId, generatePlayerName } from "./lib/nameGenerator";
import { auth } from "./lib/firebase";
import { connectToGameSocket } from "./lib/ws";
import type {
  BattleMoment,
  ApplyUpgradesMessage,
  Card,
  DiscardMoment,
  GameSocketMessage,
  HandPlayedMessage,
  HandUpdatedMessage,
  NewHandMessage,
  OpenStoreMessage,
  PlayersUpdatedMessage,
  MetaProgress,
  Upgrade,
} from "./types/game";

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

export default function App() {
  const [view, setView] = useState<"lobby" | "achievements" | "talents" | "game">("lobby");
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [draftGameId, setDraftGameId] = useState("");
  const [gameIdError, setGameIdError] = useState<string | null>(null);
  const [draftPlayerId, setDraftPlayerId] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [availableLobbies, setAvailableLobbies] = useState<
    { game_id: string; player_count: number; players: string[] }[]
  >([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Array<Card & { key: string }>>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [playerHealth, setPlayerHealth] = useState<Record<string, number>>({});
  const [playerMaxHealth, setPlayerMaxHealth] = useState<Record<string, number>>({});
  const [playerWins, setPlayerWins] = useState<Record<string, number>>({});
  const [remainingDiscards, setRemainingDiscards] = useState(1);
  const [playerGold, setPlayerGold] = useState(0);
  const [goldAttentionActive, setGoldAttentionActive] = useState(false);
  const [battleMoment, setBattleMoment] = useState<BattleMoment | null>(null);
  const [discardMoment, setDiscardMoment] = useState<DiscardMoment | null>(null);
  const [metaProgress, setMetaProgress] = useState<MetaProgress | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopUpgrades, setShopUpgrades] = useState<Upgrade[]>([]);
  const [ownedUpgrades, setOwnedUpgrades] = useState<Upgrade[]>([]);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [feedEntries, setFeedEntries] = useState<string[]>([
    "React migration shell is ready.",
  ]);
  const socketRef = useRef<WebSocket | null>(null);
  const goldAttentionTimeoutRef = useRef<number | null>(null);
  const battleMomentTimeoutRef = useRef<number | null>(null);
  const discardMomentTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      if (goldAttentionTimeoutRef.current !== null) {
        window.clearTimeout(goldAttentionTimeoutRef.current);
      }
      if (battleMomentTimeoutRef.current !== null) {
        window.clearTimeout(battleMomentTimeoutRef.current);
      }
      if (discardMomentTimeoutRef.current !== null) {
        window.clearTimeout(discardMomentTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setGuestMode(false);
        const preferredName =
          user.displayName?.trim() || user.email?.split("@")[0] || "";
        if (preferredName) {
          setDraftPlayerId(preferredName);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (view !== "lobby") {
      return;
    }

    let cancelled = false;

    async function loadLobbies() {
      try {
        const response = await listLobbies();
        if (!cancelled) {
          setAvailableLobbies(response.games);
        }
      } catch {
        if (!cancelled) {
          setAvailableLobbies([]);
        }
      }
    }

    void loadLobbies();
    const intervalId = window.setInterval(() => {
      void loadLobbies();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [view]);

  useEffect(() => {
    if (!currentUser?.email || view === "game") {
      setMetaProgress(null);
      return;
    }

    let cancelled = false;

    void getMetaProgress(currentUser.email)
      .then((response) => {
        if (!cancelled && !response.error) {
          setMetaProgress(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetaProgress(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, view]);

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

  function pushFeedEntry(entry: string) {
    setFeedEntries((current) => [new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + " " + entry, ...current].slice(0, 12));
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
    if (battleMomentTimeoutRef.current !== null) {
      window.clearTimeout(battleMomentTimeoutRef.current);
    }

    setBattleMoment(buildBattleMoment(message));
    battleMomentTimeoutRef.current = window.setTimeout(() => {
      setBattleMoment(null);
      battleMomentTimeoutRef.current = null;
    }, 3200);
  }

  function triggerGoldAttention() {
    if (goldAttentionTimeoutRef.current !== null) {
      window.clearTimeout(goldAttentionTimeoutRef.current);
    }

    setGoldAttentionActive(false);
    window.requestAnimationFrame(() => {
      setGoldAttentionActive(true);
      goldAttentionTimeoutRef.current = window.setTimeout(() => {
        setGoldAttentionActive(false);
        goldAttentionTimeoutRef.current = null;
      }, 820);
    });
  }

  function showDiscardMoment(nextCards: Card[], nextRemainingDiscards: number) {
    if (discardMomentTimeoutRef.current !== null) {
      window.clearTimeout(discardMomentTimeoutRef.current);
    }

    setDiscardMoment({
      cards: nextCards,
      remainingDiscards: nextRemainingDiscards,
    });
    discardMomentTimeoutRef.current = window.setTimeout(() => {
      setDiscardMoment(null);
      discardMomentTimeoutRef.current = null;
    }, 1500);
  }

  function syncPlayers(nextPlayers: string[]) {
    setPlayers(nextPlayers);
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
    syncPlayers(response.players ?? []);
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
          syncPlayers(message.players);
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
          setShopOpen(true);
          setShopUpgrades(message.upgrades);
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
      await handleJoinGame(normalizedGameId, normalizedPlayerId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create the game.";
      pushFeedEntry(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinGame(nextGameId: string, nextPlayerId: string) {
    const { normalizedGameId, normalizedPlayerId } = resolveLobbyDetails(
      nextGameId,
      nextPlayerId,
    );
    setBusy(true);
    setGameIdError(null);
    try {
      const response = await joinGame(
        normalizedGameId,
        normalizedPlayerId,
        currentUser?.email ?? null,
      );
      if (response.error) {
        throw new Error(response.error);
      }

      setGameId(normalizedGameId);
      setPlayerId(normalizedPlayerId);
      setView("game");
      pushFeedEntry(response.message ?? `Joined ${normalizedGameId}.`);
      await refreshPlayers(normalizedGameId);
      openSocket(normalizedGameId, normalizedPlayerId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join the game.";
      if (message.toLowerCase().includes("game not found")) {
        setGameIdError("Invalid game ID");
      }
      pushFeedEntry(message);
    } finally {
      setBusy(false);
    }
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
      const response = await discardCards(
        gameId,
        playerId,
        discardedCards,
      );
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

  async function handleUnlockTalent(talentId: string) {
    if (!currentUser?.email) {
      return;
    }

    setBusy(true);
    try {
      const response = await unlockTalent(currentUser.email, talentId);
      if (response.error) {
        throw new Error(response.error);
      }
      setMetaProgress(response);
      pushFeedEntry(`Unlocked talent: ${response.talents.find((talent) => talent.id === talentId)?.name ?? talentId}.`);
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Talent unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleContinueFromShop() {
    setShopOpen(false);
    pushFeedEntry("Continuing from the upgrade shop.");
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
      setView("lobby");
      setDraftGameId("");
      setGameId(null);
      setDraftPlayerId("");
      setPlayerId(null);
      setPlayers([]);
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
      setShopOpen(false);
      setShopUpgrades([]);
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
    health: playerHealth[name] ?? 100,
    maxHealth: playerMaxHealth[name] ?? 100,
    wins: playerWins[name] ?? 0,
  }));
  const shopOtherPlayers = battlePlayers
    .map((player) => player.id)
    .filter((id) => id !== playerId);
  const shopStatusText =
    shopOtherPlayers.length > 0
      ? `Waiting for these players: ${shopOtherPlayers.join(", ")}`
      : "Waiting for other players";
  const hasChosenAccess = Boolean(currentUser || guestMode);

  return (
    <main className="app-shell">
      <AuthPanel
        currentUser={currentUser}
        guestMode={guestMode}
        currentView={view}
        onNavigate={setView}
        onGuestModeChange={setGuestMode}
      />

      {hasChosenAccess && view !== "game" ? (
        <header className="simple-header">
          <h1>Slaskecards</h1>
        </header>
      ) : null}

      {hasChosenAccess && view === "lobby" ? (
        <section className="content-grid lobby-grid">
          <GameSetupForm
            gameId={draftGameId}
            gameIdError={gameIdError}
            playerId={draftPlayerId}
            lockedPlayerName={
              currentUser?.displayName?.trim() ||
              currentUser?.email?.split("@")[0] ||
              null
            }
            onGameIdChange={(value) => {
              setDraftGameId(value);
              if (gameIdError) {
                setGameIdError(null);
              }
            }}
            onPlayerIdChange={setDraftPlayerId}
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            busy={busy}
          />
          <AvailableLobbies
            lobbies={availableLobbies}
            busy={busy}
            onJoinLobby={async (selectedGameId) => {
              setDraftGameId(selectedGameId);
              await handleJoinGame(selectedGameId, draftPlayerId);
            }}
          />
          <section className="debug-stack">
            <StatusPanel
              apiBaseUrl={apiBaseUrl}
              websocketConnected={websocketConnected}
              gameId={gameId}
              playerId={playerId}
              players={players}
            />
            <EventFeed entries={feedEntries} />
          </section>
        </section>
      ) : hasChosenAccess && view === "achievements" ? (
        <section className="content-grid account-grid">
          <AchievementsPage metaProgress={metaProgress} />
        </section>
      ) : hasChosenAccess && view === "talents" ? (
        <section className="content-grid account-grid">
          <TalentTreePage
            metaProgress={metaProgress}
            busy={busy}
            onUnlockTalent={handleUnlockTalent}
          />
        </section>
      ) : hasChosenAccess ? (
        <section className="content-grid">
          {!shopOpen ? (
            <BattleStatus
              players={battlePlayers}
              currentTurn={currentTurn}
              battleMoment={battleMoment}
              playerGold={playerGold}
              selectedCount={selectedCards.length}
              playerId={playerId}
              shopOpen={shopOpen}
              onLeaveLobby={handleLeaveLobby}
            />
          ) : null}
          {!shopOpen ? (
            <GameBoard
              cards={playerHand}
              battleMoment={battleMoment}
              discardMoment={discardMoment}
              selectedCardKeys={selectedCardKeys}
              onToggleCard={handleToggleCard}
              onPlayHand={handlePlayHand}
              onDiscard={handleDiscard}
              onEndTurn={handleEndTurn}
              canPlayActions={canPlayActions}
              canEndTurn={canEndTurn}
              remainingDiscards={remainingDiscards}
              busy={busy}
              disabled={!isPlayersTurn}
            />
          ) : null}
          <UpgradePanel
            upgrades={shopUpgrades}
            ownedUpgrades={ownedUpgrades}
            playerGold={playerGold}
            goldAttentionActive={goldAttentionActive}
            visible={shopOpen}
            busy={busy}
            onBuyUpgrade={handleBuyUpgrade}
            onContinue={handleContinueFromShop}
            shopStatusText={shopStatusText}
            onLeaveLobby={handleLeaveLobby}
          />
          <section className="debug-stack">
            <StatusPanel
              apiBaseUrl={apiBaseUrl}
              websocketConnected={websocketConnected}
              gameId={gameId}
              playerId={playerId}
              players={players}
            />
            <EventFeed entries={feedEntries} />
          </section>
        </section>
      ) : null}
    </main>
  );
}
