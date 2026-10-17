export type AgentRow = {
  id: string
  type: string
  desc: string
  model: string
  startedAt: number
  endedAt?: number
  calls: number
  lastTool: string
  tokens: number
}
export type TaskRow = { id: string; subject: string; status: string }
export type ModelCost = { turns: number; input: number; reads: number; writes: number; output: number }
export type Stats = { turns: number; calls: number; denies: number; ctx: number; agents: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-guard': {
      agents: AgentRow[]
      tasks: TaskRow[]
      costs: Record<string, ModelCost>
      stats: Stats
    }
  }
}
