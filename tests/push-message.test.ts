import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module shared with the Cloud Function
import { feedMessage, fmtClock } from '../functions/message.js'

describe('push message', () => {
  it('formats the new-feeding notification', () => {
    expect(feedMessage({ byName: 'Sam Parent', oz: 1.5, at: '2026-11-16T15:00' }, 'Nadia')).toEqual({
      title: 'New feeding 🍼',
      body: 'Sam added a feeding for Nadia, 1.5oz at 3pm',
    })
  })
  it('keeps minutes and handles midnight/noon', () => {
    expect(fmtClock('2026-11-16T03:12')).toBe('3:12am')
    expect(fmtClock('2026-11-16T00:05')).toBe('12:05am')
    expect(fmtClock('2026-11-16T12:00')).toBe('12pm')
  })
  it('rounds oz and tolerates a missing name', () => {
    expect(feedMessage({ byName: null, oz: 2, at: '2026-11-16T21:30' }).body).toBe('Someone added a feeding for Nadia, 2oz at 9:30pm')
    expect(feedMessage({ byName: 'A', oz: 2.25, at: '2026-11-16T21:30' }).body).toContain('2.3oz')
  })
})
