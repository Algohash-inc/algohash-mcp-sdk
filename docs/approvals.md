# Approvals

Some calls do not run straight away. They come back as a request to ask the user. These are **not
errors**: on the wire they have `isError: false`, and nothing has been charged or published yet.

| `status` | When | What to do |
|---|---|---|
| `needs_confirmation` | A paid step above the confirm threshold (Studio: 50 HWT), or any Team step that spends, applies, deletes or grants risk | Show the price (`feeHwt`) and the summary (hosts with cards show them for you). Once the user approves, repeat the **identical** call plus `confirm_token` |
| `needs_permission` | The account's approval rules say "ask" for this action | Show the summary. Once allowed, repeat the identical call plus `permission_token` |
| `awaiting_approval` | Page-approval keys only: you repeated the call with a token the owner has not approved yet | Nothing ran, nothing was charged, the token is still valid. Wait (`studio_confirm.wait` / `team_confirm.wait`), then repeat |
| `needs_storyboard` | Any video render without an approved storyboard | Follow `next`: storyboard → draw → show → user approves → render |
| `needs_cast` | A storyboard or cut needs a lead character and none was matched | Let the user pick (`studio_cast.show`, or the `pick_url`), then repeat with `args.cast_pick` |

## Who approves: one tap, or the AlgoHash page

Every Studio and Team key has a setting **Only I can approve paid and risky steps**. It is off by default,
so approving takes one tap.

| Setting | `approval` in the result | Who can approve |
|---|---|---|
| Off (default) | `"agent"` | The user, with one tap on **Approve** in the card (hosts with MCP Apps), or by saying yes in chat. The card records the decision and types the approval into the chat for the user. The agent then repeats the call with the token |
| On | `"user"`, plus `approve_url` | Only the account owner, signed in, on the `approve_url` page on AlgoHash. A "yes" in chat does not count. An MCP call to `studio_confirm.decide` can only decline; trying to approve returns `user_required` |

With the default, the loop is:

1. Call. The server answers `needs_confirmation` (or `needs_permission`) with a token and a summary.
2. Show the card with `studio_confirm.show` (or `team_confirm.show`), then call `studio_confirm.wait`
   (or `team_confirm.wait`) with the token. It returns as soon as the user taps (≤ 50 s per call; call
   again while it says `open`). In hosts without cards, ask the user in chat.
3. `decision: "approved"` (or a clear yes in chat) → repeat the identical call plus the token.
   `declined` or `expired` → stop.

With the setting on, step 2 gives the user the `approve_url` instead (the card's **Approve** button opens
it). Repeating the call before the owner approves there returns `awaiting_approval`: nothing runs,
nothing is charged, and the token stays valid.

## Tokens

- **Single use.** A token runs one call, once.
- **Bound to the exact arguments.** Change any argument and the token is rejected (`confirm_invalid`);
  ask again with the new arguments.
- **Short-lived.** About five minutes.
- **Bound to the key** that received it.

A matching quote token also covers the permission question, so one approved quote is enough for a paid
call that also needed permission.

## The SDK helper

`callWithApproval` (TS) / `call_with_approval` (Python) / `CallWithApproval` (Go) walks the loop for
you: call → ask → (on page-approval keys, wait for the owner on AlgoHash) → repeat with the token, up to three rounds
(permission → quote → run).

```ts
const r = await studio.callWithApproval("studio", { action: "generate_image", prompt: "…" }, {
  approve: async (q) => {
    // q.kind: "confirmation" | "permission", q.feeHwt, q.summary, q.tool, q.action, q.args
    // q.approval: "user" | "agent", q.approveUrl (when approval is "user")
    if (q.approval === "user") {
      showLink(q.approveUrl);            // the owner approves there, signed in to AlgoHash
      return true;                       // true = "wait for the decision", not "approved"
    }
    return await askTheHuman(q);         // approval "agent" (default): true ONLY if a person said yes
  },
  maxWaitSec: 300,                       // default; tokens live about 5 minutes
});
if (r.status === "declined") { /* nothing ran, nothing was charged */ }
if (r.status === "awaiting_approval") { /* still undecided: r.approveUrl, r.confirmToken */ }
```

What your approver's `true` means depends on `q.approval`:

| `q.approval` | Who decides | What `true` does |
|---|---|---|
| `"agent"` (default) | Your approver | The SDK repeats the call with the token at once |
| `"user"` (key setting on) | The account owner, on `q.approveUrl` while signed in to AlgoHash | The SDK waits with `studio_confirm.wait` / `team_confirm.wait` until the owner approves or declines, then repeats the call once |

Return `false` to stop: the result is `declined`. If the owner declines on AlgoHash, the result is
also `declined`. If nobody decides within `maxWaitSec` (`max_wait_sec`, `WithMaxWaitSec`), the result
has status `awaiting_approval` with the token and the link, and nothing ran. Wait again with the
confirm tool, then repeat the exact call with the same token.

The SDK passes `approveUrl` to your approver only when the link is on the endpoint's own origin
(same scheme, host and port, no user info). A link anywhere else is dropped, so a tampered response
cannot send your user to a look-alike approval page.

There is **no default approver**. The helper refuses to run without one (`no_approver`), and the SDKs
have no auto-approve option. That is deliberate.

### Card mode (Studio, MCP-Apps hosts)

Hosts that render MCP Apps can show Studio's own approval card. `card: true` (Python `card=True`,
Go `s.CardApprover()`) calls `studio_confirm.show`, then waits with `studio_confirm.wait` (≤ 50 s per
call, repeated up to `maxWaitSec`) for the user's decision. If the host cannot show the card, the
helper asks your approver instead (TS `approve`, Python `approve=`, Go `CardApprover(fallback)`). `studio_confirm.decide` has **no SDK wrapper**: your code should never record a decision on the user's
behalf. On page-approval keys the server only accepts a decline through it anyway.

## What approvals protect against — and what they do not

With the default (one-tap approval), the token goes back to whoever made the call. Approvals protect
against **mistakes** (a wrong argument, a misunderstood request, a loop), not against an agent that
ignores its instructions: an agent that has been prompt-injected could approve its own step.

With **Only I can approve paid and risky steps** on, approval is a real boundary: the decision is made
by the signed-in account owner on AlgoHash, not by the caller. A prompt-injected agent cannot approve
its own paid or public step, and a forged "yes" in chat does not count.

Either way, these limits hold no matter what the agent does:

1. the key's **scopes** (no `spend` → no paid step at all, enforced on the server),
2. the key's **daily cap** (or monthly cap for Open API keys),
3. the account balance,
4. **revocation**: a revoked key stops working on the next request.

Turn the setting on for any agent that reads content you do not control. See [security](security.md).

## Destructive actions (`confirm: true`)

Actions marked **confirm** in the reference (deletes, publishing, approving a storyboard, clearing a
board) need `confirm: true` in the arguments. Without it the server refuses with `confirm_required`.
Send it only after the user agreed to that specific action.
