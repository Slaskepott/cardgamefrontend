import type { BattleMoment, Card, DiscardMoment, Suit } from "../types/game";

interface GameBoardProps {
  cards: Card[];
  battleMoment: BattleMoment | null;
  discardMoment: DiscardMoment | null;
  selectedCardKeys: string[];
  onToggleCard: (card: Card, index: number) => void;
  onPlayHand: () => Promise<void>;
  onDiscard: () => Promise<void>;
  onEndTurn: () => Promise<void>;
  canPlayActions: boolean;
  canEndTurn: boolean;
  remainingDiscards: number;
  busy: boolean;
  disabled: boolean;
}

const suitFlavor: Record<Suit, { label: string; emoji: string }> = {
  Fire: { label: "fire surge", emoji: "🔥" },
  Air: { label: "air burst", emoji: "💨" },
  Earth: { label: "earth crush", emoji: "🌿" },
  Water: { label: "water crash", emoji: "💧" },
};

const suitSymbols: Record<Card["suit"], string> = {
  Fire: "🔥",
  Air: "💨",
  Earth: "🌿",
  Water: "💧",
};

const rankOrder: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function makeCardKey(card: Card, index: number) {
  return `${card.rank}-${card.suit}-${index}`;
}

export function GameBoard({
  cards,
  battleMoment,
  discardMoment,
  selectedCardKeys,
  onToggleCard,
  onPlayHand,
  onDiscard,
  onEndTurn,
  canPlayActions,
  canEndTurn,
  remainingDiscards,
  busy,
  disabled,
}: GameBoardProps) {
  const sortedCards = [...cards]
    .map((card, index) => ({ card, index }))
    .sort((left, right) => rankOrder[left.card.rank] - rankOrder[right.card.rank]);

  return (
    <section className="panel game-board">
      {battleMoment ? (
        <div className="board-impact-banner-shell">
          <section
            className={`battle-impact-banner board-impact-banner${
            battleMoment.accentSuit ? ` impact-${battleMoment.accentSuit.toLowerCase()}` : ""
            }`}
          >
            <div className="battle-impact-copy">
              <span className="battle-impact-label">
                {battleMoment.accentSuit
                  ? `${suitFlavor[battleMoment.accentSuit].emoji} ${suitFlavor[battleMoment.accentSuit].label}`
                  : "⚔ impact"}
              </span>
              <strong>
                {battleMoment.attacker} hits
                {battleMoment.target ? ` ${battleMoment.target}` : ""} for {battleMoment.damage}
              </strong>
              <span className="battle-impact-detail">
                {battleMoment.handType.replace(/\b\w/g, (letter) => letter.toUpperCase())} x
                {battleMoment.multiplier}
                {battleMoment.winner ? ` • ${battleMoment.winner} wins the round` : ""}
              </span>
            </div>
            <div className="battle-impact-damage">-{battleMoment.damage}</div>
          </section>
        </div>
      ) : null}

      {discardMoment ? (
        <div className="board-discard-banner-shell" aria-hidden="true">
          <section className="discard-feedback-banner">
            <div className="discard-feedback-copy">
              <span className="discard-feedback-label">Discarded</span>
              <strong>
                Burned {discardMoment.cards.length} card
                {discardMoment.cards.length === 1 ? "" : "s"}
              </strong>
              <span className="discard-feedback-detail">
                {discardMoment.remainingDiscards} discard
                {discardMoment.remainingDiscards === 1 ? "" : "s"} left this turn
              </span>
            </div>
            <div className="discard-feedback-fan">
              {discardMoment.cards.slice(0, 5).map((card, index) => (
                <div
                  key={`discard-${card.rank}-${card.suit}-${index}`}
                  className={`discard-ghost-card suit-${card.suit.toLowerCase()}`}
                  style={{ ["--discard-index" as any]: index }}
                >
                  <span className="discard-ghost-rank">{card.rank}</span>
                  <span className="discard-ghost-suit">{suitSymbols[card.suit]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className={disabled ? "game-board-body game-board-disabled" : "game-board-body"}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Battle board</p>
            <h2>Your hand</h2>
          </div>
          <div className="action-row">
            <button
              type="button"
              onClick={() => void onPlayHand()}
              disabled={!canPlayActions || busy}
            >
              Play hand
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void onDiscard()}
              disabled={!canPlayActions || remainingDiscards <= 0 || busy}
            >
              Discard ({remainingDiscards})
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void onEndTurn()}
              disabled={!canEndTurn || busy}
            >
              End turn
            </button>
          </div>
        </div>

        <div className="card-grid">
          {sortedCards.length === 0 ? (
            <p className="panel-copy">Waiting for a hand from the backend.</p>
          ) : null}
          {sortedCards.map(({ card, index }) => {
            const cardKey = makeCardKey(card, index);
            const selected = selectedCardKeys.includes(cardKey);
            return (
              <button
                type="button"
                key={cardKey}
                className={`card-tile suit-${card.suit.toLowerCase()}${selected ? " selected" : ""}`}
                onClick={() => onToggleCard(card, index)}
                disabled={disabled}
              >
                <span className="card-corner">
                  <span className="card-rank">{card.rank}</span>
                  <span className="card-label">{card.suit}</span>
                </span>
                <span className="card-illustration" aria-hidden="true">
                  {suitSymbols[card.suit]}
                </span>
                <span className="card-corner mirrored">
                  <span className="card-rank">{card.rank}</span>
                  <span className="card-suit">{suitSymbols[card.suit]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
