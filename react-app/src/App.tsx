import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { AchievementUnlockToast } from "./components/AchievementUnlockToast";
import { AchievementsPage } from "./components/AchievementsPage";
import { BattleStatus } from "./components/BattleStatus";
import { BootSplash } from "./components/BootSplash";
import { AvailableLobbies } from "./components/AvailableLobbies";
import { AuthPanel } from "./components/AuthPanel";
import { EventFeed } from "./components/EventFeed";
import { GameBoard } from "./components/GameBoard";
import { GameSetupForm } from "./components/GameSetupForm";
import { LevelUpToast } from "./components/LevelUpToast";
import { LevelProgressionModal } from "./components/LevelProgressionModal";
import { MatchResultOverlay } from "./components/MatchResultOverlay";
import { StatusPanel } from "./components/StatusPanel";
import { TalentTreePage } from "./components/TalentTreePage";
import { UpgradePanel } from "./components/UpgradePanel";
import { apiBaseUrl } from "./lib/config";
import { getMetaProgress, listLobbies, unlockTalent } from "./lib/api";
import { auth } from "./lib/firebase";
import { useGameSession } from "./hooks/useGameSession";
import type { LevelMilestone, MetaAchievement, MetaProgress } from "./types/game";

interface LevelUpEvent {
  level: number;
  unlocks: LevelMilestone[];
}

export default function App() {
  const [bootProgress, setBootProgress] = useState(0);
  const [bootComplete, setBootComplete] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [view, setView] = useState<"lobby" | "achievements" | "talents" | "game">("lobby");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [availableLobbies, setAvailableLobbies] = useState<
    { game_id: string; player_count: number; players: string[] }[]
  >([]);
  const [metaProgress, setMetaProgress] = useState<MetaProgress | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<MetaAchievement[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<MetaAchievement | null>(null);
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEvent[]>([]);
  const [activeLevelUp, setActiveLevelUp] = useState<LevelUpEvent | null>(null);
  const [progressionModalOpen, setProgressionModalOpen] = useState(false);

  const session = useGameSession(currentUser);
  const { setDraftPlayerId } = session;
  const seenUnlockedAchievementsRef = useRef<Set<string>>(new Set());
  const hydratedAchievementsRef = useRef(false);
  const previousLevelRef = useRef<number | null>(null);
  const previousLevelRewardsRef = useRef<Set<string>>(new Set());
  const accountIconClickCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    function advanceBoot(currentProgress: number) {
      if (cancelled) {
        return;
      }

      if (currentProgress >= 100) {
        timeoutId = window.setTimeout(() => {
          if (!cancelled) {
            setBootComplete(true);
          }
        }, 420);
        return;
      }

      const remaining = 100 - currentProgress;
      const jump = Math.min(
        remaining,
        Math.max(1, Math.round(Math.random() * 8)),
      );
      const nextProgress = Math.min(
        100,
        currentProgress + jump - (Math.random() > 0.76 ? 1 : 0),
      );

      timeoutId = window.setTimeout(() => {
        setBootProgress(nextProgress);
        advanceBoot(nextProgress);
      }, 130 + Math.round(Math.random() * 180));
    }

    advanceBoot(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
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
  }, [setDraftPlayerId]);

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
    if (!currentUser?.email) {
      setMetaProgress(null);
      setAchievementQueue([]);
      setActiveAchievement(null);
      setLevelUpQueue([]);
      setActiveLevelUp(null);
      seenUnlockedAchievementsRef.current = new Set();
      hydratedAchievementsRef.current = false;
      previousLevelRef.current = null;
      previousLevelRewardsRef.current = new Set();
      return;
    }

    const currentEmail = currentUser.email;
    let cancelled = false;
    let intervalId: number | null = null;

    async function loadMetaProgress() {
      try {
        const response = await getMetaProgress(currentEmail);
        if (!cancelled && !response.error) {
          setMetaProgress(response);
        }
      } catch {
        if (!cancelled) {
          setMetaProgress(null);
        }
      }
    }

    void loadMetaProgress();
    intervalId = window.setInterval(() => {
      void loadMetaProgress();
    }, view === "game" ? 3500 : 7000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentUser, view]);

  useEffect(() => {
    if (!metaProgress) {
      return;
    }

    const unlockedAchievements = metaProgress.achievements.filter(
      (achievement) => achievement.unlocked,
    );
    const unlockedIds = new Set(unlockedAchievements.map((achievement) => achievement.id));
    const currentRewardIds = new Set(metaProgress.unlocked_level_rewards);

    if (!hydratedAchievementsRef.current) {
      seenUnlockedAchievementsRef.current = unlockedIds;
      hydratedAchievementsRef.current = true;
      previousLevelRef.current = metaProgress.level;
      previousLevelRewardsRef.current = currentRewardIds;
      return;
    }

    const newlyUnlocked = unlockedAchievements.filter(
      (achievement) => !seenUnlockedAchievementsRef.current.has(achievement.id),
    );

    if (newlyUnlocked.length > 0) {
      setAchievementQueue((current) => {
        const existingIds = new Set(current.map((achievement) => achievement.id));
        if (activeAchievement) {
          existingIds.add(activeAchievement.id);
        }
        return [
          ...current,
          ...newlyUnlocked.filter((achievement) => !existingIds.has(achievement.id)),
        ];
      });
    }

    if ((previousLevelRef.current ?? metaProgress.level) < metaProgress.level) {
      const previousRewards = previousLevelRewardsRef.current;
      const freshUnlocks = metaProgress.level_milestones.filter(
        (milestone) => milestone.unlocked && !previousRewards.has(milestone.id),
      );

      setLevelUpQueue((current) => [
        ...current,
        {
          level: metaProgress.level,
          unlocks: freshUnlocks,
        },
      ]);
    }

    seenUnlockedAchievementsRef.current = unlockedIds;
    previousLevelRef.current = metaProgress.level;
    previousLevelRewardsRef.current = currentRewardIds;
  }, [activeAchievement, metaProgress]);

  useEffect(() => {
    if (activeAchievement || achievementQueue.length === 0) {
      return;
    }

    setActiveAchievement(achievementQueue[0]);
    setAchievementQueue((current) => current.slice(1));
  }, [activeAchievement, achievementQueue]);

  useEffect(() => {
    if (activeLevelUp || levelUpQueue.length === 0) {
      return;
    }

    setActiveLevelUp(levelUpQueue[0]);
    setLevelUpQueue((current) => current.slice(1));
  }, [activeLevelUp, levelUpQueue]);

  useEffect(() => {
    if (!activeAchievement) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveAchievement(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeAchievement]);

  useEffect(() => {
    if (!activeLevelUp) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveLevelUp(null);
    }, 4300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeLevelUp]);

  async function handleUnlockTalent(talentId: string) {
    if (!currentUser?.email) {
      return;
    }

    try {
      const response = await unlockTalent(currentUser.email, talentId);
      if (response.error) {
        throw new Error(response.error);
      }
      setMetaProgress(response);
    } catch {
      // Keep the current meta snapshot if unlocking fails.
    }
  }

  async function handleAccountNavigate(nextView: "lobby" | "achievements" | "talents") {
    if (view === "game" && nextView !== "lobby") {
      await session.handleLeaveLobby();
    }
    setView(nextView);
  }

  function handleAccountIconClick() {
    accountIconClickCountRef.current += 1;
    if (accountIconClickCountRef.current >= 10) {
      setDebugVisible((current) => !current);
      accountIconClickCountRef.current = 0;
    }
  }

  const hasChosenAccess = Boolean(currentUser || guestMode);

  if (!bootComplete) {
    return <BootSplash progress={bootProgress} />;
  }

  return (
    <main className="app-shell">
      {view !== "game" ? (
        <header className="simple-header">
          <h1>Slaskecards</h1>
        </header>
      ) : null}

      {activeAchievement ? (
        <AchievementUnlockToast achievement={activeAchievement} />
      ) : null}
      {activeLevelUp ? <LevelUpToast level={activeLevelUp.level} unlocks={activeLevelUp.unlocks} /> : null}
      {session.matchResult ? (
        <MatchResultOverlay
          matchResult={session.matchResult}
          playerId={session.playerId}
          onLeaveLobby={async () => {
            await session.handleLeaveLobby();
            setView("lobby");
          }}
        />
      ) : null}
      {progressionModalOpen ? (
        <LevelProgressionModal
          metaProgress={metaProgress}
          onClose={() => setProgressionModalOpen(false)}
        />
      ) : null}

      <AuthPanel
        currentUser={currentUser}
        guestMode={guestMode}
        currentView={view}
        metaProgress={metaProgress}
        onOpenProgression={() => setProgressionModalOpen(true)}
        onAccountIconClick={handleAccountIconClick}
        onNavigate={handleAccountNavigate}
        onGuestModeChange={setGuestMode}
      />

      {hasChosenAccess && view === "lobby" ? (
        <section className="content-grid lobby-grid">
          <GameSetupForm
            gameId={session.draftGameId}
            gameIdError={session.gameIdError}
            playerId={session.draftPlayerId}
            lockedPlayerName={
              currentUser?.displayName?.trim() ||
              currentUser?.email?.split("@")[0] ||
              null
            }
            lockedPlayerAvatar={currentUser?.photoURL ?? null}
            onGameIdChange={session.handleDraftGameIdChange}
            onPlayerIdChange={setDraftPlayerId}
            onCreateGame={async (gameId, playerId) => {
              if (await session.handleCreateGame(gameId, playerId)) {
                setView("game");
              }
            }}
            onJoinGame={async (gameId, playerId) => {
              if (await session.handleJoinGame(gameId, playerId)) {
                setView("game");
              }
            }}
            busy={session.busy}
          />
          <AvailableLobbies
            lobbies={availableLobbies}
            busy={session.busy}
            onJoinLobby={async (selectedGameId) => {
              session.handleDraftGameIdChange(selectedGameId);
              if (await session.handleJoinGame(selectedGameId, session.draftPlayerId)) {
                setView("game");
              }
            }}
          />
          {debugVisible ? (
            <section className="debug-stack">
              <StatusPanel
                apiBaseUrl={apiBaseUrl}
                websocketConnected={session.websocketConnected}
                gameId={session.gameId}
                playerId={session.playerId}
                players={session.players}
              />
              <EventFeed entries={session.feedEntries} />
            </section>
          ) : null}
        </section>
      ) : hasChosenAccess && view === "achievements" ? (
        <section className="content-grid account-grid">
          <AchievementsPage
            metaProgress={metaProgress}
            onOpenProgression={() => setProgressionModalOpen(true)}
          />
        </section>
      ) : hasChosenAccess && view === "talents" ? (
        <section className="content-grid account-grid">
          <TalentTreePage
            metaProgress={metaProgress}
            busy={session.busy}
            onUnlockTalent={handleUnlockTalent}
          />
        </section>
      ) : hasChosenAccess ? (
        <section className="content-grid">
          {!session.shopOpen ? (
            <BattleStatus
              players={session.battlePlayers}
              currentTurn={session.currentTurn}
              battleMoment={session.battleMoment}
              playerGold={session.playerGold}
              playerId={session.playerId}
              shopOpen={session.shopOpen}
              battleTimerSeconds={session.battleTimerSeconds}
              onLeaveLobby={async () => {
                await session.handleLeaveLobby();
                setView("lobby");
              }}
            />
          ) : null}
          {!session.shopOpen ? (
            <GameBoard
              cards={session.playerHand}
              battleMoment={session.battleMoment}
              discardMoment={session.discardMoment}
              cosmeticRewards={metaProgress?.unlocked_level_rewards ?? []}
              selectedCardKeys={session.selectedCardKeys}
              ownedUpgrades={session.ownedUpgrades}
              metaProgress={metaProgress}
              unlockedLevelRewards={metaProgress?.unlocked_level_rewards ?? []}
              onToggleCard={session.handleToggleCard}
              onPlayHand={session.handlePlayHand}
              onDiscard={session.handleDiscard}
              onEndTurn={session.handleEndTurn}
              canPlayActions={session.canPlayActions}
              canEndTurn={session.canEndTurn}
              remainingDiscards={session.remainingDiscards}
              busy={session.busy}
              disabled={!session.isPlayersTurn}
            />
          ) : null}
            <UpgradePanel
              upgrades={session.shopUpgrades}
              ownedUpgrades={session.ownedUpgrades}
              playerGold={session.playerGold}
              goldAttentionActive={session.goldAttentionActive}
              visible={session.shopOpen}
              busy={session.busy}
              onBuyUpgrade={session.handleBuyUpgrade}
              onContinue={session.handleContinueFromShop}
              shopStatusText={session.shopStatusText}
              shopWaitingOnYou={session.shopWaitingOnYou}
              shopTimerSeconds={session.shopTimerSeconds}
              onLeaveLobby={async () => {
                await session.handleLeaveLobby();
                setView("lobby");
              }}
            />
          {debugVisible ? (
            <section className="debug-stack">
              <StatusPanel
                apiBaseUrl={apiBaseUrl}
                websocketConnected={session.websocketConnected}
                gameId={session.gameId}
                playerId={session.playerId}
                players={session.players}
              />
              <EventFeed entries={session.feedEntries} />
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
