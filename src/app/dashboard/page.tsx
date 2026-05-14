"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Home, Lightbulb, Tv, MessageCircle, LogOut, Shield } from "lucide-react";
import SnakeGame from "@/components/SnakeGame";
import Logo from "@/components/Logo";
import HomeTab from "@/components/tabs/HomeTab";
import RoomsTab from "@/components/tabs/RoomsTab";
import MediaTab from "@/components/tabs/MediaTab";
import FeedTab from "@/components/tabs/FeedTab";
import AdminTab from "@/components/tabs/AdminTab";

type Tab = "home" | "rooms" | "media" | "feed" | "admin";

interface Guest {
  id: number;
  name: string;
  isAdmin: boolean;
  familyFriendly: boolean;
}

const TABS: { id: Tab; label: string; icon: typeof Home; adminOnly?: boolean }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "rooms", label: "Rooms", icon: Lightbulb },
  { id: "media", label: "Media", icon: Tv },
  { id: "feed", label: "Feed", icon: MessageCircle },
  { id: "admin", label: "Admin", icon: Shield, adminOnly: true },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [accessOpen, setAccessOpen] = useState(true);
  const [accessStart, setAccessStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) return router.push("/");
        if (data.guest.needsOnboarding) return router.push("/onboarding");
        setGuest(data.guest);
        setAccessOpen(data.accessOpen);
        setAccessStart(data.accessStart);
        setLoading(false);
        // Show welcome animation on first visit
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 2000);
      })
      .catch(() => router.push("/"));
  }, [router]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  if (loading) return null;

  // Welcome animation
  if (showWelcome && guest) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="text-center"
        >
          <Logo size="md" />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold mt-6"
          >
            Welcome, {guest.name}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Access not open yet - countdown + snake game
  if (!accessOpen && !guest?.isAdmin) {
    return <WaitingScreen accessStart={accessStart} guestName={guest?.name || ""} />;
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20"
                : "bg-red-500/10 text-[var(--color-danger)] border border-red-500/20"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top banner */}
      <header className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            {guest?.name}
            <LogOut size={12} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-5 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "home" && guest && <HomeTab guest={guest} showToast={showToast} />}
            {activeTab === "rooms" && guest && <RoomsTab guest={guest} showToast={showToast} />}
            {activeTab === "media" && guest && <MediaTab guest={guest} showToast={showToast} />}
            {activeTab === "feed" && guest && <FeedTab guest={guest} showToast={showToast} />}
            {activeTab === "admin" && guest?.isAdmin && <AdminTab guest={guest} showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)]" style={{ background: "var(--color-surface-0)" }}>
        <div className="max-w-lg mx-auto flex items-center pb-safe">
          {TABS.filter(t => !t.adminOnly || guest?.isAdmin).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  active ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
                }`}
              >
                <tab.icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function WaitingScreen({ accessStart, guestName }: { accessStart: string | null; guestName: string }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!accessStart) return;
    const target = new Date(accessStart).getTime();

    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
      if (diff <= 0) window.location.reload();
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [accessStart]);

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-12">
      <Logo size="md" />

      <div className="mt-8 text-center">
        <h1 className="text-xl font-bold">Hey {guestName}, not yet!</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-xs mx-auto">
          El Casito opens Saturday at 10:30. We&apos;re setting everything up for you!
        </p>
      </div>

      {/* Countdown */}
      <div className="mt-8 flex gap-3">
        {[
          { value: countdown.days, label: "days" },
          { value: countdown.hours, label: "hrs" },
          { value: countdown.minutes, label: "min" },
          { value: countdown.seconds, label: "sec" },
        ].map((unit) => (
          <div key={unit.label} className="card p-3 w-16 text-center">
            <p className="text-2xl font-bold tabular-nums">{String(unit.value).padStart(2, "0")}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase">{unit.label}</p>
          </div>
        ))}
      </div>

      {/* Snake game */}
      <div className="mt-10">
        <p className="text-xs text-[var(--color-text-tertiary)] text-center mb-3">
          Meanwhile, here&apos;s a game. You&apos;re welcome.
        </p>
        <SnakeGame />
      </div>
    </div>
  );
}
