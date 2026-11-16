// Sends a push notification to the other parent(s) whenever a feed is added.
// Subscriptions live in pushSubs/{id} (written by the app, see app/composables/usePush.ts).
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import * as webpush from 'web-push'
import { feedMessage } from './message.js'

initializeApp()
const db = getFirestore()

// Generate once with `npx web-push generate-vapid-keys`.
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY')
const VAPID_PUBLIC_KEY = defineString('VAPID_PUBLIC_KEY')
// Apple requires a mailto: or https: contact; the app's own URL works.
const VAPID_SUBJECT = defineString('VAPID_SUBJECT')

// Feeds whose `created` stamp is older than this are imports/restores, not live adds — don't notify.
const MAX_AGE_MS = 15 * 60 * 1000

export const notifyNewFeed = onDocumentCreated(
  { document: 'feeds/{feedId}', secrets: [VAPID_PRIVATE_KEY] },
  async event => {
    const feed = event.data?.data()
    if (!feed) return
    const created = Date.parse(feed.created ?? '')
    if (!Number.isFinite(created) || Date.now() - created > MAX_AGE_MS) return

    webpush.setVapidDetails(VAPID_SUBJECT.value(), VAPID_PUBLIC_KEY.value(), VAPID_PRIVATE_KEY.value())

    const [babySnap, subsSnap] = await Promise.all([db.doc('meta/baby').get(), db.collection('pushSubs').get()])
    const { title, body } = feedMessage(feed, babySnap.get('name') || 'Nadia')
    const payload = JSON.stringify({ title, body, tag: event.params.feedId })

    // Don't notify the person who logged it.
    const targets = subsSnap.docs.filter(d => d.get('name') !== feed.byName)
    await Promise.all(targets.map(async d => {
      const { endpoint, keys } = d.data()
      try {
        await webpush.sendNotification({ endpoint, keys }, payload, { TTL: 60 * 60, urgency: 'high' })
      } catch (e) {
        // 404/410: the phone dropped this subscription (app removed, permission revoked).
        if (e?.statusCode === 404 || e?.statusCode === 410) await d.ref.delete()
        else logger.warn('push failed', { id: d.id, status: e?.statusCode, body: e?.body })
      }
    }))
  },
)
