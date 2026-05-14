import achievementUnlockSfx from "./sfx/achievement_unlock.mp3";
import cardDeselectSfx from "./sfx/card_deselect.wav";
import cardSelectSfx from "./sfx/card_select.wav";
import defeatSfx from "./sfx/defeat.mp3";
import discardSfx from "./sfx/discard.mp3";
import impactDoubleSfx from "./sfx/impact_double.mp3";
import levelUpSfx from "./sfx/level_up.mp3";
import notEnoughGoldSfx from "./sfx/error.wav";
import punch1Sfx from "./sfx/punch1.wav";
import punch2Sfx from "./sfx/punch2.wav";
import punch3Sfx from "./sfx/punch3.wav";
import punch4Sfx from "./sfx/punch4.wav";
import punchExtremeSfx from "./sfx/punch_extreme.wav";
import punchHard1Sfx from "./sfx/punch_hard1.wav";
import punchMedium1Sfx from "./sfx/punch_medium1.wav";
import relicPickSfx from "./sfx/relic_pick.mp3";
import relicRevealSfx from "./sfx/relic_reveal.mp3";
import shopRerollSfx from "./sfx/shop_reroll.mp3";
import shopRevealSfx from "./sfx/shop_reveal.mp3";
import shopReveal1Sfx from "./sfx/shop_reveal1.wav";
import shopReveal2Sfx from "./sfx/shop_reveal2.wav";
import shopReveal3Sfx from "./sfx/shop_reveal3.wav";
import shopReveal4Sfx from "./sfx/shop_reveal4.wav";
import shopReveal5Sfx from "./sfx/shop_reveal5.wav";
import upgradeBuyCommonSfx from "./sfx/shop_purchase_common.mp3";
import upgradeBuyEpicSfx from "./sfx/shop_purchase_epic.mp3";
import upgradeBuyLegendarySfx from "./sfx/shop_purchase_legendary.mp3";
import upgradeBuyRareSfx from "./sfx/shop_purchase_rare.wav";
import upgradeBuyUncommonSfx from "./sfx/shop_purchase_uncommon.mp3";
import victorySfx from "./sfx/victory.mp3";
import tableOfFivesMusic from "../assets/audio/velvet-house-edge-menu.mp3";
import velvetHouseCampaign2Music from "../assets/audio/velvet-house-campaign-2.mp3";
import velvetHouseCampaignBoss1Music from "../assets/audio/velvet-house-campaign-boss-1.mp3";
import velvetHouseCampaignBoss2Music from "../assets/audio/velvet-house-campaign-boss-2.mp3";
import velvetHouseCampaignBoss3Music from "../assets/audio/velvet-house-campaign-boss-3.mp3";
import velvetHouseCampaignBoss4Music from "../assets/audio/velvet-house-campaign-boss-4.mp3";
import velvetHouseEdgeMusic from "../assets/audio/velvet-house-edge.mp3";

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
}

export type AudioScene =
  | "hero"
  | "hub"
  | "campaign"
  | "campaignBoss1"
  | "campaignBoss2"
  | "campaignBoss3"
  | "campaignBoss4"
  | "battle"
  | "shop"
  | "relic";

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
  levelUp: levelUpSfx,
  notEnoughGold: notEnoughGoldSfx,
  punch1: punch1Sfx,
  punch2: punch2Sfx,
  punch3: punch3Sfx,
  punch4: punch4Sfx,
  punchExtreme: punchExtremeSfx,
  punchHard1: punchHard1Sfx,
  punchMedium1: punchMedium1Sfx,
  relicPick: relicPickSfx,
  relicReveal: relicRevealSfx,
  shopReroll: shopRerollSfx,
  shopReveal: shopRevealSfx,
  shopReveal1: shopReveal1Sfx,
  shopReveal2: shopReveal2Sfx,
  shopReveal3: shopReveal3Sfx,
  shopReveal4: shopReveal4Sfx,
  shopReveal5: shopReveal5Sfx,
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
let campaignMusic: HTMLAudioElement | null = null;
let campaignBoss1Music: HTMLAudioElement | null = null;
let campaignBoss2Music: HTMLAudioElement | null = null;
let campaignBoss3Music: HTMLAudioElement | null = null;
let campaignBoss4Music: HTMLAudioElement | null = null;
let activeMusicKind:
  | "game"
  | "campaign"
  | "campaignBoss1"
  | "campaignBoss2"
  | "campaignBoss3"
  | "campaignBoss4"
  | "non-game"
  | null = null;
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
  if (scene === "campaign") return "campaign";
  if (scene === "campaignBoss1") return "campaignBoss1";
  if (scene === "campaignBoss2") return "campaignBoss2";
  if (scene === "campaignBoss3") return "campaignBoss3";
  if (scene === "campaignBoss4") return "campaignBoss4";
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

  if (!campaignMusic) {
    campaignMusic = new Audio(velvetHouseCampaign2Music);
    campaignMusic.loop = true;
    campaignMusic.preload = "auto";
  }

  if (!campaignBoss1Music) {
    campaignBoss1Music = new Audio(velvetHouseCampaignBoss1Music);
    campaignBoss1Music.loop = true;
    campaignBoss1Music.preload = "auto";
  }

  if (!campaignBoss2Music) {
    campaignBoss2Music = new Audio(velvetHouseCampaignBoss2Music);
    campaignBoss2Music.loop = true;
    campaignBoss2Music.preload = "auto";
  }

  if (!campaignBoss3Music) {
    campaignBoss3Music = new Audio(velvetHouseCampaignBoss3Music);
    campaignBoss3Music.loop = true;
    campaignBoss3Music.preload = "auto";
  }

  if (!campaignBoss4Music) {
    campaignBoss4Music = new Audio(velvetHouseCampaignBoss4Music);
    campaignBoss4Music.loop = true;
    campaignBoss4Music.preload = "auto";
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
  silenceTrack(campaignMusic);
  silenceTrack(campaignBoss1Music);
  silenceTrack(campaignBoss2Music);
  silenceTrack(campaignBoss3Music);
  silenceTrack(campaignBoss4Music);
  activeMusicKind = null;
}

async function playTrack(
  track: HTMLAudioElement | null,
  expectedKind?:
    | "game"
    | "campaign"
    | "campaignBoss1"
    | "campaignBoss2"
    | "campaignBoss3"
    | "campaignBoss4"
    | "non-game",
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
  nextKind:
    | "game"
    | "campaign"
    | "campaignBoss1"
    | "campaignBoss2"
    | "campaignBoss3"
    | "campaignBoss4"
    | "non-game",
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
  if (campaignMusic && activeMusicKind === "campaign") {
    setTrackVolume(campaignMusic, volume);
  }
  if (campaignBoss1Music && activeMusicKind === "campaignBoss1") {
    setTrackVolume(campaignBoss1Music, volume);
  }
  if (campaignBoss2Music && activeMusicKind === "campaignBoss2") {
    setTrackVolume(campaignBoss2Music, volume);
  }
  if (campaignBoss3Music && activeMusicKind === "campaignBoss3") {
    setTrackVolume(campaignBoss3Music, volume);
  }
  if (campaignBoss4Music && activeMusicKind === "campaignBoss4") {
    setTrackVolume(campaignBoss4Music, volume);
  }
}

function syncMusicPlayback() {
  initializeMusicTracks();

  if (!unlocked || settings.masterVolume <= 0 || settings.musicVolume <= 0) {
    stopMusicPlayback();
    return;
  }

  const nextKind = desiredMusicKind(currentScene);
  const nextTrack =
    nextKind === "game"
      ? gameMusic
      : nextKind === "campaign"
        ? campaignMusic
        : nextKind === "campaignBoss1"
          ? campaignBoss1Music
          : nextKind === "campaignBoss2"
            ? campaignBoss2Music
            : nextKind === "campaignBoss3"
              ? campaignBoss3Music
              : nextKind === "campaignBoss4"
                ? campaignBoss4Music
                : nonGameMusic;
  const previousTracks = [
    gameMusic,
    campaignMusic,
    campaignBoss1Music,
    campaignBoss2Music,
    campaignBoss3Music,
    campaignBoss4Music,
    nonGameMusic,
  ].filter((track) => track && track !== nextTrack);

  if (activeMusicKind !== nextKind) {
    activeMusicKind = nextKind;
    animateMusicTransition(nextKind, nextTrack, previousTracks[0] ?? null);
    for (const staleTrack of previousTracks.slice(1)) {
      silenceTrack(staleTrack);
    }
    return;
  }

  for (const staleTrack of previousTracks) {
    silenceTrack(staleTrack);
  }
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

export function playShopRevealSound(rarity?: string) {
  const keyByRarity: Record<string, SfxKey> = {
    common: "shopReveal1",
    uncommon: "shopReveal2",
    rare: "shopReveal3",
    epic: "shopReveal4",
    legendary: "shopReveal5",
  };
  playSfx(keyByRarity[rarity ?? ""] ?? "shopReveal");
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
  targetHealthBefore?: number | null;
}) {
  const hitCount = Math.max(1, options.hits || 1);
  const targetHealthBefore = Math.max(1, options.targetHealthBefore ?? options.damage);
  const damagePercent = (options.damage / targetHealthBefore) * 100;
  const lowImpactPool: SfxKey[] = ["punch1", "punch2", "punch3", "punch4"];
  const impactKey: SfxKey =
    damagePercent <= 30
      ? lowImpactPool[Math.floor(Math.random() * lowImpactPool.length)]
      : damagePercent <= 60
        ? "punchMedium1"
        : damagePercent <= 80
          ? "punchHard1"
          : "punchExtreme";

  for (let index = 0; index < hitCount; index += 1) {
    window.setTimeout(() => {
      playSfx(impactKey, options.matchFinished ? 1.05 : 1);
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
