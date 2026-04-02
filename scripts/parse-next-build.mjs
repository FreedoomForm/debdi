import fs from 'node:fs'

const logPath = process.argv[2]
if (!logPath) {
  console.error('Usage: node scripts/parse-next-build.mjs <build.log>')
  process.exit(2)
}

const content = fs.readFileSync(logPath, 'utf8')

function findFirstLoad(route) {
  // Matches: "├ ○ /low-admin  290 B  250 kB"
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\n.*\\s${escaped}\\s+\\S+\\s+([0-9.]+)\\s*kB`, 'i')
  const match = content.match(re)
  if (!match) return null
  return Number(match[1])
}

const budgets = {
  '/middle-admin': 250,
  '/low-admin': 250,
}

let failed = false
for (const [route, budget] of Object.entries(budgets)) {
  const firstLoadKb = findFirstLoad(route)
  if (firstLoadKb == null) {
    console.warn(`[budget] Could not find First Load JS for ${route}`)
    continue
  }
  if (firstLoadKb > budget) {
    console.error(`[budget] ${route} First Load JS ${firstLoadKb}kB > ${budget}kB`)
    failed = true
  } else {
    console.log(`[budget] ${route} First Load JS ${firstLoadKb}kB <= ${budget}kB`)
  }
}

process.exit(failed ? 1 : 0)

