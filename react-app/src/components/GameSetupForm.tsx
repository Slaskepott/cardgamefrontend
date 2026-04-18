interface GameSetupFormProps {
  gameId: string;
  gameIdError?: string | null;
  playerId: string;
  lockedPlayerAvatar?: string | null;
  lockedPlayerName?: string | null;
  onGameIdChange: (value: string) => void;
  onPlayerIdChange: (value: string) => void;
  onCreateGame: (gameId: string, playerId: string) => Promise<void>;
  onJoinGame: (gameId: string, playerId: string) => Promise<void>;
  busy: boolean;
}

export function GameSetupForm({
  gameId,
  gameIdError,
  playerId,
  lockedPlayerAvatar,
  lockedPlayerName,
  onGameIdChange,
  onPlayerIdChange,
  onCreateGame,
  onJoinGame,
  busy,
}: GameSetupFormProps) {
  const canSubmit = !busy;

  async function handleSubmit(mode: "create" | "join") {
    const resolvedPlayerName = lockedPlayerName ?? playerId;
    if (mode === "create") {
      await onCreateGame(gameId, resolvedPlayerName);
      return;
    }

    await onJoinGame(gameId, resolvedPlayerName);
  }

  return (
    <section className="panel">
      <p className="eyebrow">Join lobby</p>
      <h2>Start or enter a Slaskecards match</h2>
      <p className="panel-copy">
        Choose a lobby name and player name if you want to customize them, or leave
        either field blank and Slaskecards will generate one for you.
      </p>

      <form
        className="setup-form"
        onSubmit={(event) => event.preventDefault()}
      >
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
            disabled={!canSubmit}
            onClick={() => void handleSubmit("create")}
          >
            {busy ? "Working..." : "Host lobby"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            className="secondary"
            onClick={() => void handleSubmit("join")}
          >
            Join lobby
          </button>
        </div>
      </form>
    </section>
  );
}



