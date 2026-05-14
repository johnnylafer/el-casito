"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Volume2, Heart, DoorOpen, Lightbulb, MessageSquare, MapPin, ArrowRight, Check, ChevronRight } from "lucide-react";
import Logo from "@/components/Logo";

export default function OnboardingPage() {
  const [guestName, setGuestName] = useState("");
  const [agreed, setAgreed] = useState([false, false]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0 = welcome, 1 = how it works, 2 = rules, 3 = done
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/");
          return;
        }
        setGuestName(data.guest.name);
        if (!data.guest.needsOnboarding) router.push("/dashboard");
      })
      .catch(() => router.push("/"));
  }, [router]);

  async function handleAgree() {
    if (!agreed[0] || !agreed[1]) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/agree", { method: "POST" });
      if (res.ok) {
        setStep(3);
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  const howItWorks = [
    { icon: DoorOpen, title: "Doors", desc: "You can unlock our street door and apartment door right from this app. No keys needed!" },
    { icon: MapPin, title: "Check in & out", desc: "Please always tap \"I'm here\" when you arrive and \"I'm leaving\" when you go, even if you're alone. It helps us know who's at the apartment." },
    { icon: Lightbulb, title: "Lights & Scenes", desc: "Switch the vibes in each room. We set up a bunch of presets for you: party, chill, movie night, and more." },
    { icon: MessageSquare, title: "Chat & Announce", desc: "Send messages to everyone or blast announcements on our speakers. Yes, really." },
  ];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              >
                <div className="flex justify-center">
                  <Logo size="lg" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <h1 className="text-3xl font-bold tracking-tight">
                  Hey, {guestName}!
                </h1>
                <p className="text-[var(--color-text-secondary)] leading-relaxed max-w-xs mx-auto">
                  Welcome to our place for Pride weekend!
                  Quick setup, takes 30 seconds, we promise.
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setStep(1)}
                className="btn-primary inline-flex items-center gap-2"
              >
                Let&apos;s go <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 1: How It Works */}
          {step === 1 && (
            <motion.div
              key="how"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              <div className="text-center mb-2">
                <p className="section-label">How it works</p>
                <h2 className="text-2xl font-bold">Your apartment remote</h2>
              </div>

              <div className="space-y-3">
                {howItWorks.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="card p-4 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-soft)] flex items-center justify-center flex-shrink-0">
                      <item.icon size={20} className="text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-[var(--color-text-secondary)] text-sm mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Got it <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* Step 2: Rules */}
          {step === 2 && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-5"
            >
              <div className="text-center mb-2">
                <p className="section-label">Almost done</p>
                <h2 className="text-2xl font-bold">Two ground rules</h2>
                <p className="text-[var(--color-text-tertiary)] text-sm mt-1">Tick both to continue</p>
              </div>

              {/* Rule 1: Volume */}
              <label
                className={`card p-4 flex gap-4 cursor-pointer transition-all duration-150 ${
                  agreed[0] ? "card-active" : "card-interactive"
                }`}
              >
                <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  agreed[0]
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                    : "border-[var(--color-text-tertiary)]"
                }`}>
                  {agreed[0] && <Check size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={agreed[0]}
                  onChange={(e) => setAgreed([e.target.checked, agreed[1]])}
                  className="sr-only"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 size={16} className="text-[var(--color-accent)]" />
                    <p className="font-semibold text-sm">Keep it down</p>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    Really watch your volume inside, and be <span className="text-[var(--color-text)]">especially quiet</span> in
                    the hallways. Our neighbors are super picky and will complain.
                  </p>
                </div>
              </label>

              {/* Rule 2: PG */}
              <label
                className={`card p-4 flex gap-4 cursor-pointer transition-all duration-150 ${
                  agreed[1] ? "card-active" : "card-interactive"
                }`}
              >
                <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  agreed[1]
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                    : "border-[var(--color-text-tertiary)]"
                }`}>
                  {agreed[1] && <Check size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={agreed[1]}
                  onChange={(e) => setAgreed([agreed[0], e.target.checked])}
                  className="sr-only"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart size={16} className="text-[var(--color-accent)]" />
                    <p className="font-semibold text-sm">Keep it PG</p>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    No horny stuff in the apartment, unless Fen & Kura are there ;P
                    <span className="text-[var(--color-text-tertiary)] text-xs block mt-1 italic">
                      You know who you are.
                    </span>
                  </p>
                </div>
              </label>

              <button
                onClick={handleAgree}
                disabled={!agreed[0] || !agreed[1] || loading}
                className="btn-primary w-full"
              >
                {loading ? "Setting up..." : "I promise to behave (mostly)"}
              </button>
            </motion.div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-[var(--color-success-soft)] flex items-center justify-center mx-auto"
              >
                <Check size={32} className="text-[var(--color-success)]" />
              </motion.div>
              <h2 className="text-2xl font-bold">You&apos;re in, {guestName}!</h2>
              <p className="text-[var(--color-text-secondary)]">Loading your dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
