// Pure formatting for the "new feeding" push. Kept separate from index.js so it's unit-tested
// (tests/push-message.test.ts) without Firebase.

/** "2026-11-16T15:00" → "3pm", "2026-11-16T03:12" → "3:12am". Wall-clock string; never converted to UTC. */
export function fmtClock(at) {
  const h24 = Number(at.slice(11, 13))
  const m = Number(at.slice(14, 16))
  const ap = h24 < 12 ? 'am' : 'pm'
  const h = h24 % 12 || 12
  return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`
}

export function fmtOz(n) {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** First name only: "Dana Smith" → "Dana". */
export function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'Someone'
}

/** @returns {{ title: string, body: string }} */
export function feedMessage(feed, babyName = 'Nadia') {
  return {
    title: "New feeding 🍼",
    body: `${firstName(feed.byName)} added a feeding for ${babyName}, ${fmtOz(feed.oz)}oz at ${fmtClock(feed.at)}`,
  }
}
