import type { Register } from 'claude-code'

// Files the repo says to grep, never read whole (CLAUDE.md section 7, orient skill).
const GREP_ONLY = /(^|\/)docs\/(CODEMAP\.md|roadmap\/HISTORY\.md)$/
// Agents that pin their own model; anything else must name one (CLAUDE.md section 8 rungs).
const PINNED = new Set(['scout', 'reviewer', 'ux-auditor', 'blind-tester', 'fork'])
const REPEAT_LIMIT = 3
const BIG_CONTEXT = 150_000
const COLD_MS = 55 * 60 * 1000 // the 1h prompt cache is about to expire

type Turn = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }

export const register: Register = on => {
  let calls = 0
  let agents = 0
  let denies = 0
  let turns = 0
  let ctx = 0
  let reads = 0
  let writes = 0
  let output = 0
  let lastTurnAt = 0
  let fableAsked = false
  let lastKey = ''
  let repeats = 0
  let bigWarned = false

  const label = () =>
    (`ctx ${Math.round(ctx / 1000)}k · turns ${turns} · calls ${calls} · agents ${agents}`)

  // The single most useful next step, from this session's numbers.
  const advice = () => {
    if (ctx > BIG_CONTEXT) return `Context is ${Math.round(ctx / 1000)}k per turn: update the HANDOVER "Now" line and start a fresh session at the next milestone.`
    if (writes > 100_000 && writes * 2 > 0.4 * (reads * 0.1 + writes * 2 + output * 5)) return 'Cache writes dominate cost: avoid gaps over an hour, model switches and idle check-ins.'
    if (turns > 0 && calls / turns > 25) return 'Many tool calls per turn: name files and line ranges in briefs, batch independent calls.'
    return 'No waste signal yet. Run the retro skill at session end.'
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'spend', description: "This session's usage split and the best next step to cut it" })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'spend' }, async () => {
    const cost = reads * 0.1 + writes * 2 + output * 5 || 1
    const pct = (n: number) => Math.round((100 * n) / cost)
    return {
      text: [
        `turns ${turns}, context ${Math.round(ctx / 1000)}k, tool calls ${calls}, agents ${agents}, blocked ${denies}`,
        `cost share (weighted): cache reads ${pct(reads * 0.1)}%, cache writes ${pct(writes * 2)}%, output ${pct(output * 5)}%`,
        advice(),
      ].join('\n'),
    }
  })

  // Fable is opt-in: any later prompt that does not name it clears the grant.
  on('prompt.submit', async ($, e, next) => {
    fableAsked = /fable/i.test(e.text)
    const now = await $.clock.now()
    if (lastTurnAt && now - lastTurnAt > COLD_MS) {
      $.ui.toast(`Idle ${Math.round((now - lastTurnAt) / 60000)} min: the cache has likely expired, so this turn re-caches ${Math.round(ctx / 1000)}k tokens. A fresh session may be cheaper.`)
    }
    if (e.attachments?.some(a => a.type === 'image')) {
      $.ui.toast('Images stay in context for every later turn. Crop to the problem, or state the numbers instead.')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const u = e.usage as Turn | undefined
    if (u && !e.agentId) {
      turns += 1
      reads += u.cache_read_input_tokens
      writes += u.cache_creation_input_tokens
      output += u.output_tokens
      ctx = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      lastTurnAt = await $.clock.now()
      if (ctx > BIG_CONTEXT && !bigWarned) {
        bigWarned = true
        $.ui.toast(advice())
      }
      $.ui.status(label())
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Read' }, ($, e, next) => {
    const args = e as unknown as { file_path: string; limit?: number }
    if (GREP_ONLY.test(args.file_path) && args.limit === undefined) {
      denies += 1
      return { deny: `${$.plugin.name}: ${args.file_path} is huge. Grep it, then read a line range (offset and limit).` }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, ($, e, next) => {
    const args = e as unknown as { model?: string; subagent_type?: string }
    if (args.model && /fable/i.test(args.model) && !fableAsked) {
      denies += 1
      return { deny: `${$.plugin.name}: Fable is opt-in. Ask the user to name it for this task, or use sonnet, haiku or opus.` }
    }
    const type = args.subagent_type ?? 'general-purpose'
    if (!args.model && !PINNED.has(type) && !type.includes(':')) {
      denies += 1
      return { deny: `${$.plugin.name}: name a model. haiku for lookup and labour, sonnet to implement, opus for judgement. Unset inherits the orchestrator's model.` }
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
    $.ui.status(label())
    if (repeats >= REPEAT_LIMIT) {
      denies += 1
      return { deny: `${$.plugin.name}: same call ${repeats} times in a row. Change the hypothesis or report the blocker.` }
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
