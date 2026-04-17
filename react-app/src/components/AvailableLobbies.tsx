import type { LobbySummary } from "../types/game";

interface AvailableLobbiesProps {
  lobbies: LobbySummary[];
  busy: boolean;
  onJoinLobby: (gameId: string) => Promise<void>;
}

export function AvailableLobbies({
  lobbies,
  busy,
  onJoinLobby,
}: AvailableLobbiesProps) {
  return (
    <section className="panel lobby-panel">
      <p className="eyebrow">Available lobbies</p>
      <h2>Join game</h2>

      <div className="lobby-list">
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
    </section>
  );
}
