interface BotMatchPanelProps {
  busy: boolean;
  onStartBotMatch: (difficulty: "easy" | "medium" | "hard") => Promise<void>;
}

export function BotMatchPanel({ busy, onStartBotMatch }: BotMatchPanelProps) {
  return (
    <section className="panel lobby-panel">
      <p className="eyebrow">Solo play</p>
      <h2>Play against a bot</h2>
      <p className="panel-copy">
        Practice against Easy, Medium, or Hard bots. Bot matches feel like real games, but they
        do not affect Elo, achievements, or level progression.
      </p>
      <div className="bot-match-button-stack">
        <button type="button" disabled={busy} onClick={() => void onStartBotMatch("easy")}>
          {busy ? "Working..." : "Easy"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void onStartBotMatch("medium")}
        >
          Medium
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void onStartBotMatch("hard")}
        >
          Hard
        </button>
      </div>
    </section>
  );
}
