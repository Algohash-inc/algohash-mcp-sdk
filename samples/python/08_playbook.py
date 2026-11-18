"""Run a ready-made playbook. The server drives the flow (storyboard, quote, render); you relay what
the user says. This sample starts a run, prints what to ask the user, then cancels it, so nothing is
spent. Set ALGOHASH_PLAYBOOK_KEEP=1 to leave the run open and continue it yourself."""
import json
import os
import sys

from _env import MOCK, show, studio

s = studio()
books_result = s.playbook.list()
show("list", books_result)
books = (books_result.data or {}).get("playbooks") or []
for p in books:
    print(f"- {p['id']}: {p.get('title')} (asks: {', '.join(i['name'] for i in p.get('inputs') or [])})")

playbook = os.environ.get("ALGOHASH_PLAYBOOK") or (books[0]["id"] if books else ("mock_playbook" if MOCK else ""))
if not playbook:
    sys.exit("No playbook is available for this account.")

# `inputs` are the user's answers to the questions that `list` returned, as JSON.
inputs = json.loads(os.environ.get("ALGOHASH_PLAYBOOK_INPUTS", "{}"))
run = s.playbook.start(playbook=playbook, inputs=inputs)
show("start", run)
if not run.ok:
    sys.exit(1)
run_id = (run.data or {}).get("run_id", "run_mock")

# Every result says what to tell the user (`ask_user`) and what to call next (`next`).
# Send approve=True with `step` only after the user has seen the storyboard and said yes.
print("ask_user:", (run.data or {}).get("ask_user") or "(nothing yet)")
show("step", s.playbook.step(run_id=run_id))          # no reply = keep waiting
show("status", s.playbook.status(run_id=run_id))

if os.environ.get("ALGOHASH_PLAYBOOK_KEEP") != "1":
    show("cancel", s.playbook.cancel(run_id=run_id))
