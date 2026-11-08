// Core MCP client: transport, result parsing, scope preflight, approval loop.
// Zero runtime dependencies — uses the platform `fetch` (Node 18+, Deno, Bun, browsers).

export type Params = Record<string, unknown>;
export type ResultStatus =
  | "ok"
  | "needs_confirmation"
  | "needs_permission"
  | "needs_storyboard"
  | "needs_cast"
  | "awaiting_approval"
  | "declined"
  | "error";

export interface ClientOptions {
  /** "studio" | "team" | "open" — used for scope tables and the approval tool name. */
  server: string;
  /** Full MCP endpoint URL. The typed clients fill this in for you. */
  endpoint: string;
  /** Static key (smk_… for Studio, tmk_… for Team, an Open API key for open). */
  apiKey?: string;
  /** OAuth 2.1 access token. Used instead of apiKey when set. */
  accessToken?: string;
  /** Scopes this key was issued with. When set, calls that need more are refused locally. */
  keyScopes?: string[];
  /** Protocol version to ask for. Default "2025-11-25" (needed for structuredContent). */
  protocolVersion?: string;
  clientInfo?: { name: string; version: string };
  /** Per-request timeout in ms. Default 120000. */
  timeoutMs?: number;
  /** How many times to wait and retry a `rate_limited` answer. Default 2. Never retries anything else. */
  retryRateLimited?: number;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  /** Largest response body accepted, in bytes. Default 32 MiB. */
  maxResponseBytes?: number;
  /** Filled by the typed clients: "tool.action" → required scopes. */
  actionScopes?: Readonly<Record<string, readonly string[]>>;
}

export interface CallOptions {
  signal?: AbortSignal;
  /** Override the client's rate-limit retry count for this call. */
  retryRateLimited?: number;
}

export interface ApprovalRequest {
  kind: "confirmation" | "permission";
  tool: string;
  action: string;
  args: Params;
  token: string;
  feeHwt?: number;
  summary?: string;
  message?: string;
  /**
   * "user" (the key setting "Only I can approve paid and risky steps" is on): only the account owner
   * can approve, on `approveUrl` on AlgoHash while signed in. Your approver's job is to show the user that
   * link; returning true makes the SDK wait for their decision there.
   * "agent" (default): one tap on the card or the user's yes in chat counts; returning true approves.
   */
  approval: "user" | "agent";
  /** The AlgoHash page where the user approves or declines. Present when `approval` is "user". */
  approveUrl?: string;
  result: ToolResult;
}
/**
 * Ask your user. Return true only if a human agreed (approval "agent"), or, for approval "user",
 * after you have shown them `req.approveUrl` and they want to go ahead. Return false to cancel.
 */
export type Approver = (req: ApprovalRequest) => boolean | Promise<boolean>;

export interface ApprovalOptions extends CallOptions {
  /** Ask your user. Return true only if a human agreed. Required unless `card` is used on Studio. */
  approve?: Approver;
  /**
   * Studio only: show the approval card in an MCP-Apps host via studio_confirm.show, then
   * block on studio_confirm.wait until the user clicks. Falls back to `approve` if given.
   */
  card?: boolean;
  /** Stop after this many approval rounds. Default 3 (permission → quote → run). */
  maxRounds?: number;
  /**
   * How long to wait for the user to decide on AlgoHash (approval "user"), in seconds.
   * Default 300 (tokens live about 5 minutes). On timeout the result has status "awaiting_approval".
   */
  maxWaitSec?: number;
}

const ASK: Record<string, ResultStatus> = {
  needs_confirmation: "needs_confirmation",
  needs_permission: "needs_permission",
  needs_storyboard: "needs_storyboard",
  needs_cast: "needs_cast",
  cast_pending: "needs_cast",
  needs_cast_roles: "needs_cast",
  awaiting_approval: "awaiting_approval",
};

export class AlgoHashError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly rpcCode?: number;
  readonly retryAfterSec?: number;
  readonly data?: unknown;
  constructor(message: string, o: { code: string; httpStatus?: number; rpcCode?: number; retryAfterSec?: number; data?: unknown }) {
    super(message);
    this.name = "AlgoHashError";
    this.code = o.code;
    this.httpStatus = o.httpStatus;
    this.rpcCode = o.rpcCode;
    this.retryAfterSec = o.retryAfterSec;
    this.data = o.data;
  }
  /** Safe to retry without risking a second charge. */
  get retryable(): boolean {
    return this.code === "rate_limited" || this.code === "timeout_before_send";
  }
}

export interface ContentBlock { type: string; text?: string; data?: string; mimeType?: string; uri?: string; [k: string]: unknown }

export class ToolResult {
  readonly status: ResultStatus;
  /** structuredContent, or the JSON parsed from the first text block. */
  readonly data: any;
  readonly content: ContentBlock[];
  readonly text: string;
  readonly isError: boolean;
  /** Machine code for errors and "ask the user" states (e.g. scope_denied, needs_confirmation). */
  readonly code?: string;
  readonly message?: string;
  readonly confirmToken?: string;
  readonly permissionToken?: string;
  readonly feeHwt?: number;
  readonly summary?: string;
  /** "user": only the account owner can approve, on `approveUrl`. "agent": the agent may pass on a yes. */
  readonly approval?: "user" | "agent";
  /** AlgoHash page where the user approves (needs_confirmation, needs_permission, awaiting_approval). */
  readonly approveUrl?: string;
  readonly retryAfterSec?: number;
  /** The server's suggested next step (call + what to tell the user). */
  readonly next?: unknown;
  /** Field names whose values are user-written data, never instructions. */
  readonly untrustedFields?: string[];
  /** True when the SDK refused the call locally (scope preflight) without contacting the server. */
  readonly local: boolean;
  readonly raw: any;

  constructor(raw: any, o: { local?: boolean; declined?: boolean; endpoint?: string } = {}) {
    this.raw = raw;
    this.local = !!o.local;
    this.content = Array.isArray(raw?.content) ? raw.content : [];
    const texts = this.content.filter((c) => c.type === "text" && typeof c.text === "string").map((c) => c.text as string);
    this.text = texts.join("\n");
    this.isError = !!raw?.isError;
    let data = raw?.structuredContent;
    if (data === undefined && texts[0]) { try { data = JSON.parse(texts[0]); } catch { /* plain text */ } }
    this.data = data ?? null;
    const d = data && typeof data === "object" ? data : {};
    let code: string | undefined = d.ok === false && typeof d.error === "string" ? d.error
      : typeof d.error === "string" && this.isError ? d.error : undefined;
    if (!code && texts[0]) {
      const m = /^ERROR:\s*([a-z][a-z0-9_]*)(?=\s*(?:—|-|:|$))/.exec(texts[0]) || /^(needs_[a-z_]+|awaiting_approval)\b/.exec(texts[0]);
      if (m) code = m[1];
      else if (this.isError) code = "tool_error";
    }
    this.code = code;
    this.message = typeof d.message === "string" ? d.message : code ? texts[0] : undefined;
    this.confirmToken = typeof d.confirm_token === "string" ? d.confirm_token : undefined;
    this.permissionToken = typeof d.permission_token === "string" ? d.permission_token : undefined;
    this.feeHwt = typeof d.fee_hwt === "number" ? d.fee_hwt : undefined;
    this.summary = typeof d.summary === "string" ? d.summary : undefined;
    this.approval = d.approval === "user" || d.approval === "agent" ? d.approval : undefined;
    // Approval links are kept only when they point at the endpoint's own origin (no user info).
    this.approveUrl = typeof d.approve_url !== "string" ? undefined
      : o.endpoint ? sameOriginUrl(d.approve_url, o.endpoint)
      : /^https?:\/\//.test(d.approve_url) ? d.approve_url : undefined;
    const ra = raw?._meta?.retry_after_sec ?? d.retry_after_sec ?? /retry_after_sec=(\d+)/.exec(this.text)?.[1];
    this.retryAfterSec = ra !== undefined ? Number(ra) : undefined;
    this.next = d.next ?? (texts.find((t) => t.startsWith("NEXT")) || undefined);
    this.untrustedFields = Array.isArray(d.untrusted_fields) ? d.untrusted_fields : undefined;
    this.status = o.declined ? "declined" : code && ASK[code] ? ASK[code] : code || this.isError ? "error" : "ok";
  }

  get ok(): boolean { return this.status === "ok"; }
  /** Images returned by the tool (base64 + mime type). */
  get images(): ContentBlock[] { return this.content.filter((c) => c.type === "image"); }
  /** Download links returned by the tool. */
  get links(): ContentBlock[] { return this.content.filter((c) => c.type === "resource_link"); }
  /** Throw an AlgoHashError unless the call succeeded. */
  unwrap(): any {
    if (this.status === "ok") return this.data;
    throw new AlgoHashError(this.message || this.text || this.status, {
      code: this.code || this.status, retryAfterSec: this.retryAfterSec, data: this.data,
    });
  }
}

async function readCapped(res: Response, max: number): Promise<string> {
  const len = Number(res.headers.get("content-length") || 0);
  if (len > max) throw new AlgoHashError(`response too large (${len} bytes)`, { code: "response_too_large" });
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel().catch(() => {}); throw new AlgoHashError("response too large", { code: "response_too_large" }); }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(buf);
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); rej(signal.reason); }, { once: true });
});

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Throws unless the endpoint is https, or plain http on a loopback address (mock / dev only). */
export function assertSafeEndpoint(endpoint: string): URL {
  let u: URL;
  try { u = new URL(endpoint); } catch { throw new AlgoHashError("endpoint is not a valid URL", { code: "bad_endpoint" }); }
  if (u.username || u.password) throw new AlgoHashError("endpoint must not contain credentials", { code: "bad_endpoint" });
  if (u.protocol === "https:") return u;
  if (u.protocol === "http:" && LOCAL_HOSTS.has(u.hostname)) return u;
  throw new AlgoHashError("refusing to send a key over plain http (only https, or http://localhost for testing)", { code: "insecure_endpoint" });
}

function assertSafeToken(t: string): void {
  if (/[\r\n\0]/.test(t) || t.length > 4096) throw new AlgoHashError("api key / token contains invalid characters", { code: "bad_api_key" });
}

export class McpClient {
  readonly server: string;
  readonly endpoint: string;
  protected readonly opts: Omit<ClientOptions, "apiKey" | "accessToken">;
  // Private field: never enumerable, never printed by console.log / JSON.stringify.
  readonly #token: string;
  private seq = 0;
  private init?: Promise<any>;
  private negotiated?: string;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey && !opts.accessToken) throw new AlgoHashError("apiKey or accessToken is required", { code: "missing_api_key" });
    const { apiKey, accessToken, ...rest } = opts;
    this.#token = String(accessToken || apiKey);
    assertSafeToken(this.#token);
    assertSafeEndpoint(opts.endpoint);
    this.opts = { protocolVersion: "2025-11-25", timeoutMs: 120_000, retryRateLimited: 2, maxResponseBytes: 32 * 1024 * 1024, ...rest };
    this.server = opts.server;
    this.endpoint = opts.endpoint;
  }

  // ── transport ─────────────────────────────────────────────────────────────
  /** Send one JSON-RPC message (or a batch) and return the parsed response body. */
  async send(body: unknown, signal?: AbortSignal): Promise<any> {
    const f = this.opts.fetch ?? globalThis.fetch;
    if (!f) throw new AlgoHashError("no fetch implementation available", { code: "no_fetch" });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new Error("timeout")), this.opts.timeoutMs);
    signal?.addEventListener("abort", () => ctl.abort(signal.reason), { once: true });
    let res: Response;
    try {
      res = await f(this.endpoint, {
        method: "POST",
        signal: ctl.signal,
        // Never follow redirects: a redirect could carry the Authorization header to another host.
        redirect: "error",
        credentials: "omit",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...Object.fromEntries(Object.entries(this.opts.headers || {}).filter(([k]) => k.toLowerCase() !== "authorization")),
          ...(this.negotiated ? { "mcp-protocol-version": this.negotiated } : {}),
          authorization: `Bearer ${this.#token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      clearTimeout(timer);
      throw new AlgoHashError(`request failed: ${e?.message || e}`, { code: "network_error" });
    }
    let text: string;
    try {
      if (res.status === 202) return null;
      text = await readCapped(res, this.opts.maxResponseBytes!);
    } finally {
      clearTimeout(timer);
    }
    let json: any = null;
    if ((res.headers.get("content-type") || "").includes("text/event-stream")) {
      const events = text.split(/\n\n/).map((b) => b.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n")).filter(Boolean);
      try { json = events.length ? JSON.parse(events[events.length - 1]) : null; } catch {
        throw new AlgoHashError("the server sent an event that is not JSON", { code: "bad_response", httpStatus: res.status });
      }
    } else if (text) {
      try { json = JSON.parse(text); } catch { json = null; }
    }
    if (!res.ok) {
      const e = json?.error;
      const retry = Number(res.headers.get("retry-after")) || e?.data?.retry_after_sec;
      const code = res.status === 401 ? "invalid_api_key" : res.status === 429 ? "rate_limited"
        : res.status === 403 ? (json?.error?.data?.error || "forbidden") : `http_${res.status}`;
      throw new AlgoHashError(e?.message || `HTTP ${res.status}`, {
        code, httpStatus: res.status, rpcCode: e?.code, retryAfterSec: retry || undefined,
        data: { body: json, wwwAuthenticate: res.headers.get("www-authenticate") || undefined },
      });
    }
    return json;
  }

  /** Raw JSON-RPC request. Throws on JSON-RPC errors. */
  async rpc(method: string, params?: unknown, signal?: AbortSignal): Promise<any> {
    if (method !== "initialize") await this.initialize();
    const id = ++this.seq;
    const out = await this.send({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) }, signal);
    if (out?.error) {
      const e = out.error;
      throw new AlgoHashError(e.message || "JSON-RPC error", {
        code: e.code === -32029 ? "rate_limited" : e.code === -32602 ? "invalid_params" : e.code === -32601 ? "method_not_found" : `rpc_${e.code}`,
        rpcCode: e.code, retryAfterSec: e.data?.retry_after_sec, data: e.data,
      });
    }
    return out?.result;
  }

  /** Negotiate the protocol version. Called automatically before the first request. */
  initialize(): Promise<any> {
    if (!this.init) {
      this.init = this.rpc("initialize", {
        protocolVersion: this.opts.protocolVersion,
        capabilities: {},
        clientInfo: this.opts.clientInfo ?? { name: "algohash-mcp-sdk-ts", version: "0.1.0" },
      }).then(async (r) => {
        this.negotiated = r?.protocolVersion;
        await this.send({ jsonrpc: "2.0", method: "notifications/initialized" }).catch(() => null);
        return r;
      }).catch((e) => { this.init = undefined; throw e; });
    }
    return this.init;
  }

  /** Redacted form for logs. The key is never included. */
  toJSON(): object { return { server: this.server, endpoint: this.endpoint, key: "[redacted]" }; }
  [Symbol.for("nodejs.util.inspect.custom")](): string { return `McpClient(${this.server}, ${this.endpoint}, key=[redacted])`; }

  /** Server instructions from `initialize` — how the server wants agents to use it. */
  async instructions(): Promise<string> { return (await this.initialize())?.instructions ?? ""; }
  async ping(): Promise<void> { await this.rpc("ping"); }
  async listTools(): Promise<any[]> { return (await this.rpc("tools/list"))?.tools ?? []; }

  // ── scopes ────────────────────────────────────────────────────────────────
  /** Scopes the server requires for `tool.action` (base scopes; some actions need more for some arguments). */
  requiredScopes(tool: string, action?: string): readonly string[] | undefined {
    return this.opts.actionScopes?.[`${tool}.${action ?? ""}`];
  }
  canCall(tool: string, action: string, scopes: string[] | undefined = this.opts.keyScopes): boolean {
    const need = this.requiredScopes(tool, action);
    if (!need || !scopes) return true;
    return need.every((s) => scopes.includes(s));
  }
  /** Split every known action into allowed / denied for a scope set. */
  allowedActions(scopes: string[] | undefined = this.opts.keyScopes): { allowed: string[]; denied: string[] } {
    const allowed: string[] = [], denied: string[] = [];
    for (const [k, need] of Object.entries(this.opts.actionScopes || {})) {
      (need.every((s) => (scopes || []).includes(s)) ? allowed : denied).push(k);
    }
    return { allowed, denied };
  }

  // ── calls ─────────────────────────────────────────────────────────────────
  /**
   * Call a tool. Tool-level failures and "ask the user" states come back as a ToolResult
   * (check `status`); only transport and protocol failures throw.
   * A `rate_limited` answer is retried after `retry_after_sec` — the server did not run the call.
   * Nothing else is ever retried automatically: a paid call might have been submitted.
   */
  async call(tool: string, args: Params = {}, opts: CallOptions = {}): Promise<ToolResult> {
    const action = typeof args.action === "string" ? args.action : "";
    if (action && !this.canCall(tool, action)) {
      const need = this.requiredScopes(tool, action) || [];
      return new ToolResult({
        isError: true,
        content: [{ type: "text", text: `ERROR: scope_denied — ${tool}.${action} needs [${need.join(" + ")}]; key has [${(this.opts.keyScopes || []).join(", ")}]` }],
        structuredContent: { ok: false, error: "scope_denied", needs: need, have: this.opts.keyScopes },
      }, { local: true });
    }
    let tries = opts.retryRateLimited ?? this.opts.retryRateLimited ?? 0;
    for (;;) {
      let r: ToolResult;
      try {
        r = new ToolResult(await this.rpc("tools/call", { name: tool, arguments: args }, opts.signal), { endpoint: this.endpoint });
      } catch (e) {
        if (e instanceof AlgoHashError && e.code === "rate_limited" && tries-- > 0) {
          await sleep(Math.min(30, e.retryAfterSec ?? 2) * 1000, opts.signal);
          continue;
        }
        throw e;
      }
      if (r.code === "rate_limited" && tries-- > 0) {
        await sleep(Math.min(30, r.retryAfterSec ?? 2) * 1000, opts.signal);
        continue;
      }
      return r;
    }
  }

  /** Call `tool` with `{ action, ...params }`. */
  callAction(tool: string, action: string, params: Params = {}, opts?: CallOptions): Promise<ToolResult> {
    return this.call(tool, { ...params, action }, opts);
  }

  /** Send up to 20 tool calls in one HTTP request. Results keep the input order. */
  async batch(calls: { tool: string; args?: Params }[], signal?: AbortSignal): Promise<ToolResult[]> {
    if (calls.length > 20) throw new AlgoHashError("batch limit is 20 calls", { code: "batch_too_large" });
    await this.initialize();
    const base = this.seq;
    const msgs = calls.map((c, i) => ({ jsonrpc: "2.0", id: base + i + 1, method: "tools/call", params: { name: c.tool, arguments: c.args || {} } }));
    this.seq += calls.length;
    const out: any[] = (await this.send(msgs, signal)) || [];
    const byId = new Map(out.map((m) => [m.id, m]));
    return msgs.map((m) => {
      const r = byId.get(m.id);
      if (r?.error) return new ToolResult({ isError: true, content: [{ type: "text", text: `ERROR: rpc_${r.error.code} — ${r.error.message}` }] });
      return new ToolResult(r?.result ?? { isError: true, content: [{ type: "text", text: "ERROR: no_response" }] }, { endpoint: this.endpoint });
    });
  }

  /**
   * Call a tool and walk the approval protocol:
   *   needs_permission   → ask → (approval "user": wait for the owner on AlgoHash) → repeat with permission_token
   *   needs_confirmation → ask → (approval "user": wait for the owner on AlgoHash) → repeat with confirm_token
   * Tokens are single-use and bound to the exact arguments, so the repeat is byte-identical
   * apart from the token. If the user says no, the result has status "declined". If the user has
   * not decided within `maxWaitSec`, the result has status "awaiting_approval".
   * The SDK never approves anything itself.
   */
  async callWithApproval(tool: string, args: Params, o: ApprovalOptions): Promise<ToolResult> {
    if (!o.approve && !(o.card && this.server === "studio")) {
      throw new AlgoHashError("callWithApproval needs an `approve` callback (or card: true on Studio)", { code: "no_approver" });
    }
    const action = typeof args.action === "string" ? args.action : "";
    const rounds = o.maxRounds ?? 3;
    let extra: Params = {};
    let pending: ApprovalRequest | undefined;
    for (let round = 0; round <= rounds; round++) {
      const r = await this.call(tool, { ...args, ...extra }, o);
      if (r.status === "awaiting_approval" && pending && round < rounds) {
        // The repeat arrived before the owner decided (for example a host approved in chat). Wait, then repeat.
        const w = await this.waitDecision(pending, o);
        if (w !== true) return w;
        continue;
      }
      if (r.status !== "needs_confirmation" && r.status !== "needs_permission") return r;
      if (round === rounds) return r;
      const kind = r.status === "needs_confirmation" ? "confirmation" : "permission";
      const token = kind === "confirmation" ? r.confirmToken : r.permissionToken;
      if (!token) return r;
      const req: ApprovalRequest = {
        kind, tool, action, args, token, feeHwt: r.feeHwt, summary: r.summary, message: r.message,
        approval: r.approval === "user" ? "user" : "agent", approveUrl: this.sameOrigin(r.approveUrl), result: r,
      };
      if (o.card && this.server === "studio") {
        const w = await this.cardDecision(req, o);
        if (w !== true) return w;
      } else {
        if (!(await o.approve!(req))) return new ToolResult(r.raw, { declined: true });
        if (req.approval === "user") {
          const w = await this.waitDecision(req, o);
          if (w !== true) return w;
        }
      }
      pending = req;
      extra = kind === "confirmation" ? { confirm_token: token } : { permission_token: token };
    }
    throw new AlgoHashError("approval loop exhausted", { code: "approval_loop" });
  }

  /** Only hand the approver an approval link on the endpoint's own origin: never a link to somewhere else. */
  private sameOrigin(url?: string): string | undefined {
    if (!url) return undefined;
    return sameOriginUrl(url, this.endpoint);
  }

  /** Studio: render the approval card, then wait for the user's decision. */
  private async cardDecision(req: ApprovalRequest, o: ApprovalOptions): Promise<true | ToolResult> {
    const field = req.kind === "confirmation" ? "confirm_token" : "permission_token";
    const shown = await this.call("studio_confirm", { action: "show", args: { [field]: req.token, summary: req.summary || req.message || `${req.tool}.${req.action}` } }, o);
    if (!shown.ok) {
      // No card: fall back to the approver (it shows the approve_url for approval "user").
      if (!o.approve || !(await o.approve(req))) return new ToolResult(req.result.raw, { declined: true });
      // Approval "agent": the yes is enough, there is no page decision to wait for.
      if (req.approval !== "user") return true;
    }
    return this.waitDecision(req, o);
  }

  /**
   * Wait on studio_confirm.wait / team_confirm.wait until the decision is made.
   * Returns true when approved; otherwise the ToolResult to hand back to the caller.
   */
  private async waitDecision(req: ApprovalRequest, o: ApprovalOptions): Promise<true | ToolResult> {
    const field = req.kind === "confirmation" ? "confirm_token" : "permission_token";
    const deadline = Date.now() + Math.max(1, o.maxWaitSec ?? 300) * 1000;
    const waitTool = this.server === "team" ? "team_confirm" : "studio_confirm";
    while (Date.now() < deadline) {
      const sec = Math.max(5, Math.min(50, Math.ceil((deadline - Date.now()) / 1000)));
      const started = Date.now();
      const w = await this.call(waitTool, this.server === "team"
        ? { action: "wait", confirm_token: req.token, timeout_sec: sec }
        : { action: "wait", args: { [field]: req.token, timeout_sec: sec } }, o);
      const st = w.data?.status, dec = w.data?.decision;
      if (st === "decided" || st === "used") {
        return dec === "approved" ? true : new ToolResult(req.result.raw, { declined: true });
      }
      if (st !== "open") {
        if (!w.ok) return w;
        return new ToolResult({ isError: true, content: [{ type: "text", text: "ERROR: approval_expired — the approval request expired or is gone. Make the call again for a new one." }],
          structuredContent: { ok: false, error: "approval_expired", message: "The approval request expired or is gone. Make the call again for a new one.", status: st } });
      }
      // The live server long-polls; never spin if a wait comes back early.
      if (Date.now() - started < 1000) await new Promise((r) => setTimeout(r, 1000));
    }
    return new ToolResult({ isError: false, content: [{ type: "text", text: "awaiting_approval — the user has not decided yet." }],
      structuredContent: { ok: false, error: "awaiting_approval", approval: req.approval, ...(req.approveUrl ? { approve_url: req.approveUrl } : {}),
        [field]: req.token, message: "The user has not decided yet. Wait again, then repeat the call with the same token." } });
  }
}

/** `url` when it is http(s) on the same origin as `endpoint` and carries no user info; otherwise undefined. */
function sameOriginUrl(url: string, endpoint: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.username || u.password || (u.protocol !== "https:" && u.protocol !== "http:")) return undefined;
    return u.origin === new URL(endpoint).origin ? url : undefined;
  } catch { return undefined; }
}
