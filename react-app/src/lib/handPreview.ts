import type { Card, MetaProgress, Relic, Suit, Upgrade } from "../types/game";

const RANK_VALUES: Record<string, number> = {
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
  "15": 15,
};

const HAND_MULTIPLIERS: Record<string, number> = {
  "high card": 1,
  pair: 2,
  "two pair": 3,
  "three of a kind": 3,
  straight: 4,
  flush: 4,
  "full house": 4,
  "flush house": 9,
  "four of a kind": 7,
  "straight flush": 8,
  "royal flush": 10,
  "five of a kind": 8,
};
const RANK_COMPRESSION_FACTOR = 2;

interface PreviewModifiers {
  damageModifier: number;
  elemental: Record<string, number>;
  lowCardDamageModifier: number;
  highCardDamageModifier: number;
  tinyRankDamageMultiplier: number;
  pairDamageModifier: number;
  straightDamageModifier: number;
  flushDamageModifier: number;
  fullHouseDamageModifier: number;
  repeatedSuitDamageBonusPct: number;
  plasmaBonusValue: number;
  gapStraightEnabled: boolean;
  softFlushEnabled: boolean;
  playTwiceChancePct: number;
}

export interface HandPreview {
  handType: string;
  damage: number;
  multiplier: number;
  playTwiceChancePct: number;
}

function parsePercent(effect: string) {
  const match = effect.match(/([+-]?\d+)/);
  return match ? Number(match[1]) : 0;
}

function getCompressedRankValue(rank: number) {
  const midpoint = 8;
  return midpoint + (rank - midpoint) / RANK_COMPRESSION_FACTOR;
}

function buildModifiers(
  upgrades: Upgrade[],
  relics: Relic[],
  metaProgress: MetaProgress | null,
  unlockedLevelRewards: string[],
): PreviewModifiers {
  const talentBonuses = metaProgress?.talent_bonuses ?? {};
  const unlocked = new Set(unlockedLevelRewards);

  const modifiers: PreviewModifiers = {
    damageModifier:
      1 + ((Number(talentBonuses.damage_pct ?? 0) +
        (unlocked.has("killer_instinct") ? 2 : 0) +
        (unlocked.has("prismatic_knack") ? 3 : 0)) /
        100),
    elemental: {
      Water: 1 + Number(talentBonuses.water_damage_pct ?? 0) / 100,
      Fire: 1 + Number(talentBonuses.fire_damage_pct ?? 0) / 100,
      Air: 1 + Number(talentBonuses.air_damage_pct ?? 0) / 100,
      Earth: 1 + Number(talentBonuses.earth_damage_pct ?? 0) / 100,
      Plasma:
        1 +
        (Number(talentBonuses.plasma_damage_pct ?? 0) +
          (unlocked.has("arc_furnace") ? 18 : 0)) /
          100,
    },
    lowCardDamageModifier: 1 + Number(talentBonuses.low_card_damage_pct ?? 0) / 100,
    highCardDamageModifier: 1 + Number(talentBonuses.high_card_damage_pct ?? 0) / 100,
    tinyRankDamageMultiplier: 1,
    pairDamageModifier: 1 + Number(talentBonuses.pair_damage_pct ?? 0) / 100,
    straightDamageModifier: 1 + Number(talentBonuses.straight_damage_pct ?? 0) / 100,
    flushDamageModifier: 1 + Number(talentBonuses.flush_damage_pct ?? 0) / 100,
    fullHouseDamageModifier: 1 + Number(talentBonuses.full_house_damage_pct ?? 0) / 100,
    repeatedSuitDamageBonusPct: 0,
    plasmaBonusValue: unlocked.has("singularity_engine") ? 2 : 0,
    gapStraightEnabled: false,
    softFlushEnabled: false,
    playTwiceChancePct: Number(talentBonuses.play_twice_chance_pct ?? 0),
  };

  upgrades.forEach((upgrade) => {
    const amount = parsePercent(upgrade.effect) / 100;
    if (upgrade.name === "Increase Damage") {
      modifiers.damageModifier += amount;
      return;
    }
    if (upgrade.name === "Low Cards Specialist") {
      modifiers.lowCardDamageModifier += amount;
      return;
    }
    if (upgrade.name === "High Cards Specialist") {
      modifiers.highCardDamageModifier += amount;
      return;
    }
    if (upgrade.name === "Echo Hand") {
      modifiers.playTwiceChancePct += parsePercent(upgrade.effect);
      return;
    }
    if (upgrade.name === "Gap Straight") {
      modifiers.gapStraightEnabled = true;
      return;
    }
    if (upgrade.name === "Soft Flush") {
      modifiers.softFlushEnabled = true;
      return;
    }
    if (upgrade.name.startsWith("Increase ") && upgrade.name.endsWith(" Damage")) {
      const element = upgrade.name.split(" ")[1];
      modifiers.elemental[element] = (modifiers.elemental[element] ?? 1) + amount;
    }
  });

  relics.forEach((relic) => {
    switch (relic.id) {
      case "tiny_tyrants":
        modifiers.tinyRankDamageMultiplier = 3;
        break;
      case "tidal_memory":
        modifiers.repeatedSuitDamageBonusPct += 18;
        break;
      case "plasma_lattice":
        modifiers.elemental.Plasma = (modifiers.elemental.Plasma ?? 1) + 0.4;
        break;
      case "overflow_chamber":
        modifiers.damageModifier = Math.max(0.4, modifiers.damageModifier - 0.2);
        break;
      default:
        break;
    }
  });

  return modifiers;
}

function getAvailableSuits(unlockedLevelRewards: string[]) {
  const suits: Suit[] = ["Fire", "Air", "Earth", "Water"];
  if (unlockedLevelRewards.includes("plasma")) {
    suits.push("Plasma");
  }
  return suits;
}

function getAvailableRanks(unlockedLevelRewards: string[]) {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  if (unlockedLevelRewards.includes("fifteen")) {
    ranks.push("15");
  }
  return ranks;
}

function resolveCardVariants(card: Card, unlockedLevelRewards: string[]) {
  const rank = card.rank;
  const suit = card.suit;

  if (rank === "Joker" || suit === "Wild") {
    return getAvailableSuits(unlockedLevelRewards).flatMap((candidateSuit) =>
      getAvailableRanks(unlockedLevelRewards).map((candidateRank) => ({
        rank: candidateRank,
        suit: candidateSuit,
      })),
    );
  }

  if (rank === "Flame") {
    return getAvailableRanks(unlockedLevelRewards).map((candidateRank) => ({
      rank: candidateRank,
      suit: "Fire" as Suit,
    }));
  }

  return [card];
}

function cartesianProduct<T>(items: T[][]): T[][] {
  return items.reduce<T[][]>(
    (accumulator, current) =>
      accumulator.flatMap((entry) => current.map((item) => [...entry, item])),
    [[]],
  );
}

function isGapStraightWindow(window: number[], modifiers: PreviewModifiers) {
  if (window.length !== 5) {
    return false;
  }
  const spread = window[4] - window[0];
  if (spread === 4) {
    return true;
  }
  return modifiers.gapStraightEnabled && spread === 5;
}

function evaluateConcreteHand(cards: Card[], modifiers: PreviewModifiers): HandPreview {
  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<string, number>();
  const ranks: number[] = [];
  const baseValues: number[] = [];

  cards.forEach((card) => {
    const rank = RANK_VALUES[card.rank];
    const suit = card.suit;
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
    suitCounts.set(suit, (suitCounts.get(suit) ?? 0) + 1);
    ranks.push(rank);
  });

  cards.forEach((card) => {
    const rank = RANK_VALUES[card.rank];
    const suit = card.suit;

    let rankModifier = 1;
    if (rank <= 7) {
      rankModifier *= modifiers.lowCardDamageModifier;
    } else if (rank >= 10) {
      rankModifier *= modifiers.highCardDamageModifier;
    }
    if (rank === 2 || rank === 3 || rank === 4) {
      rankModifier *= modifiers.tinyRankDamageMultiplier;
    }

    let totalModifier =
      (modifiers.elemental[suit] ?? 1) * modifiers.damageModifier * rankModifier;
    const repeatCount = Math.max(0, (suitCounts.get(suit) ?? 0) - 1);
    if (repeatCount > 0 && modifiers.repeatedSuitDamageBonusPct > 0) {
      totalModifier *= 1 + (repeatCount * modifiers.repeatedSuitDamageBonusPct) / 100;
    }
    const damageRank =
      getCompressedRankValue(rank) + (suit === "Plasma" ? modifiers.plasmaBonusValue : 0);
    baseValues.push(damageRank * totalModifier);
  });

  const rankFrequencies = [...rankCounts.values()].sort((left, right) => right - left);
  const flushRequirement = modifiers.softFlushEnabled ? 4 : 5;
  const isFlush =
    cards.length >= flushRequirement && Math.max(...suitCounts.values()) >= flushRequirement;
  const sortedRanks = [...new Set(ranks)].sort((left, right) => left - right);

  let isStraight = false;
  if (sortedRanks.length >= 5) {
    for (let index = 0; index <= sortedRanks.length - 5; index += 1) {
      const window = sortedRanks.slice(index, index + 5);
      if (isGapStraightWindow(window, modifiers)) {
        isStraight = true;
        break;
      }
    }
    if (JSON.stringify(sortedRanks.slice(-5)) === JSON.stringify([2, 3, 4, 5, 14])) {
      isStraight = true;
    }
  }

  const isRoyal =
    isFlush && [10, 11, 12, 13, 14].every((rank) => ranks.includes(rank));

  let handType = "high card";
  if (isRoyal) handType = "royal flush";
  else if (isStraight && isFlush) handType = "straight flush";
  else if (rankFrequencies.includes(5)) handType = "five of a kind";
  else if (isFlush && rankFrequencies.includes(3) && rankFrequencies.includes(2)) handType = "flush house";
  else if (rankFrequencies.includes(4)) handType = "four of a kind";
  else if (rankFrequencies.includes(3) && rankFrequencies.includes(2)) handType = "full house";
  else if (isFlush) handType = "flush";
  else if (isStraight) handType = "straight";
  else if (rankFrequencies.includes(3)) handType = "three of a kind";
  else if (rankFrequencies.filter((count) => count === 2).length === 2) handType = "two pair";
  else if (rankFrequencies.includes(2)) handType = "pair";

  const multiplier = HAND_MULTIPLIERS[handType];
  let handTypeModifier = 1;
  if (handType === "pair" || handType === "two pair") {
    handTypeModifier *= modifiers.pairDamageModifier;
  }
  if (handType === "straight" || handType === "straight flush" || handType === "royal flush") {
    handTypeModifier *= modifiers.straightDamageModifier;
  }
  if (
    handType === "flush" ||
    handType === "flush house" ||
    handType === "straight flush" ||
    handType === "royal flush"
  ) {
    handTypeModifier *= modifiers.flushDamageModifier;
  }
  if (
    handType === "three of a kind" ||
    handType === "full house" ||
    handType === "flush house"
  ) {
    handTypeModifier *= modifiers.fullHouseDamageModifier;
  }

  const baseDamage = Math.floor(baseValues.reduce((sum, value) => sum + value, 0) / Math.max(1, baseValues.length));
  return {
    handType,
    multiplier,
    damage: Math.round(baseDamage * multiplier * handTypeModifier),
    playTwiceChancePct: modifiers.playTwiceChancePct,
  };
}

export function buildHandPreview(
  cards: Card[],
  upgrades: Upgrade[],
  relics: Relic[],
  metaProgress: MetaProgress | null,
  unlockedLevelRewards: string[],
): HandPreview | null {
  if (cards.length === 0) {
    return null;
  }

  const modifiers = buildModifiers(upgrades, relics, metaProgress, unlockedLevelRewards);
  const variantsPerCard = cards.map((card) => resolveCardVariants(card, unlockedLevelRewards));
  const combinations = cartesianProduct(variantsPerCard);

  let bestPreview: HandPreview | null = null;
  let bestScore: [number, number, number] | null = null;

  combinations.forEach((resolvedCards) => {
    const preview = evaluateConcreteHand(resolvedCards as Card[], modifiers);
    const rankTotal = (resolvedCards as Card[]).reduce(
      (sum, card) => sum + (RANK_VALUES[card.rank] ?? 0),
      0,
    );
    const score: [number, number, number] = [preview.damage, preview.multiplier, rankTotal];
    if (
      !bestScore ||
      score[0] > bestScore[0] ||
      (score[0] === bestScore[0] && score[1] > bestScore[1]) ||
      (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] > bestScore[2])
    ) {
      bestScore = score;
      bestPreview = preview;
    }
  });

  return bestPreview;
}
