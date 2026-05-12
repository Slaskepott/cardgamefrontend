import achievementUnlockSfx from "./sfx/achievement_unlock.mp3";
import cardDeselectSfx from "./sfx/card_deselect.mp3";
import cardSelectSfx from "./sfx/card_select.mp3";
import defeatSfx from "./sfx/defeat.mp3";
import discardSfx from "./sfx/discard.mp3";
import impactDoubleSfx from "./sfx/impact_double.mp3";
import impactHitSfx from "./sfx/impact_hit.mp3";
import impactLethalSfx from "./sfx/impact_lethal.mp3";
import levelUpSfx from "./sfx/level_up.mp3";
import notEnoughGoldSfx from "./sfx/not_enough_gold.mp3";
import relicPickSfx from "./sfx/relic_pick.mp3";
import relicRevealSfx from "./sfx/relic_reveal.mp3";
import shopRerollSfx from "./sfx/shop_reroll.mp3";
import shopRevealSfx from "./sfx/shop_reveal.mp3";
import upgradeBuyCommonSfx from "./sfx/upgrade_buy_common.mp3";
import upgradeBuyEpicSfx from "./sfx/upgrade_buy_epic.mp3";
import upgradeBuyLegendarySfx from "./sfx/upgrade_buy_legendary.mp3";
import upgradeBuyRareSfx from "./sfx/upgrade_buy_rare.mp3";
import upgradeBuyUncommonSfx from "./sfx/upgrade_buy_uncommon.mp3";
import victorySfx from "./sfx/victory.mp3";
import tableOfFivesMusic from "../assets/audio/table-of-fives.mp3";
import velvetHouseEdgeMusic from "../assets/audio/velvet-house-edge.mp3";

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
}

export type AudioScene = "hero" | "hub" | "battle" | "shop" | "relic";

const AUDIO_SETTINGS_KEY = "slaskecards-audio-settings";
const defaultAudioSettings: AudioSettings = {
  masterVolume: 0.85,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  ambienceVolume: 0.45,
};

const sfxSources = {
  achievementUnlock: achievementUnlockSfx,
  cardDeselect: cardDeselectSfx,
  cardSelect: cardSelectSfx,
  defeat: defeatSfx,
  discard: discardSfx,
  impactDouble: impactDoubleSfx,
  impactHit: impactHitSfx,
  impactLethal: impactLethalSfx,
  levelUp: levelUpSfx,
  notEnoughGold: notEnoughGoldSfx,
  relicPick: relicPickSfx,
  relicReveal: relicRevealSfx,
  shopReroll: shopRerollSfx,
  shopReveal: shopRevealSfx,
  upgradeBuyCommon: upgradeBuyCommonSfx,
  upgradeBuyEpic: upgradeBuyEpicSfx,
  upgradeBuyLegendary: upgradeBuyLegendarySfx,
  upgradeBuyRare: upgradeBuyRareSfx,
  upgradeBuyUncommon: upgradeBuyUncommonSfx,
  victory: victorySfx,
} as const;

type SfxKey = keyof typeof sfxSources;

let settings: AudioSettings = loadStoredAudioSettings();
let unlocked = false;
let currentScene: AudioScene = "hero";
let gameMusic: HTMLAudioElement | null = null;
let nonGameMusic: HTMLAudioElement | null = null;
let activeMusicKind: "game" | "non-game" | null = null;
let musicFadeFrame: number | null = null;
let musicTransitionToken = 0;

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

function loadStoredAudioSettings(): AudioSettings {
  if (typeof window === "undefined") {
    return { ...defaultAudioSettings };
  }

  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) {
      return { ...defaultAudioSettings };
    }
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      masterVolume: clampVolume(parsed.masterVolume ?? defaultAudioSettings.masterVolume),
      musicVolume: clampVolume(parsed.musicVolume ?? defaultAudioSettings.musicVolume),
      sfxVolume: clampVolume(parsed.sfxVolume ?? defaultAudioSettings.sfxVolume),
      ambienceVolume: clampVolume(parsed.ambienceVolume ?? defaultAudioSettings.ambienceVolume),
    };
  } catch {
    return { ...defaultAudioSettings };
  }
}

function saveStoredAudioSettings(next: AudioSettings) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function getStoredAudioSettings() {
  return { ...settings };
}

function desiredMusicKind(scene: AudioScene) {
  return scene === "battle" || scene === "shop" || scene === "relic" ? "game" : "non-game";
}

function currentMusicVolume() {
  return clampVolume(settings.masterVolume * settings.musicVolume);
}

function currentSfxVolume() {
  return clampVolume(settings.masterVolume * settings.sfxVolume);
}

function initializeMusicTracks() {
  if (typeof window === "undefined") {
    return;
  }

  if (!gameMusic) {
    gameMusic = new Audio(velvetHouseEdgeMusic);
    gameMusic.loop = true;
    gameMusic.preload = "auto";
  }

  if (!nonGameMusic) {
    nonGameMusic = new Audio(tableOfFivesMusic);
    nonGameMusic.loop = true;
    nonGameMusic.preload = "auto";
  }
}

function setTrackVolume(track: HTMLAudioElement | null, value: number) {
  if (!track) {
    return;
  }
  track.volume = clampVolume(value);
}

function silenceTrack(track: HTMLAudioElement | null) {
  if (!track) {
    return;
  }
  track.pause();
  setTrackVolume(track, 0);
}

function stopMusicPlayback() {
  if (musicFadeFrame !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(musicFadeFrame);
  }
  musicFadeFrame = null;
  musicTransitionToken += 1;
  silenceTrack(gameMusic);
  silenceTrack(nonGameMusic);
  activeMusicKind = null;
}

async function playTrack(
  track: HTMLAudioElement | null,
  expectedKind?: "game" | "non-game",
  token?: number,
) {
  if (!track) {
    return;
  }
  try {
    await track.play();
    if (
      (token !== undefined && token !== musicTransitionToken) ||
      (expectedKind && desiredMusicKind(currentScene) !== expectedKind)
    ) {
      silenceTrack(track);
    }
  } catch {
    // Ignore autoplay / playback interruptions until the next user interaction.
  }
}

function animateMusicTransition(
  nextKind: "game" | "non-game",
  incomingTrack: HTMLAudioElement | null,
  outgoingTrack: HTMLAudioElement | null,
  durationMs = 1800,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (musicFadeFrame !== null) {
    window.cancelAnimationFrame(musicFadeFrame);
    musicFadeFrame = null;
  }
  musicTransitionToken += 1;
  const transitionToken = musicTransitionToken;
  const targetVolume = currentMusicVolume();

  if (!incomingTrack) {
    silenceTrack(outgoingTrack);
    return;
  }

  if (incomingTrack === outgoingTrack) {
    setTrackVolume(incomingTrack, targetVolume);
    if (incomingTrack.paused) {
      void playTrack(incomingTrack, nextKind, transitionToken);
    }
    return;
  }

  if (incomingTrack.paused) {
    setTrackVolume(incomingTrack, 0);
    void playTrack(incomingTrack, nextKind, transitionToken);
  }

  const initialIncoming = incomingTrack.volume;
  const initialOutgoing = outgoingTrack?.volume ?? 0;
  const startedAt = window.performance.now();

  const step = (now: number) => {
    if (transitionToken !== musicTransitionToken) {
      return;
    }

    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);

    setTrackVolume(
      incomingTrack,
      initialIncoming + (targetVolume - initialIncoming) * eased,
    );

    if (outgoingTrack) {
      setTrackVolume(outgoingTrack, initialOutgoing * (1 - eased));
    }

    if (progress < 1) {
      musicFadeFrame = window.requestAnimationFrame(step);
      return;
    }

    setTrackVolume(incomingTrack, targetVolume);
    if (outgoingTrack) {
      silenceTrack(outgoingTrack);
    }
    musicFadeFrame = null;
  };

  musicFadeFrame = window.requestAnimationFrame(step);
}

function syncMusicVolume() {
  const volume = currentMusicVolume();
  if (gameMusic && activeMusicKind === "game") {
    setTrackVolume(gameMusic, volume);
  }
  if (nonGameMusic && activeMusicKind === "non-game") {
    setTrackVolume(nonGameMusic, volume);
  }
}

function syncMusicPlayback() {
  initializeMusicTracks();

  if (!unlocked || settings.masterVolume <= 0 || settings.musicVolume <= 0) {
    stopMusicPlayback();
    return;
  }

  const nextKind = desiredMusicKind(currentScene);
  const nextTrack = nextKind === "game" ? gameMusic : nonGameMusic;
  const previousTrack = nextKind === "game" ? nonGameMusic : gameMusic;

  if (activeMusicKind !== nextKind) {
    activeMusicKind = nextKind;
    animateMusicTransition(nextKind, nextTrack, previousTrack);
    return;
  }

  silenceTrack(previousTrack);
  syncMusicVolume();
  if (nextTrack?.paused) {
    void playTrack(nextTrack, nextKind, musicTransitionToken);
  }
}

function refreshBackgroundAudio() {
  syncMusicPlayback();
}

export async function primeAudio() {
  initializeMusicTracks();
  unlocked = true;
  refreshBackgroundAudio();
}

export function setAudioMix(next: AudioSettings) {
  settings = {
    masterVolume: clampVolume(next.masterVolume),
    musicVolume: clampVolume(next.musicVolume),
    sfxVolume: clampVolume(next.sfxVolume),
    ambienceVolume: clampVolume(next.ambienceVolume),
  };
  saveStoredAudioSettings(settings);
  refreshBackgroundAudio();
}

export function setAudioScene(scene: AudioScene) {
  currentScene = scene;
  refreshBackgroundAudio();
}

function playSfx(key: SfxKey, volumeMultiplier = 1) {
  if (!unlocked) {
    return;
  }
  const volume = clampVolume(currentSfxVolume() * volumeMultiplier);
  if (volume <= 0) {
    return;
  }

  const sound = new Audio(sfxSources[key]);
  sound.preload = "auto";
  sound.volume = volume;
  void sound.play().catch(() => {
    // Ignore playback interruption/no-user-gesture cases.
  });
}

export function playCardToggle(selected: boolean) {
  playSfx(selected ? "cardSelect" : "cardDeselect");
}

export function playDiscardSound() {
  playSfx("discard");
}

export function playShopRevealSound() {
  playSfx("shopReveal");
}

export function playRerollSound() {
  playSfx("shopReroll");
}

export function playUpgradeBuySound(rarity: string) {
  const keyByRarity: Record<string, SfxKey> = {
    common: "upgradeBuyCommon",
    uncommon: "upgradeBuyUncommon",
    rare: "upgradeBuyRare",
    epic: "upgradeBuyEpic",
    legendary: "upgradeBuyLegendary",
  };
  playSfx(keyByRarity[rarity] ?? "upgradeBuyCommon");
}

export function playRelicRevealSound() {
  playSfx("relicReveal");
}

export function playRelicPickSound() {
  playSfx("relicPick");
}

export function playGoldErrorSound() {
  playSfx("notEnoughGold");
}

export function playBattleImpact(options: {
  damage: number;
  hits: number;
  doublePlayTriggered: boolean;
  matchFinished?: boolean;
}) {
  const hitCount = Math.max(1, options.hits || 1);
  for (let index = 0; index < hitCount; index += 1) {
    window.setTimeout(() => {
      playSfx(options.matchFinished ? "impactLethal" : "impactHit", 1);
    }, index * 170);
  }

  if (options.doublePlayTriggered) {
    window.setTimeout(() => {
      playSfx("impactDouble", 0.95);
    }, 90);
  }
}

export function playVictorySound(isWinner: boolean) {
  playSfx(isWinner ? "victory" : "defeat");
}

export function playAchievementSound() {
  playSfx("achievementUnlock");
}

export function playLevelUpSound() {
  playSfx("levelUp");
}
