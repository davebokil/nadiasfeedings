<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'
import type { Baby, Feed } from '~/utils/types'

const props = defineProps<{ a: Analysis; baby: Baby; now: Date }>()
defineEmits<{ edit: [Feed] }>()

const pace = computed(() => paceOf(props.a))
const tips = computed(() => tipsFor(props.a, props.baby, props.now))
const guide = computed(() => guideFor(props.baby, props.now))
const lastText = computed(() => {
  const f = props.a.lastFeed
  if (!f) return '—'
  const other = dayOf(f.at) !== props.a.today ? ` (${fmtDay(dayOf(f.at), { month: 'short', day: 'numeric' })})` : ''
  return `${fmtOz(f.oz)} oz at ${fmtTime(minuteOf(f.at))}${other}`
})
</script>

<template>
  <section>
    <div class="card">
      <h2>Today · {{ fmtDay(a.today) }}</h2>
      <div class="hero">
        <div class="big">{{ fmtOz(a.todayTotal) }} <small>oz</small></div>
        <div class="heroSide">{{ a.todayFeeds.length }} feed{{ a.todayFeeds.length === 1 ? '' : 's' }} · last: {{ lastText }}</div>
      </div>
      <div class="pill" :class="pace.kind">{{ pace.icon }} {{ pace.label }}</div>
      <p v-if="a.base.length" class="msg">By {{ fmtTime(a.nowMin) }} she's usually had <b>{{ fmtOz(a.avgCumNow) }} oz</b>.</p>
      <p class="msg" style="color:var(--ink2);font-size:14px">
        She's {{ guide.ageLabel }} · typical day: {{ guide.lo }}–{{ guide.hi }} oz
        <template v-if="guide.weightTarget"> · weight-based goal ≈ {{ fmtOz(guide.weightTarget) }} oz</template>
      </p>
    </div>

    <div class="card">
      <h2>Pace through the day</h2>
      <div class="legend">
        <span><i style="background:var(--accent)" />Today</span>
        <span><i style="background:var(--avg)" />7-day average</span>
        <span><i style="background:var(--band);height:9px" />Range</span>
      </div>
      <PaceChart :a="a" />
    </div>

    <div class="card">
      <h2>Tips right now</h2>
      <ul class="tips">
        <!-- Tip HTML is built from our own numbers/strings in utils/analytics.ts (only <b> tags). -->
        <li v-for="(t, i) in tips" :key="i"><span class="ic">{{ t.icon }}</span><span v-html="t.html" /></li>
      </ul>
    </div>

    <div v-if="a.todayFeeds.length" class="card" style="padding:6px 0">
      <div class="rows" style="display:block;border:0">
        <FeedRows :feeds="a.todayFeeds" @edit="$emit('edit', $event)" />
      </div>
    </div>
  </section>
</template>
