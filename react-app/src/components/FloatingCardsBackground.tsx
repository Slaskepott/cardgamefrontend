import { useMemo } from "react";
import type { CSSProperties } from "react";

type FloatingCardItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  suitClass: string;
  rank: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotate: number;
  wobble: number;
  tiltX: number;
  tiltY: number;
  scale: number;
  duration: number;
  delay: number;
};

const deckPool = [
  { title: "A", subtitle: "Fire", icon: "🔥", suitClass: "suit-fire" },
  { title: "K", subtitle: "Water", icon: "💧", suitClass: "suit-water" },
  { title: "Q", subtitle: "Air", icon: "💨", suitClass: "suit-air" },
  { title: "10", subtitle: "Earth", icon: "🌿", suitClass: "suit-earth" },
  { title: "15", subtitle: "Plasma", icon: "⚡", suitClass: "suit-plasma" },
  { title: "Joker", subtitle: "Wild", icon: "🃏", suitClass: "suit-wild" },
];

const upgradePool = [
  { title: "Soft Flush", subtitle: "Legendary upgrade", icon: "🌈", suitClass: "suit-water" },
  { title: "Gap Straight", subtitle: "Legendary upgrade", icon: "↔️", suitClass: "suit-air" },
  { title: "Echo Hand", subtitle: "Play twice", icon: "🌀", suitClass: "suit-plasma" },
  { title: "Grand Bazaar", subtitle: "More shop cards", icon: "🎪", suitClass: "suit-earth" },
  { title: "Royal Invitation", subtitle: "High draw", icon: "👑", suitClass: "suit-fire" },
];

const relicPool = [
  { title: "Tiny Tyrants", subtitle: "Relic", icon: "👹", suitClass: "suit-fire" },
  { title: "Wild Orbit", subtitle: "Relic", icon: "🌙", suitClass: "suit-wild" },
  { title: "House Advantage", subtitle: "Relic", icon: "🏰", suitClass: "suit-earth" },
  { title: "Greedy Fingers", subtitle: "Relic", icon: "💰", suitClass: "suit-water" },
  { title: "Tidal Memory", subtitle: "Relic", icon: "🌊", suitClass: "suit-plasma" },
];

function sampleFromPool<T>(pool: T[]) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildFloatingCards(): FloatingCardItem[] {
  return Array.from({ length: 5 }, (_, index) => {
    const source =
      index % 3 === 0 ? sampleFromPool(deckPool) : index % 3 === 1 ? sampleFromPool(upgradePool) : sampleFromPool(relicPool);
    const travelMode = Math.floor(Math.random() * 4);
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    if (travelMode === 0) {
      const enterFromLeft = Math.random() > 0.5;
      startX = enterFromLeft ? -24 - Math.random() * 14 : 108 + Math.random() * 16;
      endX = enterFromLeft ? 112 + Math.random() * 18 : -28 - Math.random() * 14;
      startY = 8 + Math.random() * 84;
      endY = clamp(startY + (-24 + Math.random() * 48), -18, 96);
    } else if (travelMode === 1) {
      startX = -24 - Math.random() * 14;
      endX = 110 + Math.random() * 16;
      startY = 70 + Math.random() * 26;
      endY = clamp(2 + Math.random() * 34, -18, 96);
    } else if (travelMode === 2) {
      startX = 108 + Math.random() * 16;
      endX = -28 - Math.random() * 14;
      startY = 6 + Math.random() * 28;
      endY = clamp(58 + Math.random() * 32, -18, 96);
    } else {
      const enterFromTop = Math.random() > 0.5;
      startY = enterFromTop ? -42 - Math.random() * 18 : 120 + Math.random() * 18;
      endY = enterFromTop ? 118 + Math.random() * 18 : -44 - Math.random() * 18;
      startX = 12 + Math.random() * 76;
      endX = clamp(startX + (-28 + Math.random() * 56), -30, 112);
    }

    const rotate = -16 + Math.random() * 32;
    const wobble = 16 + Math.random() * 16;
    const tiltX = -18 + Math.random() * 36;
    const tiltY = -22 + Math.random() * 44;
    const scale = 0.82 + Math.random() * 0.32;
    const duration = 20 + Math.random() * 16;
    const delay = -1 * Math.random() * duration;

    return {
      key: `${source.title}-${source.subtitle}-${index}`,
      title: source.title,
      subtitle: source.subtitle,
      icon: source.icon,
      suitClass: source.suitClass,
      rank: source.title.length > 2 ? "✦" : source.title,
      startX,
      startY,
      endX,
      endY,
      rotate,
      wobble,
      tiltX,
      tiltY,
      scale,
      duration,
      delay,
    };
  });
}

export function FloatingCardsBackground() {
  const floatingCards = useMemo(() => buildFloatingCards(), []);

  return (
    <div className="floating-cards-background" aria-hidden="true">
      {floatingCards.map((item) => (
        <div
          key={item.key}
          className="floating-card-shell"
          style={
            {
              "--float-start-x": `${item.startX}vw`,
              "--float-start-y": `${item.startY}vh`,
              "--float-end-x": `${item.endX}vw`,
              "--float-end-y": `${item.endY}vh`,
              "--float-rotate": `${item.rotate}deg`,
              "--float-wobble": `${item.wobble}deg`,
              "--float-tilt-x": `${item.tiltX}deg`,
              "--float-tilt-y": `${item.tiltY}deg`,
              "--float-scale": item.scale,
              "--float-duration": `${item.duration}s`,
              "--float-delay": `${item.delay}s`,
            } as CSSProperties
          }
        >
          <article className={`floating-card card-tile ${item.suitClass}`}>
            <span className="card-corner">
              <span className="card-rank">{item.rank}</span>
              <span className="card-label">{item.subtitle}</span>
            </span>
            <span className="floating-card-pill">{item.subtitle}</span>
            <span className="card-illustration floating-card-illustration" aria-hidden="true">
              {item.icon}
            </span>
            <span className="card-corner mirrored">
              <span className="card-rank">{item.rank}</span>
              <span className="card-suit">{item.icon}</span>
            </span>
            <span className="floating-card-title">{item.title}</span>
          </article>
        </div>
      ))}
    </div>
  );
}
