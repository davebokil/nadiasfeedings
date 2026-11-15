// Feed times are stored as local wall-clock strings ("2026-11-14T13:30") so they read
// the same on every device and sort correctly as plain strings.

export const pad = (n: number) => String(n).padStart(2, '0')

export const localStamp = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

export const dayOf = (at: string) => at.slice(0, 10)
export const minuteOf = (at: string) => Number(at.slice(11, 13)) * 60 + Number(at.slice(14, 16))

export function toDate(at: string): Date {
  const [y, m, d] = at.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!, Number(at.slice(11, 13)) || 0, Number(at.slice(14, 16)) || 0)
}

/** Minutes since epoch, for gap math across midnight. */
export const absMinutes = (at: string) => toDate(at).getTime() / 60000

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export function fmtTime(min: number) {
  min = ((min % 1440) + 1440) % 1440
  let h = Math.floor(min / 60)
  const m = min % 60
  const ap = h < 12 ? 'am' : 'pm'
  h = h % 12 || 12
  return `${h}:${pad(m)}${ap}`
}

export function fmtHourShort(min: number) {
  let h = Math.floor(min / 60) % 24
  const ap = h < 12 ? 'a' : 'p'
  h = h % 12 || 12
  return `${h}${ap}`
}

export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, opts)
}

export function fmtDuration(mins: number) {
  mins = Math.round(mins)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

export function fmtOz(n: number) {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function addDays(day: string, n: number) {
  const d = toDate(`${day}T00:00`)
  d.setDate(d.getDate() + n)
  return localStamp(d).slice(0, 10)
}
