import { useMemo, useState } from "react";
import type { CampaignNode, MetaProgress } from "../types/game";

type PlayMode = "multiplayer" | "singleplayer";
type SingleplayerMode = "practice" | "campaign";

const fallbackCampaignNodes: CampaignNode[] = [
  { id: "ember_wake", region: 1, index: 1, name: "Ember Wake", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "A fire-leaning opener. The rival drafts toward flame draw and direct damage." },
  { id: "second_deal", region: 1, index: 2, name: "Second Deal", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "A sly merchant duel. The enemy shops harder and always finds one more reroll." },
  { id: "moss_ledger", region: 1, index: 3, name: "Moss Ledger", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "A slower grind through bark and stone. Expect armor, health, and resistance scaling." },
  { id: "cinder_marquis", region: 1, index: 4, name: "The Cinder Marquis", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Soft Flush is always on, and the boss always shops premium." },
  { id: "slipstream_table", region: 2, index: 5, name: "Slipstream Table", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "A fast air table built around tempo and high cards." },
  { id: "house_of_echoes", region: 2, index: 6, name: "House of Echoes", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "Combo lines echo, and repeat-hand pressure appears more often." },
  { id: "floodmarked_vault", region: 2, index: 7, name: "Floodmarked Vault", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "A water-heavy vault with flush packages and relic synergy." },
  { id: "archivist_of_gaps", region: 2, index: 8, name: "The Archivist of Gaps", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Gap Straight is always on, and the boss starts each round with an extra card." },
  { id: "stonewire_hollow", region: 3, index: 9, name: "Stonewire Hollow", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "Earth draw, armor, and low-card durability make this table stubborn." },
  { id: "prism_tax", region: 3, index: 10, name: "Prism Tax", type: "bo3", best_of: 3, wins_to_clinch: 2, description: "A punishing elemental specialist that taxes predictable suit lines." },
  { id: "the_fifth_seat", region: 3, index: 11, name: "The Fifth Seat", type: "bo5", best_of: 5, wins_to_clinch: 3, description: "A fuller-handed duel with stronger relic pressure and larger shops." },
  { id: "the_house_edge", region: 3, index: 12, name: "The House Edge", type: "boss", best_of: 9, wins_to_clinch: 5, description: "Gap Straight, Soft Flush, a free relic, and oversized shops." },
];

interface PlayHubPanelProps {
  gameId: string;
  gameIdError?: string | null;
  playerId: string;
  lockedPlayerAvatar?: string | null;
  lockedPlayerBorder?: string | null;
  lockedPlayerName?: string | null;
  metaProgress: MetaProgress | null;
  signedIn: boolean;
  onGameIdChange: (value: string) => void;
  onPlayerIdChange: (value: string) => void;
  onCreateGame: (gameId: string, playerId: string) => Promise<void>;
  onJoinGame: (gameId: string, playerId: string) => Promise<void>;
  onStartBotMatch: (difficulty: "easy" | "medium" | "hard") => Promise<void>;
  onStartCampaignNode: (nodeId: string) => Promise<void>;
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
  metaProgress,
  signedIn,
  onGameIdChange,
  onPlayerIdChange,
  onCreateGame,
  onJoinGame,
  onStartBotMatch,
  onStartCampaignNode,
  busy,
}: PlayHubPanelProps) {
  const [mode, setMode] = useState<PlayMode>("multiplayer");
  const [singleplayerMode, setSingleplayerMode] = useState<SingleplayerMode>("practice");
  const campaignNodes = metaProgress?.campaign_nodes?.length
    ? metaProgress.campaign_nodes
    : fallbackCampaignNodes;
  const campaignGroups = useMemo(
    () => groupCampaignNodes(campaignNodes),
    [campaignNodes],
  );
  const clearedNodeIds = new Set(metaProgress?.campaign_progress?.cleared_node_ids ?? []);
  const currentNodeId = metaProgress?.campaign_progress?.current_node_id ?? fallbackCampaignNodes[0].id;

  async function handleMultiplayer(modeAction: "create" | "join") {
    const resolvedPlayerName = lockedPlayerName ?? playerId;
    if (modeAction === "create") {
      await onCreateGame(gameId, resolvedPlayerName);
      return;
    }
    await onJoinGame(gameId, resolvedPlayerName);
  }

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

  return (
    <section className="panel lobby-panel play-hub-panel">
      <div className="section-header play-hub-header">
        <div>
          <p className="eyebrow">{mode === "multiplayer" ? "Multiplayer" : "Singleplayer"}</p>
          <h2>
            {mode === "multiplayer"
              ? "Start a live Slaskecards match"
              : singleplayerMode === "practice"
                ? "Play against a bot"
                : "Climb the campaign table"}
          </h2>
          <p className="panel-copy">
            {mode === "multiplayer"
              ? "Host a lobby or jump into an existing duel. Leave a field blank and Slaskecards will generate it for you."
              : singleplayerMode === "practice"
                ? "Practice against Easy, Medium, or Hard bots. Bot matches feel real, but they do not affect Elo or progression."
                : "Take on an authored route of unfair houses, escalating match formats, and campaign-only rewards."}
          </p>
        </div>
        <div className="play-mode-toggle" role="tablist" aria-label="Choose game mode">
          <button
            type="button"
            className={mode === "multiplayer" ? "play-mode-pill active" : "play-mode-pill"}
            onClick={() => setMode("multiplayer")}
          >
            Multiplayer
          </button>
          <button
            type="button"
            className={mode === "singleplayer" ? "play-mode-pill active" : "play-mode-pill"}
            onClick={() => setMode("singleplayer")}
          >
            Singleplayer
          </button>
        </div>
      </div>

      {mode === "multiplayer" ? (
        <form className="setup-form play-hub-form" onSubmit={(event) => event.preventDefault()}>
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
                  {lockedPlayerAvatar ?? "ðŸ‘¤"}
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
            <button type="button" disabled={busy} onClick={() => void handleMultiplayer("create")}>
              {busy ? "Working..." : "Host lobby"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="secondary"
              onClick={() => void handleMultiplayer("join")}
            >
              Join lobby
            </button>
          </div>
        </form>
      ) : (
        <div className="singleplayer-panel-stack">
          <div className="play-mode-toggle nested" role="tablist" aria-label="Choose singleplayer mode">
            <button
              type="button"
              className={singleplayerMode === "practice" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setSingleplayerMode("practice")}
            >
              Practice
            </button>
            <button
              type="button"
              className={singleplayerMode === "campaign" ? "play-mode-pill active" : "play-mode-pill"}
              onClick={() => setSingleplayerMode("campaign")}
            >
              Campaign
            </button>
          </div>

          {singleplayerMode === "practice" ? (
            <div className="play-hub-bot-stack">
              <button type="button" disabled={busy} onClick={() => void onStartBotMatch("easy")}>
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
          ) : (
            renderCampaignMap()
          )}
        </div>
      )}
    </section>
  );
}
