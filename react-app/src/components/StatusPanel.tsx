interface StatusPanelProps {
  apiBaseUrl: string;
  websocketConnected: boolean;
  gameId: string | null;
  playerId: string | null;
  players: string[];
}

export function StatusPanel({
  apiBaseUrl,
  websocketConnected,
  gameId,
  playerId,
  players,
}: StatusPanelProps) {
  return (
    <section className="panel status-panel">
      <div>
        <p className="eyebrow">Connection</p>
        <h2>{websocketConnected ? "Socket live" : "Socket idle"}</h2>
      </div>

      <dl className="status-grid">
        <div>
          <dt>Backend</dt>
          <dd>{apiBaseUrl}</dd>
        </div>
        <div>
          <dt>Game</dt>
          <dd>{gameId ?? "Not joined"}</dd>
        </div>
        <div>
          <dt>Player</dt>
          <dd>{playerId ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Lobby size</dt>
          <dd>{players.length}</dd>
        </div>
      </dl>

      <div>
        <p className="eyebrow">Players</p>
        <ul className="player-list">
          {players.length === 0 ? <li>No players in the lobby yet.</li> : null}
          {players.map((player) => (
            <li key={player}>{player}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

