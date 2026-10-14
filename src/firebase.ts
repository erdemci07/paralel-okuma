import { getApps, initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import type { Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
export const firebaseProjectId = firebaseConfig.projectId

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Auth still works with the SDK default if local persistence is unavailable.
  })
}

let firestoreInstance: Firestore | null = null

if (firebaseApp) {
  try {
    firestoreInstance = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    firestoreInstance = getFirestore(firebaseApp)
  }
}

export const db = firestoreInstance

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!firebaseApp) return null

  try {
    return (await isSupported()) ? getMessaging(firebaseApp) : null
  } catch {
    return null
  }
}

export const firebaseStatusMessage = isFirebaseConfigured
  ? 'Firebase bağlantısı hazır.'
  : 'Firebase yapılandırması eksik. .env dosyasındaki VITE_FIREBASE_* değerlerini doldurun; bu arada demo veri gösteriliyor.'
