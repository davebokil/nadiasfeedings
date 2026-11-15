<script setup lang="ts">
import type { Feed } from '~/utils/types'

const props = defineProps<{ feeds: Feed[] }>()
defineEmits<{ edit: [Feed] }>()

const rows = computed(() => {
  let run = 0
  return props.feeds.map(f => ({ f, run: (run += f.oz) }))
})
</script>

<template>
  <div v-for="{ f, run } in rows" :key="f.id" class="row" @click="$emit('edit', f)">
    <div class="tm">{{ fmtTime(minuteOf(f.at)) }}</div>
    <div>
      <span class="oz">{{ fmtOz(f.oz) }} oz</span>
      <span v-if="f.formula" class="tag">formula</span>
      <span v-if="f.note" class="note">{{ f.note }}</span>
    </div>
    <div class="run">{{ fmtOz(run) }}</div>
  </div>
</template>
