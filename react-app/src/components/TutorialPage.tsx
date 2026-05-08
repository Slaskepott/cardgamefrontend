import { useEffect, useMemo, useState } from "react";
import type { Card } from "../types/game";
import { buildHandPreview } from "../lib/handPreview";
import { launchVictoryConfetti } from "../lib/confetti";

interface TutorialPageProps {
  onBackToLobby: () => void;
}

const handExamples: { name: string; cards: Card[]; tip: string; multiplier: number }[] = [
  {
    name: "High card",
    cards: [
      { rank: "2", suit: "Fire" },
      { rank: "5", suit: "Water" },
      { rank: "8", suit: "Earth" },
      { rank: "J", suit: "Air" },
      { rank: "K", suit: "Fire" },
    ],
    tip: "No combo, just raw card value.",
    multiplier: 1,
  },
  {
    name: "Pair",
    cards: [
      { rank: "7", suit: "Fire" },
      { rank: "7", suit: "Water" },
      { rank: "3", suit: "Earth" },
      { rank: "10", suit: "Air" },
      { rank: "Q", suit: "Fire" },
    ],
    tip: "A simple opener with a small multiplier.",
    multiplier: 2,
  },
  {
    name: "Two pair",
    cards: [
      { rank: "4", suit: "Fire" },
      { rank: "4", suit: "Water" },
      { rank: "9", suit: "Earth" },
      { rank: "9", suit: "Air" },
      { rank: "A", suit: "Fire" },
    ],
    tip: "More stable than a single pair.",
    multiplier: 2,
  },
  {
    name: "Three of a kind",
    cards: [
      { rank: "8", suit: "Fire" },
      { rank: "8", suit: "Water" },
      { rank: "8", suit: "Earth" },
      { rank: "J", suit: "Air" },
      { rank: "A", suit: "Water" },
    ],
    tip: "A chunky mid-tier hit.",
    multiplier: 3,
  },
  {
    name: "Straight",
    cards: [
      { rank: "6", suit: "Fire" },
      { rank: "7", suit: "Water" },
      { rank: "8", suit: "Earth" },
      { rank: "9", suit: "Air" },
      { rank: "10", suit: "Fire" },
    ],
    tip: "Consecutive ranks, any suits.",
    multiplier: 4,
  },
  {
    name: "Flush",
    cards: [
      { rank: "2", suit: "Water" },
      { rank: "6", suit: "Water" },
      { rank: "9", suit: "Water" },
      { rank: "Q", suit: "Water" },
      { rank: "A", suit: "Water" },
    ],
    tip: "All one suit. Great with elemental bonuses.",
    multiplier: 4,
  },
  {
    name: "Full house",
    cards: [
      { rank: "K", suit: "Fire" },
      { rank: "K", suit: "Water" },
      { rank: "K", suit: "Earth" },
      { rank: "5", suit: "Air" },
      { rank: "5", suit: "Fire" },
    ],
    tip: "Three of a kind plus a pair.",
    multiplier: 4,
  },
  {
    name: "Four of a kind",
    cards: [
      { rank: "9", suit: "Fire" },
      { rank: "9", suit: "Water" },
      { rank: "9", suit: "Earth" },
      { rank: "9", suit: "Air" },
      { rank: "A", suit: "Fire" },
    ],
    tip: "Rare and brutal.",
    multiplier: 7,
  },
  {
    name: "Straight flush",
    cards: [
      { rank: "7", suit: "Earth" },
      { rank: "8", suit: "Earth" },
      { rank: "9", suit: "Earth" },
      { rank: "10", suit: "Earth" },
      { rank: "J", suit: "Earth" },
    ],
    tip: "Consecutive ranks in the same suit.",
    multiplier: 8,
  },
  {
    name: "Royal flush",
    cards: [
      { rank: "10", suit: "Fire" },
      { rank: "J", suit: "Fire" },
      { rank: "Q", suit: "Fire" },
      { rank: "K", suit: "Fire" },
      { rank: "A", suit: "Fire" },
    ],
    tip: "The dream. Max prestige, max damage.",
    multiplier: 10,
  },
];

const attackCards: Card[] = [
  { rank: "K", suit: "Fire" },
  { rank: "K", suit: "Water" },
  { rank: "K", suit: "Earth" },
  { rank: "5", suit: "Air" },
  { rank: "5", suit: "Fire" },
];

const weakDiscardHand: Card[] = [
  { rank: "2", suit: "Fire" },
  { rank: "5", suit: "Water" },
  { rank: "7", suit: "Earth" },
  { rank: "8", suit: "Air" },
  { rank: "9", suit: "Fire" },
];

const improvedDiscardHand: Card[] = [
  { rank: "5", suit: "Water" },
  { rank: "6", suit: "Air" },
  { rank: "7", suit: "Earth" },
  { rank: "8", suit: "Air" },
  { rank: "9", suit: "Fire" },
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

export function TutorialPage({ onBackToLobby }: TutorialPageProps) {
  const [step, setStep] = useState(0);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [discardImproved, setDiscardImproved] = useState(false);
  const [boughtUpgradeId, setBoughtUpgradeId] = useState<number | null>(null);

  const attackPreview = useMemo(() => buildHandPreview(attackCards, [], [], null, []), []);
  const discardPreview = useMemo(
    () => buildHandPreview(discardImproved ? improvedDiscardHand : weakDiscardHand, [], [], null, []),
    [discardImproved],
  );

  useEffect(() => {
    if (step === 4) {
      launchVictoryConfetti();
    }
  }, [step]);

  return (
    <section className="panel account-page-panel tutorial-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tutorial</p>
          <h2>Learn a quick match flow</h2>
          <p className="panel-copy">
            This is a short solo walkthrough: learn the hand ladder, see how attacking works,
            practice a discard, and take one fast shop turn.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary" onClick={onBackToLobby}>
            Back to lobby
          </button>
        </div>
      </div>

      <div className="tutorial-stepper">
        {["Hands", "Attack", "Discard", "Shop", "Finish"].map((label, index) => (
          <div
            key={label}
            className={`tutorial-step-pill${index === step ? " active" : ""}${index < step ? " complete" : ""}`}
          >
            {label}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>The hand ladder</h3>
            <p className="panel-copy compact-copy">
              Most of the game is reading your hand quickly. Better hands get bigger multipliers,
              so poker logic matters more than just slamming your highest ranks. The multiplier is
              also how much gold you earn after playing the hand.
            </p>
          </div>
          <div className="tutorial-hand-grid">
            {handExamples.map((example) => (
              <article key={example.name} className="tutorial-hand-card">
                <div className="tutorial-hand-head">
                  <strong>{example.name}</strong>
                  <span>{example.tip}</span>
                </div>
                <div className="tutorial-hand-rewards">
                  <span>Multiplier x{example.multiplier}</span>
                  <span>+{example.multiplier} gold</span>
                </div>
                <div className="tutorial-mini-cards">
                  {example.cards.map((card, index) => (
                    <TutorialCard key={`${example.name}-${index}`} card={card} />
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setStep(1)}>
              Start practice duel
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Attacking</h3>
            <p className="panel-copy compact-copy">
              On your turn, select up to five cards and play the best hand you can build. Here
              you’ve lined up a full house, which hits much harder than a random pile.
            </p>
          </div>
          <div className="tutorial-duel-strip">
            <article className="health-card tutorial-health-card">
              <div className="health-meta">
                <strong className="health-player-name">
                  <span className="player-avatar-badge health-avatar">😈</span>
                  Training dummy
                </strong>
                <span>{enemyHealth} HP</span>
              </div>
              <div className="health-bar-shell">
                <div className="health-bar-fill" style={{ width: `${enemyHealth}%` }} />
              </div>
            </article>
            <article className="hand-preview-panel active tutorial-preview-panel">
              <div className="hand-preview-copy">
                <span className="hand-preview-label">Selected hand preview</span>
                <strong>
                  {titleCase(attackPreview?.handType ?? "full house")}{" "}
                  <span className="hand-preview-inline-multiplier">
                    (Multiplier x{attackPreview?.multiplier ?? 1})
                  </span>
                </strong>
                <span>Those cards are already selected for you.</span>
              </div>
              <div className="hand-preview-metrics">
                <span>Deals {attackPreview?.damage ?? 0} damage</span>
              </div>
            </article>
          </div>
          <div className="tutorial-card-row">
            {attackCards.map((card, index) => (
              <TutorialCard key={`attack-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                setEnemyHealth(Math.max(0, 100 - (attackPreview?.damage ?? 0)));
                setStep(2);
              }}
            >
              Play hand
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Discarding</h3>
            <p className="panel-copy compact-copy">
              Discards let you reshape weak hands. Here the opening hand is messy. Discarding two
              dead cards turns it into a straight.
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
                  ? "Much better. Now you have a clean straight."
                  : "This is weak. Try cycling into a cleaner shape."}
              </span>
            </div>
            <div className="hand-preview-metrics">
              <span>Deals {discardPreview?.damage ?? 0} damage</span>
            </div>
          </article>
          <div className="tutorial-card-row">
            {(discardImproved ? improvedDiscardHand : weakDiscardHand).map((card, index) => (
              <TutorialCard key={`discard-${index}`} card={card} />
            ))}
          </div>
          <div className="button-row">
            {!discardImproved ? (
              <button type="button" onClick={() => setDiscardImproved(true)}>
                Discard two weak cards
              </button>
            ) : (
              <button type="button" onClick={() => setStep(3)}>
                Continue to the shop
              </button>
            )}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>The shop</h3>
            <p className="panel-copy compact-copy">
              Between rounds, spend gold to shape your build. Damage upgrades push aggression,
              health keeps you alive, and extra discards make hands more consistent.
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
          <div className="button-row">
            <button type="button" onClick={() => setStep(4)} disabled={boughtUpgradeId === null}>
              Finish tutorial
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="tutorial-stage tutorial-finish-stage">
          <div className="tutorial-copy-block">
            <h3>You’re ready</h3>
            <p className="panel-copy compact-copy">
              Quick recap: build the strongest hand you can, use discards to fix weak draws, spend
              gold between rounds, and race to 5 wins in a match.
            </p>
          </div>
          <div className="tutorial-summary-grid">
            <article className="tutorial-summary-card">
              <strong>Hands</strong>
              <span>Better combos mean bigger multipliers.</span>
            </article>
            <article className="tutorial-summary-card">
              <strong>Discards</strong>
              <span>Cycle weak cards into straights, flushes, and pairs.</span>
            </article>
            <article className="tutorial-summary-card">
              <strong>Shop</strong>
              <span>Buy damage, health, draw shaping, or extra discards.</span>
            </article>
          </div>
          <div className="button-row">
            <button type="button" onClick={onBackToLobby}>
              Back to join lobby
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
