import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

function runPrismaPush(args, inherit = false) {
  return spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', ...args],
    inherit ? { stdio: 'inherit' } : { encoding: 'utf8', stdio: 'pipe' }
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

log('[vercel-db-push] Running: prisma db push --skip-generate')
const first = runPrismaPush(['--skip-generate'])
if (first.stdout) process.stdout.write(first.stdout)
if (first.stderr) process.stderr.write(first.stderr)
if (first.status === 0) process.exit(0)

const combined = `${first.stdout ?? ''}\n${first.stderr ?? ''}`.toLowerCase()
const needsAcceptDataLoss =
  combined.includes('--accept-data-loss') ||
  combined.includes('data loss warnings') ||
  combined.includes('may cause data loss')

if (!needsAcceptDataLoss) {
  process.exit(first.status ?? 1)
}

log('[vercel-db-push] Retrying with: prisma db push --skip-generate --accept-data-loss')
const second = runPrismaPush(['--skip-generate', '--accept-data-loss'], true)
process.exit(second.status ?? 1)
