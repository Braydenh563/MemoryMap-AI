import type { Register } from 'claude-code'

// Files the repo says to grep, never read whole (CLAUDE.md section 7, orient skill).
const GREP_ONLY = /(^|\/)docs\/(CODEMAP\.md|roadmap\/HISTORY\.md)$/
const REPEAT_LIMIT = 3

export const register: Register = on => {
  let calls = 0
  let agents = 0
  let fableAsked = false
  let lastKey = ''
  let repeats = 0

  // Fable is opt-in: any later prompt that does not name it clears the grant.
  on('prompt.submit', ($, e, next) => {
    fableAsked = /fable/i.test(e.text)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Read' }, ($, e, next) => {
    const args = e as unknown as { file_path: string; limit?: number }
    return GREP_ONLY.test(args.file_path) && args.limit === undefined
      ? { deny: `${$.plugin.name}: ${args.file_path} is huge. Grep it, then read a line range (offset and limit).` }
      : next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, ($, e, next) => {
    const args = e as unknown as { model?: string }
    if (args.model && /fable/i.test(args.model) && !fableAsked) {
      return { deny: `${$.plugin.name}: Fable is opt-in. Ask the user to name it for this task, or use sonnet, haiku or opus.` }
    }
    agents += 1
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', ($, e, next) => {
    const { tool_use_id: _id, ...args } = e as unknown as Record<string, unknown>
    const key = JSON.stringify(args)
    repeats = key === lastKey ? repeats + 1 : 1
    lastKey = key
    calls += 1
    $.ui.status(`calls ${calls} · agents ${agents}`)

    return repeats >= REPEAT_LIMIT
      ? { deny: `${$.plugin.name}: same call ${repeats} times in a row. Change the hypothesis or report the blocker.` }
      : next(e)
  }).catch(($, e, next) => next(e))
}
