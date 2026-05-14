"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Tv, Monitor, Gamepad2, Power, Film, Music, Clapperboard, Play, Sparkles, Volume2, Minus, Plus, Lightbulb, Sofa } from "lucide-react";

interface Props {
  guest: { id: number; name: string; isAdmin: boolean };
  showToast: (msg: string, type?: "success" | "error") => void;
}

const TV_INPUTS = [
  { id: "AppleTV", icon: Play, label: "Apple TV" },
  { id: "PS4", icon: Gamepad2, label: "PlayStation" },
  { id: "Nintendo Switch", icon: Gamepad2, label: "Switch" },
  { id: "Off", icon: Power, label: "TV Off" },
];

const TV_APPS = [
  { id: "Netflix", icon: Film, label: "Netflix" },
  { id: "Disney+", icon: Sparkles, label: "Disney+" },
  { id: "Youtube", icon: Play, label: "YouTube" },
  { id: "Prime Video", icon: Film, label: "Prime" },
  { id: "AppleTV+", icon: Clapperboard, label: "Apple TV+" },
  { id: "Apple Music", icon: Music, label: "Music" },
  { id: "Omni", icon: Tv, label: "Omni" },
];

const SYNC_MODES = [
  { id: "Off", icon: Power, label: "Off" },
  { id: "Video", icon: Film, label: "Video" },
  { id: "Music", icon: Music, label: "Music" },
  { id: "Game", icon: Gamepad2, label: "Game" },
];

export default function MediaTab({ showToast }: Props) {
  const [activeTvInput, setActiveTvInput] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [volume, setVolume] = useState(20);
  const [volumeLoading, setVolumeLoading] = useState(false);

  async function changeVolume(delta: number) {
    const newVol = Math.max(0, Math.min(100, volume + delta));
    setVolume(newVol);
    setVolumeLoading(true);
    try {
      await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "volume", value: String(newVol) }),
      });
    } catch { /* silent */ }
    finally { setVolumeLoading(false); }
  }

  async function setVolumeDirectly(val: number) {
    setVolume(val);
    setVolumeLoading(true);
    try {
      await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "volume", value: String(val) }),
      });
    } catch { /* silent */ }
    finally { setVolumeLoading(false); }
  }

  async function apiCall(action: string, value: string, label: string) {
    setLoading(`${action}-${value}`);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      });
      if (res.ok) {
        showToast(label);
        if (action === "tv_input") setActiveTvInput(value);
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

  return (
    <div className="space-y-6">
      {/* TV Input */}
      <section>
        <p className="section-label">TV Input</p>
        <div className="grid grid-cols-4 gap-2">
          {TV_INPUTS.map((input) => {
            const active = activeTvInput === input.id;
            const isLoading = loading === `tv_input-${input.id}`;
            return (
              <motion.button
                key={input.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => apiCall("tv_input", input.id, `TV → ${input.label}`)}
                disabled={loading !== null}
                className={`card-interactive p-3 flex flex-col items-center gap-2 ${
                  active ? "card-active" : ""
                } ${isLoading ? "animate-pulse" : ""}`}
              >
                <input.icon size={18} className={active ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"} />
                <span className="text-[10px] font-medium">{input.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Volume */}
      <section>
        <p className="section-label">Volume</p>
        <div className="card p-4 flex items-center gap-4">
          <button
            onClick={() => changeVolume(-5)}
            disabled={volumeLoading}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center hover:bg-[var(--color-surface-3)] transition-colors"
          >
            <Minus size={16} className="text-[var(--color-text-secondary)]" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <Volume2 size={16} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(e) => setVolumeDirectly(parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${volume}%, var(--color-surface-3) ${volume}%, var(--color-surface-3) 100%)`,
              }}
            />
            <span className="text-xs text-[var(--color-text-secondary)] w-8 text-right font-mono">{volume}</span>
          </div>
          <button
            onClick={() => changeVolume(5)}
            disabled={volumeLoading}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center hover:bg-[var(--color-surface-3)] transition-colors"
          >
            <Plus size={16} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </section>

      {/* PC Gaming */}
      <section>
        <p className="section-label">PC Gaming</p>
        <button
          onClick={() => apiCall("pc_switch", "aitor", "PC → TV via Moonlight")}
          disabled={loading !== null}
          className="card-interactive p-4 w-full flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center">
            <Monitor size={18} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Stream PC to TV</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">Via Moonlight. Games, desktop, whatever you want.</p>
          </div>
        </button>
      </section>

      {/* Apps */}
      <section>
        <p className="section-label">Apps</p>
        <div className="grid grid-cols-4 gap-2">
          {TV_APPS.map((app) => {
            const isLoading = loading === `tv_app-${app.id}`;
            return (
              <motion.button
                key={app.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => apiCall("tv_app", app.id, `Launched ${app.label}`)}
                disabled={loading !== null}
                className={`card-interactive p-3 flex flex-col items-center gap-2 ${
                  isLoading ? "animate-pulse" : ""
                }`}
              >
                <app.icon size={16} className="text-[var(--color-text-secondary)]" />
                <span className="text-[10px] font-medium">{app.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Hue Sync */}
      <section>
        <p className="section-label">Hue Light Sync</p>
        <p className="text-xs text-[var(--color-text-tertiary)] -mt-1 mb-3">Syncs our room lights with whatever is on the TV</p>

        {/* Sync on/off + mode */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => apiCall("sync_power", "on", "Light sync on")}
              disabled={loading !== null}
              className={`card-interactive p-3 flex items-center justify-center gap-2 ${
                loading === "sync_power-on" ? "animate-pulse" : ""
              }`}
            >
              <Power size={14} className="text-[var(--color-success)]" />
              <span className="text-sm font-medium">Sync On</span>
            </button>
            <button
              onClick={() => apiCall("sync_power", "off", "Light sync off")}
              disabled={loading !== null}
              className={`card-interactive p-3 flex items-center justify-center gap-2 ${
                loading === "sync_power-off" ? "animate-pulse" : ""
              }`}
            >
              <Power size={14} className="text-[var(--color-text-tertiary)]" />
              <span className="text-sm font-medium">Sync Off</span>
            </button>
          </div>

          {/* Entertainment area */}
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1.5">Which lights sync</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => apiCall("sync_area", "Only TV", "Sync: TV lights only")}
                disabled={loading !== null}
                className={`card-interactive p-3 flex items-center justify-center gap-2 ${
                  loading === "sync_area-Only TV" ? "animate-pulse" : ""
                }`}
              >
                <Tv size={14} className="text-[var(--color-text-secondary)]" />
                <span className="text-sm font-medium">TV only</span>
              </button>
              <button
                onClick={() => apiCall("sync_area", "Living Room", "Sync: all living room lights")}
                disabled={loading !== null}
                className={`card-interactive p-3 flex items-center justify-center gap-2 ${
                  loading === "sync_area-Living Room" ? "animate-pulse" : ""
                }`}
              >
                <Sofa size={14} className="text-[var(--color-text-secondary)]" />
                <span className="text-sm font-medium">Whole room</span>
              </button>
            </div>
          </div>

          {/* Sync mode */}
          <div className="grid grid-cols-4 gap-2">
            {SYNC_MODES.filter(m => m.id !== "Off").map((mode) => {
              const isLoading = loading === `sync_mode-${mode.id}`;
              return (
                <button
                  key={mode.id}
                  onClick={() => apiCall("sync_mode", mode.id, `Sync: ${mode.label}`)}
                  disabled={loading !== null}
                  className={`card-interactive p-3 flex flex-col items-center gap-1.5 ${
                    isLoading ? "animate-pulse" : ""
                  }`}
                >
                  <mode.icon size={14} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[10px] font-medium">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Intensity */}
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1.5">Intensity</p>
            <div className="grid grid-cols-4 gap-2">
              {["subtle", "moderate", "high", "intense"].map((level) => (
                <button
                  key={level}
                  onClick={() => apiCall("sync_intensity", level, `Intensity: ${level}`)}
                  disabled={loading !== null}
                  className={`card-interactive py-2 px-2 text-center ${
                    loading === `sync_intensity-${level}` ? "animate-pulse" : ""
                  }`}
                >
                  <span className="text-xs font-medium capitalize">{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div className="card p-4">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Sync brightness</p>
            <div className="flex items-center gap-3">
              <Lightbulb size={14} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                defaultValue={54}
                onChange={(e) => apiCall("sync_brightness", e.target.value, `Sync brightness: ${e.target.value}`)}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) 27%, var(--color-surface-3) 27%, var(--color-surface-3) 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
