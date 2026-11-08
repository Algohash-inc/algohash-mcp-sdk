#!/usr/bin/env python3
"""Builds assets/cover.html from the generated background, the official icon and the
official wordmark (taken from assets/hero.svg). Render it to PNG with any headless Chromium:
  python3 assets/cover-src/build_cover.py && \
  chromium --headless=new --hide-scrollbars --window-size=3168,1344 \
    --screenshot=assets/cover-src/cover-full.png file://$PWD/assets/cover-src/cover.html
The image model never draws text or the logo; everything readable is composited here.
Background: a generated 21:9 image saved as cover-bg-raw.png (not committed).
Web copy: resize cover-full.png to 2112x896 and save it as ../cover.jpg (JPEG quality 82)."""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
src = ROOT / "assets" / "cover-src"
hero = (ROOT / "assets" / "hero.svg").read_text()
i = hero.find('<text x="690"')
g = hero[hero.rfind("<g", 0, i):i]
path = re.search(r'<path[^>]*/>', g).group(0)

b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
bg = b64(src / "cover-bg-raw.png")
icon = b64(ROOT / "assets" / "algohash-icon.png")

html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:3168px;height:1344px;overflow:hidden;background:#05070f}}
.stage{{position:relative;width:3168px;height:1344px;
  background:url(data:image/png;base64,{bg}) center/cover no-repeat;
  font-family:-apple-system,'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif;color:#fff}}
.glow{{position:absolute;left:50%;top:50%;width:1700px;height:900px;transform:translate(-50%,-50%);
  background:radial-gradient(ellipse at center,rgba(5,8,20,.72) 0%,rgba(5,8,20,.35) 45%,rgba(5,8,20,0) 70%)}}
.col{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}}
.lock{{display:flex;align-items:center;gap:48px;margin-top:64px}}
.icon{{width:184px;height:184px;border-radius:42px;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.10),0 24px 80px rgba(60,120,255,.35)}}
.wm{{height:104px;width:auto;display:block;opacity:.96}}
h1{{margin:0;font-size:184px;line-height:1;font-weight:800;letter-spacing:-4px;
  background:linear-gradient(90deg,#7dd3fc 0%,#a5b4fc 50%,#c4b5fd 100%);-webkit-background-clip:text;color:transparent}}
p{{margin:44px 0 0;font-size:54px;font-weight:500;color:#c7d2fe;opacity:.92;letter-spacing:-.3px}}
.chips{{display:flex;gap:22px;margin-top:64px}}
.chip{{font-size:38px;font-weight:600;padding:16px 38px;border-radius:999px;color:#e0e7ff;
  background:rgba(255,255,255,.06);border:2px solid rgba(165,180,252,.28)}}
</style></head><body><div class="stage"><div class="glow"></div><div class="col">
<svg class="wm" viewBox="0 -2 1461 176" fill="#ffffff">{path}</svg>
<div class="lock"><img class="icon" src="data:image/png;base64,{icon}"><h1>MCP SDK</h1></div>
<p>Build on AlgoHash from any language, any agent, any AI app.</p>
<div class="chips"><span class="chip">TypeScript</span><span class="chip">Python</span><span class="chip">Go</span></div>
</div></div></body></html>"""
(src / "cover.html").write_text(html)
print("wrote", src / "cover.html")
