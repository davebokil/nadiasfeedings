import type { Baby } from './types'

/*
 * Daily-intake reference ranges.
 *  - Breast milk, 1–6 months: average ~25 oz/day, typical range 19–30 oz/day (KellyMom / HSE research summary).
 *  - AAP (HealthyChildren.org): ~2.5 oz per lb of body weight per day, usually no more than ~32 oz/day.
 * These are population ranges, not targets — the pediatrician's growth check is the real measure.
 */
export const GUIDE = { lo: 19, hi: 30, mid: 25, max: 32, ozPerLb: 2.5 } as const

export interface Guide {
  ageDays: number
  weeks: number
  months: number
  ageLabel: string
  inRange: boolean // 1–6 months, when the 19–30 oz range applies
  lo: number
  hi: number
  mid: number
  max: number
  weightTarget: number | null
}

export function guideFor(baby: Baby, now: Date): Guide {
  const [y, m, d] = baby.birth.split('-').map(Number)
  const birth = new Date(y!, m! - 1, d!)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const ageDays = Math.round((today.getTime() - birth.getTime()) / 86400000)
  const weeks = Math.floor(ageDays / 7)
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months--
  const ageLabel = ageDays < 70 ? `${weeks} weeks old` : `${weeks} weeks (${months} mo) old`
  const weightTarget = baby.weightLb ? Math.min(GUIDE.max, Math.round(baby.weightLb * GUIDE.ozPerLb * 2) / 2) : null
  return {
    ageDays, weeks, months, ageLabel,
    inRange: ageDays >= 28 && ageDays < 183,
    lo: GUIDE.lo, hi: GUIDE.hi, mid: GUIDE.mid, max: GUIDE.max,
    weightTarget,
  }
}

export type Verdict = { kind: 'good' | 'warn'; icon: string; text: string }

export function verdictFor(g: Guide, ozPerDay: number): Verdict {
  if (ozPerDay > g.max) return { kind: 'warn', icon: '⚠', text: `above the ~${g.max} oz/day the AAP calls the usual upper limit` }
  if (ozPerDay < g.lo) return { kind: 'warn', icon: '⚠', text: `below the typical ${g.lo}–${g.hi} oz range for her age` }
  if (ozPerDay > g.hi) return { kind: 'good', icon: '✓', text: `on the high end of the typical ${g.lo}–${g.hi} oz range` }
  return { kind: 'good', icon: '✓', text: `within the typical ${g.lo}–${g.hi} oz range for her age` }
}
