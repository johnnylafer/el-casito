"use client";

import { useState, useEffect } from "react";
import { UserPlus, Copy, Check, Users } from "lucide-react";

interface Props {
  guest: { id: number; name: string; isAdmin: boolean; familyFriendly: boolean };
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface GuestEntry {
  id: number;
  name: string;
  invite_code: string;
  agreed_at: string | null;
  is_admin: number;
  family_friendly: number;
  last_seen_at: string | null;
}

export default function AdminTab({ showToast }: Props) {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [newFF, setNewFF] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchGuests();
  }, []);

  function fetchGuests() {
    fetch("/api/admin/guests")
      .then((r) => r.json())
      .then((data) => { if (data.guests) setGuests(data.guests); })
      .catch(() => {});
  }

  async function addGuest() {
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), familyFriendly: newFF }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Added ${data.guest.name}: ${data.guest.invite_code}`);
        setNewName("");
        setNewFF(false);
        fetchGuests();
      } else {
        showToast(data.error || "Failed", "error");
      }
    } catch {
      showToast("Error", "error");
    } finally {
      setAdding(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      showToast("Copied!");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Add Guest */}
      <section>
        <p className="section-label">Add Guest</p>
        <div className="card p-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Guest name"
            className="input"
          />
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={newFF}
              onChange={(e) => setNewFF(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
            />
            Family-friendly (hide spicy content)
          </label>
          <button
            onClick={addGuest}
            disabled={!newName.trim() || adding}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            {adding ? "Adding..." : "Add Guest"}
          </button>
        </div>
      </section>

      {/* Guest List */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[var(--color-text-tertiary)]" />
          <p className="section-label mb-0">All Guests ({guests.length})</p>
        </div>
        <div className="space-y-1.5">
          {guests.map((g) => (
            <div key={g.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{g.name}</p>
                  {g.is_admin ? (
                    <span className="text-[10px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-1.5 py-0.5 rounded">admin</span>
                  ) : null}
                  {g.family_friendly ? (
                    <span className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] px-1.5 py-0.5 rounded">ff</span>
                  ) : null}
                </div>
                <p className="text-xs font-mono text-[var(--color-text-tertiary)] mt-0.5">{g.invite_code}</p>
              </div>
              <button
                onClick={() => copyCode(g.invite_code)}
                className="p-2 hover:bg-[var(--color-surface-2)] rounded-lg transition-colors"
              >
                {copied === g.invite_code ? (
                  <Check size={16} className="text-[var(--color-success)]" />
                ) : (
                  <Copy size={16} className="text-[var(--color-text-tertiary)]" />
                )}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
