<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'
import type { Baby } from '~/utils/types'

const props = defineProps<{ a: Analysis; baby: Baby; now: Date }>()
const log = useFeedLog()
const { toast } = useToast()

const g = computed(() => guideFor(props.baby, props.now))
const v = computed(() => verdictFor(g.value, props.a.avgTotal))
const SCALE = 36
const pct = (n: number) => Math.max(0, Math.min(100, (n / SCALE) * 100))
const daysIn = computed(() => props.a.base.filter(d => { const t = props.a.total(d); return t >= g.value.lo && t <= g.value.max }).length)

const weightInput = ref(props.baby.weightLb ? String(props.baby.weightLb) : '')
watch(() => props.baby.weightLb, w => { weightInput.value = w ? String(w) : '' })
async function saveWeight() {
  const lb = Number.parseFloat(weightInput.value.replace(/[^\d.]/g, ''))
  if (!(lb > 4 && lb < 40)) return toast('Enter weight in pounds')
  try {
    await log.saveWeight(Math.round(lb * 10) / 10, localStamp(new Date()).slice(0, 10))
    toast('Weight saved')
  } catch { toast("Couldn't save") }
}
</script>

<template>
  <div class="card">
    <h2>Vs. guidelines · {{ g.ageLabel }}</h2>
    <div class="pill" :class="v.kind" style="margin-top:0">{{ v.icon }} {{ fmtOz(a.avgTotal) }} oz/day — {{ v.text }}</div>

    <div style="position:relative;height:46px;margin:18px 4px 4px">
      <div style="position:absolute;left:0;right:0;top:14px;height:12px;border-radius:6px;background:var(--grid)" />
      <div :style="{ position: 'absolute', top: '14px', height: '12px', borderRadius: '6px', background: 'var(--good-bg)', border: '1px solid var(--good)', left: `${pct(g.lo)}%`, width: `${pct(g.hi) - pct(g.lo)}%` }" />
      <div :style="{ position: 'absolute', top: '10px', height: '20px', width: '2px', background: 'var(--warn)', left: `${pct(g.max)}%` }" />
      <div v-if="g.weightTarget" :style="{ position: 'absolute', top: '8px', height: '24px', borderLeft: '2px dashed var(--avg)', left: `${pct(g.weightTarget)}%` }" />
      <div :style="{ position: 'absolute', top: '8px', width: '16px', height: '24px', marginLeft: '-8px', borderRadius: '6px', background: 'var(--accent)', border: '2px solid var(--card)', left: `${pct(a.avgTotal)}%` }" />
      <div style="position:absolute;top:30px;left:0;right:0;font-size:11px;color:var(--ink3)">
        <span v-for="n in [0, g.lo, g.hi, g.max]" :key="n" :style="{ position: 'absolute', left: `${pct(n)}%`, transform: 'translateX(-50%)' }">{{ n }}</span>
      </div>
    </div>
    <div class="legend" style="margin-top:8px">
      <span><i style="background:var(--accent);height:9px" />Nadia (7-day avg)</span>
      <span><i style="background:var(--good-bg);border:1px solid var(--good);height:9px" />Typical {{ g.lo }}–{{ g.hi }} oz</span>
      <span><i style="background:var(--warn);width:3px;height:10px" />~{{ g.max }} oz upper limit</span>
      <span v-if="g.weightTarget"><i style="background:var(--avg)" />Weight goal</span>
    </div>

    <p class="msg">
      {{ daysIn }} of the last {{ a.base.length }} days landed in the normal range.
      <template v-if="a.avgPerFeed < 3.5">
        Her bottles are smaller and more frequent than formula charts suggest ({{ fmtOz(a.avgPerFeed) }} oz × ~{{ Math.round(a.avgFeeds) }} feeds
        vs. 4–5 oz every 3–4 h) — the daily total is what matters.
      </template>
    </p>
    <p v-if="g.weightTarget && baby.weightLb" class="msg">
      At {{ fmtOz(baby.weightLb) }} lb, the AAP rule of thumb (2.5 oz per lb) puts her around <b>{{ fmtOz(g.weightTarget) }} oz/day</b> —
      she's averaging {{ fmtOz(a.avgTotal) }} ({{ a.avgTotal >= g.weightTarget ? 'at or above' : `${fmtOz(g.weightTarget - a.avgTotal)} oz below` }}).
    </p>

    <form style="display:flex;gap:8px;align-items:center;margin-top:12px" @submit.prevent="saveWeight">
      <input v-model="weightInput" type="text" inputmode="decimal" placeholder="Weight in lb (e.g. 11.2)" style="flex:1">
      <button type="submit" class="userbtn" style="padding:11px 14px;border-radius:12px;font-size:15px">Save</button>
    </form>
    <div style="font-size:12px;color:var(--ink3);margin-top:6px">
      <template v-if="baby.weighedOn">Weight from {{ fmtDay(baby.weighedOn, { month: 'short', day: 'numeric' }) }}. </template>
      Add her latest weight for a personal target. Ranges are for babies on breast milk or formula and no solids yet;
      your pediatrician's growth check is the real measure.
    </div>
  </div>
</template>
