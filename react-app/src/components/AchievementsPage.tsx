import { useMemo, useState } from "react";
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

const statIcons: Record<string, string> = {
  hands_played: "🃏",
  games_won: "👑",
  games_lost: "🪦",
  damage_dealt: "💥",
  cards_discarded: "🗑️",
  full_hand_of_a_kind_draws: "🎲",
  shop_rerolls_used: "🎁",
  max_armor_in_game: "🛡️",
  max_health_in_game: "❤️",
  max_single_hand_damage: "⚔️",
  earth_flushes: "🌿",
  fire_flushes: "🔥",
  water_flushes: "💧",
  air_flushes: "💨",
  straight_flushes_played: "🌈",
  royal_flushes_played: "👸",
  upgrades_bought: "✨",
  elo_rating: "🏆",
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

function getTierClass(index: number) {
  if (index === 0) {
    return "bronze";
  }
  if (index === 1) {
    return "silver";
  }
  return "gold";
}

function groupAchievements(achievements: MetaAchievement[], stats: Record<string, number>) {
  const grouped = new Map<
    string,
    {
      stat: string;
      label: string;
      icon: string;
      currentValue: number;
      achievements: MetaAchievement[];
    }
  >();

  for (const achievement of achievements) {
    const existing = grouped.get(achievement.stat);
    if (existing) {
      existing.achievements.push(achievement);
      continue;
    }

    grouped.set(achievement.stat, {
      stat: achievement.stat,
      label: statLabels[achievement.stat] ?? achievement.stat,
      icon: statIcons[achievement.stat] ?? "✨",
      currentValue: stats[achievement.stat] ?? 0,
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
  const [selectedAchievement, setSelectedAchievement] = useState<MetaAchievement | null>(null);

  const achievementGroups = useMemo(
    () => groupAchievements(metaProgress?.achievements ?? [], metaProgress?.stats ?? {}),
    [metaProgress],
  );

  if (!metaProgress) {
    return (
      <section className="panel account-page-panel">
        <p className="eyebrow">Account</p>
        <h2>Achievements</h2>
        <p className="panel-copy">Loading account progress…</p>
      </section>
    );
  }

  const spotlightStats = spotlightStatOrder
    .map((key) => [key, metaProgress.stats[key] ?? 0] as const)
    .filter(([, value]) => value > 0)
    .slice(0, 6);

  return (
    <>
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
              {metaProgress.experience_in_level} / {metaProgress.experience_for_next_level} XP
              toward the next level.
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

        <div className="achievement-overview-grid">
          {achievementGroups.map((group) => {
            const completedCount = group.achievements.filter((item) => item.unlocked).length;
            return (
              <article key={group.stat} className="meta-achievement-card achievement-track-card">
                <div className="achievement-track-head">
                  <div>
                    <p className="achievement-track-label">{group.label}</p>
                    <strong>{group.currentValue}</strong>
                  </div>
                  <span className="achievement-track-status">
                    {completedCount}/{group.achievements.length}
                  </span>
                </div>

                <div className="achievement-icon-row">
                  {group.achievements.map((achievement, index) => {
                    const progressPercent =
                      achievement.target > 0
                        ? Math.min(100, (achievement.progress / achievement.target) * 100)
                        : 0;
                    const tierClass = getTierClass(index);
                    return (
                      <button
                        key={achievement.id}
                        type="button"
                        className={`achievement-icon-button ${tierClass}${
                          achievement.unlocked ? " unlocked" : ""
                        }`}
                        onClick={() => setSelectedAchievement(achievement)}
                      >
                        <span className="achievement-icon-emoji">{group.icon}</span>
                        <span className="achievement-icon-check" aria-hidden="true">
                          {achievement.unlocked ? "✓" : ""}
                        </span>
                        <span className="achievement-hover-card">
                          <strong>{achievement.name}</strong>
                          <span>{achievement.description}</span>
                          <span>
                            {achievement.progress}/{achievement.target} • {achievement.points} pt
                          </span>
                          <span className="achievement-hover-progress">
                            <span style={{ width: `${progressPercent}%` }} />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedAchievement ? (
        <div className="modal-backdrop" onClick={() => setSelectedAchievement(null)}>
          <section
            className="panel modal-panel achievement-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Achievement</p>
                  <h2>{selectedAchievement.name}</h2>
                </div>
                <button
                  type="button"
                  className="secondary modal-close-button"
                  onClick={() => setSelectedAchievement(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="achievement-modal-body">
              <div
                className={`achievement-modal-emblem ${getTierClass(
                  achievementGroups
                    .find((group) => group.stat === selectedAchievement.stat)
                    ?.achievements.findIndex((item) => item.id === selectedAchievement.id) ?? 0,
                )}${selectedAchievement.unlocked ? " unlocked" : ""}`}
              >
                {statIcons[selectedAchievement.stat] ?? "✨"}
              </div>

              <div className="achievement-modal-status">
                <span
                  className={`achievement-completion-pill${
                    selectedAchievement.unlocked ? " unlocked" : ""
                  }`}
                >
                  {selectedAchievement.unlocked ? "Completed" : "In progress"}
                </span>
                <strong>
                  {selectedAchievement.progress}/{selectedAchievement.target}
                </strong>
              </div>

              <div className="achievement-modal-progress">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedAchievement.progress / selectedAchievement.target) * 100,
                    )}%`,
                  }}
                />
              </div>

              <p className="achievement-modal-description">{selectedAchievement.description}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
