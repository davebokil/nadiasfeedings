/** One logged bottle. `at` is a local wall-clock time "YYYY-MM-DDTHH:MM" (no time zone). */
export interface Feed {
  id: string
  at: string
  oz: number
  formula: boolean
  note: string
  byName?: string | null
  created?: string
  edited?: string
}

export interface Baby {
  name: string
  birth: string // YYYY-MM-DD
  weightLb: number | null
  weighedOn: string | null
}

export type FeedInput = Pick<Feed, 'at' | 'oz' | 'formula' | 'note'>
