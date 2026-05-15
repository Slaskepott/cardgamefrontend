import type { BattleMoment, Card, DiscardMoment, MatchSpell, SpellMoment, Suit } from "../types/game";
import type { MetaProgress, Relic, Upgrade } from "../types/game";
import { buildHandPreview, type PreviewSpellId } from "../lib/handPreview";

interface GameBoardProps {
  cards: Card[];
  battleMoment: BattleMoment | null;
  discardMoment: DiscardMoment | null;
  selectedCardKeys: string[];
  ownedUpgrades: Upgrade[];
  ownedRelics: Relic[];
  matchSpells: MatchSpell[];
  spellMoment: SpellMoment | null;
  opponentHealthRatio: number;
  metaProgress: MetaProgress | null;
  unlockedLevelRewards?: string[];
  onToggleCard: (card: Card, index: number) => void;
  onPlayHand: () => Promise<void>;
  onDiscard: () => Promise<void>;
  onUseSpell: (spellId: string) => Promise<void>;
  onEndTurn: () => Promise<void>;
  canPlayActions: boolean;
  canEndTurn: boolean;
  remainingDiscards: number;
  busy: boolean;
  disabled: boolean;
  cosmeticRewards?: string[];
}

const suitFlavor: Record<Suit, { label: string; emoji: string }> = {
  Fire: { label: "fire surge", emoji: "🔥" },
  Air: { label: "air burst", emoji: "💨" },
  Earth: { label: "earth crush", emoji: "🌿" },
  Water: { label: "water crash", emoji: "💧" },
  Plasma: { label: "plasma burst", emoji: "⚡" },
  Wild: { label: "wild twist", emoji: "🃏" },
};

const suitSymbols: Record<Card["suit"], string> = {
  Fire: "🔥",
  Air: "💨",
  Earth: "🌿",
  Water: "💧",
  Plasma: "⚡",
  Wild: "🃏",
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
  Joker: 15,
  Flame: 15,
  "15": 16,
};

const spellFlavor: Record<
  string,
  { icon: string; prepareLabel: string; prepareDetail: string; castDetail: string }
> = {
  kindle: {
    icon: "🔥",
    prepareLabel: "Ember drawn",
    prepareDetail: "The next hand is primed for +20% damage.",
    castDetail: "The hit lands hotter with a +20% damage surge.",
  },
  guard_pulse: {
    icon: "🛡️",
    prepareLabel: "Barrier ready",
    prepareDetail: "A defensive pulse is ready to snap into place.",
    castDetail: "A shield pulse surges in for 12 armor.",
  },
  second_breath: {
    icon: "💚",
    prepareLabel: "Breath held",
    prepareDetail: "A reserve of health is waiting to be called on.",
    castDetail: "A second breath restores 10 health.",
  },
  heavy_blow: {
    icon: "💥",
    prepareLabel: "Weight loaded",
    prepareDetail: "The next 1-card hand is set to slam for 8x damage.",
    castDetail: "A single card crashes down at 8x force.",
  },
  perfect_pairing: {
    icon: "🂡",
    prepareLabel: "Pattern fixed",
    prepareDetail: "The next hand will count as at least two pair.",
    castDetail: "The pattern locks into two pair before the strike.",
  },
  stone_delay: {
    icon: "🪨",
    prepareLabel: "Anchor set",
    prepareDetail: "The next incoming hit will be slowed by 25%.",
    castDetail: "A stone brace catches 25% of the next hit.",
  },
  overcharge: {
    icon: "⚡",
    prepareLabel: "Power surging",
    prepareDetail: "The next hand gains +35% damage, then bites back.",
    castDetail: "The hand erupts with +35% damage and recoil.",
  },
  blood_price: {
    icon: "🩸",
    prepareLabel: "Blood pledged",
    prepareDetail: "Health is about to be traded for one more discard.",
    castDetail: "8 health is paid for +1 discard.",
  },
  double_stake: {
    icon: "🎲",
    prepareLabel: "Bet raised",
    prepareDetail: "The next hand is gambling for gold at a health cost.",
    castDetail: "The wager resolves: +4 gold, but 6 health is lost.",
  },
  final_push: {
    icon: "👑",
    prepareLabel: "Finisher lined up",
    prepareDetail: "If the foe is low enough, the next hand gets +50% damage.",
    castDetail: "The finisher connects for a +50% damage push.",
  },
};

export function makeCardKey(card: Card, index: number) {
  return `${card.rank}-${card.suit}-${index}`;
}

function getCosmeticClasses(cosmeticRewards: string[] | undefined) {
  const rewardSet = new Set(cosmeticRewards ?? []);
  return [
    rewardSet.has("starlit_edges") ? " card-theme-starlit" : "",
    rewardSet.has("duelist_lacquer") ? " card-theme-lacquer" : "",
    rewardSet.has("constellation_foil") ? " card-theme-foil" : "",
  ].join("");
}

export function GameBoard({
  cards,
  battleMoment,
  discardMoment,
  selectedCardKeys,
  ownedUpgrades,
  ownedRelics,
  matchSpells,
  spellMoment,
  opponentHealthRatio,
  metaProgress,
  unlockedLevelRewards = [],
  onToggleCard,
  onPlayHand,
  onDiscard,
  onUseSpell,
  onEndTurn,
  canPlayActions,
  canEndTurn,
  remainingDiscards,
  busy,
  disabled,
  cosmeticRewards,
}: GameBoardProps) {
  const sortedCards = [...cards]
    .map((card, index) => ({ card, index }))
    .sort((left, right) => rankOrder[left.card.rank] - rankOrder[right.card.rank]);
  const cosmeticClasses = getCosmeticClasses(cosmeticRewards);
  const selectedPreviewCards = sortedCards
    .filter(({ card, index }) => selectedCardKeys.includes(makeCardKey(card, index)))
    .map(({ card }) => card);
  const preparedSpellId =
    matchSpells.find((spell) => spell.prepared)?.id ?? null;
  const preparedSpellFlavor = preparedSpellId ? spellFlavor[preparedSpellId] : null;
  const handPreview = buildHandPreview(
    selectedPreviewCards,
    ownedUpgrades,
    ownedRelics,
    metaProgress,
    unlockedLevelRewards,
    preparedSpellId as PreviewSpellId,
    opponentHealthRatio,
  );

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
                  {battleMoment.doublePlayTriggered ? " • Double strike" : ""}
                  {battleMoment.winner ? ` • ${battleMoment.winner} wins the round` : ""}
                </span>
              </div>
              <div className="battle-impact-damage">
                -{battleMoment.hits > 1 ? battleMoment.damageInstances[0] : battleMoment.damage}
                {battleMoment.hits > 1 ? <span className="battle-impact-hits">×{battleMoment.hits}</span> : null}
              </div>
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

      {spellMoment ? (
        <div className="board-spell-banner-shell" aria-hidden="true">
          <section className={`spell-effect-banner spell-${spellMoment.animation}`}>
            <span className="spell-effect-icon">
              {spellFlavor[spellMoment.spellId]?.icon ?? "✦"}
            </span>
            <span className="spell-effect-label">
              {spellMoment.effectNow
                ? spellFlavor[spellMoment.spellId]?.castDetail ?? "Spell cast"
                : spellFlavor[spellMoment.spellId]?.prepareLabel ?? "Spell primed"}
            </span>
            <strong>{spellMoment.spellName}</strong>
            <span className="spell-effect-detail">
              {spellMoment.player}{" "}
              {spellMoment.effectNow
                ? spellFlavor[spellMoment.spellId]?.castDetail ?? "triggers it."
                : spellFlavor[spellMoment.spellId]?.prepareDetail ?? "arms it."}
            </span>
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
            {matchSpells.length > 0 ? (
              <div className="spell-action-row">
                {matchSpells.map((spell) => (
                  <button
                    key={spell.id}
                    type="button"
                    className={`spell-pill spell-${spell.animation}${spell.prepared ? " prepared" : ""}${spell.used ? " used" : ""}`}
                    disabled={busy || disabled || spell.used}
                    onClick={() => void onUseSpell(spell.id)}
                    title={spell.description}
                  >
                    <span className="spell-pill-icon">
                      {spellFlavor[spell.id]?.icon ?? "✦"}
                    </span>
                    <span className="spell-pill-name">{spell.name}</span>
                    <span className="spell-pill-copy">
                      {spell.used ? "Spent" : spell.prepared ? "Primed" : "Ready"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
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

        <section
          className={`hand-preview-panel${handPreview ? " active" : ""}`}
          aria-hidden={handPreview ? undefined : true}
        >
          {handPreview ? (
            <>
              <div className="hand-preview-copy">
                <span className="hand-preview-label">Selected hand preview</span>
                <strong>
                  {handPreview.handType.replace(/\b\w/g, (letter) => letter.toUpperCase())}{" "}
                  <span className="hand-preview-inline-multiplier">
                    (Multiplier x{handPreview.multiplier})
                  </span>
                </strong>
                <span>
                  {selectedPreviewCards.length} card{selectedPreviewCards.length === 1 ? "" : "s"}{" "}
                  selected
                </span>
                {preparedSpellFlavor ? (
                  <span className="hand-preview-spell-copy">
                    {preparedSpellFlavor.icon} {preparedSpellFlavor.prepareDetail}
                  </span>
                ) : null}
              </div>
              <div className="hand-preview-metrics">
                <span>Deals {handPreview.damage} damage</span>
                {handPreview.playTwiceChancePct > 0 ? (
                  <span>{handPreview.playTwiceChancePct}% chance to hit twice</span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="hand-preview-copy hand-preview-copy-idle">
              <span className="hand-preview-label">Selected hand preview</span>
              <strong>Select cards to preview your hand</strong>
            </div>
          )}
        </section>

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
                className={`card-tile suit-${card.suit.toLowerCase()}${cosmeticClasses}${selected ? " selected" : ""}`}
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
