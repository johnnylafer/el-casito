import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAccessWindowOpen } from "@/lib/auth";
import { setScene, toggleBoolean, setLight, callService } from "@/lib/ha";
import { logActivity } from "@/lib/log";

const SCENE_SELECTORS: Record<string, { entityId: string; options: string[] }> = {
  living_room: {
    entityId: "input_select.living_room_scene",
    options: ["Off", "Morning", "Day", "Evening", "Movie Night", "Dining", "Party", "Cleaning", "Tropical", "Ocean", "City", "LoFi", "Vaporwave", "Fred", "Jazz Night", "Sexy"],
  },
  bedroom: {
    entityId: "input_select.bedroom_scene",
    options: ["Off", "Morning", "Evening", "Reading", "Bedtime", "Sunrise Wake", "Cosmos", "Forest", "Ocean", "Sleep"],
  },
  kitchen: {
    entityId: "input_select.kitchen_scene",
    options: ["Off", "Morning", "Evening", "Cooking", "Cleaning", "Ambient"],
  },
  bathroom: {
    entityId: "input_select.bathroom_scene",
    options: ["Off", "Orange Medium", "White Bright", "Shower Mode", "Colorful", "LoFi", "Ocean", "Evening"],
  },
  office: {
    entityId: "input_select.office_scene",
    options: ["Off", "Focus Work", "Meeting", "Evening", "Nanoleaf Alert", "Colourful", "Nanoleaf Colourful", "Lofi", "Chill House"],
  },
};

const MODE_TOGGLES: Record<string, string> = {
  party_mode: "input_boolean.party_mode",
  guest_mode: "input_boolean.guest_mode",
};

export async function POST(req: NextRequest) {
  try {
    const guest = await requireAuth();
    if (!isAccessWindowOpen() && !guest.is_admin) {
      return NextResponse.json({ error: "Access not yet available" }, { status: 403 });
    }

    const body = await req.json();
    const { action, room, scene, mode, state } = body;

    if (action === "scene") {
      const selector = SCENE_SELECTORS[room];
      if (!selector) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
      if (!selector.options.includes(scene)) {
        return NextResponse.json({ error: "Invalid scene" }, { status: 400 });
      }
      await setScene(selector.entityId, scene);
      logActivity(guest.id, guest.name, "set_scene", `${room} -> ${scene}`, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "mode") {
      const entityId = MODE_TOGGLES[mode];
      if (!entityId) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      await toggleBoolean(entityId, state);
      logActivity(guest.id, guest.name, "toggle_mode", `${mode} -> ${state ? "on" : "off"}`, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "quick") {
      const { preset } = body;
      const presets: Record<string, () => Promise<void>> = {
        all_on: async () => { await setLight("light.all_house_lights", true); },
        all_off: async () => { await setLight("light.all_house_lights", false); },
        upstairs_on: async () => { await setLight("light.upstairs_lights", true); },
        upstairs_off: async () => { await setLight("light.upstairs_lights", false); },
        downstairs_on: async () => { await setLight("light.downstairs_lights", true); },
        downstairs_off: async () => { await setLight("light.downstairs_lights", false); },
        movie: async () => { await setScene("input_select.living_room_scene", "Movie Night"); },
        ocean: async () => { await setScene("input_select.living_room_scene", "Ocean"); },
        tropical: async () => { await setScene("input_select.living_room_scene", "Tropical"); },
      };
      const fn = presets[preset];
      if (!fn) return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
      await fn();
      logActivity(guest.id, guest.name, "quick_preset", preset, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "toilet_color") {
      const { color } = body;
      if (!color || typeof color !== "string") {
        return NextResponse.json({ error: "Invalid color" }, { status: 400 });
      }
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const entities = ["light.wcu_r", "light.wcu_f"];
      for (const eid of entities) {
        await callService({
          domain: "light",
          service: "turn_on",
          entity_id: eid,
          data: { rgb_color: [r, g, b], brightness: 255 },
        });
      }
      logActivity(guest.id, guest.name, "set_toilet_color", color, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "toilet_effect") {
      const { effect: effectName } = body;
      const validEffects = ["off", "candle", "fire", "prism", "sparkle", "opal", "glisten", "underwater", "cosmos", "sunbeam", "enchant", "sunrise", "sunset"];
      const eff = effectName || scene;
      if (!eff || !validEffects.includes(eff)) {
        return NextResponse.json({ error: "Invalid effect" }, { status: 400 });
      }
      // Turn on first, then apply effect — some lights need to be on before effects work
      const entities = ["light.wcu_r", "light.wcu_f"];
      for (const eid of entities) {
        await callService({
          domain: "light",
          service: "turn_on",
          entity_id: eid,
          data: { brightness: 255 },
        });
      }
      // Small delay to let lights turn on
      await new Promise((r) => setTimeout(r, 300));
      for (const eid of entities) {
        await callService({
          domain: "light",
          service: "turn_on",
          entity_id: eid,
          data: { effect: eff },
        });
      }
      logActivity(guest.id, guest.name, "set_toilet_effect", scene, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "room_color") {
      const { color: roomColor, target } = body;
      const targets: Record<string, string> = {
        living_room: "light.living_room",
        kitchen: "light.kitchen",
      };
      const entityId = targets[target];
      if (!entityId || !roomColor) {
        return NextResponse.json({ error: "Invalid target or color" }, { status: 400 });
      }
      const r = parseInt(roomColor.slice(1, 3), 16);
      const g = parseInt(roomColor.slice(3, 5), 16);
      const b = parseInt(roomColor.slice(5, 7), 16);
      await callService({
        domain: "light",
        service: "turn_on",
        entity_id: entityId,
        data: { rgb_color: [r, g, b], brightness: 255 },
      });
      logActivity(guest.id, guest.name, "set_room_color", `${target} -> ${roomColor}`, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "room_effect") {
      const { effect: roomEffect, target } = body;
      const validEffects = ["off", "candle", "fire", "prism", "sparkle", "opal", "glisten", "underwater", "cosmos", "sunbeam", "enchant", "sunrise", "sunset"];
      // Target individual lights in the room (group entities don't support effects)
      const targetLights: Record<string, string[]> = {
        living_room: ["light.lr_rm", "light.lr_mf", "light.lr_rr", "light.lr_rf", "light.lr_lm", "light.lr_lr", "light.lr_mr", "light.lr_lf", "light.lr_mm", "light.corner", "light.tv_light"],
        kitchen: ["light.kitchen"],
      };
      const lights = targetLights[target];
      if (!lights || !roomEffect || !validEffects.includes(roomEffect)) {
        return NextResponse.json({ error: "Invalid target or effect" }, { status: 400 });
      }
      for (const eid of lights) {
        await callService({
          domain: "light",
          service: "turn_on",
          entity_id: eid,
          data: { effect: roomEffect },
        });
      }
      logActivity(guest.id, guest.name, "set_room_effect", `${target} -> ${roomEffect}`, "scene");
      return NextResponse.json({ success: true });
    }

    if (action === "toilet_off") {
      await setLight("light.toilet_lights", false);
      logActivity(guest.id, guest.name, "toilet_lights_off", null, "scene");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Onboarding required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to control lights" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    rooms: Object.entries(SCENE_SELECTORS).map(([key, val]) => ({
      id: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      scenes: val.options,
    })),
    modes: Object.keys(MODE_TOGGLES),
  });
}
