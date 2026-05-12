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

let settings: AudioSettings = loadStoredAudioSettings();
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlocked = false;
let currentScene: AudioScene = "hero";
let musicTimeout: number | null = null;
let ambienceTimeout: number | null = null;
let musicStep = 0;

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

function getContext() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) {
      return null;
    }
    audioContext = new Context();
    masterGain = audioContext.createGain();
    masterGain.gain.value = settings.masterVolume * 0.22;
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

function syncMasterGain() {
  if (!masterGain || !audioContext) {
    return;
  }
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(settings.masterVolume * 0.22, audioContext.currentTime + 0.05);
}

function getMasterGain() {
  const context = getContext();
  if (!context || !masterGain) {
    return null;
  }
  return { context, gain: masterGain };
}

function getNoiseBuffer(context: AudioContext) {
  if (noiseBuffer) {
    return noiseBuffer;
  }

  const buffer = context.createBuffer(1, context.sampleRate * 0.4, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function shapeGain(
  gainNode: GainNode,
  now: number,
  attack: number,
  peak: number,
  release: number,
) {
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
}

function effectiveGain(base: number, categoryVolume: number) {
  return base * settings.masterVolume * categoryVolume;
}

function playTone(options: {
  frequency: number;
  type?: OscillatorType;
  attack?: number;
  release?: number;
  gain?: number;
  detune?: number;
  when?: number;
  target?: AudioNode | null;
}) {
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const { context, gain } = pair;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(options.frequency, context.currentTime);
  oscillator.detune.setValueAtTime(options.detune ?? 0, context.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(options.target ?? gain);
  const when = options.when ?? context.currentTime;
  shapeGain(gainNode, when, options.attack ?? 0.01, options.gain ?? 0.12, options.release ?? 0.18);
  oscillator.start(when);
  oscillator.stop(when + (options.attack ?? 0.01) + (options.release ?? 0.18) + 0.05);
}

function playNoise(options: {
  attack?: number;
  release?: number;
  gain?: number;
  filterFrequency?: number;
  filterType?: BiquadFilterType;
  when?: number;
}) {
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const { context, gain } = pair;
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = options.filterType ?? "bandpass";
  filter.frequency.setValueAtTime(options.filterFrequency ?? 900, context.currentTime);
  filter.Q.value = 0.8;
  const gainNode = context.createGain();
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(gain);
  const when = options.when ?? context.currentTime;
  shapeGain(gainNode, when, options.attack ?? 0.005, options.gain ?? 0.08, options.release ?? 0.12);
  source.start(when);
  source.stop(when + (options.attack ?? 0.005) + (options.release ?? 0.12) + 0.05);
}

function playChord(
  frequencies: number[],
  options?: { gain?: number; release?: number; type?: OscillatorType },
) {
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const when = pair.context.currentTime;
  const gain = options?.gain ?? 0.08;
  frequencies.forEach((frequency, index) => {
    playTone({
      frequency,
      type: options?.type ?? "triangle",
      attack: 0.012,
      release: options?.release ?? 0.36,
      gain: gain / Math.max(1, frequencies.length * 0.8),
      when: when + index * 0.015,
      detune: (index - 1) * 4,
    });
  });
}

function clearMusicLoop() {
  if (musicTimeout !== null && typeof window !== "undefined") {
    window.clearTimeout(musicTimeout);
  }
  musicTimeout = null;
}

function clearAmbienceLoop() {
  if (ambienceTimeout !== null && typeof window !== "undefined") {
    window.clearTimeout(ambienceTimeout);
  }
  ambienceTimeout = null;
}

function queueMusicLoop() {
  clearMusicLoop();
  if (!unlocked || settings.masterVolume <= 0 || settings.musicVolume <= 0 || typeof window === "undefined") {
    return;
  }

  const scenes: Record<AudioScene, { notes: number[]; stepMs: number; type: OscillatorType; gain: number }> = {
    hero: { notes: [261.63, 329.63, 392, 523.25], stepMs: 760, type: "triangle", gain: 0.034 },
    hub: { notes: [246.94, 311.13, 369.99, 493.88], stepMs: 680, type: "triangle", gain: 0.03 },
    battle: { notes: [220, 293.66, 329.63, 392], stepMs: 520, type: "sawtooth", gain: 0.028 },
    shop: { notes: [293.66, 369.99, 440, 587.33], stepMs: 640, type: "triangle", gain: 0.032 },
    relic: { notes: [329.63, 415.3, 493.88, 659.25], stepMs: 620, type: "triangle", gain: 0.034 },
  };
  const scene = scenes[currentScene];
  const note = scene.notes[musicStep % scene.notes.length];
  musicStep += 1;
  playTone({
    frequency: note,
    type: scene.type,
    gain: effectiveGain(scene.gain, settings.musicVolume),
    attack: 0.02,
    release: currentScene === "battle" ? 0.24 : 0.42,
  });
  if (musicStep % scene.notes.length === 0) {
    playTone({
      frequency: note / 2,
      type: "sine",
      gain: effectiveGain(scene.gain * 0.65, settings.musicVolume),
      attack: 0.025,
      release: 0.54,
    });
  }
  musicTimeout = window.setTimeout(queueMusicLoop, scene.stepMs);
}

function queueAmbienceLoop() {
  clearAmbienceLoop();
  if (!unlocked || settings.masterVolume <= 0 || settings.ambienceVolume <= 0 || typeof window === "undefined") {
    return;
  }

  const ambientGains: Record<AudioScene, number> = {
    hero: 0.026,
    hub: 0.02,
    battle: 0.018,
    shop: 0.024,
    relic: 0.028,
  };
  const noiseFreq: Record<AudioScene, number> = {
    hero: 580,
    hub: 760,
    battle: 940,
    shop: 830,
    relic: 690,
  };

  playNoise({
    gain: effectiveGain(ambientGains[currentScene], settings.ambienceVolume),
    release: currentScene === "battle" ? 0.5 : 0.85,
    filterFrequency: noiseFreq[currentScene],
    filterType: currentScene === "battle" ? "bandpass" : "lowpass",
  });

  if (currentScene !== "battle") {
    const pair = getMasterGain();
    if (pair) {
      playTone({
        frequency: currentScene === "relic" ? 466.16 : 349.23,
        type: "sine",
        gain: effectiveGain(0.012, settings.ambienceVolume),
        attack: 0.05,
        release: 1.2,
        when: pair.context.currentTime + 0.12,
      });
    }
  }

  const nextDelay =
    currentScene === "battle"
      ? 2200 + Math.round(Math.random() * 900)
      : 3200 + Math.round(Math.random() * 1800);
  ambienceTimeout = window.setTimeout(queueAmbienceLoop, nextDelay);
}

function refreshBackgroundAudio() {
  syncMasterGain();
  if (!unlocked) {
    return;
  }
  queueMusicLoop();
  queueAmbienceLoop();
}

export async function primeAudio() {
  const context = getContext();
  if (!context) {
    return;
  }
  if (context.state === "suspended") {
    await context.resume();
  }
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
  musicStep = 0;
  refreshBackgroundAudio();
}

function canPlaySfx() {
  return unlocked && settings.masterVolume > 0 && settings.sfxVolume > 0 && !!getContext();
}

export function playCardToggle(selected: boolean) {
  if (!canPlaySfx()) {
    return;
  }
  playTone({
    frequency: selected ? 620 : 420,
    type: selected ? "triangle" : "sine",
    attack: 0.004,
    release: 0.08,
    gain: effectiveGain(selected ? 0.08 : 0.055, settings.sfxVolume),
  });
}

export function playDiscardSound() {
  if (!canPlaySfx()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playNoise({
    when: start,
    gain: effectiveGain(0.075, settings.sfxVolume),
    release: 0.16,
    filterFrequency: 1200,
  });
  playTone({
    frequency: 360,
    type: "sawtooth",
    when: start + 0.01,
    gain: effectiveGain(0.055, settings.sfxVolume),
    release: 0.14,
  });
  playTone({
    frequency: 280,
    type: "triangle",
    when: start + 0.03,
    gain: effectiveGain(0.05, settings.sfxVolume),
    release: 0.16,
  });
}

export function playShopRevealSound() {
  if (!canPlaySfx()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  [420, 520, 660].forEach((frequency, index) => {
    playTone({
      frequency,
      type: "triangle",
      when: start + index * 0.045,
      gain: effectiveGain(0.055, settings.sfxVolume),
      attack: 0.008,
      release: 0.16,
    });
  });
}

export function playRerollSound() {
  if (!canPlaySfx()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playNoise({
    when: start,
    gain: effectiveGain(0.06, settings.sfxVolume),
    release: 0.14,
    filterFrequency: 1500,
  });
  playTone({
    frequency: 540,
    type: "square",
    when: start + 0.03,
    gain: effectiveGain(0.05, settings.sfxVolume),
    release: 0.12,
  });
  playTone({
    frequency: 690,
    type: "triangle",
    when: start + 0.07,
    gain: effectiveGain(0.045, settings.sfxVolume),
    release: 0.12,
  });
}

export function playUpgradeBuySound(rarity: string) {
  if (!canPlaySfx()) {
    return;
  }
  const normalized = (rarity as "common" | "uncommon" | "rare" | "epic" | "legendary") ?? "common";
  const chords = {
    common: [392, 494],
    uncommon: [440, 554, 659],
    rare: [494, 622, 740],
    epic: [554, 698, 830],
    legendary: [659, 830, 988],
  };
  playChord(chords[normalized], {
    gain: effectiveGain(normalized === "legendary" ? 0.12 : 0.09, settings.sfxVolume),
    release: normalized === "legendary" ? 0.52 : 0.34,
    type: normalized === "legendary" ? "sawtooth" : "triangle",
  });
}

export function playRelicRevealSound() {
  if (!canPlaySfx()) {
    return;
  }
  playChord([330, 440, 554, 740], {
    gain: effectiveGain(0.095, settings.sfxVolume),
    release: 0.42,
    type: "triangle",
  });
}

export function playRelicPickSound() {
  if (!canPlaySfx()) {
    return;
  }
  playChord([392, 523, 659], {
    gain: effectiveGain(0.11, settings.sfxVolume),
    release: 0.48,
    type: "sawtooth",
  });
}

export function playGoldErrorSound() {
  if (!canPlaySfx()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playTone({
    frequency: 220,
    type: "square",
    when: start,
    gain: effectiveGain(0.05, settings.sfxVolume),
    release: 0.08,
  });
  playTone({
    frequency: 184,
    type: "square",
    when: start + 0.06,
    gain: effectiveGain(0.055, settings.sfxVolume),
    release: 0.1,
  });
}

export function playBattleImpact(options: {
  damage: number;
  hits: number;
  doublePlayTriggered: boolean;
  matchFinished?: boolean;
}) {
  if (!canPlaySfx()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  const hitCount = Math.max(1, options.hits || 1);
  for (let index = 0; index < hitCount; index += 1) {
    const when = start + index * 0.17;
    const baseFrequency = Math.max(110, 260 - Math.min(options.damage, 90));
    playNoise({
      when,
      gain: effectiveGain(options.matchFinished ? 0.115 : 0.085, settings.sfxVolume),
      release: options.matchFinished ? 0.22 : 0.14,
      filterFrequency: options.matchFinished ? 720 : 880,
      filterType: "lowpass",
    });
    playTone({
      frequency: baseFrequency,
      type: options.matchFinished ? "sawtooth" : "square",
      when,
      gain: effectiveGain(options.matchFinished ? 0.08 : 0.05, settings.sfxVolume),
      attack: 0.003,
      release: options.matchFinished ? 0.24 : 0.12,
    });
    playTone({
      frequency: baseFrequency * 1.9,
      type: "triangle",
      when: when + 0.012,
      gain: effectiveGain(options.matchFinished ? 0.04 : 0.03, settings.sfxVolume),
      attack: 0.004,
      release: 0.1,
    });
  }

  if (options.doublePlayTriggered) {
    playTone({
      frequency: 820,
      type: "triangle",
      when: start + 0.08,
      gain: effectiveGain(0.05, settings.sfxVolume),
      attack: 0.005,
      release: 0.18,
    });
  }

  if (options.matchFinished) {
    playChord([196, 247, 311], {
      gain: effectiveGain(0.1, settings.sfxVolume),
      release: 0.8,
      type: "sawtooth",
    });
  }
}

export function playVictorySound(isWinner: boolean) {
  if (!canPlaySfx()) {
    return;
  }
  if (isWinner) {
    playChord([392, 494, 587, 784], {
      gain: effectiveGain(0.12, settings.sfxVolume),
      release: 0.72,
      type: "triangle",
    });
  } else {
    const pair = getMasterGain();
    if (!pair) {
      return;
    }
    const start = pair.context.currentTime;
    playTone({
      frequency: 240,
      type: "sawtooth",
      when: start,
      gain: effectiveGain(0.06, settings.sfxVolume),
      release: 0.2,
    });
    playTone({
      frequency: 196,
      type: "triangle",
      when: start + 0.08,
      gain: effectiveGain(0.055, settings.sfxVolume),
      release: 0.26,
    });
    playTone({
      frequency: 147,
      type: "sine",
      when: start + 0.16,
      gain: effectiveGain(0.05, settings.sfxVolume),
      release: 0.34,
    });
  }
}

export function playAchievementSound() {
  if (!canPlaySfx()) {
    return;
  }
  playChord([523, 659, 784], {
    gain: effectiveGain(0.11, settings.sfxVolume),
    release: 0.48,
    type: "triangle",
  });
}

export function playLevelUpSound() {
  if (!canPlaySfx()) {
    return;
  }
  playChord([440, 554, 659, 880], {
    gain: effectiveGain(0.12, settings.sfxVolume),
    release: 0.62,
    type: "sawtooth",
  });
}
