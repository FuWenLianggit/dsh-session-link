import type { Context } from '@deepseek-ai/cordis'

export const name = 'session-link'

export function apply(ctx: Context): void {
  // The host half is a mount anchor only; the feature lives in the client half
  // (copy-deep-link header action + open-by-link on boot).
  void ctx
}
