"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Volume2, DoorOpen, Key, Lightbulb, Tv, Monitor, MapPin, LogIn, CheckCircle, MessageCircle, UserPlus } from "lucide-react";

interface Props {
  guest: { id: number; name: string; isAdmin: boolean };
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface FeedEntry {
  id: number;
  guest_name: string;
  action: string;
  detail: string | null;
  category: string;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof Send; format: (name: string, detail: string | null) => string }> = {
  unlocked_downstairs: { icon: DoorOpen, format: (n) => `${n} opened the street door` },
  unlocked_upstairs: { icon: Key, format: (n) => `${n} opened the apartment` },
  set_scene: { icon: Lightbulb, format: (n, d) => `${n} set ${d}` },
  toggle_mode: { icon: Lightbulb, format: (n, d) => `${n} toggled ${d}` },
  set_tv_input: { icon: Tv, format: (n, d) => `${n} switched TV to ${d}` },
  launched_app: { icon: Tv, format: (n, d) => `${n} launched ${d}` },
  switched_pc: { icon: Monitor, format: (n, d) => `${n} ${d}` },
  set_sync_mode: { icon: Lightbulb, format: (n, d) => `${n} set Hue Sync to ${d}` },
  chat_message: { icon: MessageCircle, format: (n, d) => `${n}: ${d}` },
  announcement: { icon: Volume2, format: (n, d) => `${n}: "${d}"` },
  status_here: { icon: MapPin, format: (n, d) => `${n} ${d}` },
  status_terrain: { icon: MapPin, format: (n, d) => `${n} ${d}` },
  status_away: { icon: LogIn, format: (n, d) => `${n} ${d}` },
  logged_in: { icon: UserPlus, format: (n) => `${n} joined El Casito` },
  agreed_to_rules: { icon: CheckCircle, format: (n) => `${n} agreed to the rules` },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr + "Z");
  return d.toLocaleTimeString("en-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function FeedTab({ guest, showToast }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [message, setMessage] = useState("");
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const fetchFeed = useCallback((polling = false) => {
    const url = polling && lastIdRef.current > 0
      ? `/api/feed?after=${lastIdRef.current}`
      : "/api/feed?limit=50";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.entries?.length > 0) {
          if (polling) {
            setEntries((prev) => [...prev, ...data.entries]);
          } else {
            setEntries(data.entries);
          }
          lastIdRef.current = data.entries[data.entries.length - 1].id;
          setTimeout(() => {
            feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
          }, 100);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFeed(false);
    const interval = setInterval(() => fetchFeed(true), 5000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  async function sendMessage() {
    if (!message.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), asAnnouncement }),
      });
      const data = await res.json();
      if (res.ok) {
        if (asAnnouncement && data.announced) {
          showToast("Announced on speakers");
        }
        setMessage("");
        fetchFeed(true);
      } else {
        showToast(data.error || "Failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 160px)" }}>
      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto space-y-0.5 mb-3">
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action];
            const Icon = config?.icon || MessageCircle;
            const text = config
              ? config.format(entry.guest_name, entry.detail)
              : `${entry.guest_name}: ${entry.action}`;
            const isChat = entry.action === "chat_message";
            const isMe = entry.guest_name === guest.name;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`py-2 px-3 rounded-xl ${isChat ? "card" : ""}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon
                    size={14}
                    className={`mt-0.5 flex-shrink-0 ${
                      isChat
                        ? isMe ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                        : "text-[var(--color-text-tertiary)]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${
                      isChat ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"
                    }`}>
                      {text}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                      {formatTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={32} className="text-[var(--color-text-tertiary)] mb-3" />
            <p className="text-sm text-[var(--color-text-tertiary)]">No messages yet</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Be the first to say something!</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2">
        {/* Announce toggle */}
        <button
          onClick={() => setAsAnnouncement(!asAnnouncement)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            asAnnouncement
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <Volume2 size={14} />
          {asAnnouncement ? "Will announce on speakers" : "Also announce on speakers?"}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="input flex-1"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            className="btn-primary px-4"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
