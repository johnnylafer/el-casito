import { NextRequest, NextResponse } from "next/server";
import { loginWithCode, isAccessWindowOpen, getAccessWindowInfo, needsOnboarding } from "@/lib/auth";
import { logActivity } from "@/lib/log";
import { seedGuests } from "@/db/schema";

export async function POST(req: NextRequest) {
  seedGuests(); // Ensure guests exist on first request

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const result = loginWithCode(code);
  if (!result) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
  }

  const { open, start } = getAccessWindowInfo();
  const showOnboarding = needsOnboarding(result.guest);

  logActivity(result.guest.id, result.guest.name, "logged_in", null, "auth");

  const response = NextResponse.json({
    success: true,
    guest: {
      id: result.guest.id,
      name: result.guest.name,
      isAdmin: !!result.guest.is_admin,
      agreedAt: result.guest.agreed_at,
      needsOnboarding: showOnboarding,
    },
    accessOpen: open,
    accessStart: start.toISOString(),
  });

  response.cookies.set("casito_session", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 72, // 72 hours
    path: "/",
  });

  return response;
}
