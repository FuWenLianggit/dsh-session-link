# dsh-session-link

DSH web plugin: copy a deep link to the current session and open a session
directly from a URL. Installs as a client bundle in the web profile.

## Features

- **Copy session link** — a 🔗 button in the conversation header copies
  `http://127.0.0.1:3000/?session=<id>` for the current session.
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

Restart `dsh web` and hard-refresh the browser. Uninstall with
`dsh plugin --profile web remove dsh-session-link`.

## Notes

- Client-only plugin: all behavior lives in the browser bundle, no host-side
  state.
- The deep link carries the session id; opening it in the same browser profile
  (localhost server) selects the session in the sidebar.
