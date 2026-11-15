// Download everything from Firestore into backups/feeds-YYYY-MM-DD.json
// (same shape as data/export.json, so scripts/import.mjs can restore it).
//
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/backup.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const db = getFirestore()
const snap = await db.collection('feeds').orderBy('at').get()
const baby = (await db.doc('meta/baby').get()).data() ?? null
const feeds = snap.docs.map(d => ({ id: d.id, ...d.data() }))
mkdirSync('backups', { recursive: true })
const file = `backups/feeds-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), baby, feeds }, null, 1))
console.log(`Saved ${feeds.length} feeds to ${file}`)
