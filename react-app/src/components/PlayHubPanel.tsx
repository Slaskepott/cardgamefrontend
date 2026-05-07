import { useState } from "react";

type PlayMode = "multiplayer" | "singleplayer";

interface PlayHubPanelProps {
  gameId: string;
  gameIdError?: string | null;
  playerId: string;
  lockedPlayerAvatar?: string | null;
  lockedPlayerName?: string | null;
  onGameIdChange: (value: string) => void;
  onPlayerIdChange: (value: string) => void;
  onCreateGame: (gameId: string, playerId: string) => Promise<void>;
  onJoinGame: (gameId: string, playerId: string) => Promise<void>;
  onStartBotMatch: (difficulty: "easy" | "medium" | "hard") => Promise<void>;
  busy: boolean;
}

export function PlayHubPanel({
  gameId,
  gameIdError,
  playerId,
  lockedPlayerAvatar,
  lockedPlayerName,
  onGameIdChange,
  onPlayerIdChange,
  onCreateGame,
  onJoinGame,
  onStartBotMatch,
  busy,
}: PlayHubPanelProps) {
  const [mode, setMode] = useState<PlayMode>("multiplayer");

  async function handleMultiplayer(modeAction: "create" | "join") {
    const resolvedPlayerName = lockedPlayerName ?? playerId;
    if (modeAction === "create") {
      await onCreateGame(gameId, resolvedPlayerName);
      return;
    }
    await onJoinGame(gameId, resolvedPlayerName);
  }

  return (
    <section className="panel lobby-panel play-hub-panel">
      <div className="section-header play-hub-header">
        <div>
          <p className="eyebrow">{mode === "multiplayer" ? "Multiplayer" : "Singleplayer"}</p>
          <h2>{mode === "multiplayer" ? "Start a live Slaskecards match" : "Play against a bot"}</h2>
          <p className="panel-copy">
            {mode === "multiplayer"
              ? "Host a lobby or jump into an existing duel. Leave a field blank and Slaskecards will generate it for you."
              : "Practice against Easy, Medium, or Hard bots. Bot matches feel real, but they do not affect Elo or progression."}
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
                <span className="player-avatar-badge">{lockedPlayerAvatar ?? "👤"}</span>
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
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleMultiplayer("create")}
            >
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
      )}
    </section>
  );
}
