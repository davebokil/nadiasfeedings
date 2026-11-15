<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'
import type { Baby } from '~/utils/types'

const props = defineProps<{ a: Analysis; baby: Baby; now: Date }>()

const guide = computed(() => guideFor(props.baby, props.now))
const trend = computed(() => (props.a.prevAvg !== null ? props.a.avgTotal - props.a.prevAvg : null))
const prevCount = computed(() => props.a.fullDays.slice(-14, -7).length)
const maxBlock = computed(() => Math.max(1, ...props.a.blocks.map(b => b.avg)))
const formulaDays = computed(() => props.a.base.filter(d => props.a.byDay.get(d)!.some(f => f.formula)).length)
</script>

<template>
  <section>
    <div v-if="!a.base.length" class="empty">Trends appear after the first full day.</div>
    <template v-else>
      <GuidelineCard :a="a" :baby="baby" :now="now" />

      <div class="card">
        <h2>Last 7 full days</h2>
        <div class="stats">
          <div class="stat"><div class="k">Avg per day</div><div class="v">{{ fmtOz(a.avgTotal) }} <small>oz</small></div></div>
          <div class="stat"><div class="k">Range</div><div class="v">{{ fmtOz(Math.min(...a.baseTotals)) }}–{{ fmtOz(Math.max(...a.baseTotals)) }} <small>oz</small></div></div>
          <div class="stat"><div class="k">Feeds per day</div><div class="v">{{ fmtOz(a.avgFeeds) }}</div></div>
          <div class="stat"><div class="k">Avg per feed</div><div class="v">{{ fmtOz(a.avgPerFeed) }} <small>oz</small></div></div>
          <div class="stat"><div class="k">Daytime gap</div><div class="v">{{ a.medDayGap ? fmtDuration(a.medDayGap) : '—' }}</div></div>
          <div class="stat"><div class="k">Longest night stretch</div><div class="v">{{ a.avgLongestNight ? fmtDuration(a.avgLongestNight) : '—' }} <small>avg</small></div></div>
        </div>
        <p v-if="trend !== null" class="msg">
          {{ trend >= 0.5 ? '▲' : trend <= -0.5 ? '▼' : '≈' }} Averaging
          <b>{{ fmtOz(Math.abs(trend)) }} oz/day {{ trend >= 0 ? 'more' : 'less' }}</b> than the {{ prevCount }} days before.
        </p>
        <p v-if="a.bestLongestNight" class="msg">Best overnight stretch lately: <b>{{ fmtDuration(a.bestLongestNight) }}</b>.</p>
        <p v-if="formulaDays" class="msg">Formula showed up on {{ formulaDays }} of the last {{ a.base.length }} days.</p>
      </div>

      <div class="card">
        <h2>Daily totals</h2>
        <div class="legend">
          <span><i style="background:var(--accent);height:9px" />Ounces per day</span>
          <span><i style="background:var(--avg)" />7-day average</span>
          <span><i style="background:var(--good-bg);border:1px solid var(--good);height:9px" />Typical range</span>
        </div>
        <DailyChart :a="a" :guide="guide" />
      </div>

      <div class="card">
        <h2>When she drinks (avg per day)</h2>
        <div v-for="b in a.blocks" :key="b.name" class="tod">
          <div class="l">{{ b.name }}<br><span style="font-size:11px;color:var(--ink3)">{{ b.range }}</span></div>
          <div class="b"><div :style="{ width: `${(b.avg / maxBlock) * 100}%` }" /></div>
          <div class="n">{{ fmtOz(b.avg) }} oz</div>
        </div>
      </div>
    </template>
  </section>
</template>
