/**
 * dsh-session-link client half (dsh 0.2 runtime).
 *
 * Two behaviors:
 * 1. A header action on every conversation that copies a deep link to the
 *    current session: `<origin>/?session=<sessionId>`.
 * 2. On boot, if the URL carries `?session=<id>`, select that session through
 *    the current navigation seam (`uiWorkspace.openSession`), retrying briefly
 *    because the session catalog may not have loaded when this plugin applies.
 *
 * Written against the 0.2 client contract: slots.register returns its disposer
 * (there is no `slots.inject` any more) and `sessions.open` was replaced by
 * `uiWorkspace.openSession`. Everything is resolved structurally through
 * `ctx.get`, so the bundle needs no Harness package imports.
 */
import { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const name = 'session-link'

/** The title-adjacent header action strip. */
const HEADER_ACTIONS = 'conversation.session.header.actions'
/** Bounded retry budget for the deep-link opener (~10s at 200ms). */
const OPEN_ATTEMPTS = 50
const OPEN_RETRY_MS = 200

interface SlotsLike {
  register(options: { name: string; id: string; order?: number }, component: unknown): () => void
}

interface UiWorkspaceLike {
  openSession(target: string): void
}

/** Canonical browser link to one session. */
function sessionLinkOf(sessionId: string): string {
  return `${globalThis.location.origin}/?session=${encodeURIComponent(sessionId)}`
}

/** Copy text, falling back to a hidden textarea on non-secure contexts. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // Clipboard API is unavailable outside secure contexts; try the legacy path.
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } catch {
    // Best effort only: the button reports success either way.
  }
  textarea.remove()
}

function CopySessionLink({ sessionId }: { sessionId: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    if (timerRef.current !== undefined) globalThis.clearTimeout(timerRef.current)
  }, [])

  return (
    <button
      type="button"
      onClick={() => {
        void copyText(sessionLinkOf(sessionId)).then(() => {
          setCopied(true)
          if (timerRef.current !== undefined) globalThis.clearTimeout(timerRef.current)
          timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500)
        })
      }}
      title={copied ? '已复制会话链接' : '复制会话链接'}
      aria-label={copied ? '已复制会话链接' : '复制会话链接'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        borderRadius: '999px',
        color: copied ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)',
        fontSize: '14px',
        lineHeight: 1,
      }}
    >
      {copied ? '✓' : '🔗'}
    </button>
  )
}

/**
 * Select the session named by `?session=<id>` once navigation can accept it.
 * `openSession` throws while the target is unknown, so the retry is bounded.
 */
function openSessionFromLocation(scope: Context, uiWorkspace: UiWorkspaceLike): void {
  const target = new URLSearchParams(globalThis.location.search).get('session')
  if (target === null || target.length === 0) return

  scope.effect(() => {
    let attempts = 0
    let timer: number | undefined
    let done = false

    const attempt = (): void => {
      if (done) return
      attempts += 1
      try {
        uiWorkspace.openSession(target)
        done = true
        return
      } catch {
        // Unknown session ids reject until the catalog lands; retry briefly.
      }
      if (attempts >= OPEN_ATTEMPTS) {
        console.warn(`dsh-session-link: session "${target}" never appeared in the catalog`)
        done = true
        return
      }
      timer = globalThis.setTimeout(attempt, OPEN_RETRY_MS)
    }

    attempt()
    return () => {
      done = true
      if (timer !== undefined) globalThis.clearTimeout(timer)
    }
  }, 'session-link: open session from URL')
}

export function apply(ctx: Context): void {
  // Both capabilities are optional services that may activate after this row:
  // injecting defers each registration until the service is actually here.
  ctx.inject(['uiWorkspace'], (scope: Context) => {
    openSessionFromLocation(scope, scope.get('uiWorkspace') as UiWorkspaceLike)
  })
  ctx.inject(['slots'], (scope: Context) => {
    scope.effect(() => (scope.get('slots') as SlotsLike).register(
      { name: HEADER_ACTIONS, id: 'copy-session-link', order: 25 },
      CopySessionLink,
    ), 'session-link: copy-link header action')
  })
}
