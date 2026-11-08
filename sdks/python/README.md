# algohash-mcp

Typed client for the AlgoHash Studio, Team and Open API MCP servers. Python 3.9+, standard library only.

```bash
pip install algohash-mcp
```

```python
import os
from algohash_mcp import StudioClient

studio = StudioClient(os.environ["ALGOHASH_STUDIO_KEY"], key_scopes=["read", "edit"])
r = studio.core.list_assets({"pillar": "avatars"})
print(r.status, r.data)
```

Paid and public steps return an approval request. `call_with_approval` asks your approver and never
approves on its own. By default one tap on the approval card (or a yes in chat) approves. When the key owner turns on
"Only I can approve paid and risky steps", only they can approve, on the AlgoHash link the request
carries, and the helper waits for that decision. Keys are sent only in the `Authorization` header over HTTPS, never printed or pickled.

Docs: [SDK guide](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/sdk-python.md) · [permissions](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/permissions.md) ·
[approvals](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/approvals.md) · [security](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/security.md) · [tool reference](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/reference/)

License: MIT
