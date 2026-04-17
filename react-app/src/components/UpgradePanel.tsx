import type { Upgrade } from "../types/game";

interface UpgradePanelProps {
  upgrades: Upgrade[];
  ownedUpgrades: Upgrade[];
  playerGold: number;
  goldAttentionActive: boolean;
  visible: boolean;
  busy: boolean;
  onBuyUpgrade: (upgrade: Upgrade) => Promise<void>;
  onContinue: () => void;
  shopStatusText: string;
  onLeaveLobby: () => Promise<void>;
}

const upgradeEmojis: Record<string, string> = {
  "Increase Health": "❤️",
  "Increase Health %": "💖",
  "Increase Discards": "↻",
  "Increase Damage": "⚔️",
  "Increase Earth Damage": "🌿",
  "Increase Fire Damage": "🔥",
  "Increase Water Damage": "💧",
  "Increase Air Damage": "💨",
};

interface UpgradeSummarySection {
  title: string;
  lines: string[];
}

function parseLeadingNumber(effect: string) {
  const match = effect.match(/([+-]?\d+)/);
  return match ? Number(match[1]) : 0;
}

function summarizeOwnedUpgrades(upgrades: Upgrade[]): UpgradeSummarySection[] {
  let bonusHealth = 0;
  let bonusHealthPercent = 0;
  let bonusDiscards = 0;
  let bonusDamagePercent = 0;
  let lowCardDamagePercent = 0;
  let highCardDamagePercent = 0;
  const elementalDamage: Record<string, number> = {
    earth: 0,
    fire: 0,
    water: 0,
    air: 0,
  };

  upgrades.forEach((upgrade) => {
    const amount = parseLeadingNumber(upgrade.effect);
    switch (upgrade.name) {
      case "Increase Health":
        bonusHealth += amount;
        break;
      case "Increase Health %":
        bonusHealthPercent += amount;
        break;
      case "Increase Discards":
        bonusDiscards += amount;
        break;
      case "Increase Damage":
        bonusDamagePercent += amount;
        break;
      case "Low Cards Specialist":
        lowCardDamagePercent += amount;
        break;
      case "High Cards Specialist":
        highCardDamagePercent += amount;
        break;
      case "Increase Earth Damage":
        elementalDamage.earth += amount;
        break;
      case "Increase Fire Damage":
        elementalDamage.fire += amount;
        break;
      case "Increase Water Damage":
        elementalDamage.water += amount;
        break;
      case "Increase Air Damage":
        elementalDamage.air += amount;
        break;
      default:
        break;
    }
  });

  const offensive: string[] = [];
  if (bonusDamagePercent > 0) offensive.push(`+${bonusDamagePercent}% overall damage`);
  if (lowCardDamagePercent > 0) offensive.push(`+${lowCardDamagePercent}% low card damage`);
  if (highCardDamagePercent > 0) offensive.push(`+${highCardDamagePercent}% high card damage`);
  if (elementalDamage.earth > 0) offensive.push(`+${elementalDamage.earth}% earth damage`);
  if (elementalDamage.fire > 0) offensive.push(`+${elementalDamage.fire}% fire damage`);
  if (elementalDamage.water > 0) offensive.push(`+${elementalDamage.water}% water damage`);
  if (elementalDamage.air > 0) offensive.push(`+${elementalDamage.air}% air damage`);

  const defensive: string[] = [];
  if (bonusHealth > 0) defensive.push(`+${bonusHealth} health`);
  if (bonusHealthPercent > 0) defensive.push(`+${bonusHealthPercent}% health`);

  const game: string[] = [];
  if (bonusDiscards > 0) {
    game.push(`+${bonusDiscards} discard${bonusDiscards === 1 ? "" : "s"}`);
  }

  return [
    { title: "Offensive", lines: offensive },
    { title: "Defensive", lines: defensive },
    { title: "Game", lines: game },
  ].filter((section) => section.lines.length > 0);
}

export function UpgradePanel({
  upgrades,
  ownedUpgrades,
  playerGold,
  goldAttentionActive,
  visible,
  busy,
  onBuyUpgrade,
  onContinue,
  shopStatusText,
  onLeaveLobby,
}: UpgradePanelProps) {
  if (!visible) {
    const summarySections = summarizeOwnedUpgrades(ownedUpgrades);

    return (
      <section className="panel">
        <p className="eyebrow">Upgrades</p>
        <h2>Player stats</h2>
        <div className="upgrade-summary">
          {summarySections.length === 0 ? (
            <p className="panel-copy">No upgrades purchased yet.</p>
          ) : (
            summarySections.map((section) => (
              <section key={section.title} className="summary-section">
                <h3>{section.title}</h3>
                <ul>
                  {section.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`panel ${visible ? "shop-panel-expanded" : ""}`}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Upgrade shop</p>
          <h2>Spend your gold between rounds</h2>
        </div>
        <div className="battle-metrics">
          <span className={goldAttentionActive ? "gold-chip-attention" : undefined}>
            Gold: {playerGold}
          </span>
        </div>
      </div>

      <div className="upgrade-grid">
        {upgrades.map((upgrade) => (
          <button
            type="button"
            key={upgrade.id}
            className={`upgrade-card ${upgrade.rarity}`}
            style={{ ["--shop-delay" as any]: `${upgrade.id * 90}ms` }}
            onClick={() => void onBuyUpgrade(upgrade)}
            disabled={busy}
          >
            <span className="upgrade-ornament ornament-top" aria-hidden="true" />
            <span className="upgrade-ornament ornament-bottom" aria-hidden="true" />
            <span className="upgrade-price">{upgrade.cost} gold</span>
            <span className="upgrade-emoji" aria-hidden="true">
              {upgradeEmojis[upgrade.name] ?? "✨"}
            </span>
            <strong>{upgrade.name}</strong>
            <span>{upgrade.effect}</span>
            <span className="upgrade-rarity-label">{upgrade.rarity}</span>
          </button>
        ))}
      </div>
      <div className="shop-actions">
        <span className="shop-status-text">{shopStatusText}</span>
        <button type="button" className="secondary" onClick={() => void onLeaveLobby()}>
          Leave lobby
        </button>
        <button type="button" className="shop-continue-button" onClick={onContinue}>
          Continue to next game
        </button>
      </div>
    </section>
  );
}
