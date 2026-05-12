type SoundRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlocked = false;

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
    masterGain.gain.value = 0.18;
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
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

  const buffer = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
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
  oscillator.stop(when + (options.attack ?? 0.01) + (options.release ?? 0.18) + 0.04);
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

function playChord(frequencies: number[], options?: { gain?: number; release?: number; type?: OscillatorType }) {
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

export async function primeAudio() {
  const context = getContext();
  if (!context) {
    return;
  }
  if (context.state === "suspended") {
    await context.resume();
  }
  unlocked = true;
}

function canPlay() {
  return unlocked && !!getContext();
}

export function playCardToggle(selected: boolean) {
  if (!canPlay()) {
    return;
  }
  playTone({
    frequency: selected ? 620 : 420,
    type: selected ? "triangle" : "sine",
    attack: 0.004,
    release: 0.08,
    gain: selected ? 0.08 : 0.055,
  });
}

export function playDiscardSound() {
  if (!canPlay()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playNoise({ when: start, gain: 0.075, release: 0.16, filterFrequency: 1200 });
  playTone({ frequency: 360, type: "sawtooth", when: start + 0.01, gain: 0.055, release: 0.14 });
  playTone({ frequency: 280, type: "triangle", when: start + 0.03, gain: 0.05, release: 0.16 });
}

export function playShopRevealSound() {
  if (!canPlay()) {
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
      gain: 0.055,
      attack: 0.008,
      release: 0.16,
    });
  });
}

export function playRerollSound() {
  if (!canPlay()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playNoise({ when: start, gain: 0.06, release: 0.14, filterFrequency: 1500 });
  playTone({ frequency: 540, type: "square", when: start + 0.03, gain: 0.05, release: 0.12 });
  playTone({ frequency: 690, type: "triangle", when: start + 0.07, gain: 0.045, release: 0.12 });
}

export function playUpgradeBuySound(rarity: string) {
  if (!canPlay()) {
    return;
  }
  const normalized = (rarity as SoundRarity) ?? "common";
  const chords: Record<SoundRarity, number[]> = {
    common: [392, 494],
    uncommon: [440, 554, 659],
    rare: [494, 622, 740],
    epic: [554, 698, 830],
    legendary: [659, 830, 988],
  };
  playChord(chords[normalized] ?? chords.common, {
    gain: normalized === "legendary" ? 0.12 : 0.09,
    release: normalized === "legendary" ? 0.52 : 0.34,
    type: normalized === "legendary" ? "sawtooth" : "triangle",
  });
}

export function playRelicRevealSound() {
  if (!canPlay()) {
    return;
  }
  playChord([330, 440, 554, 740], { gain: 0.095, release: 0.42, type: "triangle" });
}

export function playRelicPickSound() {
  if (!canPlay()) {
    return;
  }
  playChord([392, 523, 659], { gain: 0.11, release: 0.48, type: "sawtooth" });
}

export function playGoldErrorSound() {
  if (!canPlay()) {
    return;
  }
  const pair = getMasterGain();
  if (!pair) {
    return;
  }
  const start = pair.context.currentTime;
  playTone({ frequency: 220, type: "square", when: start, gain: 0.05, release: 0.08 });
  playTone({ frequency: 184, type: "square", when: start + 0.06, gain: 0.055, release: 0.1 });
}

export function playBattleImpact(options: {
  damage: number;
  hits: number;
  doublePlayTriggered: boolean;
  matchFinished?: boolean;
}) {
  if (!canPlay()) {
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
      gain: options.matchFinished ? 0.115 : 0.085,
      release: options.matchFinished ? 0.22 : 0.14,
      filterFrequency: options.matchFinished ? 720 : 880,
      filterType: "lowpass",
    });
    playTone({
      frequency: baseFrequency,
      type: options.matchFinished ? "sawtooth" : "square",
      when,
      gain: options.matchFinished ? 0.08 : 0.05,
      attack: 0.003,
      release: options.matchFinished ? 0.24 : 0.12,
    });
    playTone({
      frequency: baseFrequency * 1.9,
      type: "triangle",
      when: when + 0.012,
      gain: options.matchFinished ? 0.04 : 0.03,
      attack: 0.004,
      release: 0.1,
    });
  }

  if (options.doublePlayTriggered) {
    playTone({
      frequency: 820,
      type: "triangle",
      when: start + 0.08,
      gain: 0.05,
      attack: 0.005,
      release: 0.18,
    });
  }

  if (options.matchFinished) {
    playChord([196, 247, 311], { gain: 0.1, release: 0.8, type: "sawtooth" });
  }
}

export function playVictorySound(isWinner: boolean) {
  if (!canPlay()) {
    return;
  }
  if (isWinner) {
    playChord([392, 494, 587, 784], { gain: 0.12, release: 0.72, type: "triangle" });
  } else {
    const pair = getMasterGain();
    if (!pair) {
      return;
    }
    const start = pair.context.currentTime;
    playTone({ frequency: 240, type: "sawtooth", when: start, gain: 0.06, release: 0.2 });
    playTone({ frequency: 196, type: "triangle", when: start + 0.08, gain: 0.055, release: 0.26 });
    playTone({ frequency: 147, type: "sine", when: start + 0.16, gain: 0.05, release: 0.34 });
  }
}

export function playAchievementSound() {
  if (!canPlay()) {
    return;
  }
  playChord([523, 659, 784], { gain: 0.11, release: 0.48, type: "triangle" });
}

export function playLevelUpSound() {
  if (!canPlay()) {
    return;
  }
  playChord([440, 554, 659, 880], { gain: 0.12, release: 0.62, type: "sawtooth" });
}
