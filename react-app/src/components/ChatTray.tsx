import { useEffect, useMemo, useRef, useState } from "react";
import { getGameChat, getGlobalChat, postGameChat, postGlobalChat } from "../lib/api";
import type { ChatMessage } from "../types/game";

interface ChatTrayProps {
  scope: "global" | "game";
  gameId?: string | null;
  playerId?: string | null;
  authorName: string;
  authorAvatar: string;
  visible?: boolean;
}

function formatChatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ChatTray({
  scope,
  gameId,
  playerId,
  authorName,
  authorAvatar,
  visible = true,
}: ChatTrayProps) {
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const title = scope === "game" ? "Match chat" : "Global chat";
  const subtitle = scope === "game" ? "Only this game can see these messages." : "Everyone sees this chat.";
  const canUseGameScope = scope === "global" || Boolean(gameId && playerId);

  useEffect(() => {
    if (!visible || !canUseGameScope) {
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      try {
        const response =
          scope === "game" && gameId ? await getGameChat(gameId) : await getGlobalChat();
        if (!cancelled && response.messages) {
          setMessages(response.messages);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    }

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [visible, canUseGameScope, scope, gameId]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || busy || !canUseGameScope) {
      return;
    }

    setBusy(true);
    try {
      const response =
        scope === "game" && gameId && playerId
          ? await postGameChat(gameId, playerId, text)
          : await postGlobalChat(authorName, text, authorAvatar);
      if (response.message && typeof response.message !== "string") {
        setMessages((current) => [...current, response.message as ChatMessage].slice(-80));
      }
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  const orderedMessages = useMemo(
    () => [...messages].sort((left, right) => left.created_at - right.created_at),
    [messages],
  );

  useEffect(() => {
    if (!minimized && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [orderedMessages, minimized]);

  if (!visible || !canUseGameScope) {
    return null;
  }

  return (
    <aside className={`chat-tray${minimized ? " minimized" : ""}`}>
      <button
        type="button"
        className="chat-tray-header"
        onClick={() => setMinimized((current) => !current)}
        aria-expanded={!minimized}
      >
        <div>
          <strong>{title}</strong>
          {!minimized ? <span>{subtitle}</span> : null}
        </div>
        <span className="chat-tray-toggle">{minimized ? "▴" : "▾"}</span>
      </button>
      {!minimized ? (
        <div className="chat-tray-body">
          <div className="chat-messages" ref={messagesRef}>
            {orderedMessages.length === 0 ? (
              <p className="chat-empty">No messages yet.</p>
            ) : (
              orderedMessages.map((message) => (
                <article key={message.id} className="chat-message">
                  <div className="chat-message-meta">
                    <span className="player-avatar-badge">{message.avatar}</span>
                    <strong>{message.author}</strong>
                    <span>{formatChatTime(message.created_at)}</span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>
          <div className="chat-compose">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={scope === "game" ? "Message this match..." : "Message global chat..."}
            />
            <button type="button" onClick={() => void handleSend()} disabled={busy || !draft.trim()}>
              Send
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
