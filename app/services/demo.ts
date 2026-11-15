import type { Backend } from './backend'
import type { Baby, Feed } from '~/utils/types'

/**
 * Local-only backend used when no Firebase config is set (e.g. `npm run dev` before setup).
 * Loads `public/demo-data.json` if present (copy data/export.json there to try the app with
 * real numbers — it's git-ignored so it never ships), keeps changes in memory only.
 */
export function createDemoBackend(baseURL: string): Backend {
  let feeds: Feed[] = []
  let baby: Partial<Baby> | null = null
  const feedSubs = new Set<() => void>()
  const babySubs = new Set<() => void>()
  let since = ''
  const emitFeeds = (next: (f: Feed[], c: boolean) => void) => next(feeds.filter(f => f.at >= since), false)

  const loaded = fetch(`${baseURL}demo-data.json`)
    .then(r => (r.ok ? r.json() : null))
    .then(j => { if (j) { feeds = j.feeds ?? []; baby = j.baby ?? null } })
    .catch(() => {})

  return {
    kind: 'demo',
    onUser(cb) { cb({ uid: 'demo', name: 'Demo', email: 'demo@local' }); return () => {} },
    async signIn() {},
    async signOut() {},
    watchFeeds(sinceDay, next) {
      since = sinceDay
      const fire = () => emitFeeds(next)
      feedSubs.add(fire)
      loaded.then(fire)
      return () => feedSubs.delete(fire)
    },
    async fetchOlder(beforeDay) { await loaded; return feeds.filter(f => f.at < beforeDay) },
    async saveFeed(f) { feeds = [...feeds.filter(x => x.id !== f.id), f]; feedSubs.forEach(fn => fn()) },
    async deleteFeed(id) { feeds = feeds.filter(x => x.id !== id); feedSubs.forEach(fn => fn()) },
    watchBaby(next) {
      const fire = () => next(baby)
      babySubs.add(fire)
      loaded.then(fire)
      return () => babySubs.delete(fire)
    },
    async saveBaby(b) { baby = b; babySubs.forEach(fn => fn()) },
  }
}
