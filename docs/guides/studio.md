# Studio guide

Studio MCP operates **your own** Studio account: characters, scenes and props, generated images and
videos, storyboards, the shot-by-shot editor, motion templates, outputs and social publishing.

## Map of the tools

| Group (SDK) | Tool | Use it for |
|---|---|---|
| `core` | `studio` | Asset library, image generation, scene templates, ad wizard, productions, audio, Instagram and comment → DM flows, motion graphics, the motion template library, music extraction, lip sync, talking avatars |
| `create` | `studio_create` | The Create page (steps 1–4), cinematic cut and highlight cut |
| `project` `shots` `layers` `audio` `director` `export` `library` | `studio_project` … | The editor: projects, shots, overlay layers, the audio plan, the AI director, export, folders |
| `clipper` | `studio_clipper` | Long video → ranked short clips |
| `talkReel` | `studio_talk_reel` | Talking-head reel: captions, motion text, sound effects |
| `footage` | `studio_footage` | One-sentence auto-edit of uploaded footage |
| `collage` / `paper` | `studio_collage` / `studio_paper` | Paper-collage one-take videos and paper-craft explainers (call `guide` first) |
| `compiler` / `longcut` | `studio_compiler` / `studio_longcut` | Script compiler, long-video joining |
| `assets` | `studio_assets` | Details of one character, scene or prop: versions, images, memory, voice |
| `outputs` | `studio_outputs` | **The only place to get finished files** (signed download links, previews) |
| `storyboard` | `studio_storyboard` | Play a storyboard, revise it, record the user's approval, the dialogue sheet, the full-film overview |
| `playbook` | `studio_playbook` | Ready-made flows: one request, the server runs storyboard, quote and render step by step |
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

`studio_storyboard` actions add a card to the chat in card hosts. An agent that only needs the result
can use the card-free twins on `studio_create`: `storyboard_approve`, `storyboard_dialogue`,
`storyboard_dialogue_set`, `storyboard_dialogue_plan`, plus `wait_job` (wait for a render or a drawn
board) and `wait_approval` (wait for the user's tap on a quote or permission card).

### What the film says: the dialogue sheet

The words spoken in the video come from the storyboard's **dialogue sheet**, not from the prompt of
`storyboard_video`. Read it with `studio_storyboard.dialogue`, let AI write it in a given language with
`dialogue_plan { args: { language } }`, or set every line yourself with `dialogue_set`. All three are free.
You can also pass `dialogue_language` / `speakers` to `studio_create.storyboard`.

```ts
await studio.create.storyboardDialoguePlan({ version, args: { language: "English" } });
const sheet = await studio.create.storyboardDialogue({ version });   // [{ who, t0, t1, text, lang }]
```

### Multi-act films

Draw one board per act, then call `studio_storyboard.overview { args: { acts: [{ board, title? }] } }`
once (free). Every frame of the film is laid out on one sheet, saved to the library.

## Playbooks: one request, the whole flow

`studio_playbook` runs a ready-made flow on the server. You ask the user for the inputs, pass their
answers on, and hand over the result. Storyboard approval and quotes still go to the user.

```
studio_playbook.list     what playbooks exist and what each one asks the user
studio_playbook.start    { playbook, inputs }            → run_id + the next step
studio_playbook.step     { run_id, approve | revise | confirm_token | permission_token | cast_pick }
studio_playbook.status   { run_id }
studio_playbook.cancel   { run_id }
```

```ts
const list = await studio.playbook.list();                      // [{ id, title, summary, inputs }]
const run = await studio.playbook.start({ playbook: list.data.playbooks[0].id, inputs: { /* the user's answers */ } });
let step = await studio.playbook.step({ run_id: run.data.run_id });            // still working: call again
step = await studio.playbook.step({ run_id: run.data.run_id, approve: true }); // only after the user said yes
```

Every result carries `ask_user` (what to tell the user) and `next` (the next call). Follow them. A run
is kept for 48 hours.

## Sound and faces

| Action | What it does | Cost |
|---|---|---|
| `studio.extract_music` | Splits the background music out of a library audio or video asset (up to 600 s), saves it, and returns a text **beat map** for cutting on the beat. Poll `extract_music_status` | paid, refunded on failure |
| `studio.lip_sync` | Existing clip (2–10 s) + voice track → only the mouth is redrawn to match the voice | paid, per second |
| `studio.avatar_video` | One photo + voice track (2–300 s) → a new talking-head video | paid, per second of voice |

All three answer `needs_confirmation` first. None of them needs a storyboard.

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

Comment → DM flows (`social_dm_flows`, `social_dm_media`, `social_dm_flow_save`, `social_dm_flow_delete`)
reply to Instagram comments and messages for you: pick a post, a keyword and the steps to send.

Instagram, brand posts, social replies, DM flows and blog posts need the `publish` scope, usually `confirm: true`,
and often a `needs_permission` round. They are public and cannot be taken back. Ask first, every time.
