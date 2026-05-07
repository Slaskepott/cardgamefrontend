declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    scalar?: number;
    ticks?: number;
    zIndex?: number;
    origin?: {
      x?: number;
      y?: number;
    };
  }

  export default function confetti(options?: ConfettiOptions): Promise<null> | null;
}
