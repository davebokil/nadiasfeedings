import type { Baby, Feed } from './types'
import { absMinutes, dayOf, fmtDuration, fmtOz, fmtTime, localStamp, minuteOf, minutesOfDay, toDate } from './time'
import { guideFor } from './guidelines'

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0)
const median = (a: number[]) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const i = Math.floor(s.length / 2)
  return s.length % 2 ? s[i]! : (s[i - 1]! + s[i]!) / 2
}

/** How many full days the "usual" baseline uses. */
export const BASELINE_DAYS = 7
/** Feeds this close together (minutes) count as one session for gap math (top-ups). */
export const SESSION_MERGE_MIN = 30

export interface CurvePoint { m: number; avg: number; lo: number; hi: number }
export interface TimeBlock { name: string; range: string; start: number; end: number; avg: number; perFeed: number }

export interface Analysis {
  sorted: Feed[]
  byDay: Map<string, Feed[]>
  days: string[]
  fullDays: string[]
  base: string[]
  today: string
  nowMin: number
  todayFeeds: Feed[]
  todayTotal: number
  avgTotal: number
  avgCumNow: number
  avgFeeds: number
  avgPerFeed: number
  prevAvg: number | null
  baseTotals: number[]
  medDayGap: number
  medNightGap: number
  avgLongestNight: number
  bestLongestNight: number
  blocks: TimeBlock[]
  curve: CurvePoint[]
  lastFeed: Feed | null
  lastSessionEnd: number | null // absolute minutes
  total: (day: string) => number
  cumAt: (day: string, minute: number) => number
}

export function analyze(feeds: Feed[], now: Date): Analysis {
  const sorted = feeds.filter(f => f.at && typeof f.oz === 'number').sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  const byDay = new Map<string, Feed[]>()
  for (const f of sorted) {
    const d = dayOf(f.at)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(f)
  }
  const today = localStamp(now).slice(0, 10)
  const days = [...byDay.keys()].sort()
  const fullDays = days.filter(d => d < today)
  const base = fullDays.slice(-BASELINE_DAYS)
  const prev = fullDays.slice(-BASELINE_DAYS * 2, -BASELINE_DAYS)
  const total = (d: string) => sum((byDay.get(d) ?? []).map(f => f.oz))
  const cumAt = (d: string, m: number) => sum((byDay.get(d) ?? []).filter(f => minuteOf(f.at) <= m).map(f => f.oz))

  const nowMin = minutesOfDay(now)
  const todayFeeds = byDay.get(today) ?? []
  const todayTotal = sum(todayFeeds.map(f => f.oz))
  const baseTotals = base.map(total)
  const avgTotal = mean(baseTotals)
  const avgCumNow = mean(base.map(d => cumAt(d, nowMin)))
  const baseFeedCount = sum(base.map(d => byDay.get(d)!.length))
  const avgFeeds = base.length ? baseFeedCount / base.length : 0
  const avgPerFeed = baseFeedCount ? sum(baseTotals) / baseFeedCount : 0
  const prevAvg = prev.length >= 3 ? mean(prev.map(total)) : null

  // Sessions: merge entries within SESSION_MERGE_MIN of each other.
  const sessions: { start: number; end: number; at: string }[] = []
  for (const f of sorted) {
    const t = absMinutes(f.at)
    const last = sessions[sessions.length - 1]
    if (last && t - last.end <= SESSION_MERGE_MIN) last.end = t
    else sessions.push({ start: t, end: t, at: f.at })
  }
  const recent = new Set([...base, today])
  const dayGaps: number[] = []
  const nightGaps: number[] = []
  const nightMax = new Map<string, number>()
  for (let i = 1; i < sessions.length; i++) {
    const a = sessions[i - 1]!
    const b = sessions[i]!
    const gap = b.start - a.end
    if (gap <= 0 || gap > 8 * 60) continue
    const m = minuteOf(a.at)
    const d = dayOf(a.at)
    if (!recent.has(d)) continue
    const isNight = m >= 19 * 60 || m < 5 * 60
    if (isNight) {
      // Attribute after-midnight gaps to the previous evening's night.
      let key = d
      if (m < 5 * 60) {
        const x = toDate(a.at)
        x.setDate(x.getDate() - 1)
        key = localStamp(x).slice(0, 10)
      }
      nightGaps.push(gap)
      nightMax.set(key, Math.max(nightMax.get(key) ?? 0, gap))
    } else if (m >= 6 * 60) {
      dayGaps.push(gap)
    }
  }
  const longest = [...nightMax.values()]

  const blockDefs: [string, string, number, number][] = [
    ['Overnight', '12–6am', 0, 360],
    ['Morning', '6am–12', 360, 720],
    ['Afternoon', '12–6pm', 720, 1080],
    ['Evening', '6pm–12', 1080, 1440],
  ]
  const blocks: TimeBlock[] = blockDefs.map(([name, range, start, end]) => {
    const inBlock = (f: Feed) => { const m = minuteOf(f.at); return m >= start && m < end }
    const per = base.map(d => sum(byDay.get(d)!.filter(inBlock).map(f => f.oz)))
    const n = sum(base.map(d => byDay.get(d)!.filter(inBlock).length))
    return { name, range, start, end, avg: mean(per), perFeed: n ? sum(per) / n : 0 }
  })

  const curve: CurvePoint[] = []
  for (let m = 0; m <= 1440; m += 10) {
    const vals = base.map(d => cumAt(d, m))
    curve.push({ m, avg: mean(vals), lo: vals.length ? Math.min(...vals) : 0, hi: vals.length ? Math.max(...vals) : 0 })
  }

  return {
    sorted, byDay, days, fullDays, base, today, nowMin, todayFeeds, todayTotal, avgTotal, avgCumNow,
    avgFeeds, avgPerFeed, prevAvg, baseTotals,
    medDayGap: median(dayGaps), medNightGap: median(nightGaps),
    avgLongestNight: mean(longest), bestLongestNight: longest.length ? Math.max(...longest) : 0,
    blocks, curve,
    lastFeed: sorted[sorted.length - 1] ?? null,
    lastSessionEnd: sessions.length ? sessions[sessions.length - 1]!.end : null,
    total, cumAt,
  }
}

export type PaceKind = 'good' | 'warn' | 'neutral'
export interface Pace { kind: PaceKind; icon: string; label: string; diff: number; ahead: boolean; behind: boolean }

export function paceOf(a: Analysis): Pace {
  if (!a.base.length) return { kind: 'neutral', icon: '•', label: 'Building her baseline', diff: 0, ahead: false, behind: false }
  const diff = a.todayTotal - a.avgCumNow
  const thresh = Math.max(1, a.avgCumNow * 0.1)
  if (diff <= -thresh) return { kind: 'warn', icon: '⚠', label: `${fmtOz(-diff)} oz behind her usual pace`, diff, ahead: false, behind: true }
  if (diff >= thresh) return { kind: 'good', icon: '▲', label: `${fmtOz(diff)} oz ahead of her usual pace`, diff, ahead: true, behind: false }
  return { kind: 'good', icon: '✓', label: 'On her usual pace', diff, ahead: false, behind: false }
}

export interface Tip { icon: string; html: string }

/** Context-aware tips for the Today view. Text may contain <b> only; all values are numbers we format. */
export function tipsFor(a: Analysis, baby: Baby, now: Date): Tip[] {
  if (!a.base.length) return [{ icon: '💡', html: 'Log a full day or two and tips will start showing up here.' }]
  const tips: Tip[] = []
  const nm = a.nowMin
  const p = paceOf(a)
  if (p.behind) {
    tips.push({ icon: '⏱', html: `By ${fmtTime(nm)} she's usually had <b>${fmtOz(a.avgCumNow)} oz</b>; today she's at <b>${fmtOz(a.todayTotal)} oz</b>. A slightly bigger next bottle, or a small top-up later, would get her back on track.` })
  } else if (p.ahead) {
    tips.push({ icon: '🌟', html: `She's ahead of a typical day — usually <b>${fmtOz(a.avgCumNow)} oz</b> by now, today <b>${fmtOz(a.todayTotal)} oz</b>.` })
  } else {
    tips.push({ icon: '✓', html: `Right in her normal range — usually <b>${fmtOz(a.avgCumNow)} oz</b> by ${fmtTime(nm)}, today <b>${fmtOz(a.todayTotal)} oz</b>.` })
  }

  const projected = a.todayTotal + Math.max(0, a.avgTotal - a.avgCumNow)
  if (nm < 22 * 60) tips.push({ icon: '📈', html: `If the rest of today goes like usual, she'll finish around <b>${fmtOz(projected)} oz</b> (7-day average: ${fmtOz(a.avgTotal)} oz).` })

  if (a.lastSessionEnd !== null) {
    const since = now.getTime() / 60000 - a.lastSessionEnd
    const night = nm >= 19 * 60 || nm < 5 * 60
    const gap = night ? a.medNightGap : a.medDayGap
    if (since >= 0 && since < 12 * 60 && gap) {
      const next = new Date((a.lastSessionEnd + gap) * 60000)
      if (since > gap + 30) tips.push({ icon: '🍼', html: `It's been <b>${fmtDuration(since)}</b> since her last feed — longer than her usual ${night ? 'overnight' : 'daytime'} gap of about ${fmtDuration(gap)}.` })
      else tips.push({ icon: '🕐', html: `Last fed ${fmtDuration(since)} ago. She usually goes about <b>${fmtDuration(gap)}</b> between ${night ? 'night' : 'daytime'} feeds, so next is likely around <b>${fmtTime(minutesOfDay(next))}</b>.` })
    }
  }

  if (nm >= 15 * 60 && nm < 22 * 60 && a.avgTotal > a.todayTotal) {
    const rest = mean(a.base.map(d => a.total(d) - a.cumAt(d, nm)))
    tips.push({ icon: '🌙', html: `From now until midnight she usually takes about <b>${fmtOz(rest)} oz</b> more.` })
  }

  const g = guideFor(baby, now)
  if (g.inRange) {
    if (nm >= 18 * 60 && projected < g.lo) tips.push({ icon: '📋', html: `Today is tracking toward ${fmtOz(projected)} oz, under the typical ${g.lo} oz floor. One low day is common; if it keeps happening, mention it to your pediatrician.` })
    else if (a.avgTotal < g.lo) tips.push({ icon: '📋', html: `Her 7-day average (${fmtOz(a.avgTotal)} oz) is under the typical ${g.lo}–${g.hi} oz range. Worth bringing up with your pediatrician.` })
    else tips.push({ icon: '📋', html: `Her ${fmtOz(a.avgTotal)} oz/day average is in the healthy range for ${g.ageLabel} (typical ${g.lo}–${g.hi}${g.weightTarget ? `, ~${fmtOz(g.weightTarget)} for her weight` : ''}).` })
  }

  const big = [...a.blocks].sort((x, y) => y.perFeed - x.perFeed)[0]
  if (big && big.perFeed) tips.push({ icon: '🔎', html: `Her biggest bottles tend to come <b>${big.name.toLowerCase()}</b> (${big.range}) — about ${fmtOz(big.perFeed)} oz per feed.` })
  return tips
}
