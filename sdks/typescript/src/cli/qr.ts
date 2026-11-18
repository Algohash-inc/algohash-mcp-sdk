// Minimal QR Code encoder for the terminal login screen. Zero dependencies.
// Byte mode, error correction L or M, versions 1–10 (up to 271 bytes at L, 213 at M):
// plenty for a verification URL. Follows ISO/IEC 18004; structure after the
// public-domain reference by Project Nayuki.

export type Ecc = "L" | "M";
export interface QrCode { size: number; version: number; mask: number; modules: boolean[][] }

// [ecc codewords per block, number of blocks] per version (index = version).
const ECC_PER_BLOCK: Record<Ecc, number[]> = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
};
const NUM_BLOCKS: Record<Ecc, number[]> = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
};
const FORMAT_BITS: Record<Ecc, number> = { L: 1, M: 0 };
const MAX_VERSION = 10;

function rawDataModules(ver: number): number {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const a = Math.floor(ver / 7) + 2;
    n -= (25 * a - 10) * a - 55;
    if (ver >= 7) n -= 36;
  }
  return n;
}
const dataCodewords = (ver: number, ecc: Ecc) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ecc][ver] * NUM_BLOCKS[ecc][ver];

// ── Reed–Solomon over GF(2^8), polynomial 0x11D ──────────────────────────────
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const out = new Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < out.length; j++) {
      out[j] = gfMul(out[j], root);
      if (j + 1 < out.length) out[j] ^= out[j + 1];
    }
    root = gfMul(root, 2);
  }
  return out;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const out = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (out.shift() as number);
    out.push(0);
    divisor.forEach((coef, i) => { out[i] ^= gfMul(coef, factor); });
  }
  return out;
}

function addEccAndInterleave(data: number[], ver: number, ecc: Ecc): number[] {
  const numBlocks = NUM_BLOCKS[ecc][ver];
  const blockEcc = ECC_PER_BLOCK[ecc][ver];
  const raw = Math.floor(rawDataModules(ver) / 8);
  const numShort = numBlocks - (raw % numBlocks);
  const shortLen = Math.floor(raw / numBlocks);
  const blocks: number[][] = [];
  const div = rsDivisor(blockEcc);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - blockEcc + (i < numShort ? 0 : 1));
    k += dat.length;
    const rem = rsRemainder(dat, div);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(rem));
  }
  const out: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - blockEcc || j >= numShort) out.push(block[i]);
    });
  }
  return out;
}

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

function alignmentPositions(ver: number): number[] {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const size = ver * 4 + 17;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

/** Encode text (UTF-8) as a QR code. Throws when it does not fit in version 10. */
export function encodeQr(text: string, opts: { ecc?: Ecc; mask?: number } = {}): QrCode {
  const ecc: Ecc = opts.ecc ?? "M";
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1;
  for (; ; ver++) {
    if (ver > MAX_VERSION) throw new Error("text too long for a QR code");
    const countBits = ver < 10 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCodewords(ver, ecc) * 8) break;
  }
  // Bit stream: mode 0100, count, data, terminator, byte padding, pad bytes.
  const bits: number[] = [];
  const push = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capacity = dataCodewords(ver, ecc) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const all = addEccAndInterleave(data, ver, ecc);

  const size = ver * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; isFn[y][x] = true; };

  const drawFormat = (mask: number) => {
    const d = (FORMAT_BITS[ecc] << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(f, i));
    setFn(8, 7, bit(f, 6)); setFn(8, 8, bit(f, 7)); setFn(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(f, i));
    setFn(8, size - 8, true);
  };
  // Function patterns.
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
    }
  }
  const ap = alignmentPositions(ver);
  for (let i = 0; i < ap.length; i++) for (let j = 0; j < ap.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const v = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(a, b, bit(v, i)); setFn(b, a, bit(v, i));
    }
  }
  // Codewords in the zigzag.
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && k < all.length * 8) { modules[y][x] = bit(all[k >>> 3], 7 - (k & 7)); k++; }
      }
    }
  }
  const applyMask = (m: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (isFn[y][x]) continue;
      let inv = false;
      switch (m) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      if (inv) modules[y][x] = !modules[y][x];
    }
  };
  const penalty = (): number => {
    let p = 0;
    const lines: boolean[][] = [];
    for (let y = 0; y < size; y++) lines.push(modules[y]);
    for (let x = 0; x < size; x++) lines.push(modules.map((row) => row[x]));
    for (const line of lines) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && line[i] === line[i - 1]) run++;
        else { if (run >= 5) p += run - 2; run = 1; }
      }
      // Finder-like 1:1:3:1:1 with 4 light modules on either side.
      const s = line.map((d) => (d ? "1" : "0")).join("");
      for (const pat of ["10111010000", "00001011101"]) for (let i = s.indexOf(pat); i >= 0; i = s.indexOf(pat, i + 1)) p += 40;
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) p += 3;
    }
    let dark = 0;
    for (const row of modules) for (const c of row) if (c) dark++;
    p += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
    return p;
  };
  let mask = opts.mask ?? -1;
  if (mask < 0 || mask > 7) {
    let best = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      const p = penalty();
      if (p < best) { best = p; mask = m; }
      applyMask(m);
    }
  }
  applyMask(mask); drawFormat(mask);
  return { size, version: ver, mask, modules };
}

/** Text rows a QR code takes in each mode (quiet zone included). */
export function qrRows(qr: QrCode, mode: "full" | "half", margin = 2): number {
  const n = qr.size + margin * 2;
  return mode === "full" ? n : Math.ceil(n / 2);
}

/**
 * Draw a QR code for a terminal, dark modules on an explicit white quiet zone (scans on any theme).
 *
 * Colour comes from cell BACKGROUNDS wherever possible. Many terminals leave a gap between text
 * rows (line height > 1) and do not stretch block glyphs into it, so a code drawn with foreground
 * "█" glyphs shows light stripes through every dark row and phones cannot read it.
 *   full — one text row per module row, two spaces per module, backgrounds only. No glyphs at all,
 *          so line spacing cannot break it. Twice as tall as `half`.
 *   half — two module rows per text row: a uniform cell is a space on that background; a mixed cell
 *          is "▀" with the top colour as foreground and the bottom colour as background.
 */
export function renderQr(qr: QrCode, opts: { margin?: number; indent?: string; mode?: "full" | "half" } = {}): string[] {
  const m = opts.margin ?? 2;
  const n = qr.size + m * 2;
  const at = (x: number, y: number) => {
    const xx = x - m, yy = y - m;
    return xx >= 0 && yy >= 0 && xx < qr.size && yy < qr.size && qr.modules[yy][xx];
  };
  const BG = (dark: boolean) => (dark ? "\x1b[48;5;16m" : "\x1b[48;5;231m");
  const FG = (dark: boolean) => (dark ? "\x1b[38;5;16m" : "\x1b[38;5;231m");
  const RESET = "\x1b[0m";
  const lines: string[] = [];
  if (opts.mode === "full") {
    for (let y = 0; y < n; y++) {
      let s = "", cur: boolean | null = null;
      for (let x = 0; x < n; x++) { const d = at(x, y); if (d !== cur) { s += BG(d); cur = d; } s += "  "; }
      lines.push((opts.indent ?? "") + s + RESET);
    }
    return lines;
  }
  for (let y = 0; y < n; y += 2) {
    let s = "";
    for (let x = 0; x < n; x++) {
      const top = at(x, y), bot = y + 1 < n ? at(x, y + 1) : false;
      s += top === bot ? BG(top) + " " : BG(bot) + FG(top) + "▀";
    }
    lines.push((opts.indent ?? "") + s + RESET);
  }
  return lines;
}
