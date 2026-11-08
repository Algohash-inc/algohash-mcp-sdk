// Paid: estimate → generate (asks a human first) → download links.
import { studio, askHuman, show } from "./_env.mjs";

const s = studio();
show("estimate", await s.core.estimateCost({ cost_kind: "image", image_resolution: "1K" }));

const r = await s.callWithApproval("studio",
  { action: "generate_image", prompt: "a lighthouse at dawn, watercolor", ratio: "16:9", image_resolution: "1K" },
  { approve: askHuman });
show("generate_image", r);
if (r.status !== "ok") process.exit(r.status === "declined" ? 0 : 1);

const ids = r.data?.output_ids ?? (r.data?.output_id ? [r.data.output_id] : []);
if (ids.length) show("outputs", await s.outputs.get({ args: { output_ids: ids, wait_sec: 20 } }));
else if (r.data?.job_id) show("job", await s.outputs.get({ args: { job_id: r.data.job_id, wait_sec: 20 } }));
