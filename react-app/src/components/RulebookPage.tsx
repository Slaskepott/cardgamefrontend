import { useMemo, useState } from "react";

interface RulebookPageProps {
  onBackToLobby: () => void;
}

interface HandEntry {
  name: string;
  multiplier: number;
  summary: string;
}

interface ShopTier {
  rarity: string;
  effect: string;
  cost: number;
}

interface ShopUpgradeLine {
  name: string;
  icon: string;
  summary: string;
  tiers: ShopTier[];
}

interface ShopUpgradeGroup {
  id: string;
  title: string;
  description: string;
  upgrades: ShopUpgradeLine[];
}

interface RelicEntry {
  name: string;
  theme: string;
  summary: string;
}

const handLadder: HandEntry[] = [
  { name: "High card", multiplier: 1, summary: "No combo. Pure card quality." },
  { name: "Pair", multiplier: 2, summary: "Two cards with the same rank." },
  { name: "Two pair", multiplier: 3, summary: "Two separate pairs." },
  { name: "Three of a kind", multiplier: 3, summary: "Three cards sharing one rank." },
  { name: "Straight", multiplier: 4, summary: "Five consecutive ranks, any suits." },
  { name: "Flush", multiplier: 4, summary: "Five cards of the same suit." },
  { name: "Full house", multiplier: 4, summary: "Three of a kind plus a pair." },
  { name: "Four of a kind", multiplier: 7, summary: "Four cards sharing one rank." },
  { name: "Straight flush", multiplier: 8, summary: "A straight where every card matches suit." },
  { name: "Five of a kind", multiplier: 8, summary: "Five cards of one rank, usually with wild help." },
  { name: "Flush house", multiplier: 9, summary: "A full house where all five cards share the same suit." },
  { name: "Royal flush", multiplier: 10, summary: "10-J-Q-K-A in one suit." },
];

const relicEntries: RelicEntry[] = [
  { name: "Tiny Tyrants", theme: "Chaos", summary: "2s, 3s, and 4s deal triple damage." },
  { name: "House Advantage", theme: "Bulwark", summary: "Playing a full house grants armor after the hit lands." },
  { name: "Greedy Fingers", theme: "Greed", summary: "Every discard gives bonus gold, but your max health is reduced." },
  { name: "Wild Orbit", theme: "Wild", summary: "Jokers are much more likely, but shop rerolls cost health." },
  { name: "Tidal Memory", theme: "Flow", summary: "Repeated suits in a hand gain escalating damage." },
  { name: "Overflow Chamber", theme: "Excess", summary: "Draw 1 extra card every round, but lose overall damage." },
  { name: "Plasma Lattice", theme: "Plasma", summary: "Plasma cards gain big damage and draw-chance bonuses." },
  { name: "Fortress Heart", theme: "Bulwark", summary: "Gain a big spike of armor and max health." },
  { name: "Pattern Ward", theme: "Bulwark", summary: "Strong hands like straights, flushes, full houses, and four of a kind hit you for less." },
];

const shopUpgradeGroups: ShopUpgradeGroup[] = [
  {
    id: "survival",
    title: "Survival",
      description: "Health, armor, resistances, and discard upgrades that keep you alive longer.",
    upgrades: [
      {
        name: "Increase Health",
        icon: "❤️",
        summary: "Flat health. Reliable survivability with no scaling math.",
        tiers: [
          { rarity: "common", effect: "+20 HP", cost: 4 },
          { rarity: "uncommon", effect: "+40 HP", cost: 10 },
          { rarity: "rare", effect: "+60 HP", cost: 16 },
        ],
      },
      {
        name: "Increase Health %",
        icon: "💗",
        summary: "Percent max-health scaling. Best when stacked with flat health.",
        tiers: [
          { rarity: "common", effect: "+25% HP", cost: 4 },
          { rarity: "uncommon", effect: "+50% HP", cost: 8 },
        ],
      },
      {
        name: "Increase Armor",
        icon: "🛡️",
        summary: "Armor reduces incoming damage by a diminishing percentage.",
        tiers: [
          { rarity: "common", effect: "+10 Armor", cost: 4 },
          { rarity: "uncommon", effect: "+18 Armor", cost: 7 },
          { rarity: "rare", effect: "+28 Armor", cost: 11 },
          { rarity: "epic", effect: "+42 Armor", cost: 16 },
          { rarity: "legendary", effect: "+60 Armor", cost: 23 },
        ],
      },
      {
        name: "Low Card Shield",
        icon: "ðŸ§±",
        summary: "Reduces damage taken from low-rank-heavy hands.",
        tiers: [
          { rarity: "common", effect: "+12% Low Card Resistance", cost: 4 },
          { rarity: "uncommon", effect: "+20% Low Card Resistance", cost: 7 },
          { rarity: "rare", effect: "+32% Low Card Resistance", cost: 11 },
        ],
      },
      {
        name: "High Card Shield",
        icon: "ðŸ°",
        summary: "Reduces damage taken from premium-rank-heavy hands.",
        tiers: [
          { rarity: "common", effect: "+10% High Card Resistance", cost: 4 },
          { rarity: "uncommon", effect: "+18% High Card Resistance", cost: 7 },
          { rarity: "rare", effect: "+28% High Card Resistance", cost: 11 },
        ],
      },
      {
        name: "Straight Shelter",
        icon: "ðŸªœ",
        summary: "Direct resistance against straight-based hands.",
        tiers: [
          { rarity: "uncommon", effect: "+12% Straight Resistance", cost: 5 },
          { rarity: "rare", effect: "+20% Straight Resistance", cost: 9 },
          { rarity: "epic", effect: "+30% Straight Resistance", cost: 14 },
        ],
      },
      {
        name: "Flush Shelter",
        icon: "ðŸŒŠ",
        summary: "Direct resistance against flush-based hands.",
        tiers: [
          { rarity: "uncommon", effect: "+12% Flush Resistance", cost: 5 },
          { rarity: "rare", effect: "+20% Flush Resistance", cost: 9 },
          { rarity: "epic", effect: "+30% Flush Resistance", cost: 14 },
        ],
      },
      {
        name: "Increase Discards",
        icon: "🗑️",
        summary: "More card cycling each turn. Great for consistency builds.",
        tiers: [
          { rarity: "common", effect: "+1 Discard", cost: 6 },
          { rarity: "rare", effect: "+2 Discards", cost: 12 },
          { rarity: "legendary", effect: "+3 Discards", cost: 22 },
        ],
      },
    ],
  },
  {
    id: "damage",
    title: "Damage",
    description: "Raw offensive scaling for overall, elemental, and rank-based hits.",
    upgrades: [
      {
        name: "Increase Damage",
        icon: "⚔️",
        summary: "Overall damage that affects every hand you play.",
        tiers: [
          { rarity: "uncommon", effect: "+10% Damage", cost: 8 },
          { rarity: "rare", effect: "+20% Damage", cost: 12 },
          { rarity: "epic", effect: "+30% Damage", cost: 18 },
          { rarity: "legendary", effect: "+50% Damage", cost: 24 },
        ],
      },
      {
        name: "Increase Earth Damage",
        icon: "🌿",
        summary: "Boosts only Earth cards in the damage formula.",
        tiers: [
          { rarity: "uncommon", effect: "+20% Earth Damage", cost: 4 },
          { rarity: "rare", effect: "+40% Earth Damage", cost: 7 },
          { rarity: "epic", effect: "+60% Earth Damage", cost: 10 },
        ],
      },
      {
        name: "Increase Fire Damage",
        icon: "🔥",
        summary: "Boosts only Fire cards in the damage formula.",
        tiers: [
          { rarity: "uncommon", effect: "+20% Fire Damage", cost: 4 },
          { rarity: "rare", effect: "+40% Fire Damage", cost: 7 },
          { rarity: "epic", effect: "+60% Fire Damage", cost: 10 },
        ],
      },
      {
        name: "Increase Water Damage",
        icon: "💧",
        summary: "Boosts only Water cards in the damage formula.",
        tiers: [
          { rarity: "uncommon", effect: "+20% Water Damage", cost: 4 },
          { rarity: "rare", effect: "+40% Water Damage", cost: 7 },
          { rarity: "epic", effect: "+60% Water Damage", cost: 10 },
        ],
      },
      {
        name: "Increase Air Damage",
        icon: "💨",
        summary: "Boosts only Air cards in the damage formula.",
        tiers: [
          { rarity: "uncommon", effect: "+20% Air Damage", cost: 4 },
          { rarity: "rare", effect: "+40% Air Damage", cost: 7 },
          { rarity: "epic", effect: "+60% Air Damage", cost: 10 },
        ],
      },
      {
        name: "Low Cards Specialist",
        icon: "🃏",
        summary: "Extra damage for low ranks, especially 2 through 7.",
        tiers: [
          { rarity: "common", effect: "+10% Low Card Damage", cost: 6 },
          { rarity: "uncommon", effect: "+20% Low Card Damage", cost: 10 },
          { rarity: "rare", effect: "+40% Low Card Damage", cost: 16 },
          { rarity: "epic", effect: "+80% Low Card Damage", cost: 24 },
          { rarity: "legendary", effect: "+120% Low Card Damage", cost: 34 },
        ],
      },
      {
        name: "High Cards Specialist",
        icon: "🎯",
        summary: "Extra damage for premium ranks like 10, J, Q, K, A, and 15.",
        tiers: [
          { rarity: "common", effect: "+5% High Card Damage", cost: 5 },
          { rarity: "uncommon", effect: "+10% High Card Damage", cost: 8 },
          { rarity: "rare", effect: "+20% High Card Damage", cost: 13 },
          { rarity: "epic", effect: "+40% High Card Damage", cost: 19 },
          { rarity: "legendary", effect: "+60% High Card Damage", cost: 26 },
        ],
      },
    ],
  },
  {
    id: "draw",
    title: "Draw shaping",
    description: "Rig your deck odds toward a suit, rank band, or special card family.",
    upgrades: [
      {
        name: "Increase Earth Draw",
        icon: "🌿",
        summary: "More Earth cards appearing in your hand.",
        tiers: [
          { rarity: "common", effect: "+8% Earth Draw Chance", cost: 4 },
          { rarity: "uncommon", effect: "+15% Earth Draw Chance", cost: 7 },
          { rarity: "rare", effect: "+25% Earth Draw Chance", cost: 11 },
          { rarity: "epic", effect: "+40% Earth Draw Chance", cost: 16 },
          { rarity: "legendary", effect: "+60% Earth Draw Chance", cost: 23 },
        ],
      },
      {
        name: "Increase Fire Draw",
        icon: "🔥",
        summary: "More Fire cards appearing in your hand.",
        tiers: [
          { rarity: "common", effect: "+8% Fire Draw Chance", cost: 4 },
          { rarity: "uncommon", effect: "+15% Fire Draw Chance", cost: 7 },
          { rarity: "rare", effect: "+25% Fire Draw Chance", cost: 11 },
          { rarity: "epic", effect: "+40% Fire Draw Chance", cost: 16 },
          { rarity: "legendary", effect: "+60% Fire Draw Chance", cost: 23 },
        ],
      },
      {
        name: "Increase Water Draw",
        icon: "💧",
        summary: "More Water cards appearing in your hand.",
        tiers: [
          { rarity: "common", effect: "+8% Water Draw Chance", cost: 4 },
          { rarity: "uncommon", effect: "+15% Water Draw Chance", cost: 7 },
          { rarity: "rare", effect: "+25% Water Draw Chance", cost: 11 },
          { rarity: "epic", effect: "+40% Water Draw Chance", cost: 16 },
          { rarity: "legendary", effect: "+60% Water Draw Chance", cost: 23 },
        ],
      },
      {
        name: "Increase Air Draw",
        icon: "💨",
        summary: "More Air cards appearing in your hand.",
        tiers: [
          { rarity: "common", effect: "+8% Air Draw Chance", cost: 4 },
          { rarity: "uncommon", effect: "+15% Air Draw Chance", cost: 7 },
          { rarity: "rare", effect: "+25% Air Draw Chance", cost: 11 },
          { rarity: "epic", effect: "+40% Air Draw Chance", cost: 16 },
          { rarity: "legendary", effect: "+60% Air Draw Chance", cost: 23 },
        ],
      },
      {
        name: "Low Draw Specialist",
        icon: "📉",
        summary: "Makes lower ranks much more likely to show up.",
        tiers: [
          { rarity: "common", effect: "+10% Low Card Draw Chance", cost: 6 },
          { rarity: "uncommon", effect: "+18% Low Card Draw Chance", cost: 9 },
          { rarity: "rare", effect: "+30% Low Card Draw Chance", cost: 14 },
          { rarity: "epic", effect: "+50% Low Card Draw Chance", cost: 21 },
          { rarity: "legendary", effect: "+80% Low Card Draw Chance", cost: 30 },
        ],
      },
      {
        name: "High Draw Specialist",
        icon: "📈",
        summary: "Makes premium ranks appear more often.",
        tiers: [
          { rarity: "common", effect: "+8% High Card Draw Chance", cost: 5 },
          { rarity: "uncommon", effect: "+15% High Card Draw Chance", cost: 8 },
          { rarity: "rare", effect: "+25% High Card Draw Chance", cost: 12 },
          { rarity: "epic", effect: "+40% High Card Draw Chance", cost: 18 },
          { rarity: "legendary", effect: "+60% High Card Draw Chance", cost: 26 },
        ],
      },
      {
        name: "Royal Invitation",
        icon: "👑",
        summary: "Targets queens, kings, and aces specifically.",
        tiers: [
          { rarity: "epic", effect: "+25% Q/K/A Draw Chance", cost: 18 },
          { rarity: "legendary", effect: "+50% Q/K/A Draw Chance", cost: 29 },
        ],
      },
      {
        name: "Tiny Troublemakers",
        icon: "🎲",
        summary: "Hard-targets 2s and 3s for low-card builds.",
        tiers: [
          { rarity: "epic", effect: "+45% Chance To Draw 2 Or 3", cost: 17 },
          { rarity: "legendary", effect: "+90% Chance To Draw 2 Or 3", cost: 28 },
        ],
      },
    ],
  },
];

const topicLabels = [
  { id: "overview", label: "Overview" },
  { id: "match-flow", label: "Match flow" },
  { id: "hands", label: "Hands" },
  { id: "battle-math", label: "Battle math" },
  { id: "shop", label: "Shop" },
  { id: "relics", label: "Relics" },
  { id: "progression", label: "Progression" },
] as const;

function normalize(text: string) {
  return text.toLowerCase();
}

function matchesQuery(query: string, ...parts: string[]) {
  if (!query) {
    return true;
  }
  const haystack = normalize(parts.join(" "));
  return haystack.includes(query);
}

export function RulebookPage({ onBackToLobby }: RulebookPageProps) {
  const [search, setSearch] = useState("");
  const query = normalize(search.trim());

  const visibleHands = useMemo(
    () =>
      handLadder.filter((hand) =>
        matchesQuery(query, hand.name, hand.summary, `multiplier x${hand.multiplier}`),
      ),
    [query],
  );

  const visibleUpgradeGroups = useMemo(
    () =>
      shopUpgradeGroups
        .map((group) => ({
          ...group,
          upgrades: group.upgrades.filter((upgrade) =>
            matchesQuery(
              query,
              group.title,
              group.description,
              upgrade.name,
              upgrade.summary,
              ...upgrade.tiers.map((tier) => `${tier.rarity} ${tier.effect} ${tier.cost}`),
            ),
          ),
        }))
        .filter((group) => group.upgrades.length > 0 || matchesQuery(query, group.title, group.description)),
    [query],
  );

  const visibleSections = {
    overview: matchesQuery(
      query,
      "overview slaskecards poker card battler best of 9 match first to 5 wins",
    ),
    matchFlow: matchesQuery(
      query,
      "match flow turn timer shop timer inactivity forfeit best of 9 first to 5 leave lobby",
    ),
    hands: visibleHands.length > 0 || matchesQuery(query, "hands multipliers gold royal flush"),
    battleMath: matchesQuery(
      query,
      "battle math formula arithmetic rank compression armor resistance damage multiplier plasma low card high card straight flush full house four of a kind relics",
    ),
    shop: visibleUpgradeGroups.length > 0 || matchesQuery(query, "shop reroll upgrades gold continue"),
    relics:
      relicEntries.some((relic) => matchesQuery(query, relic.name, relic.theme, relic.summary)) ||
      matchesQuery(query, "relic relics choose relic rounds 2 4 6 match-only power spike"),
    progression: matchesQuery(
      query,
      "progression elo level talents achievements joker flame plasma fifteen avatar",
    ),
  };

  const hasAnyResults = Object.values(visibleSections).some(Boolean);

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="panel account-page-panel rulebook-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>Rulebook</h2>
          <p className="panel-copy">
            Everything in one place: match flow, exact damage math, progression, and the full shop
            catalog.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary" onClick={onBackToLobby}>
            Back to lobby
          </button>
        </div>
      </div>

      <div className="rulebook-toolbar">
        <label className="rulebook-search">
          <span className="locked-player-label">Search the rulebook</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hands, armor, Joker, rerolls, upgrades..."
          />
        </label>
        <div className="rulebook-topic-nav" aria-label="Rulebook topics">
          {topicLabels.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className="secondary rulebook-topic-button"
              onClick={() => scrollToSection(topic.id)}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {!hasAnyResults ? (
        <section className="rulebook-empty-state">
          <strong>No rulebook entries matched that search.</strong>
          <span>Try broader terms like “damage”, “shop”, “Joker”, or “armor”.</span>
        </section>
      ) : null}

      {visibleSections.overview ? (
        <section id="overview" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Overview</p>
            <h3>What kind of game is Slaskecards?</h3>
          </div>
          <div className="rulebook-overview-grid">
            <article className="rulebook-overview-card">
              <strong>Best-of-9 duels</strong>
              <span>Each match is first to 5 round wins. Match ELO only changes once the full match ends.</span>
            </article>
            <article className="rulebook-overview-card">
              <strong>Poker hands, card-game math</strong>
              <span>You build up to five-card hands, but actual damage comes from both hand type and per-card value.</span>
            </article>
            <article className="rulebook-overview-card">
              <strong>Relic spikes</strong>
              <span>After rounds 2, 4, and 6, each player gets a dramatic match-only relic choice.</span>
            </article>
            <article className="rulebook-overview-card">
              <strong>Gold between rounds</strong>
              <span>Your hand multiplier also becomes your gold income, so bigger combos fund stronger shops.</span>
            </article>
            <article className="rulebook-overview-card">
              <strong>Meta progression</strong>
              <span>Achievements, talents, levels, and ELO all layer on top of the match-to-match strategy.</span>
            </article>
          </div>
        </section>
      ) : null}

      {visibleSections.matchFlow ? (
        <section id="match-flow" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Match flow</p>
            <h3>How a full match moves</h3>
          </div>
          <div className="rulebook-flow-grid">
            <article className="rulebook-flow-card">
              <strong>1. Join a lobby</strong>
              <span>Two players enter a lobby. Once both are present, the battle phase starts automatically.</span>
            </article>
            <article className="rulebook-flow-card">
              <strong>2. Play the round</strong>
              <span>Each player starts with 8 cards and a discard limit. Players alternate turns until somebody is reduced to 0 health.</span>
            </article>
            <article className="rulebook-flow-card">
              <strong>3. Shop between rounds</strong>
              <span>After each round, both players shop at the same time. Gold comes mostly from your hand multiplier.</span>
            </article>
            <article className="rulebook-flow-card">
              <strong>4. Relic rounds</strong>
              <span>After rounds 2, 4, and 6, the normal shop is followed by a separate relic selection phase.</span>
            </article>
            <article className="rulebook-flow-card">
              <strong>5. Repeat until 5 wins</strong>
              <span>Rounds reset health and hands, but upgrades and match score stay. First to 5 round wins takes the match.</span>
            </article>
          </div>
          <div className="rulebook-inline-note-grid">
            <div className="rulebook-note-card">
              <strong>Turn timer</strong>
              <span>Each battle turn has a 60 second timer.</span>
            </div>
            <div className="rulebook-note-card">
              <strong>Shop timer</strong>
              <span>Each shop phase gives every player 120 seconds.</span>
            </div>
            <div className="rulebook-note-card">
              <strong>Bot matches</strong>
              <span>Bot matches skip visible timers, but still use the same round, shop, and relic structure.</span>
            </div>
            <div className="rulebook-note-card">
              <strong>Inactivity</strong>
              <span>Two minutes without a heartbeat counts as leaving and awards the full match to the opponent.</span>
            </div>
            <div className="rulebook-note-card">
              <strong>Forfeits</strong>
              <span>Leaving the lobby mid-match or navigating away to account pages counts as a forfeit.</span>
            </div>
          </div>
        </section>
      ) : null}

      {visibleSections.hands ? (
        <section id="hands" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Hands</p>
            <h3>Every hand and its multiplier</h3>
          </div>
          <div className="rulebook-hand-grid">
            {visibleHands.map((hand) => (
              <article key={hand.name} className="rulebook-hand-card">
                <div className="rulebook-hand-head">
                  <strong>{hand.name}</strong>
                  <span>Multiplier x{hand.multiplier}</span>
                </div>
                <p>{hand.summary}</p>
                <span className="rulebook-gold-note">Also grants +{hand.multiplier} gold before flat gold bonuses.</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleSections.battleMath ? (
        <section id="battle-math" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Battle math</p>
            <h3>Exact arithmetic</h3>
            <p className="panel-copy compact-copy">
              The short version: each selected card contributes value, those values are averaged,
              your hand multiplier is applied, then armor and resistances reduce the final hit.
            </p>
          </div>
          <div className="rulebook-math-stack">
            <details className="rulebook-math-card" open>
              <summary>Rank compression and per-card value</summary>
              <p>
                Slaskecards compresses rank values so low cards stay relevant. Instead of using raw
                rank directly, the game uses a midpoint-compression formula.
              </p>
              <pre>{`compressed rank = 8 + (raw rank - 8) / 2`}</pre>
              <p>
                Examples: 2 becomes 5, 7 becomes 7.5, 10 becomes 9, and Ace becomes 11. Plasma can
                add extra base value on top of that if you have the right level reward.
              </p>
              <pre>{`card value =
  (compressed rank + plasma bonus value)
  × overall damage modifier
  × elemental damage modifier
  × low-card or high-card modifier (if applicable)
  × relic card modifiers (if applicable)`}</pre>
            </details>

            <details className="rulebook-math-card">
              <summary>From card values to hand damage</summary>
              <p>
                The game averages the selected card values, then multiplies that result by the hand
                multiplier and any hand-type bonuses.
              </p>
              <pre>{`base damage = floor(sum(card values) / number of selected cards)

final damage before defense =
  round(base damage × hand multiplier × hand-type bonuses)`}</pre>
              <p>
                Hand-type bonuses currently include pair/two-pair bonuses, straight bonuses,
                flush bonuses, and full-house/three-of-a-kind bonuses.
              </p>
              <pre>{`gold earned from the play = hand multiplier + flat gold bonuses`}</pre>
            </details>

            <details className="rulebook-math-card">
              <summary>Wild cards and special cards</summary>
              <p>
                Joker acts as any rank and any suit. Flame acts as any Fire rank. The server tries
                every legal variant and keeps the highest-scoring outcome.
              </p>
              <p>
                That means the game does not guess. It evaluates all valid Joker/Flame
                interpretations and picks the strongest hand automatically.
              </p>
            </details>

            <details className="rulebook-math-card">
              <summary>Armor, resistances, and final damage taken</summary>
              <p>
                Armor is percentage reduction with diminishing returns. On top of that, some talents,
                upgrades, and relics resist low cards, high cards, or specific hand families.
              </p>
              <pre>{`scaled armor = armor ^ 0.9
armor reduction = scaled armor / (scaled armor + 120)

final damage taken =
  round(
    raw damage × target damage-taken multiplier × (1 - armor reduction)
    × rank resistance multiplier
    × hand-type resistance multiplier
  )`}</pre>
              <p>
                Rank resistance checks how much of the attacking hand is low or high cards.
                Hand-type resistance checks patterns like straight, flush, full house, and four of a kind.
              </p>
            </details>
          </div>
        </section>
      ) : null}

      {visibleSections.shop ? (
        <section id="shop" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Shop</p>
            <h3>Rerolls, timing, and every upgrade line</h3>
            <p className="panel-copy compact-copy">
              Base shop rerolls start at 0. Some talents grant rerolls, and the player who went
              second in the previous round gets +1 extra reroll for the shop.
            </p>
          </div>
          <div className="rulebook-upgrade-groups">
            {visibleUpgradeGroups.map((group) => (
              <article key={group.id} className="rulebook-upgrade-group">
                <div className="rulebook-upgrade-group-head">
                  <strong>{group.title}</strong>
                  <span>{group.description}</span>
                </div>
                <div className="rulebook-upgrade-list">
                  {group.upgrades.map((upgrade) => (
                    <section key={upgrade.name} className="rulebook-upgrade-line">
                      <div className="rulebook-upgrade-line-head">
                        <span className="rulebook-upgrade-icon" aria-hidden="true">
                          {upgrade.icon}
                        </span>
                        <div>
                          <strong>{upgrade.name}</strong>
                          <span>{upgrade.summary}</span>
                        </div>
                      </div>
                      <div className="rulebook-tier-list">
                        {upgrade.tiers.map((tier) => (
                          <div
                            key={`${upgrade.name}-${tier.rarity}-${tier.effect}`}
                            className={`rulebook-tier-chip rulebook-tier-${tier.rarity}`}
                          >
                            <span>{tier.rarity}</span>
                            <strong>{tier.effect}</strong>
                            <span>{tier.cost} gold</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleSections.relics ? (
        <section id="relics" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Relics</p>
            <h3>Match-only power spikes</h3>
            <p className="panel-copy compact-copy">
              After rounds 2, 4, and 6, both players finish the normal shop and then choose 1 of 3
              relics. Relics do not cost gold and only last for that match.
            </p>
          </div>
          <div className="rulebook-inline-note-grid">
            <article className="rulebook-note-card">
              <strong>Personal offers</strong>
              <span>Each player gets their own 3 relic offers instead of fighting over one shared pool.</span>
            </article>
            <article className="rulebook-note-card">
              <strong>Big swings</strong>
              <span>Relics are meant to change your plan, not just add another tiny stat bonus.</span>
            </article>
            <article className="rulebook-note-card">
              <strong>Bot matches too</strong>
              <span>Bot matches use relic rounds as well, so they feel like full real matches.</span>
            </article>
          </div>
          <div className="rulebook-hand-grid">
            {relicEntries
              .filter((relic) => matchesQuery(query, relic.name, relic.theme, relic.summary))
              .map((relic) => (
                <article key={relic.name} className="rulebook-hand-card">
                  <div className="rulebook-hand-head">
                    <strong>{relic.name}</strong>
                    <span>{relic.theme}</span>
                  </div>
                  <p>{relic.summary}</p>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      {visibleSections.progression ? (
        <section id="progression" className="rulebook-section">
          <div className="rulebook-section-head">
            <p className="eyebrow">Progression</p>
            <h3>Levels, talents, achievements, and ranked play</h3>
          </div>
          <div className="rulebook-progress-grid">
            <article className="rulebook-progress-card">
              <strong>Achievements</strong>
              <span>Most achievements are tiered grind tracks. They award talent points and account XP.</span>
            </article>
            <article className="rulebook-progress-card">
              <strong>Talent trees</strong>
              <span>Offense, Defense, and Utility are spec-based. Reset talents if you want to rebuild.</span>
            </article>
            <article className="rulebook-progress-card">
              <strong>Level rewards</strong>
              <span>Levels unlock special cards and meta bonuses like Joker, Flame, 15, and Plasma.</span>
            </article>
              <article className="rulebook-progress-card">
                <strong>ELO</strong>
                <span>ELO changes only when the full best-of-9 match ends, not after each individual round.</span>
              </article>
              <article className="rulebook-progress-card">
                <strong>Bot matches</strong>
                <span>Playing bots does not award ELO, achievements, XP, or level progression.</span>
              </article>
            </div>
          </section>
      ) : null}
    </section>
  );
}
