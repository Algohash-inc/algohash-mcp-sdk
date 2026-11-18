// Run a ready-made playbook. The server drives the flow (storyboard, quote, render); you relay what
// the user says. This sample starts a run, prints what to ask the user, then cancels it, so nothing
// is spent. Set ALGOHASH_PLAYBOOK_KEEP=1 to leave the run open and continue it yourself.
import { studio, show, MOCK } from "./_env.mjs";

const s = studio();
const list = await s.playbook.list();
show("list", list);
const books = list.data?.playbooks ?? [];
for (const p of books) console.log(`- ${p.id}: ${p.title} (asks: ${(p.inputs ?? []).map((i) => i.name).join(", ")})`);

const id = process.env.ALGOHASH_PLAYBOOK ?? books[0]?.id ?? (MOCK ? "mock_playbook" : "");
if (!id) { console.log("No playbook is available for this account."); process.exit(0); }

// `inputs` are the user's answers to the questions that `list` returned, as JSON.
const inputs = JSON.parse(process.env.ALGOHASH_PLAYBOOK_INPUTS ?? "{}");
const run = await s.playbook.start({ playbook: id, inputs });
show("start", run);
if (!run.ok) process.exit(1);
const runId = run.data?.run_id ?? "run_mock";

// Every result says what to tell the user (`ask_user`) and what to call next (`next`).
// Send `approve: true` with `step` only after the user has seen the storyboard and said yes.
console.log("ask_user:", run.data?.ask_user ?? "(nothing yet)");
show("step", await s.playbook.step({ run_id: runId }));          // no reply = keep waiting
show("status", await s.playbook.status({ run_id: runId }));

if (process.env.ALGOHASH_PLAYBOOK_KEEP !== "1") show("cancel", await s.playbook.cancel({ run_id: runId }));
