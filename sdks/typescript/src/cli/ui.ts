// Terminal UI for the AlgoHash CLI. Zero dependencies.
//
// Three render levels, picked once from the environment:
//   rich   — a TTY with colour and Unicode: brand header, steps, QR code, live status line.
//   plain  — a TTY without Unicode or colour (old Windows console, NO_COLOR, TERM=dumb): same steps, ASCII only.
//   lines  — not a TTY (pipe, CI log): one fact per line, no cursor movement, nothing redrawn.

/** `cols` is clamped to 40–100 for text layout; `width` is the real terminal width. */
export interface Caps { tty: boolean; color: boolean; unicode: boolean; cols: number; rows: number; width: number }

export function detectCaps(stream: NodeJS.WriteStream = process.stdout, env: NodeJS.ProcessEnv = process.env): Caps {
  const tty = !!stream.isTTY && env.TERM !== "dumb";
  const forced = env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "0";
  const color = !("NO_COLOR" in env && env.NO_COLOR !== "") && (forced || tty);
  let unicode: boolean;
  if (process.platform === "win32") {
    // Windows Terminal, VS Code, and modern shells draw Unicode; the legacy console host often does not.
    unicode = !!(env.WT_SESSION || env.TERM_PROGRAM === "vscode" || env.TERMINAL_EMULATOR || env.ConEmuTask || /^xterm|^cygwin|^msys/.test(env.TERM || ""));
  } else {
    const loc = env.LC_ALL || env.LC_CTYPE || env.LANG || "";
    unicode = env.TERM !== "linux" && (loc === "" || /utf-?8/i.test(loc));
  }
  if (env.ALGOHASH_ASCII === "1") unicode = false;
  return { tty, color, unicode, cols: Math.max(40, Math.min(stream.columns || 80, 100)), rows: stream.rows || 24, width: stream.columns || 80 };
}

// Big wordmark for wide terminals (ASCII only, so it also works without Unicode).
const BANNER = String.raw`
__________________________________________________________________________________________________________________________________________________
 ______/\\\\\\______/\\\___________/\\\\\\\\\\\_____/\\\\\\\\\\\\_____/\\\_______/\\\_______/\\\\\\_______/\\\\\\\\\\\\___/\\\_______/\\\_________
  _____/\\\//\\\____\/\\\__________/\\\////////_____/\\\////////\\\___\/\\\______\/\\\______/\\\//\\\_____/\\\/////////___\/\\\______\/\\\________
   ____/\\\_\//\\\___\/\\\_________/\\\_____________/\\\_______\//\\\__\/\\\______\/\\\_____/\\\_\//\\\___\/\\\____________\/\\\______\/\\\_______
    ___/\\\___\//\\\__\/\\\________\/\\\__/\\\\\\\__\/\\\________\/\\\__\/\\\\\\\\\\\\\\____/\\\___\//\\\__\//\\\\\\\\\\\\__\/\\\\\\\\\\\\\\______
     __\/\\\____\/\\\__\/\\\________\/\\\_\///////\\_\/\\\________\/\\\__\/\\\////////\\\___\/\\\____\/\\\___\///////////\\\_\/\\\////////\\\_____
      __/\\\_____\//\\\_\/\\\________\//\\\______\/\\_\/\\\\_______/\\\\__\/\\\______\/\\\___/\\\_____\//\\\____________\/\\\_\/\\\______\/\\\____
       _/\\\_______\//\\\\//\\\\\\\\\\\\//\\\\\\\\\\\\_\///\\\\\\\\\\\\/___\/\\\______\/\\\__/\\\_______\//\\\_/\\\\\\\\\\\\\__\/\\\______\/\\\___
        \///_________\///__\///////////__\////////////____\////////////_____\///_______\///__\///_________\///_\/////////////___\///_______\///___`
  .split("\n").slice(1);
export const BANNER_WIDTH = Math.max(...BANNER.map((l) => l.length));
// Blue → violet ramp across the wordmark (256-colour), same family as the small header.
const BANNER_RAMP = [39, 39, 45, 45, 75, 75, 111, 111, 147, 147, 183];

const ESC = "\x1b[";
export class Paint {
  constructor(readonly caps: Caps) {}
  private w(code: string, s: string): string { return this.caps.color ? `${ESC}${code}m${s}${ESC}0m` : s; }
  bold(s: string) { return this.w("1", s); }
  dim(s: string) { return this.w("2", s); }
  blue(s: string) { return this.w("38;5;75", s); }
  green(s: string) { return this.w("38;5;78", s); }
  amber(s: string) { return this.w("38;5;214", s); }
  red(s: string) { return this.w("38;5;203", s); }
  white(s: string) { return this.w("97", s); }
  /** Brand wordmark: a short blue gradient when colour is on. */
  brand(): string {
    const mark = this.caps.unicode ? "Λ" : "A";
    if (!this.caps.color) return `${mark}  AlgoHash`;
    const ramp = [39, 39, 45, 75, 75, 111, 111, 147];
    const word = "AlgoHash".split("").map((ch, i) => `${ESC}1;38;5;${ramp[i]}m${ch}`).join("") + `${ESC}0m`;
    return `${ESC}1;97m${mark}${ESC}0m  ${word}`;
  }
}

// Visible width: strips ANSI, counts wide (CJK) characters as 2.
export function width(s: string): number {
  const plain = s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  let n = 0;
  for (const ch of plain) {
    const c = ch.codePointAt(0) as number;
    n += (c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6))) ? 2 : 1;
  }
  return n;
}
const padEnd = (s: string, n: number) => s + " ".repeat(Math.max(0, n - width(s)));

export class Screen {
  readonly p: Paint;
  private lines = 0;            // lines written since mark()
  private marked = false;
  private live = "";            // current live line text (TTY only)
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private hidden = false;
  constructor(readonly caps: Caps, private readonly out: NodeJS.WriteStream = process.stdout) { this.p = new Paint(caps); }

  get rich(): boolean { return this.caps.tty && this.caps.unicode; }
  get interactive(): boolean { return this.caps.tty; }

  line(s = ""): void {
    this.out.write(s + "\n");
    if (this.marked) this.lines += 1;
  }
  blank(): void { this.line(""); }

  /**
   * The big wordmark fits: a terminal at least as wide as the banner, and tall enough that the
   * `below` rows printed after the header (for login: the full-size QR, link, code box) stay on
   * screen. The QR matters more than the logo, so the logo gives way first.
   */
  bigHeader(below = 0): boolean {
    return this.caps.tty && process.env.ALGOHASH_BANNER !== "0" && this.caps.width >= BANNER_WIDTH + 2
      && this.caps.rows >= BANNER.length + 4 + below;
  }
  /** Text rows header() prints for the same `below`. */
  headerRows(below = 0): number { return this.bigHeader(below) ? BANNER.length + 4 : 4; }

  header(right: string, below = 0): void {
    if (this.bigHeader(below)) {
      this.blank();
      for (const l of BANNER) {
        if (!this.caps.color) { this.line(" " + l); continue; }
        let s = " ";
        for (let i = 0; i < l.length; i++) {
          const ch = l[i];
          if (ch === "_" || ch === " ") s += `${ESC}38;5;238m${ch}`;
          else s += `${ESC}1;38;5;${BANNER_RAMP[Math.floor((i / BANNER_WIDTH) * BANNER_RAMP.length)]}m${ch}`;
        }
        this.line(s + `${ESC}0m`);
      }
      this.blank();
      this.line("  " + this.p.dim(right));
      this.blank();
      return;
    }
    const left = `  ${this.p.brand()}`;
    const gap = Math.max(2, Math.min(this.caps.cols, 64) - width(left) - width(right) - 2);
    this.blank();
    this.line(left + " ".repeat(gap) + this.p.dim(right));
    this.line("  " + this.p.dim((this.caps.unicode ? "─" : "-").repeat(Math.min(this.caps.cols, 64) - 4)));
    this.blank();
  }
  step(n: number, title: string, hint?: string): void {
    const num = this.caps.color ? `${ESC}1;38;5;75m${n}${ESC}0m` : `${n}.`;
    this.line(`  ${num}  ${this.p.bold(title)}`);
    if (hint) this.line(`     ${this.p.dim(hint)}`);
  }
  /** The short code, in a box the eye lands on. */
  codeBox(code: string): void {
    const dash = this.caps.unicode ? "\u2013" : "-";
    const spaced = code.split("-").map((part) => part.split("").join(" ")).join(`   ${dash}   `);
    const inner = `   ${spaced}   `;
    const [tl, tr, bl, br, h, v] = this.caps.unicode ? ["╭", "╮", "╰", "╯", "─", "│"] : ["+", "+", "+", "+", "-", "|"];
    const edge = (s: string) => this.p.blue(s);
    this.line("     " + edge(tl + h.repeat(width(inner)) + tr));
    this.line("     " + edge(v) + this.p.bold(this.p.white(inner)) + edge(v));
    this.line("     " + edge(bl + h.repeat(width(inner)) + br));
  }
  kv(rows: [string, string][]): void {
    const w = Math.max(...rows.map(([k]) => width(k)));
    for (const [k, v] of rows) this.line(`    ${this.p.dim(padEnd(k, w))}   ${v}`);
  }
  ok(s: string): void { this.line(`  ${this.p.green(this.caps.unicode ? "✔" : "[ok]")} ${this.p.bold(s)}`); }
  bad(s: string): void { this.line(`  ${this.p.red(this.caps.unicode ? "✖" : "[x]")} ${this.p.bold(s)}`); }
  note(s: string): void { this.line(`  ${this.p.dim(s)}`); }

  /** Remember this point: collapse() later removes everything printed after it (when it still fits on screen). */
  mark(): void { this.marked = true; this.lines = 0; }
  collapse(): boolean {
    if (!this.marked) return false;
    const n = this.lines;
    this.marked = false; this.lines = 0;
    if (!this.caps.tty || n <= 0 || n >= this.caps.rows - 1) return false;
    this.out.write(`${ESC}${n}A${ESC}0J`);
    return true;
  }

  // ── live status line ───────────────────────────────────────────────────────
  /** Start or update the live line. In `lines` mode each distinct text is printed once. */
  status(text: string, right = ""): void {
    if (!this.caps.tty) {
      if (text !== this.live) { this.live = text; this.out.write(text + "\n"); }
      return;
    }
    this.live = text; this.liveRight = right;
    if (!this.timer) {
      if (!this.hidden) { this.out.write(`${ESC}?25l`); this.hidden = true; }
      this.timer = setInterval(() => this.draw(), 90);
      this.draw();
    }
  }
  private liveRight = "";
  private draw(): void {
    const frames = this.caps.unicode ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] : ["|", "/", "-", "\\"];
    const spin = this.p.blue(frames[this.frame++ % frames.length]);
    const left = `  ${spin} ${this.live}`;
    const gap = Math.max(2, Math.min(this.caps.cols, 64) - width(left) - width(this.liveRight) - 2);
    this.out.write(`\r${ESC}2K${left}${this.liveRight ? " ".repeat(gap) + this.p.dim(this.liveRight) : ""}`);
  }
  /** Stop the live line and clear it. */
  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; this.out.write(`\r${ESC}2K`); }
    if (this.hidden) { this.out.write(`${ESC}?25h`); this.hidden = false; }
    this.live = "";
  }
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
