import type { AppUser, Unsub } from '~/services/backend'
import type { Baby, Feed, FeedInput } from '~/utils/types'

/** Days of history kept live; older days load on demand in History. */
export const LIVE_WINDOW_DAYS = 60

// Placeholder until meta/baby loads from the backend (real values never live in this public repo).
const DEFAULT_BABY: Baby = { name: 'Nadia', birth: '2026-08-20', weightLb: null, weighedOn: null }

// Module-level singletons: this is a client-only SPA, so one shared store is fine.
const user = ref<AppUser | null>(null)
const authReady = ref(false)
const liveFeeds = ref<Feed[]>([])
const olderFeeds = ref<Feed[]>([])
const olderLoaded = ref(false)
const loaded = ref(false)
const offline = ref(false)
const error = ref<string | null>(null)
const baby = ref<Baby>({ ...DEFAULT_BABY })
let started = false
let unsubs: Unsub[] = []

function friendly(e: unknown) {
  const code = (e as any)?.code as string | undefined
  if (code === 'permission-denied') return "This Google account isn't allowed to see the log. Sign in with an approved account."
  if (code === 'unavailable') return "Can't reach the server — showing what's saved on this device."
  return 'Something went wrong loading the log.'
}

export function useFeedLog() {
  const { $backend } = useNuxtApp()
  const live = liveWindowStart()

  if (!started) {
    started = true
    $backend.onUser(u => {
      user.value = u
      authReady.value = true
      unsubs.forEach(fn => fn())
      unsubs = []
      liveFeeds.value = []
      olderFeeds.value = []
      olderLoaded.value = false
      loaded.value = false
      error.value = null
      if (!u) return
      unsubs.push($backend.watchFeeds(live, (feeds, fromCache) => {
        liveFeeds.value = feeds
        offline.value = fromCache
        loaded.value = true
        error.value = null
      }, e => { loaded.value = true; error.value = friendly(e) }))
      unsubs.push($backend.watchBaby(b => { baby.value = { ...DEFAULT_BABY, ...(b ?? {}) } }))
    })
  }

  const feeds = computed(() => {
    const ids = new Set(liveFeeds.value.map(f => f.id))
    return [...olderFeeds.value.filter(f => !ids.has(f.id)), ...liveFeeds.value]
  })

  async function addFeed(input: FeedInput) {
    const id = `f${input.at.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 7)}`
    await $backend.saveFeed({ id, ...input, byName: user.value?.name ?? null, created: new Date().toISOString() })
  }

  async function updateFeed(existing: Feed, input: FeedInput) {
    await $backend.saveFeed({ ...existing, ...input, edited: new Date().toISOString() })
    // Edited an old (non-live) entry: reflect it locally.
    if (input.at < live || existing.at < live) {
      olderFeeds.value = olderFeeds.value.map(f => (f.id === existing.id ? { ...existing, ...input } : f)).filter(f => f.at < live)
    }
  }

  async function removeFeed(f: Feed) {
    await $backend.deleteFeed(f.id)
    olderFeeds.value = olderFeeds.value.filter(x => x.id !== f.id)
  }

  async function loadOlder() {
    olderFeeds.value = await $backend.fetchOlder(live)
    olderLoaded.value = true
  }

  async function saveWeight(lb: number, day: string) {
    await $backend.saveBaby({ ...baby.value, weightLb: lb, weighedOn: day })
  }

  return {
    backendKind: $backend.kind,
    user: readonly(user), authReady: readonly(authReady),
    feeds, loaded: readonly(loaded), offline: readonly(offline), error: readonly(error),
    baby: readonly(baby), olderLoaded: readonly(olderLoaded),
    signIn: () => $backend.signIn(), signOut: () => $backend.signOut(),
    addFeed, updateFeed, removeFeed, loadOlder, saveWeight,
  }
}

function liveWindowStart() {
  const d = new Date()
  d.setDate(d.getDate() - LIVE_WINDOW_DAYS)
  return localStamp(d).slice(0, 10)
}
