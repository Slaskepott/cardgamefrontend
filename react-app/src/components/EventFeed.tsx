interface EventFeedProps {
  entries: string[];
}

export function EventFeed({ entries }: EventFeedProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Event feed</p>
      <h2>What the backend is saying</h2>
      <div className="event-feed">
        {entries.length === 0 ? (
          <p className="panel-copy">
            No events yet. Create or join a game to start receiving messages.
          </p>
        ) : (
          entries.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)
        )}
      </div>
    </section>
  );
}

