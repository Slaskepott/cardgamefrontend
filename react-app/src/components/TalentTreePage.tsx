import { useEffect, useMemo, useState } from "react";
import type { MetaProgress, MetaSpecialization, MetaTalent } from "../types/game";

const TALENT_TREE_COLUMNS = 4;
const TALENT_TREE_ROWS = 5;

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

function getNodeCenter(column: number, row: number) {
  return {
    x: ((column + 0.5) / TALENT_TREE_COLUMNS) * 100,
    y: ((row + 0.5) / TALENT_TREE_ROWS) * 100,
  };
}

function buildConnectorPath(from: MetaTalent, to: MetaTalent) {
  const startCenter = getNodeCenter(from.column, from.row);
  const endCenter = getNodeCenter(to.column, to.row);
  const start = {
    x: startCenter.x,
    y: ((from.row + 1) / TALENT_TREE_ROWS) * 100 - 2.8,
  };
  const end = {
    x: endCenter.x,
    y: (to.row / TALENT_TREE_ROWS) * 100 + 2.8,
  };
  const travel = Math.max(end.y - start.y, 0);
  const curve = Math.max(travel * 0.55, 4.5);

  return `M ${start.x} ${start.y} C ${start.x} ${start.y + curve}, ${end.x} ${end.y - curve}, ${end.x} ${end.y}`;
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
  const visibleTalentMap = useMemo(
    () => new Map(visibleTalents.map((talent) => [talent.id, talent])),
    [visibleTalents],
  );
  const dependencyLines = useMemo(
    () =>
      visibleTalents.flatMap((talent) =>
        talent.requires.flatMap((requiredId) => {
          const requiredTalent = visibleTalentMap.get(requiredId);
          if (!requiredTalent) {
            return [];
          }

          return [
            {
              id: `${requiredId}->${talent.id}`,
              path: buildConnectorPath(requiredTalent, talent),
              active: requiredTalent.current_rank > 0,
            },
          ];
        }),
      ),
    [visibleTalentMap, visibleTalents],
  );
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
          {dependencyLines.length > 0 ? (
            <svg
              className="talent-tree-lines"
              viewBox={`0 0 100 100`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {dependencyLines.map((line) => (
                <path
                  key={line.id}
                  className={`talent-tree-line${line.active ? " active" : ""}`}
                  d={line.path}
                />
              ))}
            </svg>
          ) : null}
          {visibleTalents.map((talent) => (
            <button
              key={talent.id}
              type="button"
              className={`talent-node${
                talent.available
                  ? " available"
                  : talent.current_rank > 0
                    ? " unlocked"
                    : " locked"
              }${talent.current_rank >= talent.max_ranks ? " maxed" : ""}${
                talent.id.endsWith("capstone") ? " capstone" : ""
              }`}
              style={{
                gridRow: talent.row + 1,
                gridColumn: talent.column + 1,
              }}
              disabled={busy}
              onClick={() => {
                if (busy || !talent.available) {
                  return;
                }
                void onUnlockTalent(talent.id);
              }}
              aria-disabled={!talent.available}
            >
              <div className="meta-talent-head">
                <strong>{talent.name}</strong>
                <span>
                  {talent.current_rank}/{talent.max_ranks}
                </span>
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
                  {talent.current_rank >= talent.max_ranks
                    ? "Max rank reached"
                    : metaProgress.selected_specialization
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
