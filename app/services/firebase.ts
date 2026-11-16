import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import {
  collection, deleteDoc, doc, getDocs, initializeFirestore, onSnapshot, orderBy,
  persistentLocalCache, persistentMultipleTabManager, query, setDoc, where,
} from 'firebase/firestore'
import type { Backend } from './backend'
import type { Baby, Feed } from '~/utils/types'

const FEEDS = 'feeds'
const BABY_DOC = ['meta', 'baby'] as const
const PUSH_SUBS = 'pushSubs'

function toFeed(id: string, d: Record<string, unknown>): Feed {
  return {
    id,
    at: String(d.at ?? ''),
    oz: Number(d.oz ?? 0),
    formula: Boolean(d.formula),
    note: String(d.note ?? ''),
    byName: (d.byName as string) ?? null,
    created: d.created as string | undefined,
    edited: d.edited as string | undefined,
    editedBy: (d.editedBy as string) ?? null,
  }
}

export function createFirebaseBackend(config: FirebaseOptions): Backend {
  const app = initializeApp(config)
  const auth = getAuth(app)
  // Offline cache: the app keeps working with no signal and syncs when it's back.
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  return {
    kind: 'firebase',
    onUser(cb) {
      return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, name: u.displayName || u.email || 'You', email: u.email || '', photo: u.photoURL } : null))
    },
    async signIn() {
      try {
        await signInWithPopup(auth, provider)
      } catch (e: any) {
        // Some in-app / standalone browsers block popups; fall back to a full-page redirect.
        if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider)
        else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') throw e
      }
    },
    signOut: () => signOut(auth),
    watchFeeds(sinceDay, next, error) {
      const q = query(collection(db, FEEDS), where('at', '>=', sinceDay), orderBy('at'))
      return onSnapshot(q, { includeMetadataChanges: true }, snap => {
        next(snap.docs.map(d => toFeed(d.id, d.data())), snap.metadata.fromCache)
      }, error)
    },
    async fetchOlder(beforeDay) {
      const snap = await getDocs(query(collection(db, FEEDS), where('at', '<', beforeDay), orderBy('at')))
      return snap.docs.map(d => toFeed(d.id, d.data()))
    },
    async saveFeed(f) {
      const { id, ...data } = f
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
      await setDoc(doc(db, FEEDS, id), clean)
    },
    deleteFeed: id => deleteDoc(doc(db, FEEDS, id)),
    watchBaby(next) {
      return onSnapshot(doc(db, ...BABY_DOC), s => next(s.exists() ? (s.data() as Partial<Baby>) : null), () => next(null))
    },
    saveBaby: b => setDoc(doc(db, ...BABY_DOC), b),
    savePushSub: (id, sub, u) => setDoc(doc(db, PUSH_SUBS, id), {
      uid: u.uid, name: u.name, endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      created: new Date().toISOString(),
    }),
    deletePushSub: id => deleteDoc(doc(db, PUSH_SUBS, id)),
  }
}
