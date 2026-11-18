// Device login client (OAuth 2.0 Device Authorization Grant, RFC 8628) for the AlgoHash MCP servers.
// The terminal never sees a password: the owner approves on their phone with Face ID.
import { assertSafeEndpoint, AlgoHashError } from "../client.js";

export const DEFAULT_BASE = "https://console.algohash.ai";
export const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export interface DeviceStart {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
  algohash?: { pushed?: boolean; wait_max_ms?: number };
}
export interface ServerToken { access_token: string; endpoint: string; expires_in: number }
export interface TokenSet {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  algohash: {
    grant_id: string;
    account_label: string;
    spend: boolean;
    tokens: Record<string, ServerToken>;
    refresh_expires_in: number;
    login_hint?: string;
  };
}
export type PollState =
  | { status: "waiting" | "opened"; interval: number }
  | { status: "slow_down"; interval: number }
  | { status: "approved"; tokens: TokenSet }
  | { status: "denied" | "expired" };

export function baseUrl(input?: string): string {
  const b = String(input || process.env.ALGOHASH_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
  assertSafeEndpoint(b + "/mcp/device");          // https, or http on loopback only
  return b;
}

async function post(url: string, body: Record<string, unknown>, timeoutMs: number, signal?: AbortSignal): Promise<{ status: number; json: any; retryAfter?: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error("timeout")), timeoutMs);
  signal?.addEventListener("abort", () => ctl.abort(signal.reason), { once: true });
  try {
    const res = await fetch(url, {
      method: "POST", signal: ctl.signal, redirect: "error", credentials: "omit",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: res.status, json, retryAfter: Number(res.headers.get("retry-after")) || undefined };
  } catch (e: any) {
    if (signal?.aborted) throw e;
    throw new AlgoHashError(`cannot reach ${new URL(url).host}: ${e?.cause?.code || e?.message || e}`, { code: "network_error" });
  } finally {
    clearTimeout(timer);
  }
}

/** Ask the server for a device code and a short user code. */
export async function startDevice(base: string, o: { clientName: string; machine: string; platform: string; resources?: string[]; loginHint?: string }): Promise<DeviceStart> {
  const r = await post(base + "/mcp/device/authorize", {
    client_name: o.clientName, machine: o.machine, platform: o.platform,
    ...(o.resources?.length ? { resources: o.resources } : {}), ...(o.loginHint ? { login_hint: o.loginHint } : {}),
  }, 20_000);
  if (r.status === 429) throw new AlgoHashError("too many login requests from this address; wait a minute and try again", { code: "rate_limited", httpStatus: 429, retryAfterSec: r.retryAfter });
  if (r.status === 404) throw new AlgoHashError("this server does not offer terminal login", { code: "not_supported", httpStatus: 404 });
  if (r.status !== 200 || !r.json?.device_code || !r.json?.user_code) {
    throw new AlgoHashError(r.json?.error_description || r.json?.error || `HTTP ${r.status}`, { code: r.json?.error || `http_${r.status}`, httpStatus: r.status });
  }
  const d = r.json as DeviceStart;
  // Only ever show a link on the server we asked: never a link to somewhere else.
  for (const k of ["verification_uri", "verification_uri_complete"] as const) {
    if (typeof d[k] !== "string" || new URL(d[k]).origin !== new URL(base).origin) throw new AlgoHashError("the server sent a verification link on another origin", { code: "bad_response" });
  }
  return d;
}

/**
 * One poll. With `waitMs` the server holds the request until the phone does something,
 * so the terminal reacts the moment the owner opens or approves.
 */
export async function pollDevice(base: string, deviceCode: string, o: { waitMs?: number; seen?: string; signal?: AbortSignal } = {}): Promise<PollState> {
  const waitMs = Math.max(0, Math.min(25_000, o.waitMs ?? 0));
  const r = await post(base + "/mcp/device/token", { grant_type: DEVICE_GRANT, device_code: deviceCode, ...(waitMs ? { wait_ms: waitMs, seen: o.seen || "" } : {}) }, waitMs + 15_000, o.signal);
  if (r.status === 200 && r.json?.access_token && r.json?.algohash?.tokens) return { status: "approved", tokens: r.json as TokenSet };
  const err = r.json?.error;
  if (err === "authorization_pending") return { status: r.json.algohash_status === "opened" ? "opened" : "waiting", interval: Number(r.json.interval) || 2 };
  if (err === "slow_down") return { status: "slow_down", interval: Number(r.json.interval) || r.retryAfter || 5 };
  if (err === "access_denied") return { status: "denied" };
  if (err === "expired_token") return { status: "expired" };
  throw new AlgoHashError(r.json?.error_description || err || `HTTP ${r.status}`, { code: err || `http_${r.status}`, httpStatus: r.status });
}

/** Swap the refresh token for fresh access tokens. The old refresh token stops working at once. */
export async function refreshTokens(base: string, refreshToken: string): Promise<TokenSet> {
  const r = await post(base + "/mcp/device/token", { grant_type: "refresh_token", refresh_token: refreshToken }, 20_000);
  if (r.status === 200 && r.json?.access_token) return r.json as TokenSet;
  throw new AlgoHashError(r.json?.error_description || r.json?.error || `HTTP ${r.status}`, { code: r.json?.error || `http_${r.status}`, httpStatus: r.status });
}

/** Disconnect this terminal on the server. Never throws on an unknown token. */
export async function revokeTokens(base: string, refreshToken: string): Promise<void> {
  await post(base + "/mcp/device/revoke", { token: refreshToken }, 20_000);
}
