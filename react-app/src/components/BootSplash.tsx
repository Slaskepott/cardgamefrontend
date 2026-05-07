interface BootSplashProps {
  progress: number;
}

function getBootStatus(progress: number) {
  if (progress < 18) {
    return "Loading game assets";
  }
  if (progress < 38) {
    return "Preparing battle arena";
  }
  if (progress < 58) {
    return "Loading card effects";
  }
  if (progress < 78) {
    return "Initializing player profiles";
  }
  if (progress < 96) {
    return "Synchronizing match systems";
  }
  return "Finalizing startup";
}

export function BootSplash({ progress }: BootSplashProps) {
  return (
    <section className="boot-splash" aria-live="polite">
      <div className="marketing-battle-scene boot-battle-scene" aria-hidden="true">
        <div className="marketing-board-shell boot-board-shell">
          <div className="marketing-health-lane boot-health-lane">
            <div className="marketing-health-card enemy">
              <span className="marketing-avatar">🤖</span>
              <div className="marketing-health-bars">
                <span className="marketing-player-name">Clockwork Rival</span>
                <span className="marketing-health-bar">
                  <span className="marketing-health-fill enemy-fill" />
                </span>
              </div>
            </div>
            <div className="marketing-battle-banner boot-battle-banner">
              <strong>Loading duel</strong>
              <span>{getBootStatus(progress)}</span>
            </div>
            <div className="marketing-health-card you">
              <span className="marketing-avatar">🧙</span>
              <div className="marketing-health-bars">
                <span className="marketing-player-name">You</span>
                <span className="marketing-health-bar">
                  <span className="marketing-health-fill you-fill" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="boot-splash-stars" aria-hidden="true">
        <span className="boot-star boot-star-1" />
        <span className="boot-star boot-star-2" />
        <span className="boot-star boot-star-3" />
        <span className="boot-star boot-star-4" />
        <span className="boot-star boot-star-5" />
        <span className="boot-star boot-star-6" />
      </div>

      <div className="boot-splash-copy">
        <p className="boot-splash-label">By AI Slop Studios</p>
        <h1>SLASKECARDS</h1>
        <p className="boot-splash-tagline">
          Loading elemental duels, strange cards, and unnecessary spectacle.
        </p>

        <div className="boot-progress-shell">
          <div
            className="boot-progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div className="boot-progress-sheen" aria-hidden="true" />
        </div>

        <div className="boot-progress-meta">
          <span>{getBootStatus(progress)}</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
      </div>
    </section>
  );
}
