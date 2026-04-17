import { useEffect, useMemo, useState } from "react";
import type { MetaProgress, MetaSpecialization, MetaTalent } from "../types/game";

interface TalentTreePageProps {
  metaProgress: MetaProgress | null;
  busy: boolean;
  onUnlockTalent: (talentId: string) => Promise<void>;
}

function sortSpecOrder(
  specializations: MetaSpecialization[],
  selectedSpecialization: string | null,
) {
  if (!selectedSpecialization) {
    return specializations;
  }

  return [
    ...specializations.filter((spec) => spec.id === selectedSpecialization),
    ...specializations.filter((spec) => spec.id !== selectedSpecialization),
  ];
}

function groupTalentsBySpec(talents: MetaTalent[]) {
  return talents.reduce<Record<string, MetaTalent[]>>((acc, talent) => {
    acc[talent.specialization] ??= [];
    acc[talent.specialization].push(talent);
    return acc;
  }, {});
}

export function TalentTreePage({
  metaProgress,
  busy,
  onUnlockTalent,
}: TalentTreePageProps) {
  const specMap = useMemo(
    () => groupTalentsBySpec(metaProgress?.talents ?? []),
    [metaProgress],
  );
  const [activeSpec, setActiveSpec] = useState<string | null>(
    metaProgress?.selected_specialization ?? metaProgress?.specializations[0]?.id ?? null,
  );

  useEffect(() => {
    setActiveSpec(
      metaProgress?.selected_specialization ?? metaProgress?.specializations[0]?.id ?? null,
    );
  }, [metaProgress]);

  if (!metaProgress) {
    return (
      <section className="panel account-page-panel">
        <p className="eyebrow">Account</p>
        <h2>Talent tree</h2>
        <p className="panel-copy">Loading account progress…</p>
      </section>
    );
  }

  const selectedSpec =
    activeSpec && metaProgress.specializations.some((spec) => spec.id === activeSpec)
      ? activeSpec
      : metaProgress.selected_specialization ?? metaProgress.specializations[0]?.id ?? null;
  const visibleTalents = selectedSpec ? specMap[selectedSpec] ?? [] : [];
  const isLockedToAnotherSpec =
    Boolean(metaProgress.selected_specialization) &&
    metaProgress.selected_specialization !== selectedSpec;

  return (
    <section className="panel account-page-panel talent-page-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Talent tree</h2>
          <p className="panel-copy">
            Pick one specialization. Early nodes are intentionally small, but each tree ends in
            a real capstone worth chasing.
          </p>
        </div>
        <div className="battle-metrics">
          <span>{metaProgress.available_talent_points} talent points</span>
          <span>
            {metaProgress.selected_specialization
              ? `Specialized: ${
                  metaProgress.specializations.find(
                    (spec) => spec.id === metaProgress.selected_specialization,
                  )?.name ?? metaProgress.selected_specialization
                }`
              : "No specialization chosen"}
          </span>
        </div>
      </div>

      <div className="specialization-tabs">
        {sortSpecOrder(metaProgress.specializations, metaProgress.selected_specialization).map(
          (specialization) => (
            <button
              key={specialization.id}
              type="button"
              className={`specialization-tab${
                selectedSpec === specialization.id ? " active" : ""
              }${
                metaProgress.selected_specialization &&
                metaProgress.selected_specialization !== specialization.id
                  ? " locked"
                  : ""
              }`}
              onClick={() => setActiveSpec(specialization.id)}
            >
              <strong>{specialization.name}</strong>
              <span>{specialization.description}</span>
            </button>
          ),
        )}
      </div>

      {selectedSpec ? (
        <div className="talent-tree">
          {visibleTalents.map((talent) => (
            <button
              key={talent.id}
              type="button"
              className={`talent-node${
                talent.unlocked ? " unlocked" : talent.available ? " available" : ""
              }${talent.row === 3 ? " capstone" : ""}`}
              style={{
                gridRow: talent.row + 1,
                gridColumn: talent.column + 1,
              }}
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
                  Requires: {talent.requires
                    .map(
                      (requiredId) =>
                        visibleTalents.find((entry) => entry.id === requiredId)?.name ?? requiredId,
                    )
                    .join(", ")}
                </span>
              ) : (
                <span className="meta-talent-requires">
                  {metaProgress.selected_specialization
                    ? "Unlocked branch"
                    : "Choosing this talent also chooses this specialization"}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {isLockedToAnotherSpec ? (
        <p className="panel-copy">
          This tree is view-only now. Your account is already committed to a different
          specialization.
        </p>
      ) : null}
    </section>
  );
}
