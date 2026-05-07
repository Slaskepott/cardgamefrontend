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
