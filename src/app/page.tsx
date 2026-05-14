"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.push(data.guest.needsOnboarding ? "/onboarding" : "/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.guest.needsOnboarding ? "/onboarding" : "/dashboard");
      }, 600);
    } catch {
      setError("Something went wrong. Try again?");
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-3">
            Fen & Kura&apos;s apartment &middot; Guest Portal
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="section-label flex items-center gap-1.5"
              >
                <KeyRound size={12} />
                Invite Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RICK-THICC-DUCK-9X"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="input font-mono tracking-wider text-sm"
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[var(--color-danger)] text-sm"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || success || !code.trim()}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${
                success ? "!bg-[var(--color-success)] !opacity-100" : ""
              }`}
            >
              {success ? (
                "Welcome!"
              ) : loading ? (
                "Checking..."
              ) : (
                <>
                  Enter <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[var(--color-text-tertiary)] text-xs mt-8">
          Don&apos;t have a code? Ask Fen or Kura.
        </p>
      </motion.div>
    </div>
  );
}
