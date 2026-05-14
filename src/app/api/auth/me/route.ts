import { NextResponse } from "next/server";
import { getSession, getAccessWindowInfo, needsOnboarding } from "@/lib/auth";
import { seedGuests } from "@/db/schema";

export async function GET() {
  seedGuests();

  const guest = await getSession();
  if (!guest) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { open, start, end } = getAccessWindowInfo();

  return NextResponse.json({
    authenticated: true,
    guest: {
      id: guest.id,
      name: guest.name,
      isAdmin: !!guest.is_admin,
      agreedAt: guest.agreed_at,
      needsOnboarding: needsOnboarding(guest),
    },
    accessOpen: open,
    accessStart: start.toISOString(),
    accessEnd: end.toISOString(),
  });
}
