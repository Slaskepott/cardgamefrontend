import type { MetaAchievement } from "../types/game";

interface AchievementUnlockToastProps {
  achievement: MetaAchievement;
}

export function AchievementUnlockToast({
  achievement,
}: AchievementUnlockToastProps) {
  return (
    <aside className="achievement-unlock-toast" aria-live="polite">
      <div className="achievement-unlock-burst" aria-hidden="true">
        <span className="achievement-spark achievement-spark-1" />
        <span className="achievement-spark achievement-spark-2" />
        <span className="achievement-spark achievement-spark-3" />
        <span className="achievement-spark achievement-spark-4" />
      </div>
      <div className="achievement-unlock-copy">
        <p className="achievement-unlock-label">Achievement unlocked</p>
        <strong>{achievement.name}</strong>
        <span>{achievement.description}</span>
      </div>
      <div className="achievement-unlock-seal" aria-hidden="true">
        ✦
      </div>
    </aside>
  );
}
