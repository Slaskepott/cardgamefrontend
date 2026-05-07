import type { CSSProperties } from "react";

interface MarketingHeroProps {
  onEnter: () => void;
}

const backgroundCards = [
  { rank: "A", suit: "Fire", accent: "accent-fire", delay: "0s" },
  { rank: "Q", suit: "Water", accent: "accent-water", delay: "0.45s" },
  { rank: "10", suit: "Earth", accent: "accent-earth", delay: "0.2s" },
  { rank: "Joker", suit: "Wild", accent: "accent-wild", delay: "0.7s" },
  { rank: "K", suit: "Air", accent: "accent-air", delay: "0.35s" },
];

export function MarketingHero({ onEnter }: MarketingHeroProps) {
  return (
    <section className="marketing-hero">
      <div className="marketing-battle-scene" aria-hidden="true">
        <div className="marketing-board-shell">
          <div className="marketing-health-lane">
            <div className="marketing-health-card enemy">
              <span className="marketing-avatar">🤖</span>
              <div className="marketing-health-bars">
                <span className="marketing-player-name">Clockwork Rival</span>
                <span className="marketing-health-bar">
                  <span className="marketing-health-fill enemy-fill" />
                </span>
              </div>
            </div>
            <div className="marketing-battle-banner">
              <strong>Flush house</strong>
              <span>92 damage • Multiplier x7</span>
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
          <div className="marketing-card-fan">
            {backgroundCards.map((card, index) => (
              <article
                key={`${card.rank}-${card.suit}`}
                className={`marketing-card ${card.accent}`}
                style={{ ["--hero-delay" as never]: card.delay, ["--hero-index" as never]: index } as CSSProperties}
              >
                <span className="marketing-card-corner">{card.rank}</span>
                <span className="marketing-card-suit">{card.suit}</span>
                <strong>{card.rank}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="marketing-hero-copy">
        <p className="eyebrow">Elemental deck duels</p>
        <h1>Slaskecards</h1>
        <p className="marketing-zinger">
          Draft chaos. Read the board. Hit absurd hands.
        </p>
        <button type="button" className="marketing-play-button" onClick={onEnter}>
          Play now
        </button>
      </div>
    </section>
  );
}
