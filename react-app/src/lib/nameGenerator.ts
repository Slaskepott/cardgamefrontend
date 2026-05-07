const lobbyPrefixes = [
  "ember",
  "moon",
  "iron",
  "storm",
  "golden",
  "shadow",
  "wild",
  "frost",
  "runic",
  "crimson",
];

const lobbyPlaces = [
  "tavern",
  "citadel",
  "sanctum",
  "arena",
  "keep",
  "crossing",
  "vault",
  "forge",
  "hollow",
  "spire",
];

const lobbyModes = [
  "duel",
  "brawl",
  "showdown",
  "gauntlet",
  "trial",
  "clash",
];

const playerTitles = [
  "swift",
  "wily",
  "ember",
  "silver",
  "grim",
  "lucky",
  "arcane",
  "brave",
  "quiet",
  "storm",
];

const playerNames = [
  "fox",
  "knight",
  "mage",
  "bard",
  "raven",
  "rogue",
  "warden",
  "seer",
  "drifter",
  "duelist",
];

const playerSuffixes = [
  "of-ashes",
  "of-dawn",
  "of-stars",
  "the-bold",
  "the-cunning",
  "the-farstrider",
  "of-the-north",
  "of-the-deep",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateLobbyId() {
  const prefix = pickRandom(lobbyPrefixes);
  const mode = pickRandom(lobbyModes);
  const placeOrMode = Math.random() > 0.5 ? pickRandom(lobbyPlaces) : mode;
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${prefix}-${placeOrMode}-${suffix}`;
}

export function generatePlayerName() {
  const title = pickRandom(playerTitles);
  const name = pickRandom(playerNames);
  const suffix = Math.random() > 0.78 ? `-${pickRandom(playerSuffixes)}` : "";
  return `${title}-${name}${suffix}`;
}
