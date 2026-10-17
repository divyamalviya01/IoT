/**
 * Lab L07: a simulated IoT device with a small REST API over HTTP/1.1.
 * Requests and responses are built as real HTTP text so byte counts are exact.
 */

export type Method = "GET" | "POST" | "PUT" | "DELETE";
export const METHODS: Method[] = ["GET", "POST", "PUT", "DELETE"];

export interface Request {
  method: Method;
  path: string;
  body?: string;
  /** Adds "Authorization: Bearer <token>" */
  token?: string;
}

export interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export const LAB_TOKEN = "lab-token";
export const HOST = "device.local";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  405: "Method Not Allowed",
};

/** Paths students can try, with what each supports. */
export const ROUTES: { path: string; allow: Method[]; describe: string }[] = [
  { path: "/sensors", allow: ["GET"], describe: "List the device's sensors" },
  { path: "/sensors/temperature", allow: ["GET"], describe: "Current temperature" },
  { path: "/sensors/humidity", allow: ["GET"], describe: "Current humidity" },
  { path: "/actuators/led", allow: ["GET", "PUT"], describe: "Read or set the LED" },
  { path: "/readings", allow: ["GET", "POST"], describe: "Stored readings; POST adds one" },
];

export interface DeviceState {
  temperature: number;
  humidity: number;
  led: "on" | "off";
  readings: { id: number; value: number }[];
  requireAuth: boolean;
}

export function initialState(): DeviceState {
  return { temperature: 28.5, humidity: 62, led: "off", readings: [], requireAuth: false };
}

const utf8 = (s: string) => new TextEncoder().encode(s).length;

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  const text = JSON.stringify(body);
  return {
    status,
    statusText: STATUS_TEXT[status],
    headers: { "Content-Type": "application/json", "Content-Length": String(utf8(text)), ...extra },
    body: text,
  };
}

/** Handles one request, returning the response and the device's new state. */
export function handle(state: DeviceState, req: Request): { res: Response; state: DeviceState } {
  const path = req.path.replace(/\/+$/, "") || "/";

  if (state.requireAuth && req.token !== LAB_TOKEN) {
    return {
      res: json(401, { error: "Missing or wrong token" }, { "WWW-Authenticate": "Bearer" }),
      state,
    };
  }

  const route = ROUTES.find((r) => r.path === path);
  if (!route) return { res: json(404, { error: `No resource at ${path}` }), state };
  if (!route.allow.includes(req.method)) {
    return { res: json(405, { error: `${req.method} is not allowed on ${path}` }, { Allow: route.allow.join(", ") }), state };
  }

  switch (`${req.method} ${path}`) {
    case "GET /sensors":
      return { res: json(200, ["temperature", "humidity"]), state };
    case "GET /sensors/temperature":
      return { res: json(200, { value: state.temperature, unit: "C" }), state };
    case "GET /sensors/humidity":
      return { res: json(200, { value: state.humidity, unit: "%" }), state };
    case "GET /actuators/led":
      return { res: json(200, { state: state.led }), state };
    case "GET /readings":
      return { res: json(200, state.readings), state };
    case "PUT /actuators/led": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(req.body ?? "");
      } catch {
        return { res: json(400, { error: "The body is not valid JSON" }), state };
      }
      const s = (parsed as { state?: unknown })?.state;
      if (s !== "on" && s !== "off") {
        return { res: json(400, { error: 'Use {"state":"on"} or {"state":"off"}' }), state };
      }
      const next = { ...state, led: s as "on" | "off" };
      return { res: json(200, { state: next.led }), state: next };
    }
    case "POST /readings": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(req.body ?? "");
      } catch {
        return { res: json(400, { error: "The body is not valid JSON" }), state };
      }
      const value = (parsed as { value?: unknown })?.value;
      if (typeof value !== "number") {
        return { res: json(400, { error: 'Send a number, for example {"value":27.9}' }), state };
      }
      const id = state.readings.length + 1;
      const next = { ...state, readings: [...state.readings, { id, value }] };
      return { res: json(201, { id, value }, { Location: `/readings/${id}` }), state: next };
    }
  }
  return { res: json(404, { error: `No resource at ${path}` }), state };
}

/* ------------------------------------------------------------------ */
/* Wire format                                                         */
/* ------------------------------------------------------------------ */

export function requestText(req: Request): string {
  const lines = [`${req.method} ${req.path} HTTP/1.1`, `Host: ${HOST}`, "Accept: application/json"];
  if (req.token) lines.push(`Authorization: Bearer ${req.token}`);
  const hasBody = req.method === "PUT" || req.method === "POST";
  if (hasBody) {
    lines.push("Content-Type: application/json", `Content-Length: ${utf8(req.body ?? "")}`);
  }
  return `${lines.join("\r\n")}\r\n\r\n${hasBody ? (req.body ?? "") : ""}`;
}

export function responseText(res: Response): string {
  const lines = [`HTTP/1.1 ${res.status} ${res.statusText}`, ...Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`)];
  return `${lines.join("\r\n")}\r\n\r\n${res.body}`;
}

export interface Sizes {
  headerBytes: number;
  bodyBytes: number;
  total: number;
  /** Share of the bytes that are headers, 0–100 */
  overheadPct: number;
}

export function sizes(text: string): Sizes {
  const split = text.indexOf("\r\n\r\n");
  const headerBytes = utf8(text.slice(0, split + 4));
  const bodyBytes = utf8(text.slice(split + 4));
  const total = headerBytes + bodyBytes;
  return { headerBytes, bodyBytes, total, overheadPct: total ? Math.round((headerBytes / total) * 100) : 0 };
}
