# Python SDK

`algohash-mcp` — Python 3.9+, standard library only (synchronous, `urllib`).

```bash
pip install algohash-mcp
```

## Clients

```python
import os
from algohash_mcp import StudioClient, TeamClient, OpenClient

studio = StudioClient(os.environ["ALGOHASH_STUDIO_KEY"])
team   = TeamClient(os.environ["ALGOHASH_TEAM_KEY"])
open_  = OpenClient(os.environ["ALGOHASH_OPEN_KEY"])
```

Keyword options: `access_token`, `key_scopes`, `endpoint`, `timeout` (seconds, default 120),
`retry_rate_limited` (default 2), `max_response_bytes` (32 MiB), `protocol_version`, `client_info`,
`headers` (cannot override `Authorization`).

## Calling actions

```python
studio.core.list_assets(pillar="avatars")                  # studio.list_assets
studio.create.storyboard(args={"prompt": "…"})             # studio_create.storyboard
studio.create.storyboard({"args": {"prompt": "…"}})        # same, params as a dict
team.core.overview()
open_.quote(op="…", args={})
studio.call("studio_create", {"action": "storyboard", "args": {"prompt": "…"}})   # raw
```

Action names that are Python keywords get a trailing underscore (none today, but the generator handles it).

## Results

```python
r = studio.core.list_gallery(kind="outputs")
if r.status == "ok":
    print(r.data)
elif r.status == "needs_confirmation":
    print(r.fee_hwt, r.confirm_token)
else:
    print(r.code, r.message)
data = r.unwrap()          # raises AlgoHashError unless ok
r.images, r.links, r.next, r.untrusted_fields
```

## Approvals

```python
def approve(q):            # q.kind, q.fee_hwt, q.summary, q.tool, q.action, q.args, q.approval, q.approve_url
    if q.approval == "user":   # the owner approves on AlgoHash; True = wait for that decision
        print("Approve here:", q.approve_url)
    return input(f"Spend {q.fee_hwt} HWT on {q.tool}.{q.action}? [y/N] ").strip().lower() == "y"

r = studio.call_with_approval("studio", {"action": "generate_image", "prompt": "…"}, approve=approve,
                              max_wait_sec=300)
# r.status: "ok" | "declined" | "awaiting_approval" (r.approve_url, r.confirm_token) | …
```

`card=True` (Studio) shows the approval card and waits for the decision. See
[Approvals](approvals.md#the-sdk-helper) for what `True` means.

## Permissions

```python
studio.required_scopes("studio", "generate_image")    # ("spend",)
studio.can_call("studio", "generate_image", ["read"]) # False
studio.allowed_actions(["read", "edit"])              # {"allowed": [...], "denied": [...]}
```

## Other methods

`initialize()`, `instructions()`, `ping()`, `list_tools()`, `batch([(tool, args), ...])` (≤ 20), `rpc(method, params)`.

Clients are not thread-safe; use one per thread. They cannot be pickled (they hold a key).
