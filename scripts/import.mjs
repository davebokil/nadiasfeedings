// One-time migration: loads data/export.json into Firestore.
//
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import.mjs [--dry-run] [file]
//
// Safe to re-run: each feed keeps its id, so running twice overwrites rather than duplicates.
// Uses the Admin SDK, which bypasses security rules — keep the key file out of git.
import { readFileSync } from 'node:fs'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const file = args.find(a => !a.startsWith('--')) ?? 'data/export.json'
const data = JSON.parse(readFileSync(file, 'utf8'))
const feeds = data.feeds ?? []

const bad = feeds.filter(f => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.at) || !(f.oz > 0))
if (bad.length) { console.error('Invalid rows:', bad); process.exit(1) }

console.log(`${feeds.length} feeds from ${feeds[0]?.at} to ${feeds.at(-1)?.at}`)
if (dryRun) { console.log('Dry run — nothing written.'); process.exit(0) }

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path (see README).')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

for (let i = 0; i < feeds.length; i += 400) {
  const batch = db.batch()
  for (const { id, at, oz, formula, note } of feeds.slice(i, i + 400)) {
    batch.set(db.collection('feeds').doc(id), {
      at, oz, formula: !!formula, note: note ?? '',
      byName: null, created: data.exportedAt ?? new Date().toISOString(),
    })
  }
  await batch.commit()
  console.log(`  wrote ${Math.min(i + 400, feeds.length)}/${feeds.length}`)
}

if (data.baby) {
  const { name, birth, weightLb = null, weighedOn = null } = data.baby
  await db.doc('meta/baby').set({ name, birth, weightLb, weighedOn })
  console.log('  wrote meta/baby')
}
console.log('Done.')
