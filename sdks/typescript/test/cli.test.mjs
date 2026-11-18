// CLI rendering: the login QR must survive terminals that add line spacing, and the big logo must
// only show when it fits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeQr, renderQr, qrRows } from "../dist/cli/qr.js";
import { Screen, BANNER_WIDTH } from "../dist/cli/ui.js";

const URL52 = "https://console.algohash.ai/mcp/device?code=RJLL-KRQF";

// Read the module grid back from background colours (16 = dark, 231 = light).
function gridFromFull(lines, margin = 2) {
  return lines.map((line) => {
    const row = [];
    let bg = null;
    for (let i = 0; i < line.length;) {
      const m = /^\x1b\[([0-9;]*)m/.exec(line.slice(i));
      if (m) { const p = m[1].split(";"); if (p[0] === "48") bg = p[2] === "16"; i += m[0].length; continue; }
      assert.equal(line.slice(i, i + 2), "  ", "full mode prints two spaces per module, no glyphs");
      row.push(bg); i += 2;
    }
    return row;
  }).slice(margin, -margin).map((r) => r.slice(margin, -margin));
}

test("login link fits a version 3 code with ECC L", () => {
  const qr = encodeQr(URL52, { ecc: "L" });
  assert.equal(qr.size, 29);
  assert.equal(qrRows(qr, "full"), 33);
  assert.equal(qrRows(qr, "half"), 17);
});

test("full mode draws modules with backgrounds only and round-trips", () => {
  const qr = encodeQr(URL52, { ecc: "L" });
  const lines = renderQr(qr, { mode: "full" });
  assert.equal(lines.length, qrRows(qr, "full"));
  assert.doesNotMatch(lines.join(""), /[█▀▄]/);
  assert.deepEqual(gridFromFull(lines), qr.modules.map((r) => r.map(Boolean)));
});

test("half mode uses a glyph only where the two modules differ", () => {
  const qr = encodeQr(URL52, { ecc: "L" });
  const lines = renderQr(qr, { mode: "half" });
  assert.equal(lines.length, qrRows(qr, "half"));
  assert.doesNotMatch(lines.join(""), /[█▄]/);
  const glyphs = (lines.join("").match(/▀/g) || []).length;
  let mixed = 0;
  const n = qr.size + 4, at = (x, y) => x >= 2 && y >= 2 && x < qr.size + 2 && y < qr.size + 2 && !!qr.modules[y - 2][x - 2];
  for (let y = 0; y < n; y += 2) for (let x = 0; x < n; x++) if (at(x, y) !== (y + 1 < n ? at(x, y + 1) : false)) mixed++;
  assert.equal(glyphs, mixed);
});

test("big logo only on a wide, tall TTY", () => {
  const caps = (width, rows, tty = true) => ({ tty, color: true, unicode: true, cols: Math.min(100, width), rows, width });
  const s = (c) => new Screen(c, { write() { return true; } });
  assert.equal(s(caps(BANNER_WIDTH + 2, 80)).bigHeader(30), true);
  assert.equal(s(caps(BANNER_WIDTH + 1, 80)).bigHeader(30), false);
  assert.equal(s(caps(BANNER_WIDTH + 2, 40)).bigHeader(30), false);
  assert.equal(s(caps(BANNER_WIDTH + 2, 80, false)).bigHeader(0), false);
});
