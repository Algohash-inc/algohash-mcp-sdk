# Changelog

All notable changes are listed here. Versions follow [Semantic Versioning](https://semver.org).

## 0.2.0 — 2026-11-18

Spec, wrappers, reference and docs brought in step with the live servers.

- **Terminal login.** `npx @algohash/mcp login` signs a terminal in with your phone: check the code,
  approve with Face ID in AlgoHash, and the CLI stores the login (Keychain, system keyring or a
  `0600` file). Covers Studio and Team. Spending stays off until you turn it on per terminal. New
  commands `status`, `logout`, `token`, `headers`. See [docs/terminal-login.md](docs/terminal-login.md).
- **npm:** `@algohash/mcp` is published, with the `algohash` command.
- **Studio: 24 tools, 343 actions** (was 22 / 329).
  - New tool `studio_manual`: the server's own manual (rules, errors, recipes, per-tool help). Free,
    no scope needed.
  - New tool `studio_playbook` (`list`, `start`, `step`, `status`, `cancel`): one request runs a
    ready-made flow; the server drives storyboard, quote and render.
  - `studio.extract_music` + `extract_music_status`: split the background music out of a library audio
    or video asset and get a text beat map for cutting on the beat.
  - `studio.lip_sync` and `studio.avatar_video`: lip sync on an existing clip, and a talking-head
    video from one photo and a voice track.
  - Storyboard dialogue sheet: `studio_storyboard.dialogue`, `dialogue_set`, `dialogue_plan`, plus
    `dialogue_language` / `speakers` on `studio_create.storyboard` and `storyboard_revise`.
  - `studio_storyboard.overview`: every frame of a multi-act film on one sheet.
  - Card-free twins on `studio_create` for agents: `storyboard_approve`, `storyboard_dialogue`,
    `storyboard_dialogue_set`, `storyboard_dialogue_plan`, `wait_job`, `wait_approval`.
    `studio_confirm.wait` still works; in card hosts prefer `studio_create.wait_approval`.
  - Comment → DM flows: `social_dm_media` and `social_dm_flow_delete`; `social_dm_flow_save` accepts
    `ig_user_id` and `sources`.
  - Paper explainer: layouts, end card, own narration track (`studio_paper.plan`, `edit`, `voice`).
- **Team: 7 tools, 71 actions** (was 6 / 70). New `team.set_plus`: Plus mode per teammate. New tool
  `team_manual`, the same manual for Team.
- Install instructions: Go module, `npm install @algohash/mcp`, pip from Git. The PyPI package is not
  published yet.
- README: three-step connector setup for Claude and ChatGPT, link to the full setup guide.
- New samples `08-playbook.mjs` and `08_playbook.py`. Studio guide covers playbooks, the dialogue
  sheet, multi-act overviews, music extraction, lip sync and talking avatars.
- Client version strings are `0.2.0`. No breaking change in the client API.

## 0.1.0 — 2026-11-08

First public release.

- Interface spec for the Studio (22 tools), Team (6 tools) and Open API (5 tools) MCP servers, with
  per-action scopes and flags.
- TypeScript, Python and Go clients with generated per-tool wrappers, local scope preflight
  (`canCall`, `allowedActions`), batch calls, and `callWithApproval` for the approval protocol.
- Hardened transport: HTTPS only (except `localhost`), no redirects, response size cap, keys never
  printed or serialized.
- Local mock server, permissions scanner, code generator and leak scanner.
- Docs, generated tool reference, samples in all three languages, MCP host configs.
- README in 8 languages. Approval docs cover owner approval on AlgoHash (`approve_url`,
  `awaiting_approval`, the "Only I can approve paid and risky steps" key setting).
- Owner approval in all three SDKs: `ApprovalRequest` carries `approval` ("user" | "agent") and
  `approveUrl`; for "user" the helper waits with `studio_confirm.wait` / `team_confirm.wait`
  (`maxWaitSec`, default 300) and returns `awaiting_approval` on timeout. Approval links on another
  origin are dropped. New status `awaiting_approval`. Team spec adds `team_confirm.wait` (70 actions).
- Mock server: owner-approval flow with an approve page (`MOCK_APPROVE_VIA_PAGE=1`,
  `MOCK_DECLINE=1`, `*_agentapproval` keys).
