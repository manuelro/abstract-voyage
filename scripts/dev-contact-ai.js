#!/usr/bin/env node
// Safe local entry point for the Contact AI experience. It deliberately runs
// through Netlify Dev (rather than Next alone), supplies a session-only
// follow-up signing secret when needed, and prevents accidental email delivery
// unless the operator explicitly sets CONTACT_DELIVERY_MODE in their shell.

const { randomBytes } = require('crypto')
const { spawn } = require('child_process')
const { createServer } = require('net')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run dev:contact-ai

Starts Netlify Dev at http://127.0.0.1:8888 with Next on the first free port from 3001 to 3020.
Defaults: Gemini Gateway, console-only delivery, and a session-only signing secret.
Set CONTACT_DELIVERY_MODE=smtp explicitly to test a local SMTP sink.`)
  process.exit(0)
}

const environment = {
  ...process.env,
  // Netlify Dev gives inherited process variables precedence over .env.local.
  // Keep this opinionated launcher on the tested Gateway path, while allowing
  // an explicit shell override for a model or other advanced configuration.
  INTAKE_PROVIDER: process.env.INTAKE_PROVIDER || 'gemini',
  INTAKE_MODEL: process.env.INTAKE_MODEL || 'gemini-2.5-flash-lite',
  INTAKE_RECAP_MODEL: process.env.INTAKE_RECAP_MODEL || 'gemini-2.5-flash-lite',
  CONTACT_DELIVERY_MODE: process.env.CONTACT_DELIVERY_MODE || 'console',
  INTAKE_FOLLOWUP_TOKEN_SECRET: process.env.INTAKE_FOLLOWUP_TOKEN_SECRET || randomBytes(32).toString('hex'),
}

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') resolve(false)
      else reject(error)
    })
    server.listen({ port, host: '::' }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function start() {
  let nextPort
  for (let port = 3001; port <= 3020; port += 1) {
    if (await isPortAvailable(port)) {
      nextPort = port
      break
    }
  }
  if (!nextPort) throw new Error('No free Next.js port found from 3001 to 3020')
  environment.CLAUDE_NEXT_DIST_DIR = process.env.CLAUDE_NEXT_DIST_DIR || `.next-contact-ai-${nextPort}`

  console.log('Starting Contact AI development environment:')
  console.log('  URL:      http://127.0.0.1:8888/contact')
  console.log(`  Next:     port ${nextPort}`)
  console.log(`  AI:       ${environment.INTAKE_PROVIDER} / ${environment.INTAKE_MODEL}`)
  console.log(`  Delivery: ${environment.CONTACT_DELIVERY_MODE}`)
  console.log('  Secret:   session-only (unless supplied by the shell)')

  const child = spawn(
    'netlify',
    [
      'dev',
      // Contact AI uses a Netlify Function, not Edge Functions. Netlify CLI's
      // Edge Function watcher recursively watches this entire project, including
      // old Next build directories, and can exhaust macOS file watchers.
      '--internal-disable-edge-functions',
      '--port', '8888',
      '--target-port', String(nextPort),
      '--command', `npm run dev -- -p ${nextPort}`,
    ],
    { stdio: 'inherit', env: environment },
  )

  child.on('error', error => {
    if (error.code === 'ENOENT') {
      console.error('Netlify CLI was not found. Install it with: npm install -g netlify-cli@latest')
      process.exitCode = 1
      return
    }
    throw error
  })

  child.on('exit', (code, signal) => {
    if (signal) process.exitCode = 1
    else process.exitCode = code ?? 1
  })
}

start().catch(error => {
  console.error(error)
  process.exitCode = 1
})
