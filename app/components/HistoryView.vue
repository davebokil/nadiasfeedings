<script setup lang="ts">
import type { Analysis } from '~/utils/analytics'
import type { Feed } from '~/utils/types'

const props = defineProps<{ a: Analysis }>()
defineEmits<{ edit: [Feed] }>()

const log = useFeedLog()
const open = ref(new Set<string>())
const loadingOlder = ref(false)

const days = computed(() => [...props.a.days].reverse())
const maxTotal = computed(() => Math.max(1, ...props.a.days.map(props.a.total)))

function toggle(d: string) {
  const s = new Set(open.value)
  s.has(d) ? s.delete(d) : s.add(d)
  open.value = s
}
async function older() {
  loadingOlder.value = true
  try { await log.loadOlder() } finally { loadingOlder.value = false }
}
</script>

<template>
  <section>
    <div v-if="!days.length" class="empty">No feedings logged yet.</div>
    <div v-for="d in days" :key="d" class="day" :class="{ open: open.has(d) }">
      <div class="dayHead" @click="toggle(d)">
        <div>
          <div class="d">{{ d === a.today ? 'Today' : fmtDay(d) }}</div>
          <div class="m">
            {{ a.byDay.get(d)!.length }} feed{{ a.byDay.get(d)!.length === 1 ? '' : 's' }}
            <template v-if="a.byDay.get(d)!.some(f => f.formula)"> · some formula</template>
          </div>
        </div>
        <div class="t">{{ fmtOz(a.total(d)) }} oz<small>{{ d === a.today ? 'so far ' : '' }}{{ open.has(d) ? '▲' : '▼' }}</small></div>
      </div>
      <div class="minibar"><div :style="{ width: `${(a.total(d) / maxTotal) * 100}%` }" /></div>
      <div class="rows"><FeedRows :feeds="a.byDay.get(d)!" @edit="$emit('edit', $event)" /></div>
    </div>
    <button v-if="!log.olderLoaded.value && days.length" class="more" :disabled="loadingOlder" @click="older">
      {{ loadingOlder ? 'Loading…' : `Load older than ${LIVE_WINDOW_DAYS} days` }}
    </button>
  </section>
</template>
