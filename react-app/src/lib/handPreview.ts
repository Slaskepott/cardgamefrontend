import type { Card, MetaProgress, Suit, Upgrade } from "../types/game";

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
  "four of a kind": 7,
  "straight flush": 8,
  "royal flush": 10,
};

interface PreviewModifiers {
  damageModifier: number;
  elemental: Record<string, number>;
  lowCardDamageModifier: number;
  highCardDamageModifier: number;
  pairDamageModifier: number;
  straightDamageModifier: number;
  flushDamageModifier: number;
  fullHouseDamageModifier: number;
  plasmaBonusValue: number;
}

export interface HandPreview {
  handType: string;
  damage: number;
  multiplier: number;
}

function parsePercent(effect: string) {
  const match = effect.match(/([+-]?\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildModifiers(
  upgrades: Upgrade[],
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
    pairDamageModifier: 1 + Number(talentBonuses.pair_damage_pct ?? 0) / 100,
    straightDamageModifier: 1 + Number(talentBonuses.straight_damage_pct ?? 0) / 100,
    flushDamageModifier: 1 + Number(talentBonuses.flush_damage_pct ?? 0) / 100,
    fullHouseDamageModifier: 1 + Number(talentBonuses.full_house_damage_pct ?? 0) / 100,
    plasmaBonusValue: unlocked.has("singularity_engine") ? 2 : 0,
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
    if (upgrade.name.startsWith("Increase ") && upgrade.name.endsWith(" Damage")) {
      const element = upgrade.name.split(" ")[1];
      modifiers.elemental[element] = (modifiers.elemental[element] ?? 1) + amount;
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

    let rankModifier = 1;
    if (rank <= 7) {
      rankModifier *= modifiers.lowCardDamageModifier;
    } else if (rank >= 10) {
      rankModifier *= modifiers.highCardDamageModifier;
    }

    const totalModifier =
      (modifiers.elemental[suit] ?? 1) * modifiers.damageModifier * rankModifier;
    const damageRank = rank + (suit === "Plasma" ? modifiers.plasmaBonusValue : 0);
    baseValues.push(damageRank * totalModifier);
  });

  const rankFrequencies = [...rankCounts.values()].sort((left, right) => right - left);
  const isFlush = cards.length >= 5 && Math.max(...suitCounts.values()) === cards.length;
  const sortedRanks = [...new Set(ranks)].sort((left, right) => left - right);

  let isStraight = false;
  if (sortedRanks.length >= 5) {
    for (let index = 0; index <= sortedRanks.length - 5; index += 1) {
      const window = sortedRanks.slice(index, index + 5);
      if (window[4] - window[0] === 4 && window.length === 5) {
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
  if (handType === "flush" || handType === "straight flush" || handType === "royal flush") {
    handTypeModifier *= modifiers.flushDamageModifier;
  }
  if (handType === "three of a kind" || handType === "full house") {
    handTypeModifier *= modifiers.fullHouseDamageModifier;
  }

  const baseDamage = Math.floor(baseValues.reduce((sum, value) => sum + value, 0) / Math.max(1, baseValues.length));
  return {
    handType,
    multiplier,
    damage: Math.round(baseDamage * multiplier * handTypeModifier),
  };
}

export function buildHandPreview(
  cards: Card[],
  upgrades: Upgrade[],
  metaProgress: MetaProgress | null,
  unlockedLevelRewards: string[],
): HandPreview | null {
  if (cards.length === 0) {
    return null;
  }

  const modifiers = buildModifiers(upgrades, metaProgress, unlockedLevelRewards);
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
