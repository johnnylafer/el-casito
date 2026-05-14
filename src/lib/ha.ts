const HA_URL = process.env.HA_URL || "http://192.168.1.77:8123";
const HA_TOKEN = process.env.HA_TOKEN || "";

interface HAServiceCall {
  domain: string;
  service: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export async function callService({ domain, service, entity_id, data }: HAServiceCall) {
  const body: Record<string, unknown> = {};
  if (entity_id) body.entity_id = entity_id;
  if (data) Object.assign(body, data);

  const res = await fetch(`${HA_URL}/api/services/${domain}/${service}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HA API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getState(entityId: string) {
  const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
    headers: { Authorization: `Bearer ${HA_TOKEN}` },
  });
  if (!res.ok) throw new Error(`HA state error ${res.status}`);
  return res.json();
}

export async function getStates(entityIds: string[]) {
  return Promise.all(entityIds.map(getState));
}

// Door controls with rate limiting handled by the API route
export async function unlockDoor(entityId: string) {
  return callService({ domain: "lock", service: "unlock", entity_id: entityId });
}

// Scene control
export async function setScene(selectEntityId: string, scene: string) {
  return callService({
    domain: "input_select",
    service: "select_option",
    entity_id: selectEntityId,
    data: { option: scene },
  });
}

// TV input
export async function setTvInput(input: string) {
  return callService({
    domain: "input_select",
    service: "select_option",
    entity_id: "input_select.tv_input",
    data: { option: input },
  });
}

// TV app
export async function setTvApp(app: string) {
  return callService({
    domain: "input_select",
    service: "select_option",
    entity_id: "input_select.tv_apps",
    data: { option: app },
  });
}

// PC switching
export async function switchPcUser(user: "aitor" | "johnny" | "studio") {
  const buttons: Record<string, string> = {
    aitor: "button.studio_pc_switchtoaitor",
    johnny: "button.studio_pc_switchtojohnny",
    studio: "button.studio_pc_switchtostudio",
  };
  return callService({ domain: "button", service: "press", entity_id: buttons[user] });
}

// TTS announcement
export async function announce(message: string, speaker: string = "media_player.living_room_homepod") {
  return callService({
    domain: "tts",
    service: "speak",
    entity_id: "tts.elevenlabs",
    data: {
      media_player_entity_id: speaker,
      message,
    },
  });
}

// Toggle helpers
export async function toggleBoolean(entityId: string, state: boolean) {
  return callService({
    domain: "input_boolean",
    service: state ? "turn_on" : "turn_off",
    entity_id: entityId,
  });
}

// Light on/off
export async function setLight(entityId: string, on: boolean, brightness?: number) {
  if (!on) {
    return callService({ domain: "light", service: "turn_off", entity_id: entityId });
  }
  const data: Record<string, unknown> = {};
  if (brightness !== undefined) data.brightness_pct = brightness;
  return callService({ domain: "light", service: "turn_on", entity_id: entityId, data });
}
