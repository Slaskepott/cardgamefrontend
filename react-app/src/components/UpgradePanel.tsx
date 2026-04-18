import type { Upgrade } from "../types/game";

interface UpgradePanelProps {
  upgrades: Upgrade[];
  ownedUpgrades: Upgrade[];
  playerGold: number;
  goldAttentionActive: boolean;
  visible: boolean;
  busy: boolean;
  onBuyUpgrade: (upgrade: Upgrade) => Promise<void>;
  onContinue: () => Promise<void>;
  shopStatusText: string;
  shopWaitingOnYou: boolean;
  shopTimerSeconds: number | null;
  onLeaveLobby: () => Promise<void>;
}

function formatTimer(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
  "Increase Earth Draw": "🪨",
  "Increase Fire Draw": "🔥",
  "Increase Water Draw": "🌊",
  "Increase Air Draw": "🌬️",
  "Low Cards Specialist": "🃏",
  "High Cards Specialist": "🎯",
  "Low Draw Specialist": "🎲",
  "High Draw Specialist": "🎯",
  "Royal Invitation": "👑",
  "Tiny Troublemakers": "😈",
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
  let lowCardDrawPercent = 0;
  let highCardDrawPercent = 0;
  let royalDrawPercent = 0;
  let tinyDrawPercent = 0;
  const elementalDamage: Record<string, number> = {
    earth: 0,
    fire: 0,
    water: 0,
    air: 0,
  };
  const elementalDraw: Record<string, number> = {
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
      case "Low Draw Specialist":
        lowCardDrawPercent += amount;
        break;
      case "High Draw Specialist":
        highCardDrawPercent += amount;
        break;
      case "Royal Invitation":
        royalDrawPercent += amount;
        break;
      case "Tiny Troublemakers":
        tinyDrawPercent += amount;
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
      case "Increase Earth Draw":
        elementalDraw.earth += amount;
        break;
      case "Increase Fire Draw":
        elementalDraw.fire += amount;
        break;
      case "Increase Water Draw":
        elementalDraw.water += amount;
        break;
      case "Increase Air Draw":
        elementalDraw.air += amount;
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

  const draw: string[] = [];
  if (lowCardDrawPercent > 0) draw.push(`+${lowCardDrawPercent}% low card draw chance`);
  if (highCardDrawPercent > 0) draw.push(`+${highCardDrawPercent}% high card draw chance`);
  if (royalDrawPercent > 0) draw.push(`+${royalDrawPercent}% queen, king, and ace draw chance`);
  if (tinyDrawPercent > 0) draw.push(`+${tinyDrawPercent}% 2 and 3 draw chance`);
  if (elementalDraw.earth > 0) draw.push(`+${elementalDraw.earth}% earth draw chance`);
  if (elementalDraw.fire > 0) draw.push(`+${elementalDraw.fire}% fire draw chance`);
  if (elementalDraw.water > 0) draw.push(`+${elementalDraw.water}% water draw chance`);
  if (elementalDraw.air > 0) draw.push(`+${elementalDraw.air}% air draw chance`);

  const game: string[] = [];
  if (bonusDiscards > 0) {
    game.push(`+${bonusDiscards} discard${bonusDiscards === 1 ? "" : "s"}`);
  }

  return [
    { title: "Offensive", lines: offensive },
    { title: "Defensive", lines: defensive },
    { title: "Draw", lines: draw },
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
  shopWaitingOnYou,
  shopTimerSeconds,
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
            <span className="upgrade-pack-shell" aria-hidden="true">
              <span className="upgrade-pack-half upgrade-pack-half-top" />
              <span className="upgrade-pack-half upgrade-pack-half-bottom" />
              <span className="upgrade-pack-burst" />
            </span>
            <div className="upgrade-card-content">
              <span className="upgrade-frame-corner upgrade-frame-corner-tl" aria-hidden="true" />
              <span className="upgrade-frame-corner upgrade-frame-corner-tr" aria-hidden="true" />
              <span className="upgrade-frame-corner upgrade-frame-corner-bl" aria-hidden="true" />
              <span className="upgrade-frame-corner upgrade-frame-corner-br" aria-hidden="true" />
              <span className="upgrade-frame-crest" aria-hidden="true" />
              <span className="upgrade-frame-medallion" aria-hidden="true" />
              <span className="upgrade-ornament ornament-top" aria-hidden="true" />
              <span className="upgrade-ornament ornament-bottom" aria-hidden="true" />
              <span className="upgrade-price">{upgrade.cost} gold</span>
              <span className="upgrade-emoji" aria-hidden="true">
                {upgradeEmojis[upgrade.name] ?? "✨"}
              </span>
              <strong>{upgrade.name}</strong>
              <span>{upgrade.effect}</span>
              <span className="upgrade-rarity-label">{upgrade.rarity}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="shop-actions">
        <div className="shop-status-stack">
          <span className={`shop-status-text ${shopWaitingOnYou ? "shop-status-text-urgent" : ""}`}>
            {shopStatusText}
          </span>
          {formatTimer(shopTimerSeconds) ? (
            <span className="shop-status-timer">Shop timer: {formatTimer(shopTimerSeconds)}</span>
          ) : null}
        </div>
        <button type="button" className="secondary" onClick={() => void onLeaveLobby()}>
          Leave lobby
        </button>
        <button type="button" className="shop-continue-button" onClick={() => void onContinue()}>
          Continue to next game
        </button>
      </div>
    </section>
  );
}
