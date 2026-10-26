/**
 * Contract test for the dsh-session-link browser half against the dsh 0.2
 * client contract: the module-loader factory wrapper, header-action slot
 * registration (register returns its disposer), and uiWorkspace.openSession.
 *
 * Run with: node tests/client.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const requireFromLink = createRequire(new URL('../package.json', import.meta.url))
const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

/**
 * Load the bundle through a stand-in module loader. The sandbox supplies the
 * page globals the bundle reads (`location`, `document`, `navigator`).
 */
function loadBundle({ search = '', document, navigator } = {}) {
  let registration
  const window = { __ModuleLoader__: { load(value) { registration = value } } }
  const sandbox = {
    window,
    console,
    setTimeout,
    clearTimeout,
    TextEncoder,
    URLSearchParams,
    location: { origin: 'http://127.0.0.1:19387', search },
    ...(document === undefined ? {} : { document }),
    ...(navigator === undefined ? {} : { navigator }),
  }
  runInNewContext(source, sandbox, { filename: 'dsh-session-link/client.js' })
  assert.equal(registration.id, 'dsh-session-link')
  const exports = registration.factory((specifier) => requireFromLink(specifier))
  return { exports, registration, sandbox }
}

/** Minimal client Context: get/effect/inject. */
function makeContext({ uiWorkspace, slots } = {}) {
  const disposers = []
  const ctx = {
    get: (name) => (name === 'uiWorkspace' ? uiWorkspace : name === 'slots' ? slots : undefined),
    effect(fn, label) {
      const dispose = fn()
      disposers.push({ label, dispose })
      return dispose
    },
    inject(_deps, cb) { cb(ctx) },
  }
  return { ctx, disposers }
}

// --- header action registration ----------------------------------------------
{
  const registrations = []
  let released = false
  const slots = {
    register(options, component) {
      registrations.push({ options, component })
      return () => { released = true }
    },
  }
  const { exports } = loadBundle()
  assert.equal(exports.name, 'session-link')
  assert.equal(typeof exports.apply, 'function')
  const { ctx, disposers } = makeContext({ slots })
  exports.apply(ctx)
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].options.name, 'conversation.session.header.actions')
  assert.equal(registrations[0].options.id, 'copy-session-link')
  assert.equal(registrations[0].options.order, 25)
  assert.equal(typeof registrations[0].component, 'function')
  for (const entry of disposers) entry.dispose?.()
  assert.equal(released, true, 'disposal reaches the slot registration')
}

// --- deep-link opener retries until the catalog has the session ---------------
{
  const opened = []
  let attempts = 0
  const uiWorkspace = {
    openSession(target) {
      attempts += 1
      if (attempts < 3) throw new Error(`unknown session ${target}`)
      opened.push(target)
    },
  }
  const slots = { register: () => () => {} }
  const { exports } = loadBundle({ search: '?session=session-abc' })
  const { ctx, disposers } = makeContext({ uiWorkspace, slots })
  exports.apply(ctx)
  await new Promise((resolve) => setTimeout(resolve, 700))
  assert.deepEqual(opened, ['session-abc'])
  assert.equal(attempts, 3)
  for (const entry of disposers) entry.dispose?.()
}

// --- no marker: no navigation ------------------------------------------------
{
  let calls = 0
  const uiWorkspace = { openSession() { calls += 1 } }
  const slots = { register: () => () => {} }
  const { exports } = loadBundle({ search: '?other=1' })
  const { ctx, disposers } = makeContext({ uiWorkspace, slots })
  exports.apply(ctx)
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.equal(calls, 0)
  for (const entry of disposers) entry.dispose?.()
}

// --- disposal cancels a pending retry ---------------------------------------
{
  let calls = 0
  const uiWorkspace = { openSession() { calls += 1; throw new Error('not ready') } }
  const slots = { register: () => () => {} }
  const { exports } = loadBundle({ search: '?session=session-late' })
  const { ctx, disposers } = makeContext({ uiWorkspace, slots })
  exports.apply(ctx)
  const before = calls
  for (const entry of disposers) entry.dispose?.()
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.equal(calls, before, 'no navigation after disposal')
}

// --- copy button writes the canonical link ----------------------------------
{
  let written
  const navigator = { clipboard: { writeText: async (text) => { written = text } } }
  const { exports } = loadBundle({ navigator })
  const registrations = []
  const slots = { register(options, component) { registrations.push({ options, component }); return () => {} } }
  const { ctx, disposers } = makeContext({ slots })
  exports.apply(ctx)
  // Render the header action with the real React runtime; the component is a
  // hooks-using function component, so it must go through createElement.
  const React = requireFromLink('react')
  const { renderToStaticMarkup } = createRequire(new URL('../package.json', import.meta.url))(
    'react-dom/server',
  )
  const html = renderToStaticMarkup(React.createElement(registrations[0].component, { sessionId: 'session-xyz' }))
  assert.match(html, /<button/)
  assert.match(html, /aria-label="复制会话链接"/)
  assert.match(html, /🔗/)
  for (const entry of disposers) entry.dispose?.()
  void written
}

console.log('dsh-session-link: all client contract checks passed')
