import { useEffect, useMemo, useState } from "react";
import type { CampaignNode, LobbySummary, MetaProgress } from "../types/game";

type PlayMode = "multiplayer" | "singleplayer";
type MultiplayerMode = "host" | "join";
type JoinMode = "browser" | "id";
type SingleplayerMode = "practice" | "campaign" | "tutorial";
type MultiplayerEntryMode = "host" | "browser" | "id";
type PlayHubAction = "host" | "browser" | "id" | "practice" | "campaign" | "tutorial";

const fallbackCampaignNodes: CampaignNode[] = [
  { id: "ember_wake", region: 1, index: 1, name: "Ember Wake", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+55% Fire draw chance, +25% Fire damage." },
  { id: "second_deal", region: 1, index: 2, name: "Second Deal", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+1 shop reroll and +1 gold gained when playing hands." },
  { id: "moss_ledger", region: 1, index: 3, name: "Moss Ledger", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "+35 health, +18 armor, +14% low-card resistance, +12% high-card resistance." },
  { id: "cinder_marquis", region: 1, index: 4, name: "The Cinder Marquis", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Soft Flush enabled, +1 shop selection, guaranteed rare-or-better shop option, +70% Fire draw chance." },
  { id: "slipstream_table", region: 2, index: 5, name: "Slipstream Table", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+55% Air draw chance, +35% high-card draw chance, +18% high-card damage." },
  { id: "house_of_echoes", region: 2, index: 6, name: "House of Echoes", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+18% chance to play a hand twice, +15% pair damage, +10% straight damage." },
  { id: "floodmarked_vault", region: 2, index: 7, name: "Floodmarked Vault", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "+60% Water draw chance, +20% Water damage, +20% flush damage." },
  { id: "archivist_of_gaps", region: 2, index: 8, name: "The Archivist of Gaps", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Gap Straight enabled, +50 health, +1 hand size, +18% straight damage." },
  { id: "stonewire_hollow", region: 3, index: 9, name: "Stonewire Hollow", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+55% Earth draw chance, +14 armor, +18% low-card resistance." },
  { id: "prism_tax", region: 3, index: 10, name: "Prism Tax", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "+35% Fire draw chance, +35% Water draw chance, +18% straight damage, +18% flush damage." },
  { id: "the_fifth_seat", region: 3, index: 11, name: "The Fifth Seat", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "+1 hand size, +1 shop selection, starts with Fortress Heart relic." },
  { id: "the_house_edge", region: 3, index: 12, name: "The House Edge", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Gap Straight enabled, Soft Flush enabled, +75 health, starts with Plasma Lattice relic, +2 shop selections, +1 hand size." },
];

interface PlayHubPanelProps {
  gameId: string;
  gameIdError?: string | null;
  playerId: string;
  lockedPlayerAvatar?: string | null;
  lockedPlayerBorder?: string | null;
  lockedPlayerName?: string | null;
  lobbies: LobbySummary[];
  metaProgress: MetaProgress | null;
  signedIn: boolean;
  initialMode?: PlayMode;
  initialMultiplayerMode?: MultiplayerMode;
  initialSingleplayerMode?: SingleplayerMode;
  onModeChange?: (mode: PlayMode) => void;
  onMultiplayerModeChange?: (mode: MultiplayerMode) => void;
  onSingleplayerModeChange?: (mode: SingleplayerMode) => void;
  onGameIdChange: (value: string) => void;
  onPlayerIdChange: (value: string) => void;
  onCreateGame: (gameId: string, playerId: string) => Promise<void>;
  onJoinGame: (gameId: string, playerId: string) => Promise<void>;
  onJoinLobby: (gameId: string) => Promise<void>;
  onStartBotMatch: (difficulty: "easy" | "medium" | "hard") => Promise<void>;
  onStartCampaignNode: (nodeId: string) => Promise<void>;
  onStartTutorial: () => void;
  busy: boolean;
}

function groupCampaignNodes(nodes: CampaignNode[]) {
  const grouped = new Map<number, CampaignNode[]>();
  for (const node of nodes) {
    const existing = grouped.get(node.region) ?? [];
    existing.push(node);
    grouped.set(node.region, existing);
  }
  return [...grouped.entries()].map(([region, regionNodes]) => ({
    region,
    nodes: [...regionNodes].sort((left, right) => left.index - right.index),
  }));
}

export function PlayHubPanel({
  gameId,
  gameIdError,
  playerId,
  lockedPlayerAvatar,
  lockedPlayerBorder,
  lockedPlayerName,
  lobbies,
  metaProgress,
  signedIn,
  initialMode = "multiplayer",
  initialMultiplayerMode = "host",
  initialSingleplayerMode = "practice",
  onModeChange,
  onMultiplayerModeChange,
  onSingleplayerModeChange,
  onGameIdChange,
  onPlayerIdChange,
  onCreateGame,
  onJoinGame,
  onJoinLobby,
  onStartBotMatch,
  onStartCampaignNode,
  onStartTutorial,
  busy,
}: PlayHubPanelProps) {
  const [mode, setMode] = useState<PlayMode>(initialMode);
  const [multiplayerMode, setMultiplayerMode] = useState<MultiplayerMode>(initialMultiplayerMode);
  const [joinMode, setJoinMode] = useState<JoinMode>("browser");
  const [multiplayerEntryMode, setMultiplayerEntryMode] = useState<MultiplayerEntryMode>(
    initialMultiplayerMode === "host" ? "host" : "browser",
  );
  const [singleplayerMode, setSingleplayerMode] = useState<SingleplayerMode>(initialSingleplayerMode);
  const campaignNodes = metaProgress?.campaign_nodes?.length
    ? metaProgress.campaign_nodes
    : fallbackCampaignNodes;
  const tutorialCompleted = (metaProgress?.stats?.tutorial_completions ?? 0) > 0;
  const campaignGroups = useMemo(() => groupCampaignNodes(campaignNodes), [campaignNodes]);
  const clearedNodeIds = new Set(metaProgress?.campaign_progress?.cleared_node_ids ?? []);
  const currentNodeId = metaProgress?.campaign_progress?.current_node_id ?? fallbackCampaignNodes[0].id;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setMultiplayerMode(initialMultiplayerMode);
    const nextEntryMode: MultiplayerEntryMode = initialMultiplayerMode === "host" ? "host" : "browser";
    setMultiplayerEntryMode(nextEntryMode);
    setJoinMode("browser");
  }, [initialMultiplayerMode]);

  useEffect(() => {
    setSingleplayerMode(initialSingleplayerMode);
  }, [initialSingleplayerMode]);

  async function handleMultiplayer(modeAction: MultiplayerMode) {
    const resolvedPlayerName = lockedPlayerName ?? playerId;
    if (modeAction === "host") {
      await onCreateGame(gameId, resolvedPlayerName);
      return;
    }
    await onJoinGame(gameId, resolvedPlayerName);
  }

  function setAction(action: PlayHubAction) {
    if (action === "host") {
      setMode("multiplayer");
      setMultiplayerEntryMode("host");
      setMultiplayerMode("host");
      onModeChange?.("multiplayer");
      onMultiplayerModeChange?.("host");
      return;
    }

    if (action === "browser") {
      setMode("multiplayer");
      setMultiplayerEntryMode("browser");
      setMultiplayerMode("join");
      setJoinMode("browser");
      onModeChange?.("multiplayer");
      onMultiplayerModeChange?.("join");
      return;
    }

    if (action === "id") {
      setMode("multiplayer");
      setMultiplayerEntryMode("id");
      setMultiplayerMode("join");
      setJoinMode("id");
      onModeChange?.("multiplayer");
      onMultiplayerModeChange?.("join");
      return;
    }

    if (action === "practice") {
      setMode("singleplayer");
      setSingleplayerMode("practice");
      onModeChange?.("singleplayer");
      onSingleplayerModeChange?.("practice");
      return;
    }

    if (action === "tutorial") {
      setMode("singleplayer");
      setSingleplayerMode("tutorial");
      onModeChange?.("singleplayer");
      onSingleplayerModeChange?.("tutorial");
      return;
    }

    setMode("singleplayer");
    setSingleplayerMode("campaign");
    onModeChange?.("singleplayer");
    onSingleplayerModeChange?.("campaign");
  }

  const activeAction: PlayHubAction =
    mode === "multiplayer"
      ? multiplayerEntryMode
      : singleplayerMode === "campaign"
        ? "campaign"
        : singleplayerMode === "tutorial"
          ? "tutorial"
          : "practice";

  function renderCampaignMap() {
    if (!signedIn) {
      return (
        <div className="campaign-locked-panel">
          <strong>Campaign requires an account</strong>
          <p>Sign in to save your route, unlock cosmetics, and track campaign achievements.</p>
        </div>
      );
    }

    const currentNode = campaignNodes.find((node) => node.id === currentNodeId) ?? campaignNodes[0];

    return (
      <div className="campaign-map">
        <div className="campaign-current-callout">
          <div>
            <span className="eyebrow">Current table</span>
            <strong>{currentNode.name}</strong>
            <p>{currentNode.description}</p>
          </div>
          <button type="button" disabled={busy} onClick={() => void onStartCampaignNode(currentNode.id)}>
            {busy ? "Working..." : `Start Bo${currentNode.best_of}`}
          </button>
        </div>
        {campaignGroups.map((group) => (
          <section key={group.region} className="campaign-region">
            <div className="campaign-region-header">
              <span className="eyebrow">Region {group.region}</span>
              <strong>
                {group.region === 1
                  ? "Kindling Quarter"
                  : group.region === 2
                    ? "Slipstream Archive"
                    : "Stonewire Crown"}
              </strong>
            </div>
            <div className="campaign-node-row">
              {group.nodes.map((node) => {
                const isCleared = clearedNodeIds.has(node.id);
                const isCurrent = currentNodeId === node.id && !isCleared;
                const isUnlocked = isCleared || isCurrent;
                return (
                  <button
                    key={node.id}
                    type="button"
                    disabled={!isUnlocked || busy}
                    className={`campaign-node ${node.type}${isCleared ? " cleared" : ""}${
                      isCurrent ? " current" : ""
                    }${!isUnlocked ? " locked" : ""}`}
                    title={`${node.name}: ${node.description}`}
                    onClick={() => void onStartCampaignNode(node.id)}
                  >
                    <span className="campaign-node-type">
                      {node.type === "boss" ? "Boss" : `Bo${node.best_of}`}
                    </span>
                    <strong>{node.name}</strong>
                    <span className="campaign-node-copy">{node.description}</span>
                    <span className="campaign-node-status">
                      {isCleared ? "Cleared" : isCurrent ? "Current" : "Locked"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderJoinLobbies() {
    return (
      <div className="play-hub-join-stack">
        {joinMode === "browser" ? (
          <div className="play-hub-lobbies-box">
            <div className="lobby-list compact">
              {lobbies.length === 0 ? (
                <p className="panel-copy">
                  No public lobbies are open right now. Create one and be the first player in.
                </p>
              ) : null}
              {lobbies.map((lobby) => (
                <button
                  key={lobby.game_id}
                  type="button"
                  className="lobby-card"
                  onClick={() => void onJoinLobby(lobby.game_id)}
                  disabled={busy}
                >
                  <span className="lobby-card-title">{lobby.game_id}</span>
                  <span>{lobby.player_count} player{lobby.player_count === 1 ? "" : "s"}</span>
                  <span>{lobby.players.length > 0 ? lobby.players.join(", ") : "Empty lobby"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <label>
              Game ID
              <input
                value={gameId}
                onChange={(event) => onGameIdChange(event.target.value)}
                placeholder="Enter a lobby ID"
              />
              {gameIdError ? <span className="field-error">{gameIdError}</span> : null}
            </label>
            <div className="button-row">
              <button
                type="button"
                disabled={busy}
                className="secondary"
                onClick={() => void handleMultiplayer("join")}
              >
                Join lobby
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="panel lobby-panel play-hub-panel">
      <div className="play-hub-action-strip" aria-label="Choose what to do">
        <div className="play-hub-action-group">
          <span className="play-hub-action-label">Multiplayer</span>
          <div className="play-mode-toggle grouped-actions" role="tablist" aria-label="Multiplayer actions">
            <button
              type="button"
              className={activeAction === "host" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setAction("host")}
            >
              Host lobby
            </button>
            <button
              type="button"
              className={activeAction === "browser" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setAction("browser")}
            >
              Game browser
            </button>
            <button
              type="button"
              className={activeAction === "id" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setAction("id")}
            >
              Join by ID
            </button>
          </div>
        </div>

        <div className="play-hub-action-group">
          <span className="play-hub-action-label">Singleplayer</span>
          <div className="play-mode-toggle grouped-actions" role="tablist" aria-label="Singleplayer actions">
            <button
              type="button"
              className={activeAction === "practice" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setAction("practice")}
            >
              Bot practice
            </button>
            <button
              type="button"
              className={activeAction === "campaign" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setAction("campaign")}
            >
              Campaign
            </button>
            <button
              type="button"
              className={activeAction === "tutorial" ? "play-mode-pill active tutorial-strip-pill" : "play-mode-pill tutorial-strip-pill"}
              onClick={() => setAction("tutorial")}
            >
              Tutorial
            </button>
          </div>
        </div>
      </div>

      <div className="section-header play-hub-header">
        <div>
          <h2>
            {mode === "multiplayer"
              ? multiplayerEntryMode === "host"
                ? "Host a live Slaskecards match"
                : "Join a live Slaskecards match"
              : singleplayerMode === "campaign"
                ? "Climb the campaign table"
                : singleplayerMode === "tutorial"
                  ? "Start here"
                  : "Play against a bot"}
          </h2>
          <p className="panel-copy">
            {mode === "multiplayer"
              ? multiplayerMode === "host"
                ? null
                : null
              : singleplayerMode === "campaign"
                ? "Take on an authored route of unfair houses, escalating match formats, and campaign-only rewards."
                : singleplayerMode === "tutorial"
                  ? null
                  : "Bot matches do not affect elo or progression."}
          </p>
        </div>
      </div>

      {mode === "multiplayer" ? (
        <form className="setup-form play-hub-form" onSubmit={(event) => event.preventDefault()}>
          {multiplayerEntryMode === "host" ? (
            <>
              <label>
                Game ID
                <input
                  value={gameId}
                  onChange={(event) => onGameIdChange(event.target.value)}
                  placeholder="Auto-generate a lobby name"
                />
                {gameIdError ? <span className="field-error">{gameIdError}</span> : null}
              </label>

              {lockedPlayerName ? (
                <div className="locked-player-name">
                  <span className="locked-player-label">Playing as</span>
                  <strong className="locked-player-identity">
                    <span className={`player-avatar-badge avatar-border-${lockedPlayerBorder ?? "default"}`}>
                      {lockedPlayerAvatar ?? "👤"}
                    </span>
                    {lockedPlayerName}
                  </strong>
                </div>
              ) : (
                <label>
                  Player name
                  <input
                    value={playerId}
                    onChange={(event) => onPlayerIdChange(event.target.value)}
                    placeholder="Auto-generate a player name"
                  />
                </label>
              )}

              <div className="button-row">
                <button type="button" disabled={busy} onClick={() => void handleMultiplayer("host")}>
                  {busy ? "Working..." : "Host lobby"}
                </button>
              </div>
            </>
          ) : (
            renderJoinLobbies()
          )}
        </form>
      ) : (
        <div className="singleplayer-panel-stack">
          {singleplayerMode === "practice" ? (
            <div className="singleplayer-practice-stack">
              <div className="play-hub-bot-stack">
                <button type="button" className="secondary" disabled={busy} onClick={() => void onStartBotMatch("easy")}>
                  {busy ? "Working..." : "Easy"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void onStartBotMatch("medium")}
                >
                  Medium
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void onStartBotMatch("hard")}
                >
                  Hard
                </button>
              </div>
            </div>
          ) : singleplayerMode === "tutorial" ? (
            <div className="singleplayer-practice-stack">
              <button
                type="button"
                className={`tutorial-hero-button${!tutorialCompleted ? " tutorial-hero-button-glow" : ""}`}
                onClick={onStartTutorial}
                disabled={busy}
              >
                <strong>Play the tutorial!</strong>
              </button>
            </div>
          ) : (
            renderCampaignMap()
          )}
        </div>
      )}
    </section>
  );
}
