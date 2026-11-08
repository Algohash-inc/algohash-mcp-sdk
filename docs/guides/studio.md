# Studio guide

Studio MCP operates **your own** Studio account: characters, scenes and props, generated images and
videos, storyboards, the shot-by-shot editor, motion templates, outputs and social publishing.

## Map of the tools

| Group (SDK) | Tool | Use it for |
|---|---|---|
| `core` | `studio` | Asset library, image generation, scene templates, ad wizard, productions, audio, Instagram, motion graphics, the motion template library |
| `create` | `studio_create` | The Create page (steps 1–4), cinematic cut and highlight cut |
| `project` `shots` `layers` `audio` `director` `export` `library` | `studio_project` … | The editor: projects, shots, overlay layers, the audio plan, the AI director, export, folders |
| `clipper` | `studio_clipper` | Long video → ranked short clips |
| `talkReel` | `studio_talk_reel` | Talking-head reel: captions, motion text, sound effects |
| `footage` | `studio_footage` | One-sentence auto-edit of uploaded footage |
| `collage` / `paper` | `studio_collage` / `studio_paper` | Paper-collage one-take videos and paper-craft explainers (call `guide` first) |
| `compiler` / `longcut` | `studio_compiler` / `studio_longcut` | Script compiler, long-video joining |
| `assets` | `studio_assets` | Details of one character, scene or prop: versions, images, memory, voice |
| `outputs` | `studio_outputs` | **The only place to get finished files** (signed download links, previews) |
| `storyboard` | `studio_storyboard` | Play a storyboard, revise it, record the user's approval |
| `cast` | `studio_cast` | Let the user pick the lead character |
| `confirm` | `studio_confirm` | Quote and permission cards (`show`, `wait`) |
| `browse` | `studio_browse` | Let the user pick a reference from the library |

Every action is listed in the [reference](../reference/studio.md). When unsure, call the tool's `guide`
action (where it has one) and follow `next`.

## Rule 1 — quote before you spend

Paid actions answer `needs_confirmation` first. Use `callWithApproval` and show the user `feeHwt`.

```ts
const quote = await studio.core.estimateCost({ cost_kind: "image", image_resolution: "2K" });   // free
const r = await studio.callWithApproval("studio",
  { action: "generate_image", prompt: "a lighthouse at dawn, watercolor", ratio: "16:9" },
  { approve: (q) => askHuman(`Generate for ${q.feeHwt} HWT?`) });
```

## Rule 2 — every video starts from an approved storyboard

There is no way to render video without one. A render without an approved storyboard returns
`needs_storyboard` with `next` steps.

```
studio_create.storyboard        (edit, free)     write the storyboard
studio_create.storyboard_draw   (spend)          draw it as one image          → approval
studio_storyboard.show          (read)           show it to the user
                                                 the user says "approve"
studio_storyboard.approve       (edit, confirm)  record the approval           → confirm: true
studio.storyboard_video         (edit + spend)   render from the approved plan → approval
studio_outputs.get              (read)           download links
```

```ts
const sb = await studio.create.storyboard({ args: { prompt: "15 s product teaser for a cold-brew can", duration: 15, ratio: "9:16" } });
const version = sb.data.version;

await studio.callWithApproval("studio_create", { action: "storyboard_draw", version }, { approve });
await studio.storyboard.show({ version });
if (await askHuman("Approve this storyboard?")) {
  await studio.storyboard.approve({ version, confirm: true });
  const job = await studio.callWithApproval("studio", { action: "storyboard_video", plan_id: sb.data.plan_id }, { approve });
}
```

`approve` (the storyboard action) records **the user's** decision. Call it only after the user said yes.

## Rule 3 — pick a character when asked

`studio_create.storyboard` / `cut` without a character reference may answer `needs_cast` with a
`pick_id`. In a card host, call `studio_cast.show { args: { pick_id } }`; otherwise send the user the
`pick_url` or ask for the number, then repeat the original call with `args.cast_pick: <pick_id>`. Do not
guess the character. Pass `args.avatar: "none"` only when the user said no character.

## Getting results

Long jobs return an id. Poll the matching status action (`list_jobs`, `cut_status`, `render_status`, …)
or `studio_outputs.get { args: { job_id, wait_sec } }`, which waits up to 20 s and returns signed links.
Links expire; download the files.

## Publishing

Instagram, brand posts, social replies and blog posts need the `publish` scope, usually `confirm: true`,
and often a `needs_permission` round. They are public and cannot be taken back. Ask first, every time.
