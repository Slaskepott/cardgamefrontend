import type { MetaProgress } from "../types/game";

interface MetaProgressPanelProps {
  metaProgress: MetaProgress | null;
  busy: boolean;
  onUnlockTalent: (talentId: string) => Promise<void>;
}

function formatBonusLabel(bonusKey: string, value: number) {
  switch (bonusKey) {
    case "damage_pct":
      return `+${value}% overall damage`;
    case "health_pct":
      return `+${value}% max health`;
    case "earth_damage_pct":
      return `+${value}% earth damage`;
    case "fire_damage_pct":
      return `+${value}% fire damage`;
    case "water_damage_pct":
      return `+${value}% water damage`;
    case "air_damage_pct":
      return `+${value}% air damage`;
    default:
      return `${bonusKey}: ${value}`;
  }
}

export function MetaProgressPanel({
  metaProgress,
  busy,
  onUnlockTalent,
}: MetaProgressPanelProps) {
  if (!metaProgress) {
    return null;
  }

  const spotlightAchievements = [...metaProgress.achievements]
    .sort((left, right) => Number(right.unlocked) - Number(left.unlocked))
    .slice(0, 6);
  const activeBonuses = Object.entries(metaProgress.talent_bonuses).filter(
    ([, value]) => value > 0,
  );

  return (
    <section className="panel meta-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Meta progression</p>
          <h2>Achievements and talent tree</h2>
        </div>
        <div className="battle-metrics">
          <span>{metaProgress.available_talent_points} talent point{metaProgress.available_talent_points === 1 ? "" : "s"}</span>
          <span>{metaProgress.achievement_count} achievements</span>
        </div>
      </div>

      <div className="meta-grid">
        <section className="meta-section">
          <h3>Achievement hunt</h3>
          <div className="meta-achievement-list">
            {spotlightAchievements.map((achievement) => {
              const progressPercent =
                achievement.target > 0
                  ? Math.min(100, (achievement.progress / achievement.target) * 100)
                  : 0;
              return (
                <article
                  key={achievement.id}
                  className={`meta-achievement-card${
                    achievement.unlocked ? " unlocked" : ""
                  }`}
                >
                  <div className="meta-achievement-head">
                    <strong>{achievement.name}</strong>
                    <span>
                      {achievement.progress}/{achievement.target}
                    </span>
                  </div>
                  <p>{achievement.description}</p>
                  <div className="meta-progress-bar">
                    <div style={{ width: `${progressPercent}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="meta-section">
          <h3>Talent tree</h3>
          <div className="meta-talent-list">
            {metaProgress.talents.map((talent) => (
              <button
                key={talent.id}
                type="button"
                className={`meta-talent-card${
                  talent.unlocked ? " unlocked" : talent.available ? " available" : ""
                }`}
                disabled={busy || talent.unlocked || !talent.available}
                onClick={() => void onUnlockTalent(talent.id)}
              >
                <div className="meta-talent-head">
                  <strong>{talent.name}</strong>
                  <span>{talent.cost} pt</span>
                </div>
                <p>{talent.description}</p>
                {talent.requires.length > 0 ? (
                  <span className="meta-talent-requires">
                    Requires: {talent.requires.join(", ")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="meta-section meta-bonus-section">
        <h3>Active account bonuses</h3>
        {activeBonuses.length === 0 ? (
          <p className="panel-copy">
            Unlock achievements to earn talent points, then spend them on tiny long-term bonuses.
          </p>
        ) : (
          <ul className="meta-bonus-list">
            {activeBonuses.map(([bonusKey, value]) => (
              <li key={bonusKey}>{formatBonusLabel(bonusKey, value)}</li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
