import type { AppUser, PushSub } from '~/services/backend'

/**
 * "New feeding" notifications via Web Push. On iPhone this only works from the home-screen app
 * (iOS 16.4+), not a Safari tab — there `PushManager` doesn't exist and the bell stays hidden.
 * The sending side is functions/index.js.
 */
export type PushState = 'unsupported' | 'loading' | 'off' | 'on' | 'denied'

const state = ref<PushState>('loading')
const busy = ref(false)
let reg: ServiceWorkerRegistration | null = null
let started = false

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function subId(endpoint: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)))
  return Array.from(bytes.slice(0, 20), b => b.toString(16).padStart(2, '0')).join('')
}

function toSub(s: PushSubscription): PushSub {
  const j = s.toJSON()
  return { endpoint: s.endpoint, keys: { p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' } }
}

function urlBase64ToUint8Array(b64: string) {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export function usePush() {
  const { $backend } = useNuxtApp()
  const config = useRuntimeConfig()
  const vapidKey = config.public.vapidPublicKey as string
  const { user } = useFeedLog()

  if (!started) {
    started = true
    if (!supported() || !vapidKey || $backend.kind !== 'firebase') state.value = 'unsupported'
    else {
      navigator.serviceWorker.register(`${config.app.baseURL}sw.js`, { scope: config.app.baseURL })
        .then(async r => {
          reg = r
          const existing = await r.pushManager.getSubscription()
          state.value = Notification.permission === 'denied' ? 'denied' : existing ? 'on' : 'off'
        })
        .catch(() => { state.value = 'unsupported' })

      // Keep this device's subscription doc fresh (re-created if it was cleaned up, name changes, etc.).
      watch([user, state], async ([u, s]) => {
        if (!u || s !== 'on' || !reg) return
        const existing = await reg.pushManager.getSubscription()
        if (existing) await $backend.savePushSub(await subId(existing.endpoint), toSub(existing), u as AppUser).catch(() => {})
      }, { immediate: true })
    }
  }

  async function enable() {
    if (!reg || !user.value || busy.value) return
    busy.value = true
    try {
      // Must run directly from a tap on iOS.
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { state.value = perm === 'denied' ? 'denied' : 'off'; return }
      const s = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
      await $backend.savePushSub(await subId(s.endpoint), toSub(s), user.value as AppUser)
      state.value = 'on'
    } finally { busy.value = false }
  }

  async function disable() {
    if (!reg || busy.value) return
    busy.value = true
    try {
      const s = await reg.pushManager.getSubscription()
      if (s) {
        await $backend.deletePushSub(await subId(s.endpoint)).catch(() => {})
        await s.unsubscribe()
      }
      state.value = 'off'
    } finally { busy.value = false }
  }

  return { state: readonly(state), busy: readonly(busy), enable, disable }
}
