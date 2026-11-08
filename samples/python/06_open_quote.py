"""Open API: catalog -> quote -> (ask) -> generate -> poll."""
import sys
import time

from _env import Ask, ask_human, open_client

o = open_client()
op = o.list_models(kind="image").unwrap()["models"][0]["op"]
q = o.quote(op=op, args={}).unwrap()
print(f"{op}: {q['price_hwt']} HWT")
if not ask_human(Ask("confirmation", "generate", op, fee_hwt=q["price_hwt"])):
    sys.exit(0)
job = o.generate(op=op, inputs={"prompt": "a paper boat on a pond"}).unwrap()
for _ in range(30):
    st = o.job_status(job_id=job["job_id"]).unwrap()
    if st.get("status") in ("completed", "failed", "error"):
        print(st)
        break
    time.sleep(2)
