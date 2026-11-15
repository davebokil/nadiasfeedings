<script setup lang="ts">
import type { Feed } from '~/utils/types'

const props = defineProps<{ feed: Feed | null; avgPerFeed: number }>()
const open = defineModel<boolean>('open', { required: true })

const log = useFeedLog()
const { toast } = useToast()

const QUICK = [1, 1.5, 2, 2.5, 3, 3.5, 4]
const oz = ref(3)
const at = ref('')
const formula = ref(false)
const note = ref('')
const saving = ref(false)
const confirmDelete = ref(false)

watch(open, isOpen => {
  if (!isOpen) return
  const f = props.feed
  oz.value = f ? f.oz : Math.round((props.avgPerFeed || 3) * 2) / 2
  at.value = f ? f.at : localStamp(new Date())
  formula.value = f?.formula ?? false
  note.value = f?.note ?? ''
  confirmDelete.value = false
})

const setOz = (v: number) => { oz.value = Math.max(0, Math.min(12, Math.round(v * 10) / 10)) }

async function save() {
  const when = at.value.slice(0, 16)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) || !(oz.value > 0)) return toast('Add an amount and time')
  saving.value = true
  const input = { at: when, oz: oz.value, formula: formula.value, note: note.value.trim().slice(0, 120) }
  try {
    if (props.feed) { await log.updateFeed(props.feed, input); toast('Updated') }
    else { await log.addFeed(input); toast(`Logged ${fmtOz(oz.value)} oz`) }
    open.value = false
  } catch (e: any) {
    toast(e?.code === 'permission-denied' ? "This account can't edit the log" : "Couldn't save — try again")
  } finally { saving.value = false }
}

async function remove() {
  if (!props.feed) return
  if (!confirmDelete.value) { confirmDelete.value = true; return }
  try { await log.removeFeed(props.feed); toast('Deleted'); open.value = false } catch { toast("Couldn't delete") }
}
</script>

<template>
  <div :class="{ 'open-sheet': open }">
    <div class="sheetBg" @click="open = false" />
    <div class="sheet" role="dialog" :aria-label="feed ? 'Edit feeding' : 'Add feeding'">
      <h3>{{ feed ? 'Edit feeding' : 'Add feeding' }}</h3>
      <div class="ozRow">
        <button aria-label="Less" @click="setOz(oz - 0.5)">−</button>
        <div class="ozVal">{{ fmtOz(oz) }} <small>oz</small></div>
        <button aria-label="More" @click="setOz(oz + 0.5)">+</button>
      </div>
      <div class="chips">
        <button v-for="q in QUICK" :key="q" :class="{ on: q === oz }" @click="setOz(q)">{{ q }}</button>
      </div>
      <label class="f" for="fTime">Time</label>
      <input id="fTime" v-model="at" type="datetime-local">
      <label class="toggle"><input v-model="formula" type="checkbox"> Formula</label>
      <label class="f" for="fNote">Note (optional)</label>
      <input id="fNote" v-model="note" type="text" maxlength="120" placeholder="e.g. fussy, dream feed, stopped partway">
      <div class="actions">
        <button v-if="feed" class="btnD" @click="remove">{{ confirmDelete ? 'Tap to confirm' : 'Delete' }}</button>
        <button class="btnS" @click="open = false">Cancel</button>
        <button class="btnP" :disabled="saving" @click="save">Save</button>
      </div>
      <div v-if="feed?.byName" class="who">Logged by {{ feed.byName }}</div>
    </div>
  </div>
</template>
