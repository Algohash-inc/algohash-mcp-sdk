"""Paid: estimate -> generate (asks a human first) -> download links."""
import sys

from _env import ask_human, show, studio

s = studio()
show("estimate", s.core.estimate_cost(cost_kind="image", image_resolution="1K"))
r = s.call_with_approval("studio", {"action": "generate_image", "prompt": "a lighthouse at dawn, watercolor",
                                    "ratio": "16:9", "image_resolution": "1K"}, approve=ask_human)
show("generate_image", r)
if r.status != "ok":
    sys.exit(0 if r.status == "declined" else 1)
d = r.data or {}
if d.get("output_ids") or d.get("output_id"):
    show("outputs", s.outputs.get(args={"output_ids": d.get("output_ids") or [d["output_id"]], "wait_sec": 20}))
elif d.get("job_id"):
    show("job", s.outputs.get(args={"job_id": d["job_id"], "wait_sec": 20}))
