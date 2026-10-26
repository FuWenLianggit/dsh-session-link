# dsh-session-link

DSH web plugin: copy a deep link to the current session and open a session
directly from a URL. Installs as a client bundle in the profile.

## Features

- **Copy session link** — a 🔗 button in the conversation header copies
  `<origin>/?session=<id>` for the current session.
- **Open by URL** — visiting the app with `?session=<id>` in the query string
  focuses that session directly.

## Install

From the Git repository (recommended):

```sh
dsh plugin --profile web add https://github.com/FuWenLianggit/dsh-session-link
```

Or from a local checkout:

```sh
dsh plugin --profile web add <path-to-this-checkout>
```

Restart the profile (or the desktop app) and hard-refresh the browser. Uninstall
with `dsh plugin --profile web remove dsh-session-link`.

## Runtime compatibility

Targets the **0.2 client contract** (DSH Desktop 0.2.0-rc.2 and `dsh web`
0.2.x):

- Header actions register through `ctx.slots.register({ name, id, order }, Component)`,
  whose return value is the disposer. The old `ctx.slots.inject(...)` wrapper is
  gone.
- Navigation uses `ctx.uiWorkspace.openSession(target)`. `ctx.sessions.open(id)`
  no longer exists; the opener retries for ~10s because `openSession` throws
  until the target appears in the loaded session catalog.
- The client module declares only packages that exist in 0.2
  (`@deepseek-ai/dsh-client-ui-conversation`, `@deepseek-ai/dsh-client-ui-workspace`).
  The 0.1-era `@deepseek-ai/dsh-client-runtime` row does not exist any more and
  would leave the row waiting forever.

The plugin needs no `session-reference` service and no client→host RPC: the link
is self-contained, so it also works in a profile where `session-reference` is
disabled.

## Notes

- Client-only feature: the host half is a mount anchor, no host-side state.
- The deep link carries the session id; opening it in the same browser profile
  (localhost server) selects the session in the sidebar.
