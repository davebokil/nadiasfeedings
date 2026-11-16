import type { Baby, Feed } from '~/utils/types'

export interface AppUser { uid: string; name: string; email: string; photo?: string | null }

export type Unsub = () => void

/** A browser Web Push subscription, as stored in pushSubs/{id}. */
export interface PushSub { endpoint: string; keys: { p256dh: string; auth: string } }

/** Everything the UI needs from storage. Firebase implements it; demo mode fakes it locally. */
export interface Backend {
  kind: 'firebase' | 'demo'
  onUser(cb: (u: AppUser | null) => void): Unsub
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Live feeds with `at >= sinceDay`. */
  watchFeeds(sinceDay: string, next: (feeds: Feed[], fromCache: boolean) => void, error: (e: Error) => void): Unsub
  /** One-time read of feeds before `beforeDay` (for "load older" in History). */
  fetchOlder(beforeDay: string): Promise<Feed[]>
  saveFeed(feed: Feed): Promise<void>
  deleteFeed(id: string): Promise<void>
  watchBaby(next: (b: Partial<Baby> | null) => void): Unsub
  saveBaby(b: Baby): Promise<void>
  /** Register this device for "new feeding" notifications (id is derived from the endpoint). */
  savePushSub(id: string, sub: PushSub, user: AppUser): Promise<void>
  deletePushSub(id: string): Promise<void>
}
