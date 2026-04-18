import type { LevelMilestone } from "../types/game";

interface LevelUpToastProps {
  level: number;
  unlocks: LevelMilestone[];
}

export function LevelUpToast({ level, unlocks }: LevelUpToastProps) {
  return (
    <aside className="achievement-unlock-toast level-up-toast" aria-live="polite">
      <div className="achievement-unlock-burst" aria-hidden="true">
        <span className="achievement-spark achievement-spark-1" />
        <span className="achievement-spark achievement-spark-2" />
        <span className="achievement-spark achievement-spark-3" />
        <span className="achievement-spark achievement-spark-4" />
      </div>
      <div className="achievement-unlock-copy">
        <p className="achievement-unlock-label">Level up</p>
        <strong>Level {level}</strong>
        {unlocks.length > 0 ? (
          <span>
            Unlocked: {unlocks.map((unlock) => unlock.name).join(", ")}
          </span>
        ) : (
          <span>Your account gains another little edge.</span>
        )}
      </div>
      <div className="achievement-unlock-seal" aria-hidden="true">
        ✦
      </div>
    </aside>
  );
}
