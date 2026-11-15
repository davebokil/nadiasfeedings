<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'

const props = defineProps<{ a: Analysis }>()

const box = ref<HTMLElement>()
const W = ref(340)
const H = 220, ml = 30, mr = 10, mt = 10, mb = 24
let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(() => { if (box.value) W.value = Math.max(280, box.value.clientWidth) })
  ro.observe(box.value!)
})
onBeforeUnmount(() => ro?.disconnect())

const iw = computed(() => W.value - ml - mr)
const ih = H - mt - mb
const x = (m: number) => ml + (m / 1440) * iw.value

const todayPts = computed(() => {
  const pts: { m: number; v: number; dot?: boolean }[] = [{ m: 0, v: 0 }]
  let run = 0
  for (const f of props.a.todayFeeds) {
    const m = minuteOf(f.at)
    pts.push({ m, v: run })
    run += f.oz
    pts.push({ m, v: run, dot: true })
  }
  pts.push({ m: props.a.nowMin, v: run })
  return pts
})
const yMax = computed(() => {
  const top = Math.max(5, ...props.a.curve.map(c => c.hi), props.a.todayTotal)
  return Math.ceil((top * 1.08) / 5) * 5
})
const y = (v: number) => mt + ih - (v / yMax.value) * ih
const yTicks = computed(() => Array.from({ length: yMax.value / 5 + 1 }, (_, i) => i * 5))
const xTicks = [0, 360, 720, 1080, 1440]

const band = computed(() => {
  if (!props.a.base.length) return ''
  const c = props.a.curve
  return `M${c.map(p => `${x(p.m)},${y(p.hi)}`).join('L')}L${[...c].reverse().map(p => `${x(p.m)},${y(p.lo)}`).join('L')}Z`
})
const avgPath = computed(() => (props.a.base.length ? `M${props.a.curve.map(p => `${x(p.m)},${y(p.avg)}`).join('L')}` : ''))
const todayPath = computed(() => `M${todayPts.value.map(p => `${x(p.m)},${y(p.v)}`).join('L')}`)

// Hover / touch crosshair
const hover = ref<number | null>(null)
function move(ev: PointerEvent) {
  const svg = (ev.currentTarget as SVGElement).ownerSVGElement!
  const r = svg.getBoundingClientRect()
  const px = (ev.clientX - r.left) * (W.value / r.width)
  hover.value = Math.max(0, Math.min(1440, Math.round(((px - ml) / iw.value) * 144) * 10))
}
function leave(ev: PointerEvent) {
  if (ev.pointerType === 'mouse') hover.value = null
  else setTimeout(() => { hover.value = null }, 1500)
}
const tip = computed(() => {
  const m = hover.value
  if (m === null) return null
  const c = props.a.curve[Math.round(m / 10)]!
  const t = m <= props.a.nowMin ? props.a.cumAt(props.a.today, m) : null
  const parts = [fmtTime(m)]
  if (t !== null) parts.push(`Today ${fmtOz(t)} oz`)
  if (props.a.base.length) parts.push(`Avg ${fmtOz(c.avg)} oz`)
  return { text: parts.join(' · '), left: Math.max(70, Math.min(W.value - 70, x(m))) }
})
</script>

<template>
  <div ref="box" class="chart">
    <div class="tip" :class="{ show: tip }" :style="{ left: `${tip?.left ?? 0}px`, top: `${mt + 4}px` }">{{ tip?.text }}</div>
    <svg :viewBox="`0 0 ${W} ${H}`" :height="H" role="img" aria-label="Cumulative ounces today vs 7-day average">
      <g class="axis">
        <template v-for="v in yTicks" :key="v">
          <line :x1="ml" :x2="W - mr" :y1="y(v)" :y2="y(v)" stroke="var(--grid)" />
          <text :x="ml - 6" :y="y(v) + 4" text-anchor="end">{{ v }}</text>
        </template>
        <text v-for="m in xTicks" :key="m" :x="x(m)" :y="H - 6" :text-anchor="m === 0 ? 'start' : m === 1440 ? 'end' : 'middle'">
          {{ m === 1440 ? '12a' : fmtHourShort(m) }}
        </text>
      </g>
      <path v-if="band" :d="band" fill="var(--band)" />
      <path v-if="avgPath" :d="avgPath" fill="none" stroke="var(--avg)" stroke-width="2" stroke-dasharray="5 4" />
      <line :x1="x(a.nowMin)" :x2="x(a.nowMin)" :y1="mt" :y2="mt + ih" stroke="var(--ink3)" stroke-dasharray="2 3" />
      <path :d="todayPath" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" />
      <circle v-for="(p, i) in todayPts.filter(p => p.dot)" :key="i" :cx="x(p.m)" :cy="y(p.v)" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2" />
      <line v-if="hover !== null" :x1="x(hover)" :x2="x(hover)" :y1="mt" :y2="mt + ih" stroke="var(--ink2)" />
      <rect :x="ml" :y="mt" :width="iw" :height="ih" fill="transparent" @pointermove="move" @pointerdown="move" @pointerleave="leave" @pointerup="leave" />
    </svg>
  </div>
</template>
