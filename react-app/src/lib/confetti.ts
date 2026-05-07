import confetti from "canvas-confetti";

let activeBurstTimer: number | null = null;

function clearBurstTimer() {
  if (activeBurstTimer !== null) {
    window.clearTimeout(activeBurstTimer);
    activeBurstTimer = null;
  }
}

export function launchVictoryConfetti() {
  clearBurstTimer();

  const defaults = {
    zIndex: 40,
    ticks: 280,
    gravity: 0.92,
    drift: 0,
    scalar: 1.05,
  };

  confetti({
    ...defaults,
    particleCount: 120,
    spread: 72,
    startVelocity: 48,
    origin: { x: 0.16, y: 0.62 },
  });

  confetti({
    ...defaults,
    particleCount: 120,
    spread: 72,
    startVelocity: 48,
    origin: { x: 0.84, y: 0.62 },
  });

  activeBurstTimer = window.setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 170,
      spread: 110,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.35 },
    });
    activeBurstTimer = null;
  }, 280);
}

export function launchIntroConfetti() {
  clearBurstTimer();

  confetti({
    particleCount: 90,
    spread: 95,
    startVelocity: 34,
    gravity: 0.75,
    ticks: 220,
    scalar: 0.95,
    zIndex: 35,
    origin: { x: 0.5, y: 0.48 },
  });

  activeBurstTimer = window.setTimeout(() => {
    confetti({
      particleCount: 55,
      spread: 72,
      startVelocity: 26,
      gravity: 0.82,
      ticks: 180,
      scalar: 0.88,
      zIndex: 35,
      origin: { x: 0.28, y: 0.56 },
    });
    confetti({
      particleCount: 55,
      spread: 72,
      startVelocity: 26,
      gravity: 0.82,
      ticks: 180,
      scalar: 0.88,
      zIndex: 35,
      origin: { x: 0.72, y: 0.56 },
    });
    activeBurstTimer = null;
  }, 180);
}
