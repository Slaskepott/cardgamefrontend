import type { MetaProgress } from "../types/game";

interface SpellsPageProps {
  metaProgress: MetaProgress | null;
  busy: boolean;
  onSetEquippedSpells: (spellIds: string[]) => Promise<void>;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const spellIcons: Record<string, string> = {
  kindle: "🔥",
  guard_pulse: "🛡️",
  second_breath: "💚",
  heavy_blow: "💥",
  perfect_pairing: "🂡",
  stone_delay: "🪨",
  overcharge: "⚡",
  blood_price: "🩸",
  double_stake: "🎲",
  final_push: "👑",
};

export function SpellsPage({ metaProgress, busy, onSetEquippedSpells }: SpellsPageProps) {
  const spells = metaProgress?.spells ?? [];
  const equippedIds = metaProgress?.equipped_spell_ids ?? [];

  async function toggleSpell(spellId: string) {
    const isEquipped = equippedIds.includes(spellId);
    if (isEquipped) {
      await onSetEquippedSpells(equippedIds.filter((id) => id !== spellId));
      return;
    }
    if (equippedIds.length >= 2) {
      await onSetEquippedSpells([equippedIds[1], spellId]);
      return;
    }
    await onSetEquippedSpells([...equippedIds, spellId]);
  }

  return (
    <section className="panel account-panel">
      <div className="section-header account-hero-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Spells</h2>
          <p className="panel-copy compact-copy">
            Equip any 2 spells. Each one can be used once per match.
          </p>
        </div>
        <div className="battle-metrics">
          <span>{equippedIds.length} / 2 equipped</span>
        </div>
      </div>

      <div className="spell-loadout-summary">
        {(equippedIds.length > 0 ? equippedIds : ["Empty", "Empty"]).map((spellId, index) => {
          const spell = spells.find((entry) => entry.id === spellId);
          return (
            <div key={`${spellId}-${index}`} className="spell-loadout-chip">
              <span className="spell-loadout-label">Slot {index + 1}</span>
              <strong>
                {spell ? `${spellIcons[spell.id] ?? "✦"} ${spell.name}` : spellId}
              </strong>
            </div>
          );
        })}
      </div>

      <div className="spell-page-grid">
        {spells.map((spell) => {
          const lockedReason =
            spell.unlock_source === "level"
              ? "Unlocked by leveling."
              : spell.unlock_source === "talent"
                ? "Unlocked through the talent tree."
                : spell.unlock_source === "campaign"
                  ? "Unlocked through the campaign."
                  : "Available from the start.";
          const isEquipped = equippedIds.includes(spell.id);
          return (
            <article
              key={spell.id}
              className={`spell-card spell-${spell.animation}${spell.unlocked ? "" : " locked"}${
                isEquipped ? " equipped" : ""
              }`}
            >
              <div className="spell-card-top">
                <span className="spell-card-tag">{titleCase(spell.effect_type)}</span>
                <span className="spell-card-tag subtle">{titleCase(spell.unlock_source)}</span>
              </div>
              <strong>{spellIcons[spell.id] ?? "✦"} {spell.name}</strong>
              <p>{spell.description}</p>
              <span className="spell-card-help">{lockedReason}</span>
              <button
                type="button"
                className={isEquipped ? "secondary" : ""}
                disabled={busy || !spell.unlocked}
                onClick={() => void toggleSpell(spell.id)}
              >
                {!spell.unlocked
                  ? "Locked"
                  : isEquipped
                    ? "Unequip"
                    : equippedIds.length >= 2
                      ? "Equip (replace oldest)"
                      : "Equip"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
