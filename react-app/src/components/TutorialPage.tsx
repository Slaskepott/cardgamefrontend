import { useEffect, useMemo, useState } from "react";
import type { Card } from "../types/game";
import { buildHandPreview } from "../lib/handPreview";
import { launchVictoryConfetti } from "../lib/confetti";
import { playVictorySound } from "../lib/audio";

interface TutorialPageProps {
  onCompleteTutorial: () => void | Promise<void>;
  onBackToLobby: () => void;
}

const openingAttack: Card[] = [
  { rank: "8", suit: "Fire" },
  { rank: "8", suit: "Water" },
  { rank: "8", suit: "Earth" },
  { rank: "K", suit: "Air" },
  { rank: "K", suit: "Fire" },
];

const botAttack: Card[] = [
  { rank: "6", suit: "Water" },
  { rank: "7", suit: "Water" },
  { rank: "8", suit: "Water" },
  { rank: "9", suit: "Water" },
  { rank: "10", suit: "Water" },
];

const weakHand: Card[] = [
  { rank: "2", suit: "Fire" },
  { rank: "4", suit: "Water" },
  { rank: "7", suit: "Earth" },
  { rank: "8", suit: "Air" },
  { rank: "J", suit: "Fire" },
];

const improvedHand: Card[] = [
  { rank: "5", suit: "Fire" },
  { rank: "6", suit: "Water" },
  { rank: "7", suit: "Earth" },
  { rank: "8", suit: "Air" },
  { rank: "9", suit: "Fire" },
];

const finishingAttack: Card[] = [
  { rank: "9", suit: "Earth" },
  { rank: "10", suit: "Earth" },
  { rank: "J", suit: "Earth" },
  { rank: "Q", suit: "Earth" },
  { rank: "K", suit: "Earth" },
];

const tutorialShop = [
  { id: 1, name: "Increase Fire Damage", effect: "+20% Fire Damage", rarity: "rare", cost: 6 },
  { id: 2, name: "Increase Discards", effect: "+1 Discard", rarity: "uncommon", cost: 4 },
  { id: 3, name: "Increase Health", effect: "+20 HP", rarity: "common", cost: 4 },
];

function titleCase(input: string) {
  return input.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TutorialCard({ card }: { card: Card }) {
  return (
    <div className={`tutorial-card suit-${card.suit.toLowerCase()}`}>
      <span className="tutorial-card-rank">{card.rank}</span>
      <span className="tutorial-card-suit">{card.suit}</span>
    </div>
  );
}

export function TutorialPage({ onCompleteTutorial, onBackToLobby }: TutorialPageProps) {
  const [step, setStep] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [discardImproved, setDiscardImproved] = useState(false);
  const [boughtUpgradeId, setBoughtUpgradeId] = useState<number | null>(null);
  const [completionTracked, setCompletionTracked] = useState(false);

  const openingPreview = useMemo(() => buildHandPreview(openingAttack, [], [], null, []), []);
  const botPreview = useMemo(() => buildHandPreview(botAttack, [], [], null, []), []);
  const discardPreview = useMemo(
    () => buildHandPreview(discardImproved ? improvedHand : weakHand, [], [], null, []),
    [discardImproved],
  );
  const finishingPreview = useMemo(() => buildHandPreview(finishingAttack, [], [], null, []), []);

  useEffect(() => {
    if (step === 4 && boughtUpgradeId !== null) {
      launchVictoryConfetti();
      playVictorySound(true);
    }
  }, [step, boughtUpgradeId]);

  useEffect(() => {
    if (step === 4 && boughtUpgradeId !== null && !completionTracked) {
      setCompletionTracked(true);
      void onCompleteTutorial();
    }
  }, [boughtUpgradeId, completionTracked, onCompleteTutorial, step]);

  const currentDiscardHand = discardImproved ? improvedHand : weakHand;

  return (
    <section className="panel account-page-panel tutorial-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tutorial</p>
          <h2>Play one tiny practice round</h2>
          <p className="panel-copy">
            One attack, one bot attack, one discard, one more attack, then a quick shop stop.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary" onClick={onBackToLobby}>
            Back to lobby
          </button>
        </div>
      </div>

      <div className="tutorial-stepper">
        {["Attack", "Bot attack", "Discard", "Attack", "Shop"].map((label, index) => (
          <div
            key={label}
            className={`tutorial-step-pill${index === step ? " active" : ""}${index < step ? " complete" : ""}`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="tutorial-duel-strip">
        <article className="health-card tutorial-health-card">
          <div className="health-meta">
            <strong className="health-player-name">
              <span className="player-avatar-badge health-avatar">🤖</span>
              Tutorial bot
            </strong>
            <span>{enemyHealth} HP</span>
          </div>
          <div className="health-bar-shell">
            <div className="health-bar-fill" style={{ width: `${Math.max(enemyHealth, 0)}%` }} />
          </div>
        </article>
        <article className="health-card tutorial-health-card">
          <div className="health-meta">
            <strong className="health-player-name">
              <span className="player-avatar-badge health-avatar">🧑</span>
              You
            </strong>
            <span>{playerHealth} HP</span>
          </div>
          <div className="health-bar-shell">
            <div className="health-bar-fill player" style={{ width: `${Math.max(playerHealth, 0)}%` }} />
          </div>
        </article>
      </div>

      {step === 0 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Open with a real hand</h3>
            <p className="panel-copy compact-copy">
              These five cards are already selected. A full house gives you strong damage and good gold.
            </p>
          </div>
          <article className="hand-preview-panel active tutorial-preview-panel">
            <div className="hand-preview-copy">
              <span className="hand-preview-label">Selected hand preview</span>
              <strong>
                {titleCase(openingPreview?.handType ?? "full house")}{" "}
                <span className="hand-preview-inline-multiplier">
                  (Multiplier x{openingPreview?.multiplier ?? 1})
                </span>
              </strong>
              <span>Good hands are your engine. Bigger combos mean bigger hits and more gold.</span>
            </div>
            <div className="hand-preview-metrics">
              <span>Deals {openingPreview?.damage ?? 0} damage</span>
            </div>
          </article>
          <div className="tutorial-card-row">
            {openingAttack.map((card, index) => (
              <TutorialCard key={`opening-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                setEnemyHealth(Math.max(0, 100 - (openingPreview?.damage ?? 0)));
                setStep(1);
              }}
            >
              Play hand
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>The bot hits back</h3>
            <p className="panel-copy compact-copy">
              Combat is alternating. After your hand resolves, the bot gets its own turn.
            </p>
          </div>
          <article className="hand-preview-panel active tutorial-preview-panel">
            <div className="hand-preview-copy">
              <span className="hand-preview-label">Bot hand preview</span>
              <strong>
                {titleCase(botPreview?.handType ?? "flush")}{" "}
                <span className="hand-preview-inline-multiplier">
                  (Multiplier x{botPreview?.multiplier ?? 1})
                </span>
              </strong>
              <span>The bot is holding a clean flush.</span>
            </div>
            <div className="hand-preview-metrics">
              <span>Deals {botPreview?.damage ?? 0} damage</span>
            </div>
          </article>
          <div className="tutorial-card-row">
            {botAttack.map((card, index) => (
              <TutorialCard key={`bot-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                setPlayerHealth(Math.max(0, 100 - (botPreview?.damage ?? 0)));
                setStep(2);
              }}
            >
              Let the bot play
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Fix weak hands with discards</h3>
            <p className="panel-copy compact-copy">
              This hand starts weak. Discarding the bad cards turns it into a straight.
            </p>
          </div>
          <article className="hand-preview-panel active tutorial-preview-panel">
            <div className="hand-preview-copy">
              <span className="hand-preview-label">Current hand</span>
              <strong>
                {titleCase(discardPreview?.handType ?? "high card")}{" "}
                <span className="hand-preview-inline-multiplier">
                  (Multiplier x{discardPreview?.multiplier ?? 1})
                </span>
              </strong>
              <span>
                {discardImproved
                  ? "Much better. Now the hand is worth playing."
                  : "Use a discard when the opening shape is weak."}
              </span>
            </div>
            <div className="hand-preview-metrics">
              <span>Deals {discardPreview?.damage ?? 0} damage</span>
            </div>
          </article>
          <div className="tutorial-card-row">
            {currentDiscardHand.map((card, index) => (
              <TutorialCard key={`discard-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            {!discardImproved ? (
              <button type="button" onClick={() => setDiscardImproved(true)}>
                Discard into a straight
              </button>
            ) : (
              <button type="button" onClick={() => setStep(3)}>
                Continue
              </button>
            )}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Attack again</h3>
            <p className="panel-copy compact-copy">
              One more attack to close the round. This time you’ve built a straight flush.
            </p>
          </div>
          <article className="hand-preview-panel active tutorial-preview-panel">
            <div className="hand-preview-copy">
              <span className="hand-preview-label">Selected hand preview</span>
              <strong>
                {titleCase(finishingPreview?.handType ?? "straight flush")}{" "}
                <span className="hand-preview-inline-multiplier">
                  (Multiplier x{finishingPreview?.multiplier ?? 1})
                </span>
              </strong>
              <span>That’s the kind of payoff discards are meant to create.</span>
            </div>
            <div className="hand-preview-metrics">
              <span>Deals {finishingPreview?.damage ?? 0} damage</span>
            </div>
          </article>
          <div className="tutorial-card-row">
            {finishingAttack.map((card, index) => (
              <TutorialCard key={`finishing-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                setEnemyHealth(Math.max(0, enemyHealth - (finishingPreview?.damage ?? 0)));
                setStep(4);
              }}
            >
              Play the second hand
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Round over: visit the shop</h3>
            <p className="panel-copy compact-copy">
              Between rounds, spend gold to shape your build. Pick one upgrade and you’re done.
            </p>
          </div>
          <div className="tutorial-shop-grid">
            {tutorialShop.map((upgrade) => (
              <button
                key={upgrade.id}
                type="button"
                className={`upgrade-card ${upgrade.rarity} tutorial-shop-card${
                  boughtUpgradeId === upgrade.id ? " tutorial-shop-card-bought" : ""
                }`}
                onClick={() => setBoughtUpgradeId(upgrade.id)}
              >
                <div className="upgrade-card-content">
                  <span className="upgrade-price">{upgrade.cost} gold</span>
                  <span className="upgrade-emoji" aria-hidden="true">
                    ✨
                  </span>
                  <strong>{upgrade.name}</strong>
                  <span>{upgrade.effect}</span>
                  <span className="upgrade-rarity-label">{upgrade.rarity}</span>
                </div>
              </button>
            ))}
          </div>
          {boughtUpgradeId !== null ? (
            <div className="tutorial-summary-grid">
              <article className="tutorial-summary-card">
                <strong>That’s the full loop</strong>
                <span>Attack, survive the return hit, use discards, attack again, then shop.</span>
              </article>
            </div>
          ) : null}
          <div className="button-row">
            {boughtUpgradeId === null ? null : (
              <button type="button" onClick={onBackToLobby}>
                Back to lobby
              </button>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
