import { useEffect, useRef } from "react";
import type { MetaProgress } from "../types/game";

interface LevelProgressionModalProps {
  metaProgress: MetaProgress | null;
  onClose: () => void;
}

export function LevelProgressionModal({
  metaProgress,
  onClose,
}: LevelProgressionModalProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const levelProgressPercent = metaProgress
    ? Math.min(
        100,
        (metaProgress.experience_in_level /
          Math.max(1, metaProgress.experience_for_next_level)) *
          100,
      )
    : 0;

  useEffect(() => {
    const track = trackRef.current;
    const card = activeCardRef.current;
    if (!track || !card) {
      return;
    }

    const nextLeft =
      card.offsetLeft - track.clientWidth / 2 + card.clientWidth / 2;
    track.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: "auto",
    });
  }, [metaProgress]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="panel modal-panel progression-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progression-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-header modal-header">
          <div>
            <p className="eyebrow">Level progression</p>
            <h2 id="progression-modal-title">
              {metaProgress ? `Account level ${metaProgress.level}` : "Loading progression"}
            </h2>
            <p className="panel-copy compact-copy">
              {metaProgress
                ? `${metaProgress.experience_in_level} / ${metaProgress.experience_for_next_level} XP toward the next level.`
                : "Fetching your account progression..."}
            </p>
          </div>
          <button type="button" className="secondary modal-close-button" onClick={onClose}>
            Close
          </button>
        </div>

        {metaProgress ? (
          <>
            <div className="level-progress-shell progression-modal-bar">
              <div
                className="level-progress-fill"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>

            <div
              ref={trackRef}
              className="progression-track progression-modal-grid"
            >
              {metaProgress.level_milestones.map((milestone) => (
                <article
                  key={milestone.id}
                  ref={
                    milestone.level === metaProgress.level
                      ? (node) => {
                          activeCardRef.current = node;
                        }
                      : undefined
                  }
                  className={`level-milestone-card${
                    milestone.unlocked ? " unlocked" : " locked"
                  }${milestone.level === metaProgress.level ? " current" : ""}`}
                >
                  <span className="level-milestone-level-pill">Level {milestone.level}</span>
                  <div className="meta-achievement-head">
                    <strong>{milestone.name}</strong>
                    <span>{milestone.unlocked ? "Unlocked" : "Locked"}</span>
                  </div>
                  <p>{milestone.description}</p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="panel-copy">Loading account progression...</p>
        )}
      </section>
    </div>
  );
}
