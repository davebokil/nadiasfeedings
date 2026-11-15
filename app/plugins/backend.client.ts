import { createFirebaseBackend } from '~/services/firebase'
import { createDemoBackend } from '~/services/demo'
import type { Backend } from '~/services/backend'

export default defineNuxtPlugin(() => {
  const c = useRuntimeConfig()
  const p = c.public
  const backend: Backend = p.firebaseApiKey && p.firebaseProjectId
    ? createFirebaseBackend({
        apiKey: p.firebaseApiKey,
        authDomain: p.firebaseAuthDomain,
        projectId: p.firebaseProjectId,
        appId: p.firebaseAppId,
      })
    : createDemoBackend(c.app.baseURL)
  return { provide: { backend } }
})
