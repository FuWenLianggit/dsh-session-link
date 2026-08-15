/**
 * dsh-session-link client half.
 *
 * Two behaviors:
 * 1. A header action on every conversation that copies a deep link to the
 *    current session: `<origin>/?session=<sessionId>`.
 * 2. On boot, if the URL carries `?session=<id>`, select that session once it
 *    appears in the session list (retries briefly because the list may not be
 *    loaded when this plugin applies).
 */
import { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const name = 'session-link'

interface HeaderActionProps {
  sessionId: string
}

interface SessionsLike {
  open(id: string): void
}

interface SlotsLike {
  inject(name: string, register: () => unknown): unknown
  register(options: { name: string; id: string; order?: number }, component: unknown): unknown
}

function openWhenReady(sessions: SessionsLike, id: string): void {
  let attempts = 0
  const tryOpen = (): void => {
    attempts += 1
    try {
      sessions.open(id)
    } catch {
      // Unknown ids fail loud until the list lands; retry briefly.
      if (attempts < 10) globalThis.setTimeout(tryOpen, 500)
    }
  }
  tryOpen()
}

function CopySessionLink(props: HeaderActionProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    if (timerRef.current !== undefined) globalThis.clearTimeout(timerRef.current)
  }, [])

  const copy = async (): Promise<void> => {
    const url = `${globalThis.location.origin}/?session=${encodeURIComponent(props.sessionId)}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API can be unavailable on non-secure contexts; fall back to
      // a temporary textarea plus execCommand.
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
      } catch {
        // Best effort only.
      }
      textarea.remove()
    }
    setCopied(true)
    timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={() => { void copy() }}
      title={copied ? '已复制会话链接' : '复制会话链接'}
      aria-label={copied ? '已复制会话链接' : '复制会话链接'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        fontSize: '14px',
        lineHeight: '1',
      }}
    >
      {copied ? '✓' : '🔗'}
    </button>
  )
}

export function apply(ctx: Context): void {
  // Open-by-link: ?session=<id> selects that session once the list has it.
  const target = new URLSearchParams(globalThis.location.search).get('session')
  if (target !== null && target.length > 0) {
    const sessions = ctx.get('sessions') as SessionsLike | undefined
    if (sessions !== undefined) openWhenReady(sessions, target)
  }

  // Header action: copy a deep link to the current session.
  const slots = ctx.get('slots') as SlotsLike | undefined
  if (slots !== undefined) {
    slots.inject('conversation.session.header.actions', () => slots.register(
      { name: 'conversation.session.header.actions', id: 'copy-session-link', order: 25 },
      CopySessionLink,
    ))
  }
}
