"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sofa, Bed, CookingPot, ShowerHead, Monitor, ChevronDown, Power, Sun, PartyPopper, Moon, Palette, Waves, TreePalm, Clapperboard, ArrowUp, Printer, Loader2 } from "lucide-react";

interface Props {
  guest: { id: number; name: string; isAdmin: boolean; familyFriendly: boolean };
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface Room {
  id: string;
  label: string;
  scenes: string[];
}

const ROOM_ICONS: Record<string, typeof Sofa> = {
  living_room: Sofa,
  bedroom: Bed,
  kitchen: CookingPot,
  bathroom: ShowerHead,
  office: Monitor,
};

// Add Lights On / Lights Off to beginning of each room's scenes
function augmentScenes(scenes: string[]): string[] {
  const result = [];
  if (!scenes.includes("Off")) result.push("Off");
  result.push(...scenes);
  return result;
}

const SCENE_ICONS: Record<string, typeof Sun> = {
  "Off": Power,
  "Morning": Sun,
  "Day": Sun,
  "Evening": Moon,
  "Party": PartyPopper,
  "Movie Night": Moon,
  "Bedtime": Moon,
  "Sleep": Moon,
};

export default function RoomsTab({ guest, showToast }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [activeScenes, setActiveScenes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [fakePrinting, setFakePrinting] = useState<string | null>(null);
  const [fakePrintProgress, setFakePrintProgress] = useState(0);
  const [rickRolled, setRickRolled] = useState(false);

  useEffect(() => {
    fetch("/api/lights")
      .then((r) => r.json())
      .then((data) => {
        if (data.rooms) setRooms(data.rooms);
      })
      .catch(() => {});
  }, []);

  async function setScene(roomId: string, scene: string) {
    setLoading(`${roomId}-${scene}`);
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scene", room: roomId, scene }),
      });
      if (res.ok) {
        setActiveScenes((prev) => ({ ...prev, [roomId]: scene }));
        const roomLabel = rooms.find(r => r.id === roomId)?.label || roomId;
        showToast(`${roomLabel} → ${scene}`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setLoading(null);
    }
  }

  async function quickPreset(preset: string, label: string) {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick", preset }),
      });
      if (res.ok) showToast(label);
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }

  async function toggleMode(mode: string, state: boolean) {
    try {
      await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mode", mode, state }),
      });
      showToast(state ? "Party mode on!" : "Party mode off");
    } catch {
      showToast("Failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <section>
        <p className="section-label">Quick presets</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { preset: "all_on", icon: Sun, label: "All On", sub: "Every light", accent: true },
            { preset: "all_off", icon: Power, label: "All Off", sub: "Lights out" },
            { preset: "upstairs_on", icon: ArrowUp, label: "Upstairs On", sub: "Living, kitchen, toilet" },
            { preset: "upstairs_off", icon: ArrowUp, label: "Upstairs Off", sub: "Living, kitchen, toilet" },
            { preset: "movie", icon: Clapperboard, label: "Movie Night", sub: "Dim living room" },
            { preset: "ocean", icon: Waves, label: "Ocean", sub: "Blue living room" },
            { preset: "tropical", icon: TreePalm, label: "Tropical", sub: "Warm living room" },
          ].map((p) => (
            <button
              key={p.preset}
              onClick={() => quickPreset(p.preset, p.label)}
              className="card-interactive p-3 flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                p.accent ? "bg-[var(--color-accent-soft)]" : "bg-[var(--color-surface-2)]"
              }`}>
                <p.icon size={16} className={p.accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{p.sub}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => toggleMode("party_mode", true)}
            className="card-interactive p-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center">
              <PartyPopper size={16} className="text-[var(--color-accent)]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Party Mode</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">Full send</p>
            </div>
          </button>
        </div>
      </section>

      {/* Rooms */}
      <section>
        <p className="section-label">Rooms</p>
        <div className="space-y-2">
          {rooms.map((room) => {
            const Icon = ROOM_ICONS[room.id] || Sofa;
            const expanded = expandedRoom === room.id;
            const scenes = augmentScenes(
              guest.familyFriendly ? room.scenes.filter(s => s !== "Sexy") : room.scenes
            );

            return (
              <div key={room.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedRoom(expanded ? null : room.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center">
                      <Icon size={18} className="text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{room.label}</p>
                      {activeScenes[room.id] && (
                        <p className="text-[10px] text-[var(--color-accent)]">{activeScenes[room.id]}</p>
                      )}
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronDown size={16} className="text-[var(--color-text-tertiary)]" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {scenes.map((scene) => {
                            const active = activeScenes[room.id] === scene;
                            const isLoading = loading === `${room.id}-${scene}`;
                            const SceneIcon = SCENE_ICONS[scene];

                            return (
                              <button
                                key={scene}
                                onClick={() => setScene(room.id, scene)}
                                disabled={loading !== null}
                                className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                  active
                                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                                    : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                                } ${isLoading ? "animate-pulse" : ""}`}
                              >
                                {SceneIcon && <SceneIcon size={12} />}
                                {scene}
                              </button>
                            );
                          })}
                        </div>

                        {/* Color + Effects for living room and kitchen */}
                        {(room.id === "living_room" || room.id === "kitchen") && (
                          <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                              <Palette size={12} />
                              <span>Custom color & effects</span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {[
                                { color: "#ff0000", label: "Red" },
                                { color: "#ff6b00", label: "Orange" },
                                { color: "#ffcc00", label: "Yellow" },
                                { color: "#00ff00", label: "Green" },
                                { color: "#00ccff", label: "Cyan" },
                                { color: "#0044ff", label: "Blue" },
                                { color: "#9900ff", label: "Purple" },
                                { color: "#ff00aa", label: "Pink" },
                                { color: "#ffffff", label: "White" },
                              ].map((c) => (
                                <button
                                  key={c.color}
                                  onClick={() => setRoomColor(room.id, c.color, c.label)}
                                  className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-white/30 transition-all"
                                  style={{ background: c.color }}
                                  title={c.label}
                                />
                              ))}
                              <input
                                type="color"
                                onChange={(e) => setRoomColor(room.id, e.target.value, "Custom")}
                                className="w-8 h-8 rounded-lg cursor-pointer border-2 border-dashed border-[var(--color-border)] bg-transparent"
                                title="Custom"
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {["candle", "fire", "prism", "cosmos", "underwater", "sparkle", "sunrise", "sunset"].map((eff) => (
                                <button
                                  key={eff}
                                  onClick={() => setRoomEffect(room.id, eff)}
                                  className="card-interactive py-2 px-1 text-center"
                                >
                                  <span className="text-[10px] font-medium capitalize">{eff}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Toilet Color Control */}
      <section>
        <p className="section-label">Upstairs Toilet Lights</p>
        <div className="card p-4 space-y-4">
          {/* Color presets */}
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { color: "#ff0000", label: "Red" },
                { color: "#ff6b00", label: "Orange" },
                { color: "#ffcc00", label: "Yellow" },
                { color: "#00ff00", label: "Green" },
                { color: "#00ccff", label: "Cyan" },
                { color: "#0044ff", label: "Blue" },
                { color: "#9900ff", label: "Purple" },
                { color: "#ff00aa", label: "Pink" },
                { color: "#ffffff", label: "White" },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setToiletColor(c.color, c.label)}
                  className="w-9 h-9 rounded-xl border-2 border-transparent hover:border-white/30 transition-all"
                  style={{ background: c.color }}
                  title={c.label}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  onChange={(e) => setToiletColor(e.target.value, e.target.value)}
                  className="w-9 h-9 rounded-xl cursor-pointer border-2 border-dashed border-[var(--color-border)] bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Off button */}
          <button
            onClick={() => setToiletOff()}
            className="w-full card-interactive p-3 flex items-center justify-center gap-2"
          >
            <Power size={14} className="text-[var(--color-text-tertiary)]" />
            <span className="text-sm font-medium">Off</span>
          </button>
        </div>
      </section>

      {/* 3D Printer (hidden for family-friendly guests) */}
      {!guest.familyFriendly && <section>
        <p className="section-label">3D Printer (Booty)</p>
        <div className="card p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              fakePrinting ? "bg-[var(--color-accent-soft)]" : "bg-[var(--color-surface-2)]"
            }`}>
              {fakePrinting ? (
                <Loader2 size={18} className="text-[var(--color-accent)] animate-spin" />
              ) : (
                <Printer size={18} className="text-[var(--color-text-secondary)]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {fakePrinting ? `Printing: ${fakePrinting}` : "Idle"}
              </p>
              {fakePrinting && (
                <div className="mt-1.5">
                  <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${fakePrintProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">{fakePrintProgress}% complete</p>
                </div>
              )}
              {!fakePrinting && (
                <p className="text-xs text-[var(--color-text-tertiary)]">Ready for your wildest ideas</p>
              )}
            </div>
          </div>

          {/* Quick prints */}
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Quick Print</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "dildo", label: "Massive Dildo", sub: "XL, ribbed, 47cm" },
                { id: "furry_tail", label: "Furry Tail", sub: "Extra fluffy" },
                { id: "buttplug", label: "Buttplug", sub: "Ergonomic design" },
                { id: "chastity", label: "Chastity Cage", sub: "One size fits... some" },
                { id: "pride_crown", label: "Pride Crown", sub: "Rainbow tiara" },
                { id: "handcuffs", label: "Fuzzy Handcuffs", sub: "Safety release included" },
                { id: "trophy", label: "Best Bottom Trophy", sub: "Engraved" },
                { id: "paw_print", label: "Giant Paw Print", sub: "Wall mountable" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => startFakePrint(item.label)}
                  disabled={fakePrinting !== null}
                  className={`card-interactive p-3 text-left ${
                    fakePrinting ? "opacity-40" : ""
                  }`}
                >
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{item.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {/* Rick Roll overlay */}
      <AnimatePresence>
        {rickRolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
            onClick={() => setRickRolled(false)}
          >
            <div className="text-center p-6">
              <iframe
                width="320"
                height="180"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Print Complete"
                allow="autoplay"
                className="rounded-xl mb-4 mx-auto"
              />
              <p className="text-lg font-bold mb-1">Print Complete!</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Please collect your item from the printer.</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-4">Tap anywhere to close</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function startFakePrint(itemName: string) {
    setFakePrinting(itemName);
    setFakePrintProgress(0);
    showToast(`Starting print: ${itemName}...`);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFakePrintProgress(100);
        setTimeout(() => {
          setFakePrinting(null);
          setFakePrintProgress(0);
          setRickRolled(true);
        }, 800);
        return;
      }
      setFakePrintProgress(progress);
    }, 600);
  }

  async function setToiletColor(color: string, label: string) {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toilet_color", color }),
      });
      if (res.ok) showToast(`Toilet: ${label}`);
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }

  async function setToiletEffect(effect: string) {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toilet_effect", effect }),
      });
      if (res.ok) showToast(`Toilet: ${effect}`);
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }

  async function setToiletOff() {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toilet_off" }),
      });
      if (res.ok) showToast("Toilet lights off");
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }

  async function setRoomColor(roomId: string, color: string, label: string) {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "room_color", color, target: roomId }),
      });
      const roomLabel = rooms.find(r => r.id === roomId)?.label || roomId;
      if (res.ok) showToast(`${roomLabel}: ${label}`);
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }

  async function setRoomEffect(roomId: string, effect: string) {
    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "room_effect", effect, target: roomId }),
      });
      const roomLabel = rooms.find(r => r.id === roomId)?.label || roomId;
      if (res.ok) showToast(`${roomLabel}: ${effect}`);
      else showToast("Failed", "error");
    } catch { showToast("Error", "error"); }
  }
}
