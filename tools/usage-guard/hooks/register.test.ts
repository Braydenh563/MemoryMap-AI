import { test, expect } from 'claude-code/testing'

test('denies a whole-file read of the code map', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }) as never)
  const whole = await $.tool.call({ tool: 'Read', file_path: 'docs/CODEMAP.md' })
  expect(whole.deny).toContain('Grep it')
})

test('denies the third identical call in a row', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('ui.status', () => ({ value: undefined }) as never)
  const call = () => $.tool.call({ tool: 'Bash', command: 'false' })
  await call()
  await call()
  const third = await call()
  expect(third.deny).toContain('same call')
})
