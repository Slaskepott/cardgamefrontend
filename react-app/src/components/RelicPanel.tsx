import type { Relic } from "../types/game";

interface RelicPanelProps {
  relics: Relic[];
  ownedRelics: Relic[];
  enemyRelics: Relic[];
  enemyPlayerName?: string | null;
  busy: boolean;
  waitingText: string;
  waitingOnYou: boolean;
  onChooseRelic: (relicId: string) => Promise<void>;
  onLeaveLobby: () => Promise<void>;
}

function RelicList({
  title,
  relics,
  emptyText,
}: {
  title: string;
  relics: Relic[];
  emptyText: string;
}) {
  return (
    <div className="relic-summary">
      <h3>{title}</h3>
      {relics.length === 0 ? (
        <p className="panel-copy">{emptyText}</p>
      ) : (
        <ul className="relic-summary-list">
          {relics.map((relic) => (
            <li key={`${title}-${relic.id}`}>
              <strong>{relic.name}</strong>
              <span>{relic.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RelicPanel({
  relics,
  ownedRelics,
  enemyRelics,
  enemyPlayerName,
  busy,
  waitingText,
  waitingOnYou,
  onChooseRelic,
  onLeaveLobby,
}: RelicPanelProps) {
  const pickedAlready = relics.length === 0;

  return (
    <section className="panel relic-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Relic round</p>
          <h2>Choose a relic</h2>
          <p className="panel-copy compact-copy">
            Relics last for the rest of the match and can twist the whole build.
          </p>
        </div>
      </div>

      {!pickedAlready ? (
        <div className="relic-grid">
          {relics.map((relic) => (
            <button
              type="button"
              key={relic.id}
              className={`relic-card relic-theme-${relic.theme}`}
              onClick={() => void onChooseRelic(relic.id)}
              disabled={busy}
            >
              <span className="relic-card-crest" aria-hidden="true" />
              <strong>{relic.name}</strong>
              <span>{relic.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="relic-picked-state">
          <p className={`shop-status-text ${waitingOnYou ? "shop-status-text-urgent" : ""}`}>
            {waitingText}
          </p>
        </div>
      )}

      <div className="upgrade-comparison shop-upgrade-comparison relic-comparison">
        <RelicList title="My relics" relics={ownedRelics} emptyText="No relics chosen yet." />
        <RelicList
          title={enemyPlayerName ? `Enemy relics (${enemyPlayerName})` : "Enemy relics"}
          relics={enemyRelics}
          emptyText="No enemy relics revealed yet."
        />
      </div>

      <div className="shop-actions">
        <span className={`shop-status-text ${waitingOnYou ? "shop-status-text-urgent" : ""}`}>
          {waitingText}
        </span>
        <button type="button" className="secondary" onClick={() => void onLeaveLobby()}>
          Leave lobby
        </button>
      </div>
    </section>
  );
}
