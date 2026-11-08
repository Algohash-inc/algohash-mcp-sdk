"""What can this key do? ALGOHASH_STUDIO_SCOPES=read,edit python samples/python/01_permissions.py"""
import os
from collections import Counter

from _env import studio

s = studio()
scopes = os.environ.get("ALGOHASH_STUDIO_SCOPES", "read,edit,spend").split(",")
print(f"{len(s.list_tools())} tools on {s.endpoint}")
m = s.allowed_actions(scopes)
print(f"With {scopes}: {len(m['allowed'])} allowed, {len(m['denied'])} denied")
for tool, n in Counter(k.split(".")[0] for k in m["denied"]).items():
    print(f"  {tool:20} {n} denied")
