"""Team: overview, then deploy work to a group (always needs approval)."""
import datetime
import os

from _env import ask_human, show, team

t = team()
o = t.core.overview()
show("overview", o)
rooms = (o.data or {}).get("rooms") or [{"id": 1}]
room_id = int(os.environ.get("ALGOHASH_ROOM_ID") or rooms[0]["id"])
r = t.call_with_approval("team_deploy", {"action": "deploy", "room_id": room_id, "brief": "Weekly competitor brief, five bullets",
                                         "client_ref": f"sample-{datetime.date.today()}"}, approve=ask_human)
show("deploy", r)
show("runs", t.deploy.runs(room_id=room_id))
