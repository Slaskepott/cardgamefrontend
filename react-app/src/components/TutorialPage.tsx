import { useEffect, useMemo, useState } from "react";
import type { Card } from "../types/game";
import { buildHandPreview } from "../lib/handPreview";
import { launchVictoryConfetti } from "../lib/confetti";
import {
  playBattleImpact,
  playDiscardSound,
  playShopRevealSound,
  playUpgradeBuySound,
  playVictorySound,
} from "../lib/audio";

interface TutorialPageProps {
  onCompleteTutorial: () => void | Promise<void>;
  onBackToLobby: () => void;
}

type TutorialHitSide = "player" | "enemy";

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
  const [animating, setAnimating] = useState(false);
  const [damagedSide, setDamagedSide] = useState<TutorialHitSide | null>(null);
  const [defeatedSide, setDefeatedSide] = useState<TutorialHitSide | null>(null);
  const [damageBurst, setDamageBurst] = useState<{
    side: TutorialHitSide;
    amount: number;
    key: number;
  } | null>(null);
  const [revealedShopCount, setRevealedShopCount] = useState(0);

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
    if (step !== 4) {
      setRevealedShopCount(0);
      return;
    }

    setRevealedShopCount(0);
    const timeouts = tutorialShop.map((upgrade, index) =>
      window.setTimeout(() => {
        setRevealedShopCount(index + 1);
        playShopRevealSound(upgrade.rarity);
      }, index * 240),
    );

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
    };
  }, [step]);

  useEffect(() => {
    if (step === 4 && boughtUpgradeId !== null && !completionTracked) {
      setCompletionTracked(true);
      void onCompleteTutorial();
    }
  }, [boughtUpgradeId, completionTracked, onCompleteTutorial, step]);

  const currentDiscardHand = discardImproved ? improvedHand : weakHand;

  function queueHitAnimation(options: {
    target: TutorialHitSide;
    damage: number;
    targetHealthBefore: number;
    nextHealth: number;
    onDone: () => void;
  }) {
    setAnimating(true);
    setDamagedSide(options.target);
    setDefeatedSide(options.nextHealth <= 0 ? options.target : null);
    setDamageBurst({
      side: options.target,
      amount: options.damage,
      key: Date.now(),
    });

    playBattleImpact({
      damage: options.damage,
      hits: 1,
      doublePlayTriggered: false,
      matchFinished: options.nextHealth <= 0,
      targetHealthBefore: options.targetHealthBefore,
    });

    window.setTimeout(() => {
      if (options.target === "enemy") {
        setEnemyHealth(options.nextHealth);
      } else {
        setPlayerHealth(options.nextHealth);
      }
    }, 120);

    window.setTimeout(() => {
      setDamagedSide(null);
      setDamageBurst(null);
      setAnimating(false);
      options.onDone();
    }, options.nextHealth <= 0 ? 1400 : 900);
  }

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
            className={`tutorial-step-pill${index === step ? " active" : ""}${
              index < step ? " complete" : ""
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="tutorial-duel-strip">
        <article
          className={`health-card tutorial-health-card tutorial-enemy-card${
            damagedSide === "enemy"
              ? defeatedSide === "enemy"
                ? " health-card-defeated health-card-finished"
                : " health-card-damaged"
              : ""
          }`}
        >
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
          {damageBurst?.side === "enemy" ? (
            <span key={damageBurst.key} className="damage-burst">
              -{damageBurst.amount}
            </span>
          ) : null}
          {defeatedSide === "enemy" ? <span className="defeat-burst">Defeated</span> : null}
        </article>

        <article
          className={`health-card tutorial-health-card tutorial-player-card${
            damagedSide === "player" ? " health-card-damaged" : ""
          }`}
        >
          <div className="health-meta">
            <strong className="health-player-name">
              <span className="player-avatar-badge health-avatar">🧑</span>
              You
            </strong>
            <span>{playerHealth} HP</span>
          </div>
          <div className="health-bar-shell">
            <div
              className="health-bar-fill player"
              style={{ width: `${Math.max(playerHealth, 0)}%` }}
            />
          </div>
          {damageBurst?.side === "player" ? (
            <span key={damageBurst.key} className="damage-burst">
              -{damageBurst.amount}
            </span>
          ) : null}
        </article>
      </div>

      {step === 0 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Open with a real hand</h3>
            <p className="panel-copy compact-copy">
              These five cards are already selected. A full house gives you strong damage and good
              gold.
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
              disabled={animating}
              onClick={() => {
                const damage = openingPreview?.damage ?? 0;
                const nextHealth = Math.max(0, enemyHealth - damage);
                queueHitAnimation({
                  target: "enemy",
                  damage,
                  targetHealthBefore: enemyHealth,
                  nextHealth,
                  onDone: () => setStep(1),
                });
              }}
            >
              {animating ? "Resolving..." : "Play hand"}
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
              disabled={animating}
              onClick={() => {
                const damage = botPreview?.damage ?? 0;
                const nextHealth = Math.max(0, playerHealth - damage);
                queueHitAnimation({
                  target: "player",
                  damage,
                  targetHealthBefore: playerHealth,
                  nextHealth,
                  onDone: () => setStep(2),
                });
              }}
            >
              {animating ? "Resolving..." : "Let the bot play"}
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
              <button
                type="button"
                onClick={() => {
                  playDiscardSound();
                  setDiscardImproved(true);
                }}
              >
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
              One more attack to close the round. This time you have built a straight flush.
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
              <span>That is the kind of payoff discards are meant to create.</span>
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
              disabled={animating}
              onClick={() => {
                const damage = Math.min(enemyHealth, finishingPreview?.damage ?? 0);
                const nextHealth = Math.max(0, enemyHealth - damage);
                queueHitAnimation({
                  target: "enemy",
                  damage,
                  targetHealthBefore: enemyHealth,
                  nextHealth,
                  onDone: () => setStep(4),
                });
              }}
            >
              {animating ? "Resolving..." : "Play the second hand"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="tutorial-stage">
          <div className="tutorial-copy-block">
            <h3>Round over: visit the shop</h3>
            <p className="panel-copy compact-copy">
              Between rounds, spend gold to shape your build. Pick one upgrade and you are done.
            </p>
          </div>
          <div className="tutorial-shop-grid">
            {tutorialShop.map((upgrade, index) => {
              const revealed = index < revealedShopCount;
              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={`upgrade-card ${upgrade.rarity} tutorial-shop-card${
                    revealed ? " tutorial-shop-card-revealed" : ""
                  }${boughtUpgradeId === upgrade.id ? " tutorial-shop-card-bought" : ""}`}
                  onClick={() => {
                    playUpgradeBuySound(upgrade.rarity);
                    setBoughtUpgradeId(upgrade.id);
                  }}
                  disabled={!revealed || boughtUpgradeId !== null}
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
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 4 && boughtUpgradeId !== null ? (
        <div className="modal-backdrop">
          <section className="panel modal-panel tutorial-finish-modal">
            <div className="tutorial-finish-modal-copy">
              <p className="eyebrow">Tutorial complete</p>
              <h3>That is the full loop</h3>
              <p className="panel-copy">
                Attack, survive the return hit, use discards, attack again, then shop.
              </p>
            </div>
            <div className="button-row">
              <button type="button" onClick={onBackToLobby}>
                Back to lobby
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
