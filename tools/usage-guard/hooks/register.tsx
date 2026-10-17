import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow, ModelCost, Stats, TaskRow } from '../types'

// Files the repo says to grep, never read whole (CLAUDE.md section 7, orient skill).
const GREP_ONLY = /(^|\/)docs\/(CODEMAP\.md|roadmap\/HISTORY\.md)$/
// Agents that pin their own model; anything else must name one (CLAUDE.md section 8 rungs).
const PINNED = new Set(['scout', 'reviewer', 'ux-auditor', 'blind-tester', 'fork'])
const REPEAT_LIMIT = 3
const BIG_CONTEXT = 150_000
const COLD_MS = 55 * 60 * 1000 // the 1h prompt cache is about to expire
// Price relative to plain input; ratios only, not plan usage.
const W = { input: 1, reads: 0.1, writes: 2, output: 5 }
const PANE = 'usage-guard'

const agentsA = atom({ plugin: 'usage-guard', key: 'agents' } as const, [])
const tasksA = atom({ plugin: 'usage-guard', key: 'tasks' } as const, [])
const costsA = atom({ plugin: 'usage-guard', key: 'costs' } as const, {})
const statsA = atom({ plugin: 'usage-guard', key: 'stats' } as const, { turns: 0, calls: 0, denies: 0, ctx: 0, agents: 0 })

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number; model?: string }

function weighted(c: ModelCost): number {
  return c.input * W.input + c.reads * W.reads + c.writes * W.writes + c.output * W.output
}

function k(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}k`
}

function label(s: Stats): string {
  return `ctx ${k(s.ctx)} · turns ${s.turns} · calls ${s.calls} · agents ${s.agents}`
}

// The single most useful next step, from this session's numbers.
function advice(s: Stats, costs: Record<string, ModelCost>): string {
  const all = Object.values(costs)
  const writes = all.reduce((a, c) => a + c.writes * W.writes, 0)
  const total = all.reduce((a, c) => a + weighted(c), 0) || 1
  const opus = Object.entries(costs).filter(([m]) => /opus/.test(m)).reduce((a, [, c]) => a + weighted(c), 0)
  if (s.ctx > BIG_CONTEXT) return `Context ${k(s.ctx)} per turn: update the HANDOVER "Now" line and start a fresh session at the next milestone.`
  if (writes > 0.4 * total && s.turns > 3) return 'Cache writes are over 40% of cost: avoid gaps over an hour, model switches and idle check-ins.'
  if (opus > 0.6 * total && s.agents > 0) return 'Opus is over 60% of cost: route labour to haiku and implementation to sonnet.'
  if (s.turns > 0 && s.calls / s.turns > 25) return 'Many tool calls per turn: name files and line ranges in briefs, batch independent calls.'
  return 'No waste signal yet. Run the retro skill at session end.'
}

export const register: Register = on => {
  let fableAsked = false
  let lastKey = ''
  let repeats = 0
  let lastTurnAt = 0
  let bigWarned = false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'spend', description: "This session's cost split and the best next step to cut it" })
    await $.command.register({ name: 'dash', description: 'Open the usage dashboard: agents, tasks, cost by model, efficiency' })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'dash' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Usage' })
    return { text: 'Usage dashboard opened.' }
  })

  on('command.run', { command: 'spend' }, async $ => {
    const s = await read($, statsA)
    const costs = await read($, costsA)
    const total = Object.values(costs).reduce((a, c) => a + weighted(c), 0) || 1
    const sum = (f: (c: ModelCost) => number) => Object.values(costs).reduce((a, c) => a + f(c), 0)
    const pct = (n: number) => `${Math.round((100 * n) / total)}%`
    const byModel = Object.entries(costs).map(([m, c]) => `${m} ${pct(weighted(c))}`).join(', ')
    return {
      text: [
        `turns ${s.turns}, context ${k(s.ctx)}, tool calls ${s.calls}, agents ${s.agents}, blocked ${s.denies}`,
        `cost share: cache reads ${pct(sum(c => c.reads * W.reads))}, cache writes ${pct(sum(c => c.writes * W.writes))}, output ${pct(sum(c => c.output * W.output))}`,
        `by model: ${byModel || 'none yet'}`,
        advice(s, costs),
      ].join('\n'),
    }
  })

  // Fable is opt-in: any later prompt that does not name it clears the grant.
  on('prompt.submit', async ($, e, next) => {
    fableAsked = /fable/i.test(e.text)
    const now = await $.clock.now()
    const s = await read($, statsA)
    if (lastTurnAt && now - lastTurnAt > COLD_MS) {
      $.ui.toast(`Idle ${Math.round((now - lastTurnAt) / 60000)} min: the cache has likely expired, so this turn re-caches ${k(s.ctx)} tokens. A fresh session may be cheaper.`)
    }
    if (e.attachments?.some(a => a.type === 'image')) {
      $.ui.toast('Images stay in context for every later turn. Crop to the problem, or state the numbers instead.')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined) {
      const row: AgentRow = {
        id: r.agentId ?? e.tool_use_id, type: e.subagentType, desc: e.description, model: r.model,
        startedAt: await $.clock.now(), calls: 0, lastTool: '', tokens: 0,
      }
      await update($, agentsA, list => [...list, row].slice(-30))
      await update($, statsA, s => ({ ...s, agents: s.agents + 1 }))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const u = e.usage as Usage | undefined
    if (u) {
      const model = u.model ?? 'unknown'
      await update($, costsA, costs => {
        const c = costs[model] ?? { turns: 0, input: 0, reads: 0, writes: 0, output: 0 }
        return { ...costs, [model]: { turns: c.turns + 1, input: c.input + u.input_tokens, reads: c.reads + u.cache_read_input_tokens, writes: c.writes + u.cache_creation_input_tokens, output: c.output + u.output_tokens } }
      })
    }
    if (e.agentId) {
      const now = await $.clock.now()
      const tokens = u ? u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens + u.output_tokens : 0
      await update($, agentsA, list => list.map(a => (a.id === e.agentId ? { ...a, endedAt: now, tokens: a.tokens + tokens } : a)))
    } else if (u) {
      lastTurnAt = await $.clock.now()
      const ctx = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      const s = await update($, statsA, x => ({ ...x, turns: x.turns + 1, ctx }))
      if (ctx > BIG_CONTEXT && !bigWarned) {
        bigWarned = true
        $.ui.toast(advice(s, await read($, costsA)))
      }
      $.ui.status(label(s))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const args = e as unknown as { file_path: string; limit?: number }
    if (GREP_ONLY.test(args.file_path) && args.limit === undefined) {
      await update($, statsA, s => ({ ...s, denies: s.denies + 1 }))
      return { deny: `${$.plugin.name}: ${args.file_path} is huge. Grep it, then read a line range (offset and limit).` }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const args = e as unknown as { model?: string; subagent_type?: string }
    const type = args.subagent_type ?? 'general-purpose'
    const fable = args.model && /fable/i.test(args.model) && !fableAsked
    const bare = !args.model && !PINNED.has(type) && !type.includes(':')
    if (fable || bare) {
      await update($, statsA, s => ({ ...s, denies: s.denies + 1 }))
      return {
        deny: fable
          ? `${$.plugin.name}: Fable is opt-in. Ask the user to name it for this task, or use sonnet, haiku or opus.`
          : `${$.plugin.name}: name a model. haiku for lookup and labour, sonnet to implement, opus for judgement. Unset inherits the orchestrator's model.`,
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Task tools feed the dashboard's task list.
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const r = await next(e)
    const args = e as unknown as { subject?: string }
    const res = r.result as { task?: { id?: string } } | undefined
    const tasks = await read($, tasksA)
    const row: TaskRow = { id: res?.task?.id ?? String(tasks.length + 1), subject: args.subject ?? '?', status: 'pending' }
    await update($, tasksA, list => [...list, row].slice(-50))
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const r = await next(e)
    const args = e as unknown as { taskId?: string; status?: string; subject?: string }
    if (args.taskId) {
      await update($, tasksA, list => list.map(t => (t.id === args.taskId ? { ...t, status: args.status ?? t.status, subject: args.subject ?? t.subject } : t)))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const { tool_use_id: _id, agentId, ...args } = e as unknown as Record<string, unknown>
    if (typeof agentId === 'string') {
      await update($, agentsA, list => list.map(a => (a.id === agentId ? { ...a, calls: a.calls + 1, lastTool: e.tool } : a)))
      return next(e)
    }
    const key = JSON.stringify(args)
    repeats = key === lastKey ? repeats + 1 : 1
    lastKey = key
    const s = await update($, statsA, x => ({ ...x, calls: x.calls + 1, denies: x.denies + (repeats >= REPEAT_LIMIT ? 1 : 0) }))
    $.ui.status(label(s))
    if (repeats >= REPEAT_LIMIT) {
      return { deny: `${$.plugin.name}: same call ${repeats} times in a row. Change the hypothesis or report the blocker.` }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const agents = await read($, agentsA)
    const tasks = await read($, tasksA)
    const costs = await read($, costsA)
    const s = await read($, statsA)
    const now = await $.clock.now()
    const total = Object.values(costs).reduce((a, c) => a + weighted(c), 0) || 1
    const done = tasks.filter(t => t.status === 'completed').length

    return (
      <Box flexDirection="column">
        <Text bold>Session</Text>
        <Text>{label(s)} · blocked {s.denies}</Text>
        <Text bold>Agents</Text>
        {agents.length === 0 && <Text dimColor>None yet.</Text>}
        {agents.slice(-8).map(a => (
          <Text dimColor={a.endedAt !== undefined}>
            {a.endedAt === undefined ? 'runs' : 'done'} {a.type} ({a.model}) {Math.round(((a.endedAt ?? now) - a.startedAt) / 1000)}s · {a.calls} calls{a.lastTool ? ` · ${a.lastTool}` : ''}{a.tokens ? ` · ${k(a.tokens)}` : ''} · {a.desc}
          </Text>
        ))}
        <Text bold>Tasks {tasks.length ? `${done}/${tasks.length}` : ''}</Text>
        {tasks.length === 0 && <Text dimColor>None.</Text>}
        {tasks.slice(-8).map(t => (
          <Text dimColor={t.status === 'completed'}>{t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'now ' : 'todo'} {t.subject}</Text>
        ))}
        <Text bold>Cost by model (weighted)</Text>
        {Object.entries(costs).map(([m, c]) => (
          <Text>{m}: {Math.round((100 * weighted(c)) / total)}% · {c.turns} turns · out {k(c.output)}</Text>
        ))}
        <Text bold>Next step</Text>
        <Text>{advice(s, costs)}</Text>
      </Box>
    )
  })
}
