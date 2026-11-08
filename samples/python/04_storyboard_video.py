"""Storyboard first, then video. Every paid step and the storyboard approval ask a human."""
import sys

from _env import Ask, ask_human, show, studio

s = studio()
sb = s.create.storyboard(args={"prompt": "15 s teaser for a cold-brew can", "duration": 15, "ratio": "9:16"})
show("storyboard", sb)
if sb.status == "needs_cast":
    sys.exit(f"Pick a character first: {(sb.data or {}).get('pick_url') or sb.message}")
if not sb.ok:
    sys.exit(1)
version = (sb.data or {}).get("version", "v_mock")
plan_id = (sb.data or {}).get("plan_id", "plan_mock")

drawn = s.call_with_approval("studio_create", {"action": "storyboard_draw", "version": version}, approve=ask_human)
show("storyboard_draw", drawn)
if not drawn.ok:
    sys.exit(0)
show("show", s.storyboard.show(version=version))
if not ask_human(Ask("permission", "studio_storyboard", "approve", "Approve this storyboard for rendering?")):
    sys.exit(0)
show("approve", s.storyboard.approve(version=version, confirm=True))
show("storyboard_video", s.call_with_approval("studio", {"action": "storyboard_video", "plan_id": plan_id}, approve=ask_human))
