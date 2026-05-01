import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function runPrismaPush(args, inherit = false) {
  return spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', ...args],
    inherit ? { stdio: 'inherit' } : { encoding: 'utf8', stdio: 'pipe' }
  )
}

function isConnectionError(output) {
  const combined = `${output.stdout ?? ''}\n${output.stderr ?? ''}`.toLowerCase()
  return (
    combined.includes("can't reach database") ||
    combined.includes('connection') ||
    combined.includes('timeout') ||
    combined.includes('econnrefused') ||
    combined.includes('p1001')
  )
}

const isVercel = !!process.env.VERCEL
const vercelEnv = process.env.VERCEL_ENV
const shouldPush =
  process.env.PRISMA_DB_PUSH_ON_BUILD === 'true' ||
  (vercelEnv === 'production' && process.env.PRISMA_DB_PUSH_ON_BUILD !== 'false')

if (!isVercel) {
  log('[vercel-db-push] Skipping: not running on Vercel.')
  process.exit(0)
}
if (!shouldPush) {
  log('[vercel-db-push] Skipping: PRISMA_DB_PUSH_ON_BUILD not enabled.')
  process.exit(0)
}
if (!process.env.DATABASE_URL) {
  log('[vercel-db-push] Skipping: DATABASE_URL is not set.')
  process.exit(0)
}

// Retry logic for transient connection issues (Neon cold start, network blips)
const maxRetries = 3
const retryDelayMs = 5000

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  log(`[vercel-db-push] Running: prisma db push --skip-generate (attempt ${attempt}/${maxRetries})`)
  const result = runPrismaPush(['--skip-generate'])
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  if (result.status === 0) {
    log('[vercel-db-push] Success!')
    process.exit(0)
  }

  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.toLowerCase()
  const needsAcceptDataLoss =
    combined.includes('--accept-data-loss') ||
    combined.includes('data loss warnings') ||
    combined.includes('may cause data loss')

  if (needsAcceptDataLoss) {
    log('[vercel-db-push] Retrying with: prisma db push --skip-generate --accept-data-loss')
    const second = runPrismaPush(['--skip-generate', '--accept-data-loss'], true)
    process.exit(second.status ?? 1)
  }

  // Check if it's a connection error that might be transient
  if (isConnectionError(result) && attempt < maxRetries) {
    log(`[vercel-db-push] Connection error detected. Waiting ${retryDelayMs / 1000}s before retry...`)
    await sleep(retryDelayMs)
    continue
  }

  // Non-connection error or final attempt failed
  process.exit(result.status ?? 1)
}

process.exit(1)
