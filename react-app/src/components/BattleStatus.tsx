import type { BattleMoment } from "../types/game";

interface PlayerStatus {
  id: string;
  avatar: string;
  health: number;
  maxHealth: number;
  wins: number;
}

interface BattleStatusProps {
  players: PlayerStatus[];
  currentTurn: string | null;
  battleMoment: BattleMoment | null;
  playerGold: number;
  playerId: string | null;
  shopOpen: boolean;
  onLeaveLobby: () => Promise<void>;
}

export function BattleStatus({
  players,
  currentTurn,
  battleMoment,
  playerGold,
  playerId,
  shopOpen,
  onLeaveLobby,
}: BattleStatusProps) {
  const matchReady = players.length > 1;
  const otherPlayers = players
    .map((player) => player.id)
    .filter((id) => id !== playerId);

  let headline = "Waiting for the match to start";
  let detail = "";

  if (shopOpen) {
    headline = "Shopping round is live";
    detail =
      otherPlayers.length > 0
        ? `Waiting for these players to finish shopping: ${otherPlayers.join(", ")}.`
        : "Choose upgrades, then continue when you're ready for the next round.";
  } else if (!matchReady) {
    headline = "Waiting for the match to start";
    detail =
      otherPlayers.length > 0
        ? `Waiting for ${otherPlayers.join(", ")} to connect fully.`
        : "Waiting for another player to join the lobby.";
  } else if (currentTurn && playerId && currentTurn === playerId) {
    headline = "It's your turn!";
    detail = "Pick up to 5 cards, then play a hand, discard, or end your turn.";
  } else if (currentTurn) {
    headline = `Waiting for ${currentTurn}`;
    detail = "Watch the board and get ready for your next move.";
  }

  return (
    <section className="panel battle-status-panel">
      <div className="battle-status-top">
        <div className="battle-status-copy">
          <h2>{headline}</h2>
          {detail ? <p className="panel-copy compact-copy">{detail}</p> : null}
        </div>
        <div className="battle-metrics battle-status-actions">
          <span>Gold: {playerGold}</span>
          <button type="button" className="secondary" onClick={() => void onLeaveLobby()}>
            Leave lobby
          </button>
        </div>
      </div>

      <div className="health-row">
        {players.length === 0 ? <p className="panel-copy">No battle state yet.</p> : null}
        {players.map((player) => {
          const percentage =
            player.maxHealth > 0 ? Math.max(0, (player.health / player.maxHealth) * 100) : 0;
          const defeatedThisRound = battleMoment?.winner && battleMoment.target === player.id;
          return (
            <article
              key={player.id}
              className={`health-card${
                battleMoment?.target === player.id ? " health-card-damaged" : ""
              }${battleMoment?.attacker === player.id ? " health-card-attacker" : ""}${
                defeatedThisRound ? " health-card-defeated" : ""
              }`}
            >
              <div className="health-meta">
                <strong className="health-player-name">
                  <span className="player-avatar-badge health-avatar">{player.avatar}</span>
                  {player.id}
                </strong>
                <span>{player.wins} wins</span>
              </div>
              <div className="health-bar-shell">
                <div className="health-bar-fill" style={{ width: `${percentage}%` }} />
              </div>
              <div className="health-meta health-meta-bottom">
                <span>
                  {player.health} / {player.maxHealth}
                </span>
              </div>
              {battleMoment?.target === player.id ? (
                <span className="damage-burst" aria-hidden="true">
                  -{battleMoment.damage}
                </span>
              ) : null}
              {defeatedThisRound ? (
                <span className="defeat-burst" aria-hidden="true">
                  cracked
                </span>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
