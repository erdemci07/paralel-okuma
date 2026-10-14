import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import type { Unsubscribe, User as FirebaseUser } from 'firebase/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'
import type { DocumentData, Firestore, QueryDocumentSnapshot } from 'firebase/firestore'
import type { FirestoreError } from 'firebase/firestore'
import type { MessagePayload } from 'firebase/messaging'
import { auth, db, firebaseProjectId, getFirebaseMessaging, vapidKey } from './firebase'
import { BOOK, CHAPTERS, USERS, normalizeUserKey } from './data'
import type { Book, Chapter, Status, UserKey } from './data'

export type MemberProfile = {
  uid: string
  profileId: UserKey
  userId: UserKey
  displayName: string
  name: string
  shortName: string
  isMember: boolean
  member: boolean
  notificationPrefs: NotificationPrefs
}

export type ProgressDoc = {
  id: string
  uid: string
  userId: UserKey
  chapterId: number
  status: Status
  activityDate: string
  startedDate?: string
  completedDate?: string
}

export type PlanDoc = {
  id: string
  bookId: string
  chapterId: number
  createdBy: UserKey
  createdByUid: string
  type: 'personal' | 'shared'
  plannedDate: string
  note: string
  cancelledAt?: unknown
}

export type CommentDoc = {
  id: string
  authorId: string
  authorProfileId: UserKey
  bookId: string
  chapterId: number
  text: string
  createdAt?: unknown
}

export type ActivityDoc = {
  id: string
  actor: UserKey
  actorUid: string
  type:
    | 'status_started'
    | 'status_completed'
    | 'status_reset'
    | 'comment_added'
    | 'reading_plan_created'
    | 'reading_plan_updated'
    | 'book_started'
  bookId: string
  chapterId?: number
  planId?: string
  commentId?: string
  activityDate: string
  createdAt?: unknown
  text: string
}

export type NotificationPrefs = {
  notifyStatusStarted: boolean
  notifyStatusCompleted: boolean
  notifyCommentAdded: boolean
  notifyPlanChanges: boolean
  notifyBookStarted: boolean
  notifyRating: boolean
}

export type LibraryBook = Book & {
  authors: string[]
  coverUrl: string
  isbn: string
  publisher: string
  publishedDate: string
  externalProvider?: string
  externalId?: string
}

export type WorkspaceState = {
  book: LibraryBook
  chapters: Chapter[]
  progress: ProgressDoc[]
  plans: PlanDoc[]
  activities: ActivityDoc[]
}

export type WorkspaceStatus =
  | { state: 'success'; source: keyof WorkspaceState }
  | { state: 'empty'; source: 'book' | 'chapters' }
  | { state: 'error'; source: keyof WorkspaceState; error: FirestoreError }

export const DEFAULT_PREFS: NotificationPrefs = {
  notifyStatusStarted: true,
  notifyStatusCompleted: true,
  notifyCommentAdded: true,
  notifyPlanChanges: true,
  notifyBookStarted: true,
  notifyRating: false,
}

const DEFAULT_BOOK_ID = BOOK.id

function requireDb(): Firestore {
  if (!db) throw new Error('Firebase yapılandırması eksik.')
  return db
}

function fromDoc<T>(snapshot: QueryDocumentSnapshot<DocumentData>) {
  return { id: snapshot.id, ...snapshot.data() } as T
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function statusActivityType(status: Status) {
  if (status === 'reading') return 'status_started'
  if (status === 'completed') return 'status_completed'
  return 'status_reset'
}

function progressActivityText(userId: UserKey, status: Status, chapterId: number, activityDate: string) {
  const name = USERS[userId].name
  const dateText = formatActivityDate(activityDate)
  if (status === 'reading') return `${name} ${chapterId}. bölümü ${dateText} okumaya başladı.`
  if (status === 'completed') return `${name} ${chapterId}. bölümü ${dateText} tamamladı.`
  return `${name} ${chapterId}. bölüm durumunu sıfırladı.`
}

export function formatActivityDate(value?: string) {
  if (!value) return 'bugün'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const date = new Date(`${value}T00:00:00`)
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000)

  if (diff === 0) return 'bugün'
  if (diff === -1) return 'dün'
  if (diff === 1) return 'yarın'

  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(date)
}

export function subscribeAuth(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  if (!auth) {
    callback(null)
    return () => undefined
  }

  return auth.onAuthStateChanged(callback)
}

export async function signInForProfile(userId: UserKey, password: string) {
  if (!auth) throw new Error('Firebase yapılandırması eksik.')
  const normalizedUserId = normalizeUserKey(userId) ?? userId
  return signInWithEmailAndPassword(auth, USERS[normalizedUserId].email.toLowerCase(), password)
}

export async function signOutCurrentUser() {
  if (!auth) return
  await auth.signOut()
}

export function subscribeProfile(
  uid: string,
  callback: (profile: MemberProfile | null) => void,
  onError: (error: FirestoreError) => void,
) {
  const database = requireDb()
  logMembershipDiagnostic('read-start', {
    authUid: uid,
    projectId: firebaseProjectId,
    path: `users/${uid}`,
  })

  return onSnapshot(
    doc(database, 'users', uid),
    (snapshot) => {
      logMembershipDiagnostic('read-result', {
        authUid: uid,
        projectId: firebaseProjectId,
        path: `users/${uid}`,
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : null,
      })

      if (!snapshot.exists()) {
        callback(null)
        return
      }

      const data = snapshot.data()
      const profileId = normalizeUserKey(String(data.profileId ?? data.userId ?? ''))
      if (!profileId) {
        callback(null)
        return
      }
      const isMember = Boolean(data.isMember ?? data.member)

      callback({
        uid,
        profileId,
        userId: profileId,
        displayName: data.displayName ?? data.name ?? USERS[profileId]?.name ?? '',
        name: data.displayName ?? data.name ?? USERS[profileId]?.name ?? '',
        shortName: data.shortName ?? USERS[profileId]?.shortName ?? '',
        isMember,
        member: isMember,
        notificationPrefs: {
          ...DEFAULT_PREFS,
          ...((data.notificationPrefs as Partial<NotificationPrefs>) ?? {}),
        },
      })
    },
    (error) => {
      logMembershipDiagnostic('read-error', {
        authUid: uid,
        projectId: firebaseProjectId,
        path: `users/${uid}`,
        code: error.code,
      })
      onError(error)
    },
  )
}

function logMembershipDiagnostic(event: string, details: Record<string, unknown>) {
  if (import.meta.env.DEV || import.meta.env.VITE_FIREBASE_DEBUG === 'true') {
    console.info(`[membership:${event}]`, details)
  }
}

export function subscribeLibrary(callback: (books: LibraryBook[]) => void, onError: (error: FirestoreError) => void) {
  const database = requireDb()
  return onSnapshot(collection(database, 'books'), (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        title: data.title ?? '',
        author: data.author ?? (Array.isArray(data.authors) ? data.authors.join(', ') : ''),
        authors: data.authors ?? [],
        cover: data.coverUrl ?? data.cover ?? '',
        coverUrl: data.coverUrl ?? data.cover ?? '',
        description: data.description ?? '',
        chapterCount: data.chapterCount ?? 0,
        isbn: data.isbn ?? '',
        publisher: data.publisher ?? '',
        publishedDate: data.publishedDate ?? '',
      } as LibraryBook
    }))
  }, onError)
}

export function subscribeWorkspace(callback: (state: WorkspaceState) => void, onStatus: (status: WorkspaceStatus) => void, bookId = DEFAULT_BOOK_ID) {
  if (!db) {
    callback({
      book: {
        ...BOOK,
        authors: [BOOK.author],
        coverUrl: BOOK.cover,
        isbn: '',
        publisher: '',
        publishedDate: '',
      },
      chapters: CHAPTERS,
      progress: [],
      plans: [],
      activities: [],
    })
    onStatus({ state: 'success', source: 'book' })
    onStatus({ state: 'success', source: 'chapters' })
    onStatus({ state: 'success', source: 'progress' })
    onStatus({ state: 'success', source: 'plans' })
    onStatus({ state: 'success', source: 'activities' })
    return () => undefined
  }

  const state = {
    book: {
      ...BOOK,
      authors: [BOOK.author],
      coverUrl: BOOK.cover,
      isbn: '',
      publisher: '',
      publishedDate: '',
    } as LibraryBook,
    chapters: CHAPTERS,
    progress: [] as ProgressDoc[],
    plans: [] as PlanDoc[],
    activities: [] as ActivityDoc[],
  }

  const emit = () => callback({ ...state })
  const database = requireDb()
  const unsubscribers = [
    onSnapshot(
      doc(database, 'books', bookId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          state.book = {
            id: snapshot.id,
            title: data.title ?? BOOK.title,
            author: Array.isArray(data.authors) ? data.authors.join(', ') : data.author ?? BOOK.author,
            authors: data.authors ?? [data.author ?? BOOK.author],
            cover: data.coverUrl ?? data.cover ?? BOOK.cover,
            coverUrl: data.coverUrl ?? data.cover ?? BOOK.cover,
            description: data.description ?? BOOK.description,
            chapterCount: data.chapterCount ?? CHAPTERS.length,
            isbn: data.isbn ?? '',
            publisher: data.publisher ?? '',
            publishedDate: data.publishedDate ?? '',
            externalProvider: data.externalProvider,
            externalId: data.externalId,
          }
          onStatus({ state: 'success', source: 'book' })
        } else {
          onStatus({ state: 'empty', source: 'book' })
        }
        emit()
      },
      (error) => onStatus({ state: 'error', source: 'book', error }),
    ),
    onSnapshot(
      query(collection(database, 'books', bookId, 'chapters'), orderBy('id')),
      (snapshot) => {
        state.chapters = snapshot.docs.map((item) => fromDoc<Chapter>(item))
        onStatus(snapshot.empty ? { state: 'empty', source: 'chapters' } : { state: 'success', source: 'chapters' })
        emit()
      },
      (error) => onStatus({ state: 'error', source: 'chapters', error }),
    ),
    onSnapshot(
      query(collection(database, 'books', bookId, 'progress'), where('userId', 'in', ['faruk', 'berfin'])),
      (snapshot) => {
        state.progress = snapshot.docs.map((item) => fromDoc<ProgressDoc>(item))
        onStatus({ state: 'success', source: 'progress' })
        emit()
      },
      (error) => onStatus({ state: 'error', source: 'progress', error }),
    ),
    onSnapshot(
      query(collection(database, 'books', bookId, 'plans'), orderBy('plannedDate'), limit(30)),
      (snapshot) => {
        state.plans = snapshot.docs.map((item) => fromDoc<PlanDoc>(item)).filter((plan) => !plan.cancelledAt)
        onStatus({ state: 'success', source: 'plans' })
        emit()
      },
      (error) => onStatus({ state: 'error', source: 'plans', error }),
    ),
    onSnapshot(
      query(collection(database, 'activities'), where('bookId', '==', bookId), orderBy('createdAt', 'desc'), limit(60)),
      (snapshot) => {
        state.activities = snapshot.docs.map((item) => fromDoc<ActivityDoc>(item))
        onStatus({ state: 'success', source: 'activities' })
        emit()
      },
      (error) => onStatus({ state: 'error', source: 'activities', error }),
    ),
  ]

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

export function subscribeBookComments(callback: (comments: CommentDoc[]) => void, onError: (error: FirestoreError) => void, bookId = DEFAULT_BOOK_ID) {
  if (!db) {
    callback([])
    return () => undefined
  }

  return onSnapshot(
    query(collection(db, 'books', bookId, 'comments'), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) => callback(snapshot.docs.map((item) => fromDoc<CommentDoc>(item))),
    onError,
  )
}

export async function updateProgress(profile: MemberProfile, chapterId: number, status: Status, activityDate: string, bookId = DEFAULT_BOOK_ID) {
  const database = requireDb()
  const progressId = `${profile.uid}_${chapterId}`
  const progressRef = doc(database, 'books', bookId, 'progress', progressId)
  const activityRef = doc(collection(database, 'activities'))
  const batch = writeBatch(database)
  const statusType = statusActivityType(status)
  const payload: Record<string, unknown> = {
    uid: profile.uid,
    userId: profile.profileId,
    chapterId,
    status,
    activityDate,
    updatedAt: serverTimestamp(),
  }

  if (status === 'reading') payload.startedDate = activityDate
  if (status === 'completed') {
    payload.startedDate = activityDate
    payload.completedDate = activityDate
  }

  batch.set(progressRef, payload, { merge: true })

  if (statusType) {
    batch.set(activityRef, {
      actor: profile.profileId,
      actorUid: profile.uid,
      type: statusType,
      bookId: bookId,
      chapterId,
      activityDate,
      createdAt: serverTimestamp(),
      text: progressActivityText(profile.profileId, status, chapterId, activityDate),
    })
  }

  await batch.commit()
}

export async function savePlan(profile: MemberProfile, chapterId: number, plannedDate: string, note: string, type: 'personal' | 'shared', planId?: string, bookId = DEFAULT_BOOK_ID) {
  const database = requireDb()
  const planRef = planId ? doc(database, 'books', bookId, 'plans', planId) : doc(collection(database, 'books', bookId, 'plans'))
  const activityRef = doc(collection(database, 'activities'))
  const batch = writeBatch(database)
  const activityType = planId ? 'reading_plan_updated' : 'reading_plan_created'

  batch.set(
    planRef,
    {
      bookId: bookId,
      chapterId,
      createdBy: profile.profileId,
      createdByUid: profile.uid,
      type,
      plannedDate,
      note,
      updatedAt: serverTimestamp(),
      ...(planId ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  )
  batch.set(activityRef, {
    actor: profile.profileId,
    actorUid: profile.uid,
    type: activityType,
    bookId: bookId,
    chapterId,
    planId: planRef.id,
    activityDate: plannedDate,
    createdAt: serverTimestamp(),
    text: `${USERS[profile.profileId].name} ${chapterId}. bölüm için ${formatActivityDate(plannedDate)} plan oluşturdu.`,
  })

  await batch.commit()
}

export async function cancelPlan(profile: MemberProfile, planId: string, chapterId: number, bookId = DEFAULT_BOOK_ID) {
  const database = requireDb()
  const planRef = doc(database, 'books', bookId, 'plans', planId)
  const activityRef = doc(collection(database, 'activities'))
  const batch = writeBatch(database)

  batch.update(planRef, { cancelledAt: serverTimestamp(), updatedAt: serverTimestamp() })
  batch.set(activityRef, {
    actor: profile.profileId,
    actorUid: profile.uid,
    type: 'reading_plan_updated',
    bookId: bookId,
    chapterId,
    planId,
    activityDate: todayISO(),
    createdAt: serverTimestamp(),
    text: `${USERS[profile.profileId].name} ${chapterId}. bölüm planını iptal etti.`,
  })

  await batch.commit()
}

export async function addComment(profile: MemberProfile, chapterId: number, text: string, bookId = DEFAULT_BOOK_ID) {
  const trimmed = text.trim()
  if (!trimmed) return

  const database = requireDb()
  const commentRef = doc(collection(database, 'books', bookId, 'comments'))
  const activityRef = doc(collection(database, 'activities'))
  const batch = writeBatch(database)

  batch.set(commentRef, {
    authorId: profile.uid,
    authorProfileId: profile.profileId,
    bookId: bookId,
    chapterId,
    text: trimmed,
    createdAt: serverTimestamp(),
  })
  batch.set(activityRef, {
    actor: profile.profileId,
    actorUid: profile.uid,
    type: 'comment_added',
    bookId: bookId,
    chapterId,
    commentId: commentRef.id,
    activityDate: todayISO(),
    createdAt: serverTimestamp(),
    text: `${USERS[profile.profileId].name} ${chapterId}. bölüm için not bıraktı.`,
  })

  await batch.commit()
}

export async function updateNotificationPrefs(profile: MemberProfile, prefs: NotificationPrefs) {
  const database = requireDb()
  await updateDoc(doc(database, 'users', profile.uid), {
    notificationPrefs: prefs,
    updatedAt: serverTimestamp(),
  })
}

export async function registerDeviceForPush(profile: MemberProfile, onForegroundMessage: (payload: MessagePayload) => void) {
  const messaging = await getFirebaseMessaging()
  if (!messaging || !vapidKey || !('Notification' in window) || Notification.permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  if (!token) return null

  const deviceId = token.slice(-32)
  await setDoc(
    doc(requireDb(), 'users', profile.uid, 'devices', deviceId),
    {
      token,
      deviceId,
      platform: navigator.userAgent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  const unsubscribe = onMessage(messaging, onForegroundMessage)
  return async () => {
    unsubscribe()
  }
}

export { DEFAULT_BOOK_ID }
