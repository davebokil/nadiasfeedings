/** A clock that ticks every minute and when the app comes back to the foreground. */
const now = ref(new Date())
let started = false

export function useNow() {
  if (!started && import.meta.client) {
    started = true
    setInterval(() => { now.value = new Date() }, 60_000)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) now.value = new Date() })
  }
  return now
}
