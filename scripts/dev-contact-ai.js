#!/usr/bin/env node
// Safe local entry point for the Contact AI experience. It deliberately runs
// through Netlify Dev (rather than Next alone), supplies a session-only
// follow-up signing secret when needed, and prevents accidental email delivery
// unless the operator explicitly sets CONTACT_DELIVERY_MODE in their shell.

const { randomBytes } = require('crypto')
const { spawn } = require('child_process')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run dev:contact-ai

Starts Netlify Dev at http://127.0.0.1:8888 with Next on port 3001.
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
  CLAUDE_NEXT_DIST_DIR: process.env.CLAUDE_NEXT_DIST_DIR || '.next-contact-ai',
}

console.log('Starting Contact AI development environment:')
console.log('  URL:      http://127.0.0.1:8888/contact')
console.log(`  AI:       ${environment.INTAKE_PROVIDER} / ${environment.INTAKE_MODEL}`)
console.log(`  Delivery: ${environment.CONTACT_DELIVERY_MODE}`)
console.log('  Secret:   session-only (unless supplied by the shell)')

const child = spawn(
  'netlify',
  ['dev', '--port', '8888', '--target-port', '3001', '--command', 'npm run dev -- -p 3001'],
  { stdio: 'inherit', env: environment },
)

child.on('error', (error) => {
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
