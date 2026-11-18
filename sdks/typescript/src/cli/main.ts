#!/usr/bin/env node
// algohash — sign a terminal in to the AlgoHash MCP servers.
//
//   algohash login      show a code + QR, approve on your phone with Face ID, come back signed in
//   algohash status     who this terminal is signed in as, and what it may do
//   algohash logout     disconnect this terminal (server side too)
//   algohash token <server>     print a fresh access token for scripts (stdout only when piped or --show)
//   algohash headers <server>   print {"Authorization":"Bearer …"} for MCP clients that take a headers helper
//
// No password is typed here and no token is printed during login.
import os from "node:os";
import { AlgoHashError } from "../client.js";
import { baseUrl, startDevice, pollDevice, refreshTokens, revokeTokens, type TokenSet, type DeviceStart } from "./device.js";
import { encodeQr, renderQr, qrRows } from "./qr.js";
import { saveLogin, loadSession, loadSecret, clearLogin, storeLabel, type Secret, type Session, type StoreKind } from "./store.js";
import { detectCaps, Screen, clock } from "./ui.js";

const VERSION = "0.2.1";
const SERVER_LABEL: Record<string, string> = { studio: "Studio MCP", team: "Team MCP", voice: "Voice MCP" };

interface Flags { _: string[]; base?: string; servers?: string[]; store?: "auto" | StoreKind; qr: boolean; wait: boolean; timeout?: number; json: boolean; show: boolean; help: boolean; open: boolean }
function parseArgs(argv: string[]): Flags {
  const f: Flags = { _: [], qr: true, wait: true, json: false, show: false, help: false, open: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) throw new AlgoHashError(`${a} needs a value`, { code: "bad_args" }); return v; };
    if (a === "--help" || a === "-h") f.help = true;
    else if (a === "--base") f.base = val();
    else if (a === "--servers") f.servers = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--store") { const v = val(); if (!["auto", "keychain", "secret-service", "file"].includes(v)) throw new AlgoHashError("--store is auto, keychain, secret-service or file", { code: "bad_args" }); f.store = v as Flags["store"]; }
    else if (a === "--no-qr") f.qr = false;
    else if (a === "--no-wait") f.wait = false;
    else if (a === "--timeout") f.timeout = Math.max(5, Number(val()) || 0);
    else if (a === "--json") f.json = true;
    else if (a === "--show") f.show = true;
    else if (a.startsWith("-")) throw new AlgoHashError(`unknown option ${a}`, { code: "bad_args" });
    else f._.push(a);
  }
  return f;
}

const HELP = `algohash ${VERSION}

Usage
  algohash login [--servers studio,team] [--no-qr] [--no-wait] [--timeout <sec>] [--store auto|keychain|file]
  algohash status [--json]
  algohash logout
  algohash token <studio|team>      fresh access token, for scripts (prints only when piped, or with --show)
  algohash headers <studio|team>    {"Authorization":"Bearer …"} for an MCP client's headers helper

Login shows a short code and a QR code. Open it on your phone, check the code matches,
approve with Face ID in AlgoHash. Spending stays off until you turn it on in AlgoHash.

Environment
  ALGOHASH_BASE_URL       server to sign in to (default https://console.algohash.ai)
  ALGOHASH_CONFIG_DIR     where session.json / credentials.json live
  NO_COLOR, ALGOHASH_ASCII=1    plain output
  ALGOHASH_QR=full|half   force the login QR size
  ALGOHASH_BANNER=0       small header instead of the big logo
`;

function machineName(): string { return os.hostname().replace(/\.(local|lan|home)$/i, "").slice(0, 60); }
function platformName(): string {
  const p = process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform === "linux" ? "Linux" : process.platform;
  return `${p} ${os.arch()}`;
}
function secretFrom(t: TokenSet, prev?: Secret | null): Secret {
  const now = Date.now();
  const tokens: Secret["tokens"] = {};
  for (const [name, s] of Object.entries(t.algohash.tokens)) tokens[name] = { access_token: s.access_token, endpoint: s.endpoint, expires_at: now + s.expires_in * 1000 };
  return { refresh_token: t.refresh_token, login_hint: t.algohash.login_hint || prev?.login_hint, tokens };
}
function sessionFrom(base: string, t: TokenSet, secret: Secret): Omit<Session, "store" | "saved_at" | "version"> {
  return {
    base, grant_id: t.algohash.grant_id, account_label: t.algohash.account_label, scopes: t.scope.split(" ").filter(Boolean), spend: !!t.algohash.spend,
    servers: Object.fromEntries(Object.entries(secret.tokens).map(([k, v]) => [k, { endpoint: v.endpoint, expires_at: v.expires_at }])),
    refresh_expires_at: Date.now() + t.algohash.refresh_expires_in * 1000,
  };
}
const serverNames = (names: string[]) => names.map((n) => SERVER_LABEL[n] || n).join(", ");

async function login(f: Flags): Promise<number> {
  const ui = new Screen(detectCaps());
  const p = ui.p;
  const base = baseUrl(f.base);
  const prev = loadSession();
  const prevSecret = prev && prev.base === base ? loadSecret(prev) : null;
  const ci = !!process.env.CI;

  let d: DeviceStart;
  try {
    d = await startDevice(base, { clientName: "AlgoHash CLI", machine: machineName(), platform: platformName(), resources: f.servers, loginHint: prevSecret?.login_hint });
  } catch (e) { return die(ui, e); }
  const deadline = Date.now() + Math.min(d.expires_in, f.timeout ?? d.expires_in) * 1000;
  const pushed = !!d.algohash?.pushed;

  if (ui.interactive) {
    // Full-size QR (backgrounds only) scans on every terminal. Half size uses ▀ glyphs for mixed
    // cells, which stretch when the terminal adds line spacing, so it is only the last resort.
    // Layouts, first that fits:
    //   steps  — step 1, full QR, link, code box, step 3 and the live line all on screen (header may scroll away);
    //   bottom — full QR printed last, under the steps, so the QR and the live line stay on screen;
    //   half   — half-size QR in step 1, with a hint.
    // ECC L keeps the code small (version 3 for the login link); a screen is a clean source.
    // The big logo only shows when it fits too. ALGOHASH_QR=full|half forces a size.
    const showQr = f.qr && ui.caps.unicode && ui.caps.color;
    const qr = showQr ? encodeQr(d.verification_uri_complete, { ecc: "L" }) : null;
    const forced = process.env.ALGOHASH_QR;
    const fullRows = qr ? qrRows(qr, "full") : 0;
    const wide = !!qr && (qr.size + 4) * 2 + 5 <= ui.caps.width;
    const stepsRows = 3 + fullRows + 13;
    const layout: "steps" | "bottom" | "half" | "none" = !qr ? "none"
      : forced === "half" ? "half"
      : forced === "full" ? (stepsRows <= ui.caps.rows ? "steps" : "bottom")
      : wide && stepsRows <= ui.caps.rows ? "steps"
      : wide && fullRows + 3 <= ui.caps.rows ? "bottom"
      : "half";
    const mode = layout === "half" ? "half" : "full";
    const qrLines = qr ? renderQr(qr, { indent: "     ", mode }) : [];
    ui.header("MCP login", layout === "bottom" ? fullRows + 3 : 3 + qrLines.length + 13 + (layout === "half" ? 1 : 0));
    ui.mark();
    const scan = layout === "bottom" ? "Scan the code below with your camera, or open the link." : "Scan with your camera, or open the link.";
    ui.step(1, "Open this on your phone", pushed ? `A request was sent to your AlgoHash app. Or ${scan[0].toLowerCase()}${scan.slice(1)}` : scan);
    ui.blank();
    if (layout === "steps" || layout === "half") {
      for (const l of qrLines) ui.line(l);
      if (layout === "half") ui.note(`   Won't scan? Make the window ${fullRows + 3}+ rows tall, or run with ALGOHASH_QR=full.`);
      ui.blank();
    }
    ui.line(`     ${p.blue(d.verification_uri)}`);
    ui.blank();
    ui.step(2, "Check the code matches");
    ui.blank();
    ui.codeBox(d.user_code);
    ui.blank();
    ui.step(3, "Approve with Face ID in AlgoHash");
    ui.blank();
    if (layout === "bottom") {
      for (const l of qrLines) ui.line(l);
      ui.blank();
    }
  } else {
    ui.line("AlgoHash MCP login");
    ui.line(`Open: ${d.verification_uri_complete}`);
    ui.line(`Code: ${d.user_code}`);
  }
  if (!f.wait) {
    ui.line(ui.interactive ? `  ${p.amber("Not waiting (--no-wait).")} Run ${p.bold("algohash login")} again when someone can approve.` : "Not waiting (--no-wait). A person must approve; run login again when someone can.");
    return 2;
  }
  if (ci && !ui.interactive) ui.line(`Waiting for a person to approve (up to ${Math.round((deadline - Date.now()) / 1000)} s). Use --no-wait to fail fast.`);

  const abort = new AbortController();
  const onSig = () => { ui.stop(); ui.line(""); ui.note("Cancelled. Nothing was signed in."); abort.abort(new Error("cancelled")); process.exitCode = 130; };
  process.once("SIGINT", onSig);
  let seen: "waiting" | "opened" = "waiting";
  let interval = d.interval;
  const text = () => (seen === "opened" ? "Opened on your phone. Waiting for Face ID…".replace("…", ui.caps.unicode ? "…" : "...") : `Waiting for your phone${ui.caps.unicode ? "…" : "..."}`);
  const tick = ui.interactive ? setInterval(() => ui.status(text(), `expires in ${clock(deadline - Date.now())}`), 1000) : null;
  ui.status(ui.interactive ? text() : "Waiting for approval...", ui.interactive ? `expires in ${clock(deadline - Date.now())}` : "");
  let tokens: TokenSet | null = null;
  let end: "approved" | "denied" | "expired" | "cancelled" | "error" = "expired";
  let failure: unknown;
  try {
    while (Date.now() < deadline) {
      const left = deadline - Date.now();
      let r;
      const asked = Date.now();
      try { r = await pollDevice(base, d.device_code, { waitMs: Math.min(d.algohash?.wait_max_ms ?? 0, left), seen, signal: abort.signal }); }
      catch (e) {
        if (abort.signal.aborted) { end = "cancelled"; break; }
        if (e instanceof AlgoHashError && e.code === "network_error") { await sleep(Math.min(3000, left)); continue; }   // a dropped connection is not a denial
        throw e;
      }
      if (r.status === "approved") { tokens = r.tokens; end = "approved"; break; }
      if (r.status === "denied") { end = "denied"; break; }
      if (r.status === "expired") { end = "expired"; break; }
      if (r.status === "slow_down") { interval = r.interval; await sleep(interval * 1000); continue; }
      const changed = r.status !== seen;
      if (changed) { seen = r.status; ui.status(ui.interactive ? text() : seen === "opened" ? "Opened on phone." : "Waiting for approval...", ui.interactive ? `expires in ${clock(deadline - Date.now())}` : ""); }
      // No long-poll on this server, or it answered at once with nothing new: wait like a plain RFC 8628 client.
      if (!d.algohash?.wait_max_ms || (!changed && Date.now() - asked < 500)) await sleep(interval * 1000);
    }
  } catch (e) { end = "error"; failure = e; }
  if (tick) clearInterval(tick);
  ui.stop();
  process.removeListener("SIGINT", onSig);

  if (end === "cancelled") return 130;
  if (end === "error") return die(ui, failure);
  if (end !== "approved" || !tokens) {
    if (ui.interactive) { ui.collapse(); ui.bad(end === "denied" ? "Login denied on your phone" : "The code expired"); ui.note(end === "denied" ? "Nothing was shared with this terminal." : "Run algohash login again for a new code."); ui.blank(); }
    else ui.line(end === "denied" ? "Denied." : "Expired. Run login again.");
    return end === "denied" ? 3 : 4;
  }

  const secret = secretFrom(tokens, prevSecret);
  const kind = saveLogin(sessionFrom(base, tokens, secret), secret, f.store ?? "auto");
  const names = Object.keys(tokens.algohash.tokens);
  const scopes = tokens.scope.split(" ").filter((s) => s && s !== "spend");
  if (ui.interactive) {
    ui.collapse();                          // the QR code and the used code leave the screen
    ui.ok("Signed in");
    ui.blank();
    ui.kv([
      ["Account", tokens.algohash.account_label],
      ["Servers", serverNames(names)],
      ["Access", scopes.join(", ")],
      ["Spending", tokens.algohash.spend ? p.amber("on") : `${p.green("off")}  ${p.dim("turn on in AlgoHash: MCP Hub > Connected terminals")}`],
      ["Saved to", storeLabel(kind)],
    ]);
    ui.blank();
    ui.note("Next");
    ui.kv([[p.bold("algohash status"), p.dim("show this again")], [p.bold("algohash logout"), p.dim("disconnect this terminal")]]);
    ui.blank();
  } else {
    ui.line("Approved.");
    ui.line(`Signed in as ${tokens.algohash.account_label}. Servers: ${names.join(", ")}. Access: ${scopes.join(" ")}. Spending: ${tokens.algohash.spend ? "on" : "off"}. Saved to: ${storeLabel(kind)}.`);
  }
  return 0;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
function die(ui: Screen, e: unknown): number {
  ui.stop();
  const m = e instanceof Error ? e.message : String(e);
  if (ui.interactive) { ui.bad(m); ui.blank(); } else process.stderr.write(`error: ${m}\n`);
  return 1;
}

function needSession(ui: Screen): { session: Session; secret: Secret } | null {
  const session = loadSession();
  const secret = session ? loadSecret(session) : null;
  if (!session || !secret) {
    if (ui.interactive) { ui.blank(); ui.bad("Not signed in"); ui.note("Run algohash login."); ui.blank(); } else process.stderr.write("not signed in; run: algohash login\n");
    return null;
  }
  return { session, secret };
}
/** A token for `server` that is good for at least 2 more minutes. Refreshes (and saves) when needed. */
async function freshToken(server: string, s: { session: Session; secret: Secret }): Promise<string> {
  const cur = s.secret.tokens[server];
  if (!cur) throw new AlgoHashError(`this login does not cover "${server}" (it covers ${Object.keys(s.secret.tokens).join(", ")})`, { code: "no_such_server" });
  if (cur.expires_at - Date.now() > 120_000) return cur.access_token;
  const t = await refreshTokens(s.session.base, s.secret.refresh_token);
  const secret = secretFrom(t, s.secret);
  saveLogin(sessionFrom(s.session.base, t, secret), secret, s.session.store);
  const next = secret.tokens[server];
  if (!next) throw new AlgoHashError(`"${server}" was disconnected for this terminal; run algohash login`, { code: "no_such_server" });
  return next.access_token;
}

async function status(f: Flags): Promise<number> {
  const ui = new Screen(detectCaps());
  const s = loadSession();
  if (f.json) { process.stdout.write(JSON.stringify(s ? { signed_in: true, base: s.base, account: s.account_label, servers: Object.keys(s.servers), scopes: s.scopes, spend: s.spend, store: s.store } : { signed_in: false }) + "\n"); return s ? 0 : 1; }
  const got = needSession(ui);
  if (!got) return 1;
  const { session } = got;
  if (ui.interactive) {
    ui.header("status", 12);
    ui.ok("Signed in");
    ui.blank();
    ui.kv([
      ["Account", session.account_label], ["Server", session.base], ["Servers", serverNames(Object.keys(session.servers))],
      ["Access", session.scopes.filter((x) => x !== "spend").join(", ")], ["Spending", session.spend ? ui.p.amber("on") : ui.p.green("off")],
      ["Saved to", storeLabel(session.store)], ["Stays signed in", `until ${new Date(session.refresh_expires_at).toISOString().slice(0, 10)} (renews on use)`],
    ]);
    ui.blank();
  } else {
    ui.line(`Signed in as ${session.account_label} at ${session.base}. Servers: ${Object.keys(session.servers).join(", ")}. Access: ${session.scopes.filter((x) => x !== "spend").join(" ")}. Spending: ${session.spend ? "on" : "off"}.`);
  }
  return 0;
}

async function logout(): Promise<number> {
  const ui = new Screen(detectCaps());
  const session = loadSession();
  const secret = session ? loadSecret(session) : null;
  let server = true;
  if (session && secret) { try { await revokeTokens(session.base, secret.refresh_token); } catch { server = false; } }
  clearLogin(session);
  if (ui.interactive) {
    ui.blank();
    if (!session) ui.note("Not signed in. Nothing to do."); else ui.ok("Signed out");
    if (session && !server) ui.note("The server could not be reached. Also disconnect this terminal in AlgoHash: MCP Hub > Connected terminals.");
    else if (session) ui.note("This terminal's keys no longer work.");
    ui.blank();
  } else ui.line(!session ? "Not signed in." : server ? "Signed out. This terminal's keys no longer work." : "Signed out locally. Server not reached: disconnect this terminal in AlgoHash settings.");
  return 0;
}

async function token(f: Flags, asHeaders: boolean): Promise<number> {
  const ui = new Screen(detectCaps(process.stderr));
  const server = f._[1];
  if (!server) { process.stderr.write(`usage: algohash ${asHeaders ? "headers" : "token"} <studio|team>\n`); return 1; }
  const got = needSession(ui);
  if (!got) return 1;
  // A token on an interactive terminal ends up in scrollback and screen shares: refuse unless asked.
  if (process.stdout.isTTY && !f.show) { process.stderr.write("refusing to print a token to the terminal. Pipe it (e.g. $(algohash token studio)) or pass --show.\n"); return 1; }
  let tok: string;
  try { tok = await freshToken(server, got); } catch (e) { process.stderr.write(`error: ${e instanceof Error ? e.message : e}\n`); return 1; }
  process.stdout.write(asHeaders ? JSON.stringify({ Authorization: `Bearer ${tok}` }) + "\n" : tok + "\n");
  return 0;
}

export async function run(argv: string[]): Promise<number> {
  let f: Flags;
  try { f = parseArgs(argv); } catch (e) { process.stderr.write(`error: ${e instanceof Error ? e.message : e}\n`); return 1; }
  const cmd = f._[0];
  if (f.help || !cmd || cmd === "help") { process.stdout.write(HELP); return cmd || f.help ? 0 : 1; }
  try {
    if (cmd === "login") return await login(f);
    if (cmd === "status") return await status(f);
    if (cmd === "logout") return await logout();
    if (cmd === "token") return await token(f, false);
    if (cmd === "headers") return await token(f, true);
  } catch (e) {
    process.stderr.write(`error: ${e instanceof Error ? e.message : e}\n`);
    return 1;
  }
  process.stderr.write(`unknown command "${cmd}". Try: algohash --help\n`);
  return 1;
}

const invoked = process.argv[1] && /(^|[\\/])(main\.js|algohash)$/.test(process.argv[1]);
if (invoked) run(process.argv.slice(2)).then((code) => { process.exitCode = process.exitCode || code; });
