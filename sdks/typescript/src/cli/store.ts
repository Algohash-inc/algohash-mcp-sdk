// Where the CLI keeps the login. The secret part (tokens) goes to the OS keychain when there is one,
// otherwise to a file only the user can read (0600). Nothing here ever prints a token.
//
//   macOS    Keychain, through /usr/bin/security (commands are sent on stdin, so the secret is not in argv)
//   Linux    Secret Service, through secret-tool (secret on stdin), when it is installed and a session bus exists
//   other    file: $XDG_CONFIG_HOME/algohash/credentials.json, or %APPDATA%\algohash\credentials.json on Windows
//
// A small non-secret file (session.json) sits next to it in every case: account label, scopes, where the
// secret lives. `algohash status` reads only that.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SERVICE = "algohash-mcp";
export type StoreKind = "keychain" | "secret-service" | "file";

export interface Secret {
  refresh_token: string;
  login_hint?: string;
  tokens: Record<string, { access_token: string; endpoint: string; expires_at: number }>;
}
export interface Session {
  version: 1;
  base: string;
  grant_id: string;
  account_label: string;
  scopes: string[];
  spend: boolean;
  servers: Record<string, { endpoint: string; expires_at: number }>;
  refresh_expires_at: number;
  store: StoreKind;
  saved_at: number;
}

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.ALGOHASH_CONFIG_DIR) return env.ALGOHASH_CONFIG_DIR;
  if (process.platform === "win32") return path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "algohash");
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "algohash");
}
const sessionFile = () => path.join(configDir(), "session.json");
const secretFile = () => process.env.ALGOHASH_CREDENTIALS_FILE || path.join(configDir(), "credentials.json");
// One login per server base: a login against a test server never overwrites the real one in the keychain.
const accountFor = (base: string) => { try { return new URL(base).host; } catch { return "default"; } };

function writePrivate(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, { mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch { /* Windows: the profile folder's ACL already limits it to the user */ }
}

const has = (cmd: string) => spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" }).status === 0;
const q = (s: string) => `"${s.replace(/(["\\])/g, "\\$1")}"`;

export function pickStore(want: "auto" | StoreKind = "auto"): StoreKind {
  if (want !== "auto") return want;
  if (process.env.ALGOHASH_CREDENTIALS_FILE) return "file";
  if (process.platform === "darwin" && fs.existsSync("/usr/bin/security")) return "keychain";
  if (process.platform === "linux" && process.env.DBUS_SESSION_BUS_ADDRESS && has("secret-tool")) return "secret-service";
  return "file";
}
const tilde = (p: string) => { const h = os.homedir(); return h && h !== "/" && (p === h || p.startsWith(h + path.sep)) ? "~" + p.slice(h.length) : p; };
export function storeLabel(kind: StoreKind): string {
  return kind === "keychain" ? `macOS Keychain (${SERVICE})` : kind === "secret-service" ? `system keyring (${SERVICE})` : `${tilde(secretFile())} (0600, only you)`;
}

function putSecret(kind: StoreKind, base: string, json: string): boolean {
  const acct = accountFor(base);
  if (kind === "keychain") {
    // `security -i` reads commands from stdin: the secret never appears in the process list.
    const b64 = Buffer.from(json, "utf8").toString("base64");
    const r = spawnSync("/usr/bin/security", ["-i"], { input: `add-generic-password -U -s ${q(SERVICE)} -a ${q(acct)} -w ${q(b64)}\n`, encoding: "utf8" });
    return r.status === 0 && !/error|SecKeychain/i.test(r.stderr || "");
  }
  if (kind === "secret-service") {
    const r = spawnSync("secret-tool", ["store", "--label", "AlgoHash MCP login", "service", SERVICE, "account", acct], { input: json, encoding: "utf8" });
    return r.status === 0;
  }
  writePrivate(secretFile(), JSON.stringify({ [acct]: JSON.parse(json) }));
  return true;
}
function getSecret(kind: StoreKind, base: string): string | null {
  const acct = accountFor(base);
  try {
    if (kind === "keychain") {
      const r = spawnSync("/usr/bin/security", ["find-generic-password", "-s", SERVICE, "-a", acct, "-w"], { encoding: "utf8" });
      return r.status === 0 ? Buffer.from(r.stdout.trim(), "base64").toString("utf8") : null;
    }
    if (kind === "secret-service") {
      const r = spawnSync("secret-tool", ["lookup", "service", SERVICE, "account", acct], { encoding: "utf8" });
      return r.status === 0 && r.stdout ? r.stdout : null;
    }
    const all = JSON.parse(fs.readFileSync(secretFile(), "utf8"));
    return all && all[acct] ? JSON.stringify(all[acct]) : null;
  } catch { return null; }
}
function delSecret(kind: StoreKind, base: string): void {
  const acct = accountFor(base);
  try {
    if (kind === "keychain") spawnSync("/usr/bin/security", ["delete-generic-password", "-s", SERVICE, "-a", acct], { stdio: "ignore" });
    else if (kind === "secret-service") spawnSync("secret-tool", ["clear", "service", SERVICE, "account", acct], { stdio: "ignore" });
    else fs.rmSync(secretFile(), { force: true });
  } catch { /* nothing to delete */ }
}

/** Save a login. Falls back to the private file when the keychain refuses. Returns where it went. */
export function saveLogin(session: Omit<Session, "store" | "saved_at" | "version">, secret: Secret, want: "auto" | StoreKind = "auto"): StoreKind {
  let kind = pickStore(want);
  if (!putSecret(kind, session.base, JSON.stringify(secret))) { kind = "file"; putSecret(kind, session.base, JSON.stringify(secret)); }
  writePrivate(sessionFile(), JSON.stringify({ ...session, version: 1, store: kind, saved_at: Date.now() } satisfies Session, null, 2));
  return kind;
}
export function loadSession(): Session | null {
  try {
    const s = JSON.parse(fs.readFileSync(sessionFile(), "utf8"));
    return s && s.version === 1 && typeof s.base === "string" ? (s as Session) : null;
  } catch { return null; }
}
export function loadSecret(session: Session): Secret | null {
  const raw = getSecret(session.store, session.base);
  if (!raw) return null;
  try { const s = JSON.parse(raw); return s && typeof s.refresh_token === "string" ? (s as Secret) : null; } catch { return null; }
}
export function clearLogin(session: Session | null): void {
  if (session) delSecret(session.store, session.base);
  try { fs.rmSync(sessionFile(), { force: true }); } catch { /* already gone */ }
}
