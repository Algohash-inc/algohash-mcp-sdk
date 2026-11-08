// Team: overview, then deploy work to a group (always needs approval).
import { team, askHuman, show } from "./_env.mjs";

const t = team();
const o = await t.core.overview();
show("overview", o);
const roomId = Number(process.env.ALGOHASH_ROOM_ID || o.data?.rooms?.[0]?.id || 1);

const r = await t.callWithApproval("team_deploy",
  { action: "deploy", room_id: roomId, brief: "Weekly competitor brief, five bullets", client_ref: `sample-${new Date().toISOString().slice(0, 10)}` },
  { approve: askHuman });
show("deploy", r);
show("runs", await t.deploy.runs({ room_id: roomId }));
