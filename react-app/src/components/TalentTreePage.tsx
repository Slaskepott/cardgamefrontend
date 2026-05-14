import { useEffect, useMemo, useState } from "react";
import type { MetaProgress, MetaTalent } from "../types/game";

const TALENT_TREE_COLUMNS = 5;
const ELEMENT_UI = {
  Fire: { emoji: "🔥", className: "fire" },
  Air: { emoji: "💨", className: "air" },
  Earth: { emoji: "🌿", className: "earth" },
  Water: { emoji: "💧", className: "water" },
} as const;

interface TalentTreePageProps {
  metaProgress: MetaProgress | null;
  busy: boolean;
  onUnlockTalent: (talentId: string, element?: string | null) => Promise<void>;
  onSetTalentElement: (talentId: string, element: string) => Promise<void>;
  onResetTalents: () => Promise<void>;
}

function groupTalentsBySpec(talents: MetaTalent[]) {
  return talents.reduce<Record<string, MetaTalent[]>>((acc, talent) => {
    acc[talent.specialization] ??= [];
    acc[talent.specialization].push(talent);
    return acc;
  }, {});
}

function getTalentElementClass(selectedElement: string | null) {
  const normalizedSelectedElement = selectedElement?.toLowerCase();
  if (normalizedSelectedElement === "fire") return " talent-node-fire";
  if (normalizedSelectedElement === "air") return " talent-node-air";
  if (normalizedSelectedElement === "earth") return " talent-node-earth";
  if (normalizedSelectedElement === "water") return " talent-node-water";
  return "";
}

function buildTalentDescription(talent: MetaTalent, selectedElement: string | null) {
  if (!talent.element_options.length || !selectedElement) {
    return talent.description;
  }

  const elementName = selectedElement.toLowerCase();
  return talent.description
    .replace("Choose an element. ", "")
    .replace(/elemental damage/g, `${elementName} damage`)
    .replace(/elemental draw chance/g, `${elementName} draw chance`);
}

function getNodeCenter(column: number, row: number, totalRows: number) {
  return {
    x: ((column + 0.5) / TALENT_TREE_COLUMNS) * 100,
    y: ((row + 0.5) / totalRows) * 100,
  };
}

function formatRankCap(maxRanks: number) {
  return maxRanks >= 999 ? "∞" : String(maxRanks);
}

function buildConnectorPath(from: MetaTalent, to: MetaTalent, totalRows: number) {
  const startCenter = getNodeCenter(from.column, from.row, totalRows);
  const endCenter = getNodeCenter(to.column, to.row, totalRows);
  const start = {
    x: startCenter.x,
    y: ((from.row + 1) / totalRows) * 100 - 2.8,
  };
  const end = {
    x: endCenter.x,
    y: (to.row / totalRows) * 100 + 2.8,
  };
  const travel = Math.max(end.y - start.y, 0);
  const curve = Math.max(travel * 0.55, 4.5);

  return `M ${start.x} ${start.y} C ${start.x} ${start.y + curve}, ${end.x} ${end.y - curve}, ${end.x} ${end.y}`;
}

export function TalentTreePage({
  metaProgress,
  busy,
  onUnlockTalent,
  onSetTalentElement,
  onResetTalents,
}: TalentTreePageProps) {
  const specMap = useMemo(
    () => groupTalentsBySpec(metaProgress?.talents ?? []),
    [metaProgress],
  );
  const [draftElements, setDraftElements] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!metaProgress) {
      return;
    }

    setDraftElements((current) => {
      const next = { ...current };
      metaProgress.talents.forEach((talent) => {
        if (talent.selected_element) {
          next[talent.id] = talent.selected_element;
        }
      });
      return next;
    });
  }, [metaProgress]);

  if (!metaProgress) {
    return (
      <section className="panel account-page-panel">
        <p className="eyebrow">Account</p>
        <h2>Talent tree</h2>
        <p className="panel-copy">Loading account progress...</p>
      </section>
    );
  }

  function getSelectedElement(talent: MetaTalent) {
    return draftElements[talent.id] ?? talent.selected_element ?? talent.element_options[0] ?? null;
  }

  return (
    <section className="panel account-page-panel talent-page-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Talent tree</h2>
          <p className="panel-copy">
            Talent points can be spent freely across offense, defense, and utility. Each tree ends
            in a capstone and an endless sink for extra late-game points.
          </p>
        </div>
        <div className="battle-metrics">
          <span>{metaProgress.available_talent_points} talent points</span>
          <button type="button" className="secondary" onClick={() => void onResetTalents()}>
            Reset talents
          </button>
        </div>
      </div>

      <div className="specialization-tabs">
        {metaProgress.specializations.map((specialization) => (
          <div key={specialization.id} className="specialization-tab active">
            <strong>{specialization.name}</strong>
            <span>{specialization.description}</span>
          </div>
        ))}
      </div>

      <div className="talent-tree-stack">
        {metaProgress.specializations.map((specialization) => {
          const visibleTalents = specMap[specialization.id] ?? [];
          const treeRows = Math.max(5, ...visibleTalents.map((talent) => talent.row + 1), 0);
          const visibleTalentMap = new Map(visibleTalents.map((talent) => [talent.id, talent]));
          const dependencyLines = visibleTalents.flatMap((talent) =>
            talent.requires.flatMap((requiredId) => {
              const requiredTalent = visibleTalentMap.get(requiredId);
              if (!requiredTalent) {
                return [];
              }

              return [
                {
                  id: `${requiredId}->${talent.id}`,
                  path: buildConnectorPath(requiredTalent, talent, treeRows),
                  active: requiredTalent.current_rank > 0,
                },
              ];
            }),
          );

          return (
            <section key={specialization.id} className="talent-tree-section">
              <div className="talent-tree-section-head">
                <p className="eyebrow">{specialization.name}</p>
                <p className="panel-copy compact-copy">{specialization.description}</p>
              </div>

              <div
                className="talent-tree"
                style={{ gridTemplateRows: `repeat(${treeRows}, minmax(150px, auto))` }}
              >
                {dependencyLines.length > 0 ? (
                  <svg
                    className="talent-tree-lines"
                    viewBox="0 0 100 100"
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
                  <article
                    key={talent.id}
                    className={`talent-node${
                      talent.current_rank > 0 ? " unlocked" : " locked"
                    }${talent.available ? " available" : ""}${
                      talent.current_rank >= talent.max_ranks ? " maxed" : ""
                    }${
                      talent.id.endsWith("capstone") ? " capstone" : ""
                    }${getTalentElementClass(getSelectedElement(talent))}`}
                    style={{
                      gridRow: talent.row + 1,
                      gridColumn: talent.column + 1,
                    }}
                    role="button"
                    tabIndex={busy ? -1 : 0}
                    onClick={() => {
                      if (busy || !talent.available) {
                        return;
                      }
                      void onUnlockTalent(talent.id, getSelectedElement(talent));
                    }}
                    onKeyDown={(event) => {
                      if (busy || !talent.available) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void onUnlockTalent(talent.id, getSelectedElement(talent));
                      }
                    }}
                    aria-disabled={!talent.available}
                  >
                    <div className="meta-talent-head">
                      <strong>{talent.name}</strong>
                      <span>
                        {talent.current_rank}/{formatRankCap(talent.max_ranks)}
                      </span>
                    </div>
                    <p>{buildTalentDescription(talent, getSelectedElement(talent))}</p>
                    {talent.element_options.length > 0 ? (
                      <div className="talent-element-picker">
                        {talent.element_options.map((element) => {
                          const isActive = getSelectedElement(talent) === element;
                          const ui = ELEMENT_UI[element as keyof typeof ELEMENT_UI];
                          return (
                            <button
                              key={`${talent.id}-${element}`}
                              type="button"
                              className={`talent-element-option ${ui?.className ?? ""}${
                                isActive ? " active" : ""
                              }${!isActive ? " inactive" : ""}`}
                              aria-label={`Select ${element} for ${talent.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setDraftElements((current) => ({
                                  ...current,
                                  [talent.id]: element,
                                }));
                                if (talent.current_rank > 0) {
                                  void onSetTalentElement(talent.id, element);
                                }
                              }}
                              disabled={busy}
                              aria-pressed={isActive}
                              title={element}
                            >
                              <span>{ui?.emoji ?? "✨"}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <span className="meta-talent-requires">
                      {talent.requires.length > 0
                        ? `Requires: ${talent.requires
                            .map(
                              (requiredId) =>
                                visibleTalents.find((entry) => entry.id === requiredId)?.name ??
                                requiredId,
                            )
                            .join(", ")}`
                        : talent.current_rank >= talent.max_ranks
                          ? "Max rank reached"
                          : "Unlocked branch"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
