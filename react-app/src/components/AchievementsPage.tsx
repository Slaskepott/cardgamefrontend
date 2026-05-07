import type { MetaAchievement, MetaProgress } from "../types/game";

interface AchievementsPageProps {
  metaProgress: MetaProgress | null;
  onOpenProgression: () => void;
}

const statLabels: Record<string, string> = {
  hands_played: "Hands played",
  games_won: "Games won",
  games_lost: "Games lost",
  damage_dealt: "Damage dealt",
  cards_discarded: "Cards discarded",
  full_hand_of_a_kind_draws: "Five of a rank draws",
  shop_rerolls_used: "Shop rerolls",
  max_armor_in_game: "Best armor",
  max_health_in_game: "Best health",
  max_single_hand_damage: "Best single-hand damage",
  earth_flushes: "Earth flushes",
  fire_flushes: "Fire flushes",
  water_flushes: "Water flushes",
  air_flushes: "Air flushes",
  straight_flushes_played: "Straight flushes",
  royal_flushes_played: "Royal flushes",
  upgrades_bought: "Upgrades bought",
  elo_rating: "Elo rating",
};

const spotlightStatOrder = [
  "hands_played",
  "games_won",
  "damage_dealt",
  "shop_rerolls_used",
  "max_armor_in_game",
  "max_health_in_game",
  "max_single_hand_damage",
  "upgrades_bought",
];

function groupAchievements(achievements: MetaAchievement[], stats: Record<string, number>) {
  const grouped = new Map<
    string,
    {
      stat: string;
      label: string;
      currentValue: number;
      achievements: MetaAchievement[];
    }
  >();

  for (const achievement of achievements) {
    const stat = achievement.stat;
    const existing = grouped.get(stat);
    if (existing) {
      existing.achievements.push(achievement);
      continue;
    }

    grouped.set(stat, {
      stat,
      label: statLabels[stat] ?? stat,
      currentValue: stats[stat] ?? 0,
      achievements: [achievement],
    });
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      achievements: [...group.achievements].sort((left, right) => left.target - right.target),
    }))
    .sort((left, right) => {
      const leftUnlocked = left.achievements.filter((item) => item.unlocked).length;
      const rightUnlocked = right.achievements.filter((item) => item.unlocked).length;
      if (leftUnlocked !== rightUnlocked) {
        return rightUnlocked - leftUnlocked;
      }
      return left.label.localeCompare(right.label);
    });
}

export function AchievementsPage({
  metaProgress,
  onOpenProgression,
}: AchievementsPageProps) {
  if (!metaProgress) {
    return (
      <section className="panel account-page-panel">
        <p className="eyebrow">Account</p>
        <h2>Achievements</h2>
        <p className="panel-copy">Loading account progress…</p>
      </section>
    );
  }

  const achievementGroups = groupAchievements(metaProgress.achievements, metaProgress.stats);
  const spotlightStats = spotlightStatOrder
    .map((key) => [key, metaProgress.stats[key] ?? 0] as const)
    .filter(([, value]) => value > 0)
    .slice(0, 6);

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

      <section className="level-progression-summary">
        <div className="level-progression-copy">
          <p className="eyebrow">Level progression</p>
          <h3>Level {metaProgress.level}</h3>
          <p className="panel-copy compact-copy">
            {metaProgress.experience_in_level} / {metaProgress.experience_for_next_level} XP toward
            the next level.
          </p>
        </div>
        <div className="ranked-summary-card">
          <span className="ranked-summary-label">Ranked</span>
          <strong>Elo {metaProgress.elo_rating}</strong>
          <span className="ranked-summary-subtitle">
            Climb the ladder and unlock ranked achievements.
          </span>
        </div>
        <button type="button" onClick={onOpenProgression}>
          View rewards
        </button>
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
          <p className="panel-copy">
            Play a few rounds and your account history will start filling in here.
          </p>
        )}
      </div>

      <div className="achievement-group-grid">
        {achievementGroups.map((group) => (
          <article key={group.stat} className="meta-achievement-card achievement-group-card">
            <div className="meta-achievement-head">
              <strong>{group.label}</strong>
              <span>{group.currentValue}</span>
            </div>
            <div className="achievement-tier-row">
              {group.achievements.map((achievement) => {
                const progressPercent =
                  achievement.target > 0
                    ? Math.min(100, (achievement.progress / achievement.target) * 100)
                    : 0;
                return (
                  <div
                    key={achievement.id}
                    className={`achievement-tier-card${achievement.unlocked ? " unlocked" : ""}`}
                  >
                    <div className="achievement-tier-topline">
                      <strong>{achievement.target}</strong>
                      <span>{achievement.points} pt</span>
                    </div>
                    <p>{achievement.name}</p>
                    <div className="meta-progress-bar">
                      <div style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
