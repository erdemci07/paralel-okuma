import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

// This endpoint only verifies the caller and relays real Firestore activity records.
// Reading data and device subscriptions remain inside the Paralel Okuma project.
export const NOTIFICATION_ENDPOINT =
  'https://us-central1-zumrenet-657e1.cloudfunctions.net/paralelNotifications'

type VapidResponse = { vapidPublicKey?: string }

function decodeBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
  const result = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) result[i] = raw.charCodeAt(i)
  return result
}

export function supportsWebPush(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && window.isSecureContext
}

export async function registerWebPush(profileUid: string): Promise<void> {
  if (!supportsWebPush() || !db || Notification.permission !== 'granted') {
    throw new Error('Bu cihazda web bildirim izni açık değil.')
  }
  let response: Response
  try {
    response = await fetch(NOTIFICATION_ENDPOINT, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(12000) })
  } catch {
    throw new Error('Bildirim sunucusuna ulaşılamadı. Bağlantınızı kontrol edin ve yeniden deneyin.')
  }
  if (!response.ok) throw new Error(`Bildirim sunucusu yanıt vermedi (${response.status}).`)
  const config = await response.json() as VapidResponse
  if (!config.vapidPublicKey) throw new Error('Bildirim anahtarı bulunamadı.')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  const applicationServerKey = decodeBase64Url(config.vapidPublicKey)
  if (subscription) {
    const currentKey = subscription.options.applicationServerKey
    if (currentKey && Array.from(new Uint8Array(currentKey)).join(',') !== Array.from(applicationServerKey).join(',')) {
      await subscription.unsubscribe()
      subscription = null
    }
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    } catch {
      throw new Error('Tarayıcı push aboneliği oluşturamadı. Bildirim izinlerini kontrol edin.')
    }
  }
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    throw new Error('Cihaz bildirimi kaydedilemedi.')
  }
  // Stable and collision-resistant document ID without exposing the endpoint in its path.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json.endpoint))
  const deviceId = Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('')
  await setDoc(doc(db, 'users', profileUid, 'devices', deviceId), {
    type: 'web_push',
    subscription: {
      endpoint: json.endpoint,
      keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
      expirationTime: json.expirationTime ?? null,
    },
    platform: navigator.userAgent.slice(0, 250),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function notifyActivity(activityId: string): Promise<void> {
  const user = auth?.currentUser
  if (!user) return
  const token = await user.getIdToken()
  const response = await fetch(NOTIFICATION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activityId }),
    keepalive: true,
  })
  if (!response.ok) throw new Error(`Bildirim sunucusu: ${response.status}`)
}

// A failed notification must never make a successful reading action look unsuccessful.
export function notifyActivitySafely(activityId: string): void {
  void notifyActivity(activityId).catch((error: unknown) => {
    console.warn('Okuma hareketi kaydedildi, ancak bildirim iletilemedi.', error)
  })
}

export async function showDeviceTestNotification(): Promise<void> {
  if (!supportsWebPush() || Notification.permission !== 'granted') {
    throw new Error('Deneme bildiriminden önce tarayıcı bildirimlerine izin verin.')
  }
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Paralel Okuma', {
    body: 'Deneme bildirimi: Bu cihazın bildirim görüntüleme özelliği çalışıyor.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'paralel-okuma-local-test',
    data: { link: '/' },
  })
}
