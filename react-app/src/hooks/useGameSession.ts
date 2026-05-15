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
  chooseRelic,
  continueFromShop,
  createGame,
  discardCards,
  endTurn,
  getPlayers,
  joinGame,
  leaveGame,
  playHand,
  rerollShop,
  sendHeartbeat,
  startCampaignNode,
  startBotGame,
  useSpell,
} from "../lib/api";
import { generateLobbyId, generatePlayerName } from "../lib/nameGenerator";
import { connectToGameSocket } from "../lib/ws";
import {
  playBattleImpact,
  playCardToggle,
  playDiscardSound,
  playGoldErrorSound,
  playRelicPickSound,
  playRelicRevealSound,
  playRerollSound,
  playSpellCastSound,
  playSpellPrepareSound,
  playShopRevealSound,
  playUpgradeBuySound,
} from "../lib/audio";
import type {
  ApplyUpgradesMessage,
  BattleMoment,
  Card,
  DiscardMoment,
  GameSocketMessage,
  HandPlayedMessage,
  HandUpdatedMessage,
  MatchSpell,
  MatchOverMessage,
  MatchStateMessage,
  NewHandMessage,
  OpenRelicsMessage,
  OpenStoreMessage,
  PlayersUpdatedMessage,
  Relic,
  RelicStatusMessage,
  ShopStatusMessage,
  SpellMoment,
  SpellUsedMessage,
  StartBotGameResponse,
  Upgrade,
} from "../types/game";

type SelectedCard = Card & { key: string };
type DraftSetter = Dispatch<SetStateAction<string>>;

function formatSocketMessage(message: GameSocketMessage) {
  if ("type" in message && message.type === "hand_played") {
    const rawDamage = message.raw_damage ?? message.damage;
    const armorMitigation = message.armor_mitigation_pct ?? 0;
    const rankMitigation = message.rank_resistance_mitigation_pct ?? 0;
    const handTypeMitigation = message.hand_type_mitigation_pct ?? 0;
    const mitigationParts = [];
    if (armorMitigation > 0) {
      mitigationParts.push(`${armorMitigation}% armor`);
    }
    if (rankMitigation > 0) {
      mitigationParts.push(`${rankMitigation}% rank resist`);
    }
    if (handTypeMitigation > 0) {
      mitigationParts.push(`${handTypeMitigation}% hand resist`);
    }
    const mitigationSuffix =
      rawDamage !== message.damage && mitigationParts.length > 0
        ? ` (${rawDamage} raw, reduced by ${mitigationParts.join(", ")})`
        : "";
    return `${message.player} played ${message.hand_type} for ${message.damage} damage${mitigationSuffix}.`;
  }

  if ("type" in message && message.type === "spell_used") {
    return `${message.player} ${message.effect_now ? "cast" : "prepared"} ${message.spell_name}.`;
  }

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

function isRelicStatusMessage(
  message: GameSocketMessage,
): message is RelicStatusMessage {
  return "type" in message && message.type === "relic_status";
}

function isOpenRelicsMessage(
  message: GameSocketMessage,
): message is OpenRelicsMessage {
  return "type" in message && message.type === "open_relics";
}

function isMatchStateMessage(
  message: GameSocketMessage,
): message is MatchStateMessage {
  return "type" in message && message.type === "match_state";
}

function isMatchOverMessage(
  message: GameSocketMessage,
): message is MatchOverMessage {
  return "type" in message && message.type === "match_over";
}

function isSpellUsedMessage(
  message: GameSocketMessage,
): message is SpellUsedMessage {
  return "type" in message && message.type === "spell_used";
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
  const [playerAvatarBorders, setPlayerAvatarBorders] = useState<Record<string, string>>({});
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [playerHealth, setPlayerHealth] = useState<Record<string, number>>({});
  const [playerMaxHealth, setPlayerMaxHealth] = useState<Record<string, number>>({});
  const [playerWins, setPlayerWins] = useState<Record<string, number>>({});
  const [playerArmor, setPlayerArmor] = useState<Record<string, number>>({});
  const [playerArmorReductionPct, setPlayerArmorReductionPct] = useState<Record<string, number>>(
    {},
  );
  const [playerUpgrades, setPlayerUpgrades] = useState<Record<string, Upgrade[]>>({});
  const [remainingDiscards, setRemainingDiscards] = useState(1);
  const [playerGold, setPlayerGold] = useState(0);
  const [goldAttentionActive, setGoldAttentionActive] = useState(false);
  const [battleMoment, setBattleMoment] = useState<BattleMoment | null>(null);
  const [spellMoment, setSpellMoment] = useState<SpellMoment | null>(null);
  const [discardMoment, setDiscardMoment] = useState<DiscardMoment | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopUpgrades, setShopUpgrades] = useState<Upgrade[]>([]);
  const [shopRevealCycle, setShopRevealCycle] = useState(0);
  const [shopRerollsRemaining, setShopRerollsRemaining] = useState(0);
  const [shopWaitingPlayers, setShopWaitingPlayers] = useState<string[]>([]);
  const [relicOffers, setRelicOffers] = useState<Relic[]>([]);
  const [relicWaitingPlayers, setRelicWaitingPlayers] = useState<string[]>([]);
  const [playerRelics, setPlayerRelics] = useState<Record<string, Relic[]>>({});
  const [playerSpells, setPlayerSpells] = useState<Record<string, MatchSpell[]>>({});
  const [phase, setPhase] = useState<"waiting" | "battle" | "shop" | "relic" | "match_over">("waiting");
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [isCampaignMatch, setIsCampaignMatch] = useState(false);
  const [campaignNodeId, setCampaignNodeId] = useState<string | null>(null);
  const [winsToClinch, setWinsToClinch] = useState(5);
  const [bestOf, setBestOf] = useState(9);
  const [battleDeadlineAt, setBattleDeadlineAt] = useState<number | null>(null);
  const [shopDeadlines, setShopDeadlines] = useState<Record<string, number>>({});
  const [matchResult, setMatchResult] = useState<MatchOverMessage | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() => Date.now() / 1000);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [feedEntries, setFeedEntries] = useState<string[]>([
    "React migration shell is ready.",
  ]);

  const socketRef = useRef<WebSocket | null>(null);
  const goldAttentionTimeoutRef = useRef<number | null>(null);
  const battleMomentTimeoutRef = useRef<number | null>(null);
  const spellMomentTimeoutRef = useRef<number | null>(null);
  const discardMomentTimeoutRef = useRef<number | null>(null);
  const shopOpenTimeoutRef = useRef<number | null>(null);
  const matchResultTimeoutRef = useRef<number | null>(null);
  const finisherVisibleUntilRef = useRef(0);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      clearWindowTimeout(goldAttentionTimeoutRef);
      clearWindowTimeout(battleMomentTimeoutRef);
      clearWindowTimeout(spellMomentTimeoutRef);
      clearWindowTimeout(discardMomentTimeoutRef);
      clearWindowTimeout(shopOpenTimeoutRef);
      clearWindowTimeout(matchResultTimeoutRef);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowSeconds(Date.now() / 1000);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!gameId || !playerId || phase === "match_over") {
      return;
    }

    const activeGameId = gameId;
    const activePlayerId = playerId;
    let cancelled = false;

    async function heartbeat() {
      try {
        await sendHeartbeat(activeGameId, activePlayerId);
      } catch {
        if (!cancelled) {
          pushFeedEntry("Heartbeat failed.");
        }
      }
    }

    void heartbeat();
    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [gameId, phase, playerId]);

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
      damageInstances: message.damage_instances ?? [message.damage],
      hits: message.hits ?? (message.damage_instances?.length ?? 1),
      doublePlayTriggered: message.double_play_triggered ?? false,
      handType: message.hand_type,
      multiplier: message.multiplier,
      accentSuit,
      winner: message.winner,
      matchFinished: message.match_finished ?? false,
    };
  }

  function showBattleMoment(message: HandPlayedMessage) {
    clearWindowTimeout(battleMomentTimeoutRef);
    finisherVisibleUntilRef.current = message.match_finished ? Date.now() + 1850 : 0;
    setBattleMoment(buildBattleMoment(message));
    if (message.spell_effect_id && message.spell_effect_name) {
      clearWindowTimeout(spellMomentTimeoutRef);
      setSpellMoment({
        player: message.player,
        spellId: message.spell_effect_id,
        spellName: message.spell_effect_name,
        animation: message.spell_effect_id,
        effectNow: true,
      });
      playSpellCastSound(message.spell_effect_id);
      spellMomentTimeoutRef.current = window.setTimeout(() => {
        setSpellMoment(null);
        spellMomentTimeoutRef.current = null;
      }, 1800);
    }
    const targetPlayerId =
      Object.keys(message.health_update).find((name) => name !== message.player) ?? null;
    const targetHealthAfter =
      targetPlayerId && message.health_update[targetPlayerId] != null
        ? message.health_update[targetPlayerId]
        : null;
    const targetHealthBefore =
      targetHealthAfter !== null ? targetHealthAfter + message.damage : null;
    playBattleImpact({
      damage: message.damage,
      hits: message.hits ?? (message.damage_instances?.length ?? 1),
      doublePlayTriggered: message.double_play_triggered ?? false,
      matchFinished: message.match_finished ?? false,
      targetHealthBefore,
    });
    battleMomentTimeoutRef.current = window.setTimeout(() => {
      setBattleMoment(null);
      battleMomentTimeoutRef.current = null;
    }, message.match_finished ? 4200 : 3200);
  }

  function showDiscardMoment(nextCards: Card[], nextRemainingDiscards: number) {
    clearWindowTimeout(discardMomentTimeoutRef);
    setDiscardMoment({
      cards: nextCards,
      remainingDiscards: nextRemainingDiscards,
    });
    playDiscardSound();
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
      setShopRevealCycle((current) => current + 1);
      return;
    }

    shopOpenTimeoutRef.current = window.setTimeout(() => {
      setShopUpgrades(upgrades);
      setShopOpen(true);
      setShopRevealCycle((current) => current + 1);
      shopOpenTimeoutRef.current = null;
    }, delayMs);
  }

  function applyMatchState(message: MatchStateMessage) {
    setPhase(message.phase);
    setIsBotMatch(Boolean(message.is_bot_match));
    setIsCampaignMatch(Boolean(message.is_campaign_match));
    setCampaignNodeId(message.campaign_node_id ?? null);
    setWinsToClinch(message.wins_to_clinch ?? 5);
    setBestOf(message.best_of ?? 9);
    setCurrentTurn(message.current_turn);
    setBattleDeadlineAt(message.battle_deadline_at);
    setShopDeadlines(message.shop_deadlines ?? {});
    setShopWaitingPlayers(message.waiting_players ?? []);
    setRelicWaitingPlayers(message.relic_waiting_players ?? []);
    if (message.relics_by_player) {
      setPlayerRelics(message.relics_by_player);
    }
    if (message.spells_by_player) {
      setPlayerSpells(message.spells_by_player);
    }
    if (message.phase !== "match_over") {
      setMatchResult(null);
    }
    if (message.phase === "battle") {
      clearWindowTimeout(shopOpenTimeoutRef);
      setShopOpen(false);
      setShopUpgrades([]);
      setRelicOffers([]);
    }
    if (message.phase !== "relic") {
      setRelicOffers([]);
    }
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
    setPlayerArmor((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= 0;
      });
      return next;
    });
    setPlayerArmorReductionPct((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= 0;
      });
      return next;
    });
    setPlayerUpgrades((current) => {
      const next = { ...current };
      nextPlayers.forEach((name) => {
        next[name] ??= [];
      });
      return next;
    });
  }

  function syncAvatarBorders(nextAvatarBorders?: Record<string, string>) {
    if (nextAvatarBorders) {
      setPlayerAvatarBorders(nextAvatarBorders);
    }
  }

  async function refreshPlayers(nextGameId: string) {
    const response = await getPlayers(nextGameId);
    syncPlayers(response.players ?? [], response.avatars ?? {});
    syncAvatarBorders(response.avatar_borders ?? {});
    setCurrentTurn(response.next_player ?? null);
    setPhase(response.phase ?? "waiting");
    setIsBotMatch(Boolean(response.is_bot_match));
    setIsCampaignMatch(Boolean(response.is_campaign_match));
    setCampaignNodeId(response.campaign_node_id ?? null);
    setBestOf(response.best_of ?? 9);
    setWinsToClinch(response.wins_to_clinch ?? 5);
    setBattleDeadlineAt(response.battle_deadline_at ?? null);
    setShopDeadlines(response.shop_deadlines ?? {});
    setPlayerRelics(response.relics_by_player ?? {});
    setPlayerSpells(response.spells_by_player ?? {});
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
          syncAvatarBorders(message.avatar_borders ?? {});
          setCurrentTurn(message.next_player ?? null);
        }
        if (isMatchStateMessage(message)) {
          applyMatchState(message);
        }
        if (isSpellUsedMessage(message)) {
          setPlayerHealth((current) => ({ ...current, ...message.health_update }));
          setPlayerMaxHealth((current) => ({ ...current, ...message.max_health_update }));
          setPlayerArmor((current) => ({ ...current, ...message.armor_update }));
          setPlayerSpells(message.spells_by_player);
          if (message.gold_update[nextPlayerId] != null) {
            setPlayerGold(message.gold_update[nextPlayerId]);
          }
          if (message.remaining_discards_update[nextPlayerId] != null) {
            setRemainingDiscards(message.remaining_discards_update[nextPlayerId]);
          }
          clearWindowTimeout(spellMomentTimeoutRef);
          setSpellMoment({
            player: message.player,
            spellId: message.spell_id,
            spellName: message.spell_name,
            animation: message.animation,
            effectNow: message.effect_now,
          });
          if (message.effect_now) {
            playSpellCastSound(message.animation);
          } else {
            playSpellPrepareSound(message.animation);
          }
          spellMomentTimeoutRef.current = window.setTimeout(() => {
            setSpellMoment(null);
            spellMomentTimeoutRef.current = null;
          }, 1800);
        }
        if (isNewHandMessage(message) && message.player === nextPlayerId) {
          setPlayerHand(message.cards);
          if (typeof message.remaining_discards === "number") {
            setRemainingDiscards(message.remaining_discards);
          }
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
          if (message.spells_by_player) {
            setPlayerSpells(message.spells_by_player);
          }
          if (message.winner && !message.match_finished) {
            pushFeedEntry(`Round over. ${message.winner} wins the round.`);
          }
        }
        if (isOpenStoreMessage(message) && message.player === nextPlayerId) {
          setShopWaitingPlayers(message.waiting_players ?? []);
          setShopRerollsRemaining(message.rerolls_remaining ?? 0);
          if (message.health_update) {
            setPlayerHealth((current) => ({
              ...current,
              ...message.health_update,
            }));
          }
          if (message.max_health_update) {
            setPlayerMaxHealth((current) => ({
              ...current,
              ...message.max_health_update,
            }));
          }
          scheduleShopOpen(message.upgrades, 1400);
        }
        if (isShopStatusMessage(message)) {
          setShopWaitingPlayers(message.waiting_players);
        }
        if (isRelicStatusMessage(message)) {
          setRelicWaitingPlayers(message.waiting_players);
        }
        if (isOpenRelicsMessage(message) && message.player === nextPlayerId) {
          clearWindowTimeout(shopOpenTimeoutRef);
          setShopOpen(false);
          setShopUpgrades([]);
          setRelicOffers(message.relics);
          setRelicWaitingPlayers(message.waiting_players ?? []);
          playRelicRevealSound();
        }
        if (isMatchOverMessage(message)) {
          const showMatchResult = () => {
            setMatchResult(message);
            setPhase("match_over");
            setShopOpen(false);
            setShopUpgrades([]);
            setRelicOffers([]);
            setRelicWaitingPlayers([]);
            setShopWaitingPlayers([]);
            setCurrentTurn(null);
            setPlayerWins((current) => ({
              ...current,
              ...message.scores,
            }));
            setPlayerAvatars((current) => ({
              ...current,
              ...message.avatars,
            }));
            setPlayerAvatarBorders((current) => ({
              ...current,
              ...(message.avatar_borders ?? {}),
            }));
            pushFeedEntry(`${message.winner} wins the match.`);
          };

          clearWindowTimeout(matchResultTimeoutRef);
          const shouldDelayForFinisher = finisherVisibleUntilRef.current > Date.now();
          if (shouldDelayForFinisher) {
            matchResultTimeoutRef.current = window.setTimeout(() => {
              showMatchResult();
              matchResultTimeoutRef.current = null;
            }, 1850);
          } else {
            showMatchResult();
          }
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
          setPlayerArmor((current) => ({
            ...current,
            [message.player]: message.armor,
          }));
          setPlayerArmorReductionPct((current) => ({
            ...current,
            [message.player]: message.armor_reduction_pct,
          }));
          setPlayerUpgrades((current) => ({
            ...current,
            [message.player]: message.upgrades,
          }));
          if (message.relics) {
            setPlayerRelics((current) => ({
              ...current,
              [message.player]: message.relics ?? [],
            }));
          }
        }
        if (isHandPlayedMessage(message)) {
          if (message.armor_update) {
            setPlayerArmor((current) => ({
              ...current,
              ...message.armor_update,
            }));
          }
          if (message.armor_reduction_update) {
            setPlayerArmorReductionPct((current) => ({
              ...current,
              ...message.armor_reduction_update,
            }));
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
      setIsBotMatch(false);
      setIsCampaignMatch(false);
      setCampaignNodeId(null);
      setBestOf(9);
      setWinsToClinch(5);
      setMatchResult(null);
      setPlayerSpells({});
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

  async function enterResolvedGame(
    normalizedGameId: string,
    normalizedPlayerId: string,
    successMessage?: string,
  ) {
    setGameId(normalizedGameId);
    setPlayerId(normalizedPlayerId);
    setMatchResult(null);
    if (successMessage) {
      pushFeedEntry(successMessage);
    }
    await refreshPlayers(normalizedGameId);
    openSocket(normalizedGameId, normalizedPlayerId);
    return true;
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

  async function handleStartBotMatch(difficulty: "easy" | "medium" | "hard") {
    const { normalizedPlayerId } = resolveLobbyDetails("", draftPlayerId);

    setBusy(true);
    setGameIdError(null);
    try {
      const response: StartBotGameResponse = await startBotGame(
        difficulty,
        normalizedPlayerId,
        currentUser?.email ?? null,
        currentUser?.photoURL ?? null,
      );
      if (response.error || !response.game_id || !response.player_id) {
        throw new Error(response.error ?? "Failed to start bot match.");
      }

      setIsBotMatch(true);
      setIsCampaignMatch(false);
      return await enterResolvedGame(
        response.game_id,
        response.player_id,
        response.message ?? `Started ${difficulty} bot match.`,
      );
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Failed to start bot match.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleStartCampaignNode(nodeId: string) {
    if (!currentUser?.email) {
      pushFeedEntry("Sign in to play the campaign.");
      return false;
    }

    setBusy(true);
    setGameIdError(null);
    try {
      const response: StartBotGameResponse = await startCampaignNode(currentUser.email, nodeId);
      if (response.error || !response.game_id || !response.player_id) {
        throw new Error(response.error ?? "Failed to start campaign node.");
      }

      setIsBotMatch(true);
      setIsCampaignMatch(true);
      setCampaignNodeId(response.campaign_node_id ?? nodeId);
      setBestOf(response.best_of ?? 9);
      setWinsToClinch(response.wins_to_clinch ?? 5);
      return await enterResolvedGame(
        response.game_id,
        response.player_id,
        response.message ?? "Started campaign node.",
      );
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Failed to start campaign node.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleToggleCard(card: Card, index: number) {
    const cardKey = makeCardKey(card, index);
    setSelectedCards((current) => {
      const existing = current.find((entry) => entry.key === cardKey);
      if (existing) {
        playCardToggle(false);
        return current.filter((entry) => entry.key !== cardKey);
      }

      if (current.length >= 5) {
        pushFeedEntry("You can only select up to 5 cards.");
        return current;
      }

      playCardToggle(true);
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
      if (typeof response.gold === "number") {
        setPlayerGold(response.gold);
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

  async function handleUseSpell(spellId: string) {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await useSpell(gameId, playerId, spellId);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Spell failed.");
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
        playGoldErrorSound();
        pushFeedEntry("Not enough gold for that upgrade.");
        return;
      }
      setPlayerUpgrades((current) => ({
        ...current,
        [playerId]: [...(current[playerId] ?? []), upgrade],
      }));
      setShopUpgrades((current) => current.filter((entry) => entry.id !== upgrade.id));
      setPlayerGold((current) =>
        typeof response.price === "number" ? current - response.price : current,
      );
      playUpgradeBuySound(upgrade.rarity);
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
      setShopRerollsRemaining(0);
      pushFeedEntry("Ready for the next game.");
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Failed to continue from shop.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRerollShop() {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await rerollShop(gameId, playerId);
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.upgrades) {
        setShopUpgrades(response.upgrades);
        setShopRevealCycle((current) => current + 1);
      }
      setShopRerollsRemaining(response.rerolls_remaining ?? 0);
      playRerollSound();
      if (typeof response.health === "number" && playerId) {
        setPlayerHealth((current) => ({
          ...current,
          [playerId]: response.health ?? current[playerId] ?? 100,
        }));
      }
      pushFeedEntry("Shop rerolled.");
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Shop reroll failed.");
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
      setPlayerAvatarBorders({});
      setPlayerHand([]);
      setSelectedCards([]);
      setCurrentTurn(null);
      setPlayerHealth({});
      setPlayerMaxHealth({});
      setPlayerWins({});
      setPlayerArmor({});
      setPlayerArmorReductionPct({});
      setPlayerUpgrades({});
      setPlayerRelics({});
      setPlayerSpells({});
      setRemainingDiscards(1);
      setPlayerGold(0);
      setGoldAttentionActive(false);
      setBattleMoment(null);
      setSpellMoment(null);
      setDiscardMoment(null);
      setPhase("waiting");
      setIsBotMatch(false);
      setIsCampaignMatch(false);
      setCampaignNodeId(null);
      setBestOf(9);
      setWinsToClinch(5);
      setBattleDeadlineAt(null);
      setShopDeadlines({});
      setMatchResult(null);
      finisherVisibleUntilRef.current = 0;
      clearWindowTimeout(shopOpenTimeoutRef);
      clearWindowTimeout(matchResultTimeoutRef);
      setShopOpen(false);
      setShopUpgrades([]);
      setShopRerollsRemaining(0);
      setShopWaitingPlayers([]);
      setRelicOffers([]);
      setRelicWaitingPlayers([]);
      setWebsocketConnected(false);
      setFeedEntries(["Returned to lobby."]);
      setBusy(false);
    }
  }

  async function handleChooseRelic(relicId: string) {
    if (!gameId || !playerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await chooseRelic(gameId, playerId, relicId);
      if (response.error) {
        throw new Error(response.error);
      }
      setRelicOffers([]);
      setRelicWaitingPlayers(response.waiting_players ?? []);
      playRelicPickSound();
      pushFeedEntry("Relic chosen.");
    } catch (error) {
      pushFeedEntry(error instanceof Error ? error.message : "Relic choice failed.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCardKeys = selectedCards.map((card) => card.key);
  const isMatchReady = players.length > 1;
  const isPlayersTurn = Boolean(
    phase === "battle" && isMatchReady && currentTurn && playerId && currentTurn === playerId,
  );
  const canPlayActions = isPlayersTurn && selectedCards.length > 0;
  const canEndTurn = isPlayersTurn;
  const enemyPlayerId =
    playerId && players.length > 1 ? players.find((name) => name !== playerId) ?? null : null;
  const ownedUpgrades = playerId ? playerUpgrades[playerId] ?? [] : [];
  const enemyUpgrades = enemyPlayerId ? playerUpgrades[enemyPlayerId] ?? [] : [];
  const ownedRelics = playerId ? playerRelics[playerId] ?? [] : [];
  const enemyRelics = enemyPlayerId ? playerRelics[enemyPlayerId] ?? [] : [];
  const battlePlayers = players.map((name) => ({
    id: name,
    avatar: playerAvatars[name] ?? "ðŸ‘¤",
    avatarBorder: playerAvatarBorders[name] ?? "default",
    health: playerHealth[name] ?? 100,
    maxHealth: playerMaxHealth[name] ?? 100,
    wins: playerWins[name] ?? 0,
    armor: playerArmor[name] ?? 0,
    armorReductionPct: playerArmorReductionPct[name] ?? 0,
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
  const relicOtherPlayers = relicWaitingPlayers.filter((id) => id !== playerId);
  const relicWaitingOnYou = Boolean(
    playerId && relicWaitingPlayers.includes(playerId) && relicOtherPlayers.length === 0,
  );
  const relicStatusText = relicWaitingOnYou
    ? "The game is waiting on you"
    : relicOtherPlayers.length > 0
      ? `Waiting for these players: ${relicOtherPlayers.join(", ")}`
      : "Waiting for other players";

  const battleTimerSeconds =
    phase === "battle" && !isBotMatch && battleDeadlineAt
      ? Math.max(0, Math.ceil(battleDeadlineAt - nowSeconds))
      : null;
  const shopTimerSeconds =
    phase === "shop" && !isBotMatch && playerId && shopDeadlines[playerId]
      ? Math.max(0, Math.ceil(shopDeadlines[playerId] - nowSeconds))
      : null;

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
    shopRevealCycle,
    shopRerollsRemaining,
    ownedUpgrades,
    enemyUpgrades,
    ownedRelics,
    enemyRelics,
    playerSpells,
    spellMoment,
    relicOffers,
    enemyPlayerId,
    phase,
    isBotMatch,
    isCampaignMatch,
    campaignNodeId,
    battleDeadlineAt,
    shopDeadlines,
    winsToClinch,
    bestOf,
    matchResult,
    websocketConnected,
    feedEntries,
    selectedCards,
    selectedCardKeys,
    currentTurn,
    battlePlayers,
    canPlayActions,
    canEndTurn,
    isPlayersTurn,
    battleTimerSeconds,
    shopTimerSeconds,
    shopStatusText,
    shopWaitingOnYou,
    relicStatusText,
    relicWaitingOnYou,
    setDraftPlayerId: setDraftPlayerId as DraftSetter,
    handleDraftGameIdChange,
    handleCreateGame,
    handleJoinGame,
    handleStartBotMatch,
    handleStartCampaignNode,
    handleToggleCard,
    handleDiscard,
    handlePlayHand,
    handleUseSpell,
    handleEndTurn,
    handleBuyUpgrade,
    handleRerollShop,
    handleContinueFromShop,
    handleChooseRelic,
    handleLeaveLobby,
  };
}

