const doorUnlockTimestamps = new Map<number, number>();

export function checkDoorRateLimit(guestId: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const lastUnlock = doorUnlockTimestamps.get(guestId) || 0;
  const cooldownMs = 30_000; // 30 seconds between door unlocks

  if (now - lastUnlock < cooldownMs) {
    return { allowed: false, retryAfterMs: cooldownMs - (now - lastUnlock) };
  }

  doorUnlockTimestamps.set(guestId, now);
  return { allowed: true, retryAfterMs: 0 };
}

const announceCooldowns = new Map<number, number>();

export function checkAnnouncementRateLimit(guestId: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const last = announceCooldowns.get(guestId) || 0;
  const cooldownMs = 60_000; // 1 minute between announcements

  if (now - last < cooldownMs) {
    return { allowed: false, retryAfterMs: cooldownMs - (now - last) };
  }

  announceCooldowns.set(guestId, now);
  return { allowed: true, retryAfterMs: 0 };
}
