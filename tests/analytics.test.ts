import { describe, expect, it } from 'vitest'
import { analyze, paceOf, UNATTRIBUTED, usageOf } from '../app/utils/analytics'
import { guideFor, verdictFor } from '../app/utils/guidelines'
import { fmtOz, fmtTime } from '../app/utils/time'
import type { Feed } from '../app/utils/types'

// Synthetic log: Nov 4–14 follow the same pattern (4 oz at 1am, then 3 oz every 3h from 6am to 9pm = 22 oz/day),
// except Nov 14 adds a 3.5 oz top-up at 10pm. Today (Nov 15) has 2.5 oz at 12:30am and 2 oz at 7am.
const DAY_TIMES: [string, number][] = [['01:00', 4], ['06:00', 3], ['09:00', 3], ['12:00', 3], ['15:00', 3], ['18:00', 3], ['21:00', 3]]
const feeds: Feed[] = []
for (let d = 4; d <= 14; d++) {
  const day = `2026-11-${String(d).padStart(2, '0')}`
  for (const [t, oz] of DAY_TIMES) feeds.push({ id: `${day}${t}`, at: `${day}T${t}`, oz, formula: false, note: '' })
}
feeds.push({ id: 'x1', at: '2026-11-14T22:00', oz: 3.5, formula: true, note: 'top-up' })
feeds.push({ id: 't1', at: '2026-11-15T00:30', oz: 2.5, formula: false, note: '' })
feeds.push({ id: 't2', at: '2026-11-15T07:00', oz: 2, formula: false, note: '' })

describe('analyze', () => {
  // Sun Nov 15 2026, 2:30pm local
  const now = new Date(2026, 10, 15, 14, 30)
  const a = analyze(feeds, now)

  it('totals each day from its entries', () => {
    expect(a.total('2026-11-13')).toBe(22)
    expect(a.total('2026-11-14')).toBe(25.5)
  })

  it('uses the last 7 full days as the baseline', () => {
    expect(a.base).toEqual(['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'])
    expect(a.avgTotal).toBeCloseTo(22.5, 5)
  })

  it('computes cumulative pace for the current time', () => {
    // By 2:30pm a usual day has 4 + 3 + 3 + 3 = 13 oz; today has 4.5
    expect(a.avgCumNow).toBe(13)
    expect(a.todayTotal).toBe(4.5)
    expect(paceOf(a).behind).toBe(true)
  })

  it('measures daytime gaps', () => {
    expect(a.medDayGap).toBe(180)
  })

  it('handles an empty log', () => {
    const e = analyze([], now)
    expect(e.base).toEqual([])
    expect(paceOf(e).kind).toBe('neutral')
  })
})

describe('guidelines', () => {
  const baby = { name: 'Nadia', birth: '2026-08-20', weightLb: null, weighedOn: null }
  it('ages her from the birthday', () => {
    const g = guideFor(baby, new Date(2026, 10, 15))
    expect(g.weeks).toBe(12)
    expect(g.inRange).toBe(true)
  })
  it('caps the weight-based target at 32 oz', () => {
    expect(guideFor({ ...baby, weightLb: 10 }, new Date(2026, 10, 15)).weightTarget).toBe(25)
    expect(guideFor({ ...baby, weightLb: 15 }, new Date(2026, 10, 15)).weightTarget).toBe(32)
  })
  it('flags low and high intake', () => {
    const g = guideFor(baby, new Date(2026, 10, 15))
    expect(verdictFor(g, 17).kind).toBe('warn')
    expect(verdictFor(g, 24).kind).toBe('good')
    expect(verdictFor(g, 34).kind).toBe('warn')
  })
})

describe('format', () => {
  it('formats times and ounces', () => {
    expect(fmtTime(0)).toBe('12:00am')
    expect(fmtTime(13 * 60 + 45)).toBe('1:45pm')
    expect(fmtOz(3.2)).toBe('3.2')
    expect(fmtOz(3)).toBe('3')
  })
})

describe('usageOf', () => {
  // Synthetic: Nov 1–15. Alex logs mornings, Sam logs 2am feeds, and Nov 1–3 are unattributed (imported).
  const now = new Date(2026, 10, 15, 14, 30)
  const log: Feed[] = []
  for (let d = 1; d <= 15; d++) {
    const day = `2026-11-${String(d).padStart(2, '0')}`
    const imported = d <= 3
    log.push({ id: `${day}a`, at: `${day}T02:00`, oz: 3, formula: false, note: '', byName: imported ? null : 'Sam', created: `${day}T07:05:00.000Z` })
    log.push({ id: `${day}b`, at: `${day}T09:00`, oz: 2, formula: false, note: '', byName: imported ? null : 'Alex', created: `${day}T14:05:00.000Z` })
  }
  // Alex fixes one of Sam's entries today.
  log[log.length - 2] = { ...log[log.length - 2]!, oz: 3.5, edited: '2026-11-15T15:00:00.000Z', editedBy: 'Alex' }

  it('counts the last 7 days by logger, with share and overnight feeds', () => {
    const u = usageOf(log, now, 'week')
    expect(u.since).toBe('2026-11-09')
    expect(u.total).toBe(14)
    const sam = u.people.find(p => p.name === 'Sam')!
    const alex = u.people.find(p => p.name === 'Alex')!
    expect(sam.feeds).toBe(7)
    expect(sam.oz).toBe(6 * 3 + 3.5)
    expect(sam.overnight).toBe(7)
    expect(sam.share).toBeCloseTo(0.5)
    expect(alex.overnight).toBe(0)
    expect(alex.edits).toBe(1)
    expect(alex.lastAt).toBe('2026-11-15T09:00')
    expect(u.people.some(p => p.name === UNATTRIBUTED)).toBe(false)
  })

  it('puts unattributed feeds in their own bucket, listed last, for all time', () => {
    const u = usageOf(log, now, 'all')
    expect(u.total).toBe(30)
    expect(u.people.map(p => p.name)).toEqual(['Alex', 'Sam', UNATTRIBUTED])
    expect(u.people[2]!.feeds).toBe(6)
    expect(u.people[2]!.attributed).toBe(false)
  })

  it('lists recent activity newest first, including edits', () => {
    const u = usageOf(log, now, 'week', 3)
    expect(u.recent.map(r => `${r.kind}:${r.who}`)).toEqual(['edited:Alex', 'added:Alex', 'added:Sam'])
    expect(u.recent[0]!.feedAt).toBe('2026-11-15T02:00')
  })

  it('handles an empty log', () => {
    const u = usageOf([], now)
    expect(u.total).toBe(0)
    expect(u.people).toEqual([])
    expect(u.recent).toEqual([])
  })
})
