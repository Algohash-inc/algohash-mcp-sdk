// Read-only: list characters and recent outputs. Works with a read-only key.
import { studio, show } from "./_env.mjs";

const s = studio();
show("characters", await s.core.listAssets({ pillar: "avatars" }));
show("outputs", await s.core.listGallery({ kind: "outputs", limit: 5 }));
