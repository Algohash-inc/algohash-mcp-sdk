// Open API: catalog → quote → (ask) → generate → poll.
import { open, askHuman, show } from "./_env.mjs";

const o = open();
const models = (await o.listModels({ kind: "image" })).unwrap().models;
const op = models[0].op;
const q = (await o.quote({ op, args: {} })).unwrap();
console.log(`${op}: ${q.price_hwt} HWT`);

if (!(await askHuman({ kind: "confirmation", tool: "generate", action: op, feeHwt: q.price_hwt }))) process.exit(0);
const job = (await o.generate({ op, inputs: { prompt: "a paper boat on a pond" } })).unwrap();
for (let i = 0; i < 30; i++) {
  const st = (await o.jobStatus({ job_id: job.job_id })).unwrap();
  if (["completed", "failed", "error"].includes(st.status)) { console.log(st); break; }
  await new Promise((r) => setTimeout(r, 2000));
}
