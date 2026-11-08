// What can this key do? Lists the live tools and splits every action by the key's scopes.
//   ALGOHASH_STUDIO_SCOPES=read,edit node samples/typescript/01-permissions.mjs
import { studio } from "./_env.mjs";

const s = studio();
const scopes = process.env.ALGOHASH_STUDIO_SCOPES?.split(",") ?? ["read", "edit", "spend"];
const tools = await s.listTools();
console.log(`${tools.length} tools on ${s.endpoint}`);

const { allowed, denied } = s.allowedActions(scopes);
console.log(`With [${scopes.join(", ")}]: ${allowed.length} actions allowed, ${denied.length} denied.`);
const byTool = {};
for (const k of denied) { const t = k.split(".")[0]; byTool[t] = (byTool[t] || 0) + 1; }
for (const [t, n] of Object.entries(byTool)) console.log(`  ${t.padEnd(20)} ${n} denied`);
console.log(`Paid image generation allowed: ${s.canCall("studio", "generate_image", scopes)}`);
