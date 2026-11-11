import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// iOS/Android paketlerinde (Capacitor) WebView içinde Service Worker ve Web Push yoktur.
// Bu yüzden native tarafta bildirimler FCM token'ı üzerinden gelir:
// Android -> FCM, iOS -> APNs (FCM aracılığıyla).

export const isNativeApp = Capacitor.isNativePlatform()

export type NativePermission = 'granted' | 'denied' | 'prompt'

const INSTALL_ID_KEY = 'paralel-okuma-install-id'

function installId(): string {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem(INSTALL_ID_KEY, created)
    return created
  } catch {
    return `native-${Capacitor.getPlatform()}`
  }
}

export async function nativePermissionState(): Promise<NativePermission> {
  if (!isNativeApp) return 'denied'
  const { receive } = await FirebaseMessaging.checkPermissions()
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt'
}

export async function requestNativePermission(): Promise<NativePermission> {
  const { receive } = await FirebaseMessaging.requestPermissions()
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt'
}

async function saveToken(profileUid: string, token: string): Promise<void> {
  if (!db) throw new Error('Firebase bağlantısı yok.')
  await setDoc(doc(db, 'users', profileUid, 'devices', installId()), {
    type: 'fcm',
    token,
    platform: Capacitor.getPlatform(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

let tokenListenerUid: string | null = null

export async function registerNativePush(profileUid: string): Promise<void> {
  if (!isNativeApp) throw new Error('Native bildirim yalnızca uygulama içinde kullanılabilir.')
  if ((await nativePermissionState()) !== 'granted') {
    throw new Error('Bildirim izni kapalı. Telefon ayarlarından Paralel Okuma için bildirimlere izin verin.')
  }
  let token: string
  try {
    ({ token } = await FirebaseMessaging.getToken())
  } catch {
    throw new Error('Cihaz bildirim anahtarı alınamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.')
  }
  if (!token) throw new Error('Cihaz bildirim anahtarı alınamadı.')
  await saveToken(profileUid, token)

  // FCM token'ı zamanla yenileyebilir; yenisini aynı cihaz kaydına yaz.
  if (tokenListenerUid !== profileUid) {
    tokenListenerUid = profileUid
    await FirebaseMessaging.addListener('tokenReceived', ({ token: next }) => {
      if (next && tokenListenerUid) void saveToken(tokenListenerUid, next).catch(() => undefined)
    })
  }
}

// Bildirime dokunulunca ilgili sayfaya git (web'deki notificationclick karşılığı).
export function listenForNativeNotificationTaps(): void {
  if (!isNativeApp) return
  void FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
    const data = (notification.data ?? {}) as { link?: unknown }
    const link = typeof data.link === 'string' && data.link.startsWith('/') ? data.link : '/'
    window.history.pushState({}, '', link)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}
