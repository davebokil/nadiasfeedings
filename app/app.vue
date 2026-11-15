<script setup lang="ts">
import type { Feed } from '~/utils/types'

type Tab = 'today' | 'history' | 'trends'
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'trends', label: 'Trends' },
]

const log = useFeedLog()
const now = useNow()
const { message } = useToast()

const tab = ref<Tab>('today')
function readHash() {
  const h = location.hash.slice(1) as Tab
  tab.value = TABS.some(t => t.id === h) ? h : 'today'
}
function setTab(t: Tab) {
  tab.value = t
  history.replaceState(null, '', `#${t}`)
  window.scrollTo(0, 0)
}
onMounted(() => { readHash(); window.addEventListener('hashchange', readHash) })

const analysis = computed(() => analyze(log.feeds.value, now.value))
const subtitle = computed(() => {
  if (!log.user.value) return ''
  if (!log.loaded.value) return 'Loading…'
  const a = analysis.value
  return a.days.length ? `${a.sorted.length} feeds since ${fmtDay(a.days[0]!, { month: 'short', day: 'numeric' })}` : 'No feeds yet'
})

const sheetOpen = ref(false)
const editing = ref<Feed | null>(null)
function openAdd() { editing.value = null; sheetOpen.value = true }
function openEdit(f: Feed) { editing.value = f; sheetOpen.value = true }
</script>

<template>
  <div class="wrap">
    <header>
      <div>
        <h1>{{ log.baby.value.name }}'s Feedings <span>🍼</span></h1>
        <div class="sub">{{ subtitle }}</div>
      </div>
      <button v-if="log.user.value && log.backendKind === 'firebase'" class="userbtn" @click="log.signOut()">Sign out</button>
    </header>

    <div v-if="log.backendKind === 'demo'" class="demo">
      Demo mode — no Firebase config found, changes aren't saved. See README to connect Firebase.
    </div>

    <div v-if="!log.authReady.value" class="empty">Loading…</div>
    <SignIn v-else-if="!log.user.value" @sign-in="log.signIn()" />

    <template v-else>
      <div v-if="log.error.value" class="banner" style="display:block">{{ log.error.value }}</div>
      <nav>
        <button v-for="t in TABS" :key="t.id" :class="{ on: tab === t.id }" @click="setTab(t.id)">{{ t.label }}</button>
      </nav>
      <main>
        <TodayView v-if="tab === 'today'" :a="analysis" :baby="log.baby.value" :now="now" @edit="openEdit" />
        <HistoryView v-else-if="tab === 'history'" :a="analysis" @edit="openEdit" />
        <TrendsView v-else :a="analysis" :baby="log.baby.value" :now="now" />
      </main>
      <div class="foot">
        Averages use the last 7 full days. Every baby varies day to day — if intake drops for several days or
        something feels off, check in with your pediatrician.
      </div>
    </template>
  </div>

  <button v-if="log.user.value" class="fab" @click="openAdd">+ Add feeding</button>
  <FeedSheet v-model:open="sheetOpen" :feed="editing" :avg-per-feed="analysis.avgPerFeed" />
  <div class="toast" :class="{ show: !!message }">{{ message }}</div>
</template>
