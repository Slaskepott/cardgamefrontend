import type { MetaProgress } from "../types/game";

interface AchievementsPageProps {
  metaProgress: MetaProgress | null;
}

const statLabels: Record<string, string> = {
  hands_played: "Hands played",
  games_won: "Games won",
  games_lost: "Games lost",
  damage_dealt: "Damage dealt",
  cards_discarded: "Cards discarded",
  full_hand_of_a_kind_draws: "Full hands of a kind",
  earth_flushes: "Earth flushes",
  fire_flushes: "Fire flushes",
  water_flushes: "Water flushes",
  air_flushes: "Air flushes",
  straight_flushes_played: "Straight flushes",
  royal_flushes_played: "Royal flushes",
  upgrades_bought: "Upgrades bought",
};

export function AchievementsPage({ metaProgress }: AchievementsPageProps) {
  if (!metaProgress) {
    return (
      <section className="panel account-page-panel">
        <p className="eyebrow">Account</p>
        <h2>Achievements</h2>
        <p className="panel-copy">Loading account progress…</p>
      </section>
    );
  }

  const sortedAchievements = [...metaProgress.achievements].sort(
    (left, right) => Number(right.unlocked) - Number(left.unlocked),
  );
  const spotlightStats = Object.entries(metaProgress.stats)
    .filter(([key, value]) => key !== "experience_total" && value > 0)
    .slice(0, 6);
  const levelProgressPercent = Math.min(
    100,
    (metaProgress.experience_in_level / Math.max(1, metaProgress.experience_for_next_level)) * 100,
  );

  return (
    <section className="panel account-page-panel achievements-page-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Achievements</h2>
          <p className="panel-copy">
            Grind progress, stack account experience, and chase the weird cards waiting at later
            level milestones.
          </p>
        </div>
        <div className="battle-metrics">
          <span>Level {metaProgress.level}</span>
          <span>{metaProgress.achievement_count} unlocked</span>
          <span>{metaProgress.available_talent_points} talent points ready</span>
        </div>
      </div>

      <section className="level-progression-panel">
        <div className="level-progression-copy">
          <p className="eyebrow">Level progression</p>
          <h3>Account level {metaProgress.level}</h3>
          <p className="panel-copy compact-copy">
            {metaProgress.experience_in_level} / {metaProgress.experience_for_next_level} XP toward
            the next level.
          </p>
        </div>
        <div className="level-progress-shell">
          <div className="level-progress-fill" style={{ width: `${levelProgressPercent}%` }} />
        </div>
        <div className="level-milestone-grid">
          {metaProgress.level_milestones.map((milestone) => (
            <article
              key={milestone.id}
              className={`level-milestone-card${milestone.unlocked ? " unlocked" : ""}`}
            >
              <div className="meta-achievement-head">
                <strong>{milestone.name}</strong>
                <span>Lv. {milestone.level}</span>
              </div>
              <p>{milestone.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="achievement-stats-row">
        {spotlightStats.length > 0 ? (
          spotlightStats.map(([statKey, value]) => (
            <div key={statKey} className="achievement-stat-chip">
              <strong>{value}</strong>
              <span>{statLabels[statKey] ?? statKey}</span>
            </div>
          ))
        ) : (
          <p className="panel-copy">Play a few rounds and your account history will start filling in here.</p>
        )}
      </div>

      <div className="achievement-page-grid">
        {sortedAchievements.map((achievement) => {
          const progressPercent =
            achievement.target > 0
              ? Math.min(100, (achievement.progress / achievement.target) * 100)
              : 0;
          return (
            <article
              key={achievement.id}
              className={`meta-achievement-card achievement-page-card${
                achievement.unlocked ? " unlocked" : ""
              }`}
            >
              <div className="meta-achievement-head">
                <strong>{achievement.name}</strong>
                <span>
                  {achievement.progress}/{achievement.target} • {achievement.points} pt
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
  );
}
