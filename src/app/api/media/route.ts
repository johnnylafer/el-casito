import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAccessWindowOpen } from "@/lib/auth";
import { setTvInput, setTvApp, switchPcUser, callService } from "@/lib/ha";
import { logActivity } from "@/lib/log";

const TV_INPUTS = ["Off", "AppleTV", "PS4", "Kodi", "Nintendo Switch"];
const TV_APPS = ["Apple Music", "AppleTV+", "Disney+", "Fitness+", "Kodi", "Netflix", "Omni", "Prime Video", "Speedtest", "Youtube"];
const SYNC_MODES = ["Off", "Video", "Music", "Game"];

export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();
    if (!isAccessWindowOpen() && !guest.is_admin) {
      return NextResponse.json({ error: "Access not yet available" }, { status: 403 });
    }

    const { action, value } = await req.json();

    switch (action) {
      case "tv_input": {
        if (!TV_INPUTS.includes(value)) {
          return NextResponse.json({ error: "Invalid TV input" }, { status: 400 });
        }
        await setTvInput(value);
        logActivity(guest.id, guest.name, "set_tv_input", value, "media");
        return NextResponse.json({ success: true });
      }

      case "tv_app": {
        if (!TV_APPS.includes(value)) {
          return NextResponse.json({ error: "Invalid app" }, { status: 400 });
        }
        await setTvApp(value);
        logActivity(guest.id, guest.name, "launched_app", value, "media");
        return NextResponse.json({ success: true });
      }

      case "volume": {
        const vol = Math.max(0, Math.min(100, parseInt(value)));
        if (isNaN(vol)) {
          return NextResponse.json({ error: "Invalid volume" }, { status: 400 });
        }
        await callService({
          domain: "media_player",
          service: "volume_set",
          entity_id: "media_player.192_168_1_195",
          data: { volume_level: vol / 100 },
        });
        logActivity(guest.id, guest.name, "set_volume", `${vol}%`, "media");
        return NextResponse.json({ success: true });
      }

      case "pc_switch": {
        // Only allow switching to Aitor (with Moonlight)
        if (value !== "aitor") {
          return NextResponse.json({ error: "Not allowed" }, { status: 403 });
        }
        await switchPcUser("aitor");
        // Also trigger Moonlight TV input
        await callService({
          domain: "script",
          service: "turn_on",
          entity_id: "script.tv_input_moonlight",
        });
        logActivity(guest.id, guest.name, "switched_pc", `PC -> ${value} (Moonlight)`, "media");
        return NextResponse.json({ success: true });
      }

      case "sync_mode": {
        if (!SYNC_MODES.includes(value)) {
          return NextResponse.json({ error: "Invalid sync mode" }, { status: 400 });
        }
        await callService({
          domain: "select",
          service: "select_option",
          entity_id: "select.light_sync_box_udr_device_sync_mode",
          data: { option: value },
        });
        logActivity(guest.id, guest.name, "set_sync_mode", value, "media");
        return NextResponse.json({ success: true });
      }

      case "sync_power": {
        const on = value === "on";
        await callService({
          domain: "switch",
          service: on ? "turn_on" : "turn_off",
          entity_id: "switch.light_sync_box_udr_device_light_sync",
        });
        logActivity(guest.id, guest.name, "set_sync_power", on ? "on" : "off", "media");
        return NextResponse.json({ success: true });
      }

      case "sync_intensity": {
        const validIntensities = ["subtle", "moderate", "high", "intense"];
        if (!validIntensities.includes(value)) {
          return NextResponse.json({ error: "Invalid intensity" }, { status: 400 });
        }
        await callService({
          domain: "select",
          service: "select_option",
          entity_id: "select.light_sync_box_udr_device_intensity",
          data: { option: value },
        });
        logActivity(guest.id, guest.name, "set_sync_intensity", value, "media");
        return NextResponse.json({ success: true });
      }

      case "sync_brightness": {
        const brightness = Math.max(0, Math.min(200, parseInt(value)));
        if (isNaN(brightness)) {
          return NextResponse.json({ error: "Invalid brightness" }, { status: 400 });
        }
        await callService({
          domain: "number",
          service: "set_value",
          entity_id: "number.light_sync_box_udr_device_brightness",
          data: { value: brightness },
        });
        logActivity(guest.id, guest.name, "set_sync_brightness", `${brightness}%`, "media");
        return NextResponse.json({ success: true });
      }

      case "sync_area": {
        const validAreas = ["Only TV", "Living Room"];
        if (!validAreas.includes(value)) {
          return NextResponse.json({ error: "Invalid area" }, { status: 400 });
        }
        await callService({
          domain: "select",
          service: "select_option",
          entity_id: "select.light_sync_box_udr_device_entertainment_area",
          data: { option: value },
        });
        logActivity(guest.id, guest.name, "set_sync_area", value, "media");
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Media control failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    tvInputs: TV_INPUTS,
    tvApps: TV_APPS,
    syncModes: SYNC_MODES,
  });
}
