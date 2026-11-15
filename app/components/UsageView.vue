<script setup lang="ts">
import type { Feed } from '~/utils/types'
import type { UsagePeriod } from '~/utils/analytics'

const props = defineProps<{ feeds: Feed[]; now: Date }>()

const period = ref<UsagePeriod>('week')
const usage = computed(() => usageOf(props.feeds, props.now, period.value))
const today = computed(() => localStamp(props.now).slice(0, 10))
const yesterday = computed(() => addDays(today.value, -1))

/** "today" / "yesterday" / "Thu, Nov 12" for a YYYY-MM-DD day. */
function dayLabel(day: string) {
  if (day === today.value) return 'today'
  if (day === yesterday.value) return 'yesterday'
  return fmtDay(day)
}
/** A feed's wall-clock time, e.g. "2:00am today". */
function feedLabel(at: string) {
  return `${fmtTime(minuteOf(at))} ${dayLabel(dayOf(at))}`
}
/** When someone did something (a real instant), shown in local time. */
function whenLabel(iso: string) {
  const at = localStamp(new Date(iso))
  return `${dayLabel(at.slice(0, 10))}, ${fmtTime(minuteOf(at))}`
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
</script>

<template>
  <section>
    <div class="card">
      <div class="usageHead">
        <h2>Who's logging</h2>
        <div class="seg" role="group" aria-label="Period">
          <button :class="{ on: period === 'week' }" @click="period = 'week'">7 days</button>
          <button :class="{ on: period === 'all' }" @click="period = 'all'">All time</button>
        </div>
      </div>

      <div v-if="!usage.total && !usage.people.length" class="empty">
        No feeds logged {{ period === 'week' ? 'in the last 7 days' : 'yet' }}.
      </div>
      <div v-for="p in usage.people" :key="p.name" class="usr" :class="{ off: !p.attributed }">
        <div class="top">
          <div class="name">{{ p.name }}</div>
          <div class="nums">{{ plural(p.feeds, 'feed') }} · {{ fmtOz(p.oz) }} oz</div>
        </div>
        <div class="bar"><div :style="{ width: `${Math.round(p.share * 100)}%` }" /></div>
        <div class="meta">
          <template v-if="p.attributed">
            {{ Math.round(p.share * 100) }}% of feeds<template v-if="p.overnight"> · {{ p.overnight }} overnight (12–6am)</template><template v-if="p.edits"> · {{ plural(p.edits, 'edit') }}</template><template v-if="p.lastAt"> · last {{ feedLabel(p.lastAt) }}</template>
          </template>
          <template v-else>Logged before the app, so no name was recorded</template>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Recent activity</h2>
      <div v-if="!usage.recent.length" class="empty">
        Nothing logged in the app yet. New and edited feeds will show who did it.
      </div>
      <div v-for="r in usage.recent" :key="`${r.kind}${r.when}${r.feedAt}`" class="act">
        <div class="what"><b>{{ r.who }}</b> {{ r.kind }} {{ fmtOz(r.oz) }} oz <span>({{ feedLabel(r.feedAt) }} feed)</span></div>
        <div class="when">{{ whenLabel(r.when) }}</div>
      </div>
    </div>
  </section>
</template>
