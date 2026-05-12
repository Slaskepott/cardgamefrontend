import { useEffect } from "react";
import type { MatchOverMessage } from "../types/game";
import { launchVictoryConfetti } from "../lib/confetti";
import { playVictorySound } from "../lib/audio";

interface MatchResultOverlayProps {
  matchResult: MatchOverMessage;
  playerId: string | null;
  onLeaveLobby: () => Promise<void>;
}

function formatEloDelta(delta: number | null) {
  if (delta === null || Number.isNaN(delta)) {
    return "Guest";
  }

  return `${delta > 0 ? "+" : ""}${delta}`;
}

export function MatchResultOverlay({
  matchResult,
  playerId,
  onLeaveLobby,
}: MatchResultOverlayProps) {
  const didPlayerWin = Boolean(playerId && matchResult.winner === playerId);

  useEffect(() => {
    launchVictoryConfetti();
    playVictorySound(didPlayerWin);
  }, [didPlayerWin]);

  const botMatch = Boolean(matchResult.is_bot_match || matchResult.progression_disabled);
  const playerEntries = Object.entries(matchResult.avatars).map(([name, avatar]) => {
    const elo = matchResult.elo_changes[name] ?? {
      before: null,
      after: null,
      delta: null,
    };
    return {
      name,
      avatar,
      wins: matchResult.scores[name] ?? 0,
      elo,
      isWinner: name === matchResult.winner,
      isYou: playerId === name,
    };
  });

  return (
    <div className="match-result-overlay">
      <section className="match-result-panel">
        <p className="eyebrow">Match complete</p>
        <h2>{matchResult.winner} wins the match</h2>
        <p className="panel-copy compact-copy">{matchResult.reason}</p>
        {botMatch ? (
          <p className="panel-copy compact-copy match-result-subtitle">
            Practice match versus a bot. No rating or progression changes.
          </p>
        ) : null}

        <div className="match-result-player-grid">
          {playerEntries.map((entry) => (
            <article
              key={entry.name}
              className={`match-result-player${entry.isWinner ? " winner" : " loser"}`}
            >
              <div className="match-result-player-head">
                <span className="player-avatar-badge match-result-avatar">{entry.avatar}</span>
                <div>
                  <strong>
                    {entry.name}
                    {entry.isYou ? " (You)" : ""}
                  </strong>
                  <span>{entry.wins} round wins</span>
                </div>
              </div>
              <div className="match-result-elo-block">
                {botMatch ? (
                  <span className="match-result-elo-total">No rating changes</span>
                ) : (
                  <>
                    <span className="match-result-elo-total">
                      {entry.elo.after !== null ? `Elo ${entry.elo.after}` : "Guest account"}
                    </span>
                    <span
                      className={`match-result-elo-delta${
                        (entry.elo.delta ?? 0) >= 0 ? " positive" : " negative"
                      }`}
                    >
                      {formatEloDelta(entry.elo.delta)}
                    </span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="button-row">
          <button type="button" onClick={() => void onLeaveLobby()}>
            Back to lobby
          </button>
        </div>
      </section>
    </div>
  );
}
