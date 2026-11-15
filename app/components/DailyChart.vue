<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'
import type { Guide } from '~/utils/guidelines'

const props = defineProps<{ a: Analysis; guide: Guide; days?: number }>()

const box = ref<HTMLElement>()
const W = ref(340)
const H = 210, ml = 30, mr = 8, mt = 10, mb = 26
let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(() => { if (box.value) W.value = Math.max(280, box.value.clientWidth) })
  ro.observe(box.value!)
})
onBeforeUnmount(() => ro?.disconnect())

const shown = computed(() => props.a.days.slice(-(props.days ?? 14)))
const vals = computed(() => shown.value.map(props.a.total))
const iw = computed(() => W.value - ml - mr)
const ih = H - mt - mb
const yMax = computed(() => Math.ceil((Math.max(5, ...vals.value, props.a.avgTotal, props.guide.hi) * 1.1) / 5) * 5)
const y = (v: number) => mt + ih - (v / yMax.value) * ih
const yTicks = computed(() => Array.from({ length: yMax.value / 5 + 1 }, (_, i) => i * 5))
const slot = computed(() => iw.value / Math.max(1, shown.value.length))
const bw = computed(() => Math.min(28, slot.value - 4))
const every = computed(() => (shown.value.length > 8 ? 2 : 1))

function barPath(i: number) {
  const v = vals.value[i]!
  const cx = ml + slot.value * i + slot.value / 2
  const top = y(v)
  const h = mt + ih - top
  if (h <= 0) return ''
  const r = Math.min(4, h / 2, bw.value / 2)
  const x0 = cx - bw.value / 2, x1 = cx + bw.value / 2, yb = mt + ih
  return `M${x0},${yb}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${yb}Z`
}
const label = (d: string) => (d === props.a.today ? 'today' : `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`)

const hover = ref<number | null>(null)
const tip = computed(() => {
  const i = hover.value
  if (i === null) return null
  const d = shown.value[i]!
  return {
    text: `${d === props.a.today ? 'Today (so far)' : fmtDay(d)} · ${fmtOz(vals.value[i]!)} oz · ${props.a.byDay.get(d)!.length} feeds`,
    left: Math.max(90, Math.min(W.value - 90, ml + slot.value * i + slot.value / 2)),
    top: Math.max(18, y(vals.value[i]!)),
  }
})
</script>

<template>
  <div ref="box" class="chart">
    <div class="tip" :class="{ show: tip }" :style="{ left: `${tip?.left ?? 0}px`, top: `${tip?.top ?? 0}px` }">{{ tip?.text }}</div>
    <svg :viewBox="`0 0 ${W} ${H}`" :height="H" role="img" aria-label="Ounces per day">
      <rect :x="ml" :y="y(Math.min(guide.hi, yMax))" :width="iw" :height="y(guide.lo) - y(Math.min(guide.hi, yMax))" fill="var(--good-bg)" />
      <g class="axis">
        <template v-for="v in yTicks" :key="v">
          <line :x1="ml" :x2="W - mr" :y1="y(v)" :y2="y(v)" stroke="var(--grid)" />
          <text :x="ml - 6" :y="y(v) + 4" text-anchor="end">{{ v }}</text>
        </template>
        <template v-for="(d, i) in shown" :key="d">
          <text v-if="(shown.length - 1 - i) % every === 0" :x="ml + slot * i + slot / 2" :y="H - 8" text-anchor="middle">{{ label(d) }}</text>
        </template>
      </g>
      <line :x1="ml" :x2="W - mr" :y1="y(a.avgTotal)" :y2="y(a.avgTotal)" stroke="var(--avg)" stroke-width="2" stroke-dasharray="5 4" />
      <path v-for="(d, i) in shown" :key="d" :d="barPath(i)" fill="var(--accent)" :opacity="d === a.today ? 0.4 : 1" />
      <rect
        v-for="(d, i) in shown" :key="`h${d}`" :x="ml + slot * i" :y="mt" :width="slot" :height="ih" fill="transparent"
        @pointerenter="hover = i" @pointerdown="hover = i" @pointerleave="hover = null"
      />
    </svg>
  </div>
</template>
