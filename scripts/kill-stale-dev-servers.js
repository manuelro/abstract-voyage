#!/usr/bin/env node
// Runs automatically before every `npm run dev` (see package.json's own
// `predev` script) — reaps a `next dev` process still bound to THIS
// project directory from a previous session/terminal that was never
// cleanly closed. Orphaned Next.js dev servers accumulate silently (each
// one forks memory-hungry webpack/worker children) and, left running for
// days across sessions, can exhaust system memory badly enough to trigger
// macOS's own Force Quit intervention — confirmed live, 2026-08-28: four
// stray `next dev` processes dating back to the prior Friday were still
// running, unrelated to any process spawned that session.
//
// Two safety scopes, both required before this will ever kill anything:
//
// 1. Directory-scoped: only a `next dev` process whose own command line
//    resolves to a file under THIS repo's directory is even considered —
//    never touches `next dev` for a different project, never touches a
//    non-"next dev" process.
// 2. Age-gated: only kills a match older than STALE_THRESHOLD_MS. This
//    repo runs multiple concurrent Claude Code sessions plus the
//    operator's own dev server(s) day to day (see this project's own
//    "concurrent sessions" note) — a same-project `next dev` that's only
//    minutes/hours old is far more likely a session actively in use than
//    an abandoned one, and killing it out from under a concurrent session
//    would be worse than the memory-pressure problem this script exists to
//    fix. Anything newer than the threshold is left alone and only logged,
//    so a human can decide.
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6 hours

const { execSync } = require('child_process')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')

function findNextDevProcessesForThisProject() {
  let psOutput
  try {
    // lstart: full "started at" timestamp, parseable by `new Date(...)`
    // (unlike `etime`'s own elapsed-duration format, which isn't).
    psOutput = execSync('ps -eo pid,lstart,command', { encoding: 'utf8' })
  } catch {
    return []
  }
  const currentPid = process.pid
  return psOutput
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .filter(line => /next dev\b/.test(line) && line.includes(PROJECT_ROOT))
    .map(line => {
      const trimmed = line.trim()
      const pid = Number(trimmed.split(/\s+/)[0])
      // lstart is a fixed-width "Www Mon DD HH:MM:SS YYYY" — pid is the
      // first token, the rest up to the command is the timestamp.
      const rest = trimmed.slice(String(pid).length).trim()
      const lstart = rest.slice(0, 24)
      return { pid, startedAt: new Date(lstart) }
    })
    .filter(({ pid }) => Number.isFinite(pid) && pid !== currentPid && pid !== process.ppid)
}

const candidates = findNextDevProcessesForThisProject()
const now = Date.now()

for (const { pid, startedAt } of candidates) {
  const ageMs = Number.isNaN(startedAt.getTime()) ? 0 : now - startedAt.getTime()
  if (ageMs < STALE_THRESHOLD_MS) {
    console.log(`[predev] leaving pid ${pid} alone — only ${Math.round(ageMs / 60000)}m old, likely a session in use`)
    continue
  }
  try {
    process.kill(pid, 'SIGTERM')
    console.log(`[predev] killed stale next dev process (pid ${pid}, running since ${startedAt.toISOString()})`)
  } catch (error) {
    if (error.code !== 'ESRCH') {
      console.warn(`[predev] could not kill pid ${pid}: ${error.message}`)
    }
  }
}
