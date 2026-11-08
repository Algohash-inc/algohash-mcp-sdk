"""Read-only: characters and recent outputs."""
from _env import show, studio

s = studio()
show("characters", s.core.list_assets(pillar="avatars"))
show("outputs", s.core.list_gallery(kind="outputs", limit=5))
