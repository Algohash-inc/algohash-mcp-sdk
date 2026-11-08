// Storyboard first, then video. Every paid step and the storyboard approval ask a human.
import { studio, askHuman, show } from "./_env.mjs";

const s = studio();
const sb = await s.create.storyboard({ args: { prompt: "15 s teaser for a cold-brew can", duration: 15, ratio: "9:16" } });
show("storyboard", sb);
if (sb.status === "needs_cast") { console.log("Pick a character first:", sb.data?.pick_url ?? sb.message); process.exit(0); }
if (!sb.ok) process.exit(1);
const version = sb.data?.version ?? "v_mock";
const planId = sb.data?.plan_id ?? "plan_mock";

const drawn = await s.callWithApproval("studio_create", { action: "storyboard_draw", version }, { approve: askHuman });
show("storyboard_draw", drawn);
if (!drawn.ok) process.exit(0);

show("show", await s.storyboard.show({ version }));
const yes = await askHuman({ kind: "permission", tool: "studio_storyboard", action: "approve", message: "Approve this storyboard for rendering?" });
if (!yes) process.exit(0);
show("approve", await s.storyboard.approve({ version, confirm: true }));

const video = await s.callWithApproval("studio", { action: "storyboard_video", plan_id: planId }, { approve: askHuman });
show("storyboard_video", video);
