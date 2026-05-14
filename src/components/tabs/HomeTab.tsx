"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DoorOpen, Key, LogOut, MapPin, Users, X, Check, Wifi, Copy } from "lucide-react";

interface Props {
  guest: { id: number; name: string; isAdmin: boolean };
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface PresenceEntry {
  guest_id: number;
  guest_name: string;
  status: string;
  with_someone: number;
}

export default function HomeTab({ guest, showToast }: Props) {
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState("away");
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [showCompanionModal, setShowCompanionModal] = useState<string | null>(null); // door name
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  const [allGuests, setAllGuests] = useState<string[]>([]);

  const fetchPresence = useCallback(() => {
    fetch("/api/presence")
      .then((r) => r.json())
      .then((data) => {
        if (data.presence) {
          setPresence(data.presence);
          const me = data.presence.find((p: PresenceEntry) => p.guest_id === guest.id);
          if (me) setMyStatus(me.status);
          setAllGuests(data.presence.map((p: PresenceEntry) => p.guest_name).filter((n: string) => n !== guest.name));
        }
      })
      .catch(() => {});
  }, [guest.id, guest.name]);

  useEffect(() => {
    fetchPresence();
    const interval = setInterval(fetchPresence, 8000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  function handleDoorPress(door: string) {
    setSelectedCompanions([]);
    setShowCompanionModal(door);
  }

  async function confirmUnlock() {
    if (!showCompanionModal) return;
    const door = showCompanionModal;
    setShowCompanionModal(null);

    // "check-in" = just setting presence, no door unlock
    if (door === "check-in") {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "here", withSomeone: selectedCompanions.length > 0 }),
        });
        setMyStatus("here");
        showToast(selectedCompanions.length > 0
          ? `Checked in with ${selectedCompanions.join(", ")}`
          : "Checked in"
        );
        fetchPresence();
      } catch {
        showToast("Failed to update", "error");
      }
      return;
    }

    // Door unlock flow
    setUnlocking(door);
    try {
      const res = await fetch("/api/doors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ door, companions: selectedCompanions }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${door === "downstairs" ? "Street" : "Apartment"} door opened`);
        setMyStatus("here");
        fetchPresence();
      } else {
        showToast(data.error || "Failed to unlock", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setTimeout(() => setUnlocking(null), 800);
    }
  }

  async function handleLeave() {
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "terrain", withSomeone: false }),
      });
      setMyStatus("terrain");
      showToast("See you at the pride!");
      fetchPresence();
    } catch {
      showToast("Failed to update", "error");
    }
  }

  async function updateStatus(status: string) {
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, withSomeone: false }),
      });
      setMyStatus(status);
      fetchPresence();
    } catch {
      showToast("Failed to update", "error");
    }
  }

  const atApartment = presence.filter((p) => p.status === "here");
  const atTerrain = presence.filter((p) => p.status === "terrain");
  const awayGuests = presence.filter((p) => p.status === "away");

  return (
    <div className="space-y-6">
      {/* Door Controls */}
      <section>
        <p className="section-label">Doors</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDoorPress("downstairs")}
            disabled={unlocking !== null}
            className={`card-interactive p-5 flex flex-col items-center gap-3 text-center ${
              unlocking === "downstairs" ? "card-active" : ""
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              unlocking === "downstairs"
                ? "bg-[var(--color-success-soft)]"
                : "bg-[var(--color-surface-2)]"
            }`}>
              <DoorOpen size={22} className={unlocking === "downstairs" ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"} />
            </div>
            <div>
              <p className="text-sm font-medium">Street Door</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Buzzer</p>
            </div>
          </button>

          <button
            onClick={() => handleDoorPress("upstairs")}
            disabled={unlocking !== null}
            className={`card-interactive p-5 flex flex-col items-center gap-3 text-center ${
              unlocking === "upstairs" ? "card-active" : ""
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              unlocking === "upstairs"
                ? "bg-[var(--color-success-soft)]"
                : "bg-[var(--color-surface-2)]"
            }`}>
              <Key size={22} className={unlocking === "upstairs" ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"} />
            </div>
            <div>
              <p className="text-sm font-medium">Apartment</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Front door</p>
            </div>
          </button>
        </div>
      </section>

      {/* I'm Leaving button — prominent when at apartment */}
      {myStatus === "here" && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <button
            onClick={handleLeave}
            className="w-full card-interactive p-4 flex items-center justify-center gap-3 text-[var(--color-accent)]"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">I&apos;m leaving the apartment</span>
          </button>
        </motion.section>
      )}

      {/* Status controls when NOT at apartment */}
      {myStatus !== "here" && (
        <section>
          <p className="section-label">Your status</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateStatus("here")}
                className={`card-interactive p-3 flex items-center gap-3 ${
                  myStatus === "here" ? "card-active" : ""
                }`}
              >
                <Home size={16} className="text-[var(--color-accent)]" />
                <span className="text-sm">I&apos;m here</span>
              </button>
              <button
                onClick={() => { setSelectedCompanions([]); setShowCompanionModal("check-in"); }}
                className="card-interactive p-3 flex items-center gap-3"
              >
                <Users size={16} className="text-[var(--color-text-tertiary)]" />
                <span className="text-sm">Here with +1</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateStatus("terrain")}
                className={`card-interactive p-3 flex items-center gap-3 ${
                  myStatus === "terrain" ? "card-active" : ""
                }`}
              >
                <MapPin size={16} className={myStatus === "terrain" ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"} />
                <span className="text-sm">At the pride</span>
              </button>
              <button
                onClick={() => updateStatus("away")}
                className={`card-interactive p-3 flex items-center gap-3 ${
                  myStatus === "away" ? "card-active" : ""
                }`}
              >
                <LogOut size={16} className={myStatus === "away" ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"} />
                <span className="text-sm">Away</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Who's Where */}
      <section>
        <p className="section-label">Who&apos;s where</p>
        <div className="space-y-3">
          {atApartment.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Home size={14} className="text-[var(--color-accent)]" />
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Apartment</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{atApartment.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {atApartment.map((p) => (
                  <span key={p.guest_id} className="chip bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    {p.guest_name}{p.with_someone ? " +1" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {atTerrain.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <MapPin size={14} className="text-[var(--color-success)]" />
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">At the pride</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{atTerrain.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {atTerrain.map((p) => (
                  <span key={p.guest_id} className="chip bg-[var(--color-success-soft)] text-[var(--color-success)]">
                    {p.guest_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {awayGuests.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <LogOut size={14} className="text-[var(--color-text-tertiary)]" />
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Not checked in</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{awayGuests.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {awayGuests.map((p) => (
                  <span key={p.guest_id} className="chip bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
                    {p.guest_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* WiFi */}
      <section>
        <p className="section-label">WiFi</p>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
            <Wifi size={18} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium font-mono">ftre.co</p>
            <p className="text-xs text-[var(--color-text-tertiary)] font-mono">#Simsimma23</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText("#Simsimma23"); showToast("Password copied"); }}
            className="p-2 hover:bg-[var(--color-surface-2)] rounded-lg transition-colors"
          >
            <Copy size={16} className="text-[var(--color-text-tertiary)]" />
          </button>
        </div>
      </section>

      {/* Companion Modal */}
      <AnimatePresence>
        {showCompanionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setShowCompanionModal(null)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-t-2xl overflow-hidden"
              style={{ background: "var(--color-surface-1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">
                      {showCompanionModal === "check-in" ? "Checking in" : `Opening ${showCompanionModal === "downstairs" ? "street" : "apartment"} door`}
                    </h3>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Anyone with you?</p>
                  </div>
                  <button onClick={() => setShowCompanionModal(null)} className="p-1">
                    <X size={20} className="text-[var(--color-text-tertiary)]" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5 max-h-48 overflow-y-auto">
                  {allGuests.map((name) => {
                    const selected = selectedCompanions.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedCompanions((prev) =>
                            selected ? prev.filter((n) => n !== name) : [...prev, name]
                          );
                        }}
                        className={`p-2.5 rounded-xl text-sm font-medium transition-all ${
                          selected
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                            : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-transparent"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setSelectedCompanions([]); confirmUnlock(); }}
                    className="btn-ghost text-center"
                  >
                    Just me
                  </button>
                  <button onClick={confirmUnlock} className="btn-primary flex items-center justify-center gap-2">
                    <Check size={16} />
                    {showCompanionModal === "check-in" ? "Check in" : "Open door"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Home({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
