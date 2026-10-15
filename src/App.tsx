import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  BOOK,
  CHAPTERS,
  CHAPTER_ACTIVITY,
  CHAPTER_STATUSES,
  PROFILE_TOGGLES,
  STATUS_ICONS,
  STATUS_LABELS,
  USERS,
  normalizeUserKey,
} from './data'
import type { Status, UserKey } from './data'
import { isFirebaseConfigured } from './firebase'
import {
  addComment,
  cancelPlan,
  DEFAULT_PREFS,
  formatActivityDate,
  savePlan,
  signInForProfile,
  signOutCurrentUser,
  subscribeAuth,
  subscribeLibrary,
  subscribeBookComments,
  subscribeProfile,
  subscribeWorkspace,
  updateNotificationPrefs,
  updateProgress,
} from './firestoreStore'
import type {
  ActivityDoc,
  CommentDoc,
  LibraryBook,
  MemberProfile,
  NotificationPrefs,
  PlanDoc,
  ProgressDoc,
  WorkspaceState,
  WorkspaceStatus,
} from './firestoreStore'
import { registerWebPush, supportsWebPush } from './notificationClient'
import './App.css'

const tabs = [
  { label: 'Kitap', href: '#book' },
  { label: 'Hareketler', href: '#activity' },
  { label: 'Profil', href: '#profile' },
]

const readingQuotes = [
  'Bir düşüncenin sende yer etmesi için bazen tek bir cümle yeter.',
  'Kendini tanımak, bütün cevapları bulmak değil; doğru sorulardan kaçmamaktır.',
  'Hayatın yönünü bazen büyük kararlar değil, küçük fark edişler değiştirir.',
  'İnsan kendini tanıdıkça, neyi değiştirmesi gerektiğini daha iyi görür.',
  'Kitap ilerledikçe yalnızca sayfalar değil, bakış açısı da değişir.',
  'Kendini anlamaya başladığında, hayatına da başka gözlerle bakarsın.',
  'Değişim, başka biri olmak değil; kendini daha iyi tanımaya başlamaktır.',
  'Kendine dürüstçe bakabildiğin yerde değişim başlar.',
  'Bazen değişmesi gereken hayatın değil, ona baktığın yerdir.',
  'İnsan ne istediğini öğrendikçe, nelere hayır demesi gerektiğini de öğrenir.',
  'Bazı cevaplar bulunmaz; insan onları yaşadıkça anlamaya başlar.',
  'Kendini tanımak, güçlü yanlarını bilmek kadar sınırlarını da görebilmektir.',
  'Düşünmek, bildiklerini tekrarlamak değil; gerektiğinde onlardan şüphe edebilmektir.',
  'Bir kitabı bitirdiğinde aynı düşüncelerle kalıyorsan, belki de yalnızca sayfaları çevirmişsindir.',
  'Bazı kitaplar sana ne düşüneceğini değil, neyi yeniden düşünmen gerektiğini gösterir.',
]


const insanOlmakQuotes = [
  'İnsan, kendisini tanımaya başladığında başkalarını da farklı görmeye başlar.',
  'Bazen en büyük yalnızlık, insanların arasında kendine yer bulamamaktır.',
  'Kendini değerli hissetmek, başkalarının onayına ihtiyaç duymadan yaşayabilmektir.',
  'İnsanın kendisinden kaçtığı yerde kaygıları konuşmaya başlar.',
  'Öfkenin ardında bazen söylenememiş bir kırgınlık vardır.',
  'Başkalarının beklentileriyle kurulan bir hayat, insanı kendisine yabancılaştırabilir.',
  'Sevilmek kadar, olduğun kişi olarak kabul edilmek de önemlidir.',
  'Kendi sorumluluğunu üstlenmek, özgürlüğün başlangıcıdır.',
  'İnsan bazen yalnız kalmaktan değil, kendisiyle karşılaşmaktan korkar.',
  'Bir ilişki, iki insanın birbirini kaybetmeden yakınlaşabildiği yerde güçlenir.',
  'Geçmişi değiştiremeyiz; ama onun bugünümüzü nasıl etkilediğini anlayabiliriz.',
  'Kendini yaşamak, başkalarının biçtiği hayatı sürdürmekten vazgeçebilmektir.',
]

const fillerSultaniQuotes = [
  'Güç büyüdükçe adaletin sesi daha çok duyulmaya ihtiyaç duyar.',
  'Küçük görülenler bazen en büyük direnişi başlatır.',
  'Birlik olanların karşısında korku uzun süre ayakta kalamaz.',
  'Zorbalık güçlü görünür, ama dayanışma ondan daha kalıcıdır.',
  'İnsanı asıl büyüten şey gücü değil, vicdanıdır.',
  'Sessiz kalabalıklar konuşmaya başladığında düzen değişir.',
  'Korku yayılır, ama cesaret de yayılır.',
  'Bir halkı ayakta tutan şey yalnızca öfkesi değil, umududur.',
  'Ezilenlerin hikâyesi, direnmeye başladıkları yerde değişir.',
  'Adalet bazen en beklenmedik yerden filiz verir.',
  'Baskı ne kadar ağırsa özgürlük arzusu da o kadar güçlenir.',
  'Gerçek kuvvet, başkalarını ezmekte değil, birlikte ayakta kalmaktadır.',
]

const quotesByBookId: Record<string, readonly string[]> = {
  [BOOK.id]: readingQuotes,
  'insan-olmak': insanOlmakQuotes,
  'filler-sultani': fillerSultaniQuotes,
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/faruk" replace />} />
        <Route path="/:userKey/*" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/faruk" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProfilePage() {
  const { userKey } = useParams<{ userKey?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = normalizeUserKey(userKey) ?? 'faruk'
  const selectedBookId = new URLSearchParams(location.search).get('book')
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    book: { ...BOOK, authors: [BOOK.author], coverUrl: BOOK.cover, isbn: '', publisher: '', publishedDate: '' },
    chapters: CHAPTERS,
    progress: [],
    plans: [],
    activities: [],
  })
  const [comments, setComments] = useState<CommentDoc[]>([])
  const [library, setLibrary] = useState<LibraryBook[]>([])
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [workspaceLoad, setWorkspaceLoad] = useState(() => createWorkspaceLoadState())
  const [workspaceError, setWorkspaceError] = useState('')
  const [commentsError, setCommentsError] = useState('')

  useEffect(() => {
    return subscribeAuth((user) => {
      setFirebaseUser(user)
      setAuthLoaded(true)
      setProfile(null)
      setProfileError('')
      setWorkspaceLoad(createWorkspaceLoadState())
      setWorkspaceError('')
      setComments([])
      setCommentsError('')
      setProfileLoaded(!user || !isFirebaseConfigured)
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser || !isFirebaseConfigured) return
    return subscribeProfile(firebaseUser.uid, (nextProfile) => {
      setProfile(nextProfile)
      setProfileLoaded(true)
      setProfileError('')
    }, (error) => {
      logFirestoreError(error)
      setProfile(null)
      setProfileLoaded(true)
      setProfileError(mapFirestoreError(error))
    })
  }, [firebaseUser])

  useEffect(() => {
    if (!profile?.isMember || profile.profileId !== currentUser) return
    return subscribeLibrary(
      (books) => {
        setLibrary(books)
        setLibraryStatus('ready')
      },
      (error) => {
        logFirestoreError(error)
        setLibraryStatus('error')
      },
    )
  }, [currentUser, profile?.isMember, profile?.profileId])

  useEffect(() => {
    if (!selectedBookId || !profile?.isMember || profile.profileId !== currentUser) return

    return subscribeWorkspace(setWorkspace, (status) => {
      setWorkspaceLoad((current) => ({ ...current, [status.source]: status }))
      if (status.state === 'error') {
        logFirestoreError(status.error)
        setWorkspaceError(mapFirestoreError(status.error))
      } else {
        setWorkspaceError('')
      }
    }, selectedBookId)
  }, [currentUser, profile?.isMember, profile?.profileId, profile?.uid, selectedBookId])

  useEffect(() => {
    if (!selectedBookId || !profile?.isMember || profile.profileId !== currentUser) return

    return subscribeBookComments(
      (nextComments) => {
        setComments(nextComments)
        setCommentsError('')
      },
      (error) => {
        logFirestoreError(error)
        setCommentsError(mapFirestoreError(error))
      },
      selectedBookId,
    )
  }, [currentUser, profile?.isMember, profile?.profileId, profile?.uid, selectedBookId])

  if (!isFirebaseConfigured) {
    return <ReadingApp currentUser={currentUser} profile={null} workspace={workspace} comments={comments} demoMode locationPath={location.pathname} />
  }

  if (!authLoaded || !profileLoaded) {
    return (
      <ShellFrame currentUser={currentUser} locationPath={location.pathname}>
        <LoadingPanel />
      </ShellFrame>
    )
  }

  if (!firebaseUser) {
    return <LoginScreen key={currentUser} currentUser={currentUser} />
  }

  if (profileError) {
    return (
      <ShellFrame currentUser={currentUser} locationPath={location.pathname}>
        <SetupPanel message={profileError} />
      </ShellFrame>
    )
  }

  if (!profile?.isMember) {
    return (
      <ShellFrame currentUser={currentUser} locationPath={location.pathname}>
        <section className="panel notice-panel">
          <h2>Üyelik eşleşmesi bulunamadı</h2>
          <p>Bu oturum Faruk veya Berfin profiline bağlanmamış. Kurulum için güvenli bağlama komutunu çalıştırın.</p>
          <button type="button" className="ghost-button" onClick={() => void signOutCurrentUser()}>Çıkış yap</button>
        </section>
      </ShellFrame>
    )
  }

  if (profile.profileId !== currentUser) {
    return (
      <ShellFrame currentUser={profile.profileId} locationPath={location.pathname}>
        <section className="panel notice-panel">
          <h2>Yanlış profil</h2>
          <p>Bu oturum {USERS[profile.profileId].name} için açık. {USERS[currentUser].name} sayfasında düzenleme yapmak için o kullanıcıyla giriş yapın.</p>
          <div className="inline-actions">
            <Link className="ghost-button" to={`/${profile.profileId}`}>Kendi sayfama git</Link>
            <button type="button" className="ghost-button" onClick={() => void signOutCurrentUser()}>Çıkış yap</button>
          </div>
        </section>
      </ShellFrame>
    )
  }

  function openBook(bookId: string) {
    setWorkspaceLoad(createWorkspaceLoadState())
    setWorkspaceError('')
    setComments([])
    setCommentsError('')
    navigate({ pathname: `/${currentUser}`, search: `?book=${encodeURIComponent(bookId)}`, hash: '' })
  }

  if (!selectedBookId) {
    if (libraryStatus === 'loading') {
      return <ShellFrame currentUser={currentUser} locationPath={location.pathname} showBottomNav={false}><LoadingPanel /></ShellFrame>
    }
    if (libraryStatus === 'error') {
      return (
        <ShellFrame currentUser={currentUser} locationPath={location.pathname} showBottomNav={false}>
          <section className="panel notice-panel">Kitaplar yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.</section>
        </ShellFrame>
      )
    }
    return (
      <BookLibrary currentUser={currentUser} books={library} onSelectBook={openBook} />
    )
  }

  const workspaceMessage = workspaceError || getWorkspaceEmptyMessage(workspaceLoad)
  const workspaceReady = isWorkspaceReady(workspaceLoad)

  if (!workspaceReady && !workspaceMessage) {
    return <ShellFrame currentUser={currentUser} locationPath={location.pathname}><LoadingPanel /></ShellFrame>
  }

  if (workspaceMessage) {
    return (
      <ShellFrame currentUser={currentUser} locationPath={location.pathname}>
        <SetupPanel message={workspaceMessage} />
      </ShellFrame>
    )
  }

  return (
    <ReadingApp
      currentUser={currentUser}
      profile={profile}
      workspace={workspace}
      comments={comments}
      commentsError={commentsError}
      locationPath={location.pathname}
      library={library}
      onSelectBook={openBook}
      onShowLibrary={() => navigate({ pathname: `/${currentUser}`, search: '', hash: '' })}
      key={selectedBookId}
    />
  )
}

function BookLibrary({
  currentUser,
  books,
  onSelectBook,
}: {
  currentUser: UserKey
  books: LibraryBook[]
  onSelectBook: (bookId: string) => void
}) {
  const sortedBooks = [...books].sort((a, b) =>
    a.id === BOOK.id ? -1 : b.id === BOOK.id ? 1 : a.title.localeCompare(b.title, 'tr'),
  )

  return (
    <ShellFrame currentUser={currentUser} locationPath={`/${currentUser}`} showBottomNav={false}>
      <section id="book" className="panel library-panel">
        <p className="eyebrow">Paralel Okuma</p>
        <h2>Kitaplığınız</h2>
        <p className="library-intro">Okumaya devam etmek istediğiniz kitabı seçin.</p>
        <div className="library-grid">
          {sortedBooks.map((book) => (
            <button key={book.id} type="button" className="library-book" onClick={() => onSelectBook(book.id)}>
              <span className="library-cover">
                <img src={book.coverUrl || book.cover} alt={`${book.title} kitap kapağı`} loading="lazy" />
              </span>
              <span className="library-book-title">{book.title}</span>
              <span className="library-book-author">{book.author}</span>
              <span className="library-book-chapters">{book.chapterCount} bölüm · Kitabı aç →</span>
            </button>
          ))}
        </div>
        {sortedBooks.length === 0 ? <p className="library-intro">Henüz kitap bulunmuyor.</p> : null}
      </section>
    </ShellFrame>
  )
}

type WorkspaceLoadState = Record<keyof WorkspaceState, WorkspaceStatus | { state: 'loading' }>

const workspaceSources: (keyof WorkspaceState)[] = ['book', 'chapters', 'progress', 'plans', 'activities']

function createWorkspaceLoadState(): WorkspaceLoadState {
  return workspaceSources.reduce((state, source) => {
    state[source] = { state: 'loading' }
    return state
  }, {} as WorkspaceLoadState)
}

function isWorkspaceReady(loadState: WorkspaceLoadState) {
  return workspaceSources.every((source) => loadState[source].state !== 'loading')
}

function getWorkspaceEmptyMessage(loadState: WorkspaceLoadState) {
  if (loadState.book.state === 'empty' || loadState.chapters.state === 'empty') {
    return 'Okuma verileri henüz oluşturulmamış.'
  }

  return ''
}

function mapFirestoreError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

  if (code === 'permission-denied') return 'Verilere erişilemedi. Firebase yetkilerini kontrol edin.'
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.'
  }
  if (code === 'not-found') return 'Okuma verileri henüz oluşturulmamış.'

  return 'Veriler yüklenemedi. Lütfen tekrar deneyin.'
}

function logFirestoreError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error('Firestore listener error', error)
  }
}

function LoadingPanel() {
  return <div className="panel">Yükleniyor...</div>
}

function SetupPanel({ message }: { message: string }) {
  return (
    <section className="panel notice-panel setup-panel">
      <h2>{message}</h2>
      <p>Kurulum tamamlandıktan sonra sayfayı yenileyin.</p>
      <button type="button" className="ghost-button" onClick={() => void signOutCurrentUser()}>Çıkış yap</button>
    </section>
  )
}

function LoginScreen({ currentUser }: { currentUser: UserKey }) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const internalEmail = USERS[currentUser].email

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await signInForProfile(currentUser, password)
    } catch (loginError) {
      setError(mapAuthError(loginError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ShellFrame currentUser={currentUser} locationPath={`/${currentUser}`}>
      <form className="panel login-card" onSubmit={onSubmit}>
        <div>
          <h2>Hoş geldin</h2>
          <p className="login-profile">{USERS[currentUser].name} olarak devam et</p>
        </div>
        <input
          className="visually-hidden"
          type="text"
          value={internalEmail}
          autoComplete="username"
          tabIndex={-1}
          aria-hidden="true"
          readOnly
        />
        <label>
          Şifre
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Giriş yapılıyor...' : 'Giriş yap'}</button>
      </form>
    </ShellFrame>
  )
}

function mapAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'Şifre hatalı.'
  }
  if (code === 'auth/user-not-found') return 'Bu kullanıcı bulunamadı.'
  if (code === 'auth/operation-not-allowed') return 'Giriş yöntemi henüz etkinleştirilmemiş.'
  if (code === 'auth/network-request-failed') return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.'
  if (code === 'auth/too-many-requests') return 'Çok fazla başarısız deneme yapıldı. Bir süre sonra tekrar deneyin.'

  return 'Giriş yapılamadı. Lütfen tekrar deneyin.'
}

function ShellFrame({
  currentUser,
  locationPath,
  children,
  showBottomNav = true,
}: {
  currentUser: UserKey
  locationPath: string
  children: React.ReactNode
  showBottomNav?: boolean
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-badge" aria-hidden="true">
            <span className="book-mark" />
          </div>
          <div>
            <p className="eyebrow">Paralel Okuma</p>
            <h1>{USERS[currentUser].name}</h1>
          </div>
        </div>
      </header>
      <main className="screen" data-path={locationPath}>{children}</main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  )
}

function ReadingApp({
  currentUser,
  profile,
  workspace,
  comments,
  commentsError = '',
  demoMode = false,
  locationPath,
  library = [],
  onSelectBook,
  onShowLibrary,
}: {
  currentUser: UserKey
  profile: MemberProfile | null
  library?: LibraryBook[]
  onSelectBook?: (bookId: string) => void
  onShowLibrary?: () => void
  workspace: {
    book: LibraryBook
    chapters: typeof CHAPTERS
    progress: ProgressDoc[]
    plans: PlanDoc[]
    activities: ActivityDoc[]
  }
  comments: CommentDoc[]
  commentsError?: string
  demoMode?: boolean
  locationPath: string
}) {
  const otherUser = currentUser === 'faruk' ? 'berfin' : 'faruk'
  const progressByUser = useMemo(() => buildProgressMap(workspace.progress), [workspace.progress])
  const currentStatusMap = demoMode ? CHAPTER_STATUSES[currentUser] : progressByUser[currentUser]
  const otherStatusMap = demoMode ? CHAPTER_STATUSES[otherUser] : progressByUser[otherUser]
  const readingQuote = useMemo(() => pickReadingQuote(workspace.book.id), [workspace.book.id])
  useReadingScrollPosition(currentUser, workspace.book.id)
  const completedByCurrent = workspace.chapters.filter((chapter) => currentStatusMap[chapter.id] === 'completed').length
  const completedByOther = workspace.chapters.filter((chapter) => otherStatusMap[chapter.id] === 'completed').length
  const sharedCompleted = workspace.chapters.filter(
    (chapter) => currentStatusMap[chapter.id] === 'completed' && otherStatusMap[chapter.id] === 'completed',
  ).length

  return (
    <ShellFrame currentUser={currentUser} locationPath={locationPath}>
      <NotificationSetup profile={profile} demoMode={demoMode} />
      {onShowLibrary ? <button type="button" className="library-back" onClick={onShowLibrary}>← Tüm kitaplar</button> : null}
      {library.length > 1 ? <nav className="book-switcher" aria-label="Kitap seçimi">{library.map((book) => <button key={book.id} type="button" className={book.id === workspace.book.id ? 'book-choice active' : 'book-choice'} onClick={() => onSelectBook?.(book.id)}>{book.title}</button>)}</nav> : null}

      <section id="book" className="panel book-panel">
        <div className="book-header">
          <img src={workspace.book.coverUrl || workspace.book.cover} alt={workspace.book.title} className="book-cover" />
          <div className="book-copy">
            <p className="eyebrow">Mevcut kitap</p>
            <h2>{workspace.book.title}</h2>
            <p className="author">{workspace.book.author}</p>
            <p className="meta">{workspace.chapters.length} bölüm · 1 kitap</p>
          </div>
        </div>

        <blockquote className="book-quote">{readingQuote}</blockquote>

        <div className="progress-grid">
          <MiniProgress user={currentUser} completed={completedByCurrent} total={workspace.chapters.length} />
          <MiniProgress user={otherUser} completed={completedByOther} total={workspace.chapters.length} />
        </div>

        <div className="shared-progress">
          <span>Birlikte tamamlanan</span>
          <strong>{sharedCompleted} / {workspace.chapters.length}</strong>
        </div>

      </section>

      <section className="panel">
        <div className="section-header">
          <h3>{workspace.book.id === 'filler-sultani' ? 'Kısımlar' : 'Bölümler'}</h3>
        </div>

        {workspace.chapters.map((chapter) => {
          const plan = workspace.plans.find((item) => item.chapterId === chapter.id)
          const currentStatus = currentStatusMap[chapter.id] ?? 'not_started'
          const otherStatus = otherStatusMap[chapter.id] ?? 'not_started'
          const currentActivity = demoMode ? CHAPTER_ACTIVITY[currentUser]?.[chapter.id] : latestProgressDate(workspace.progress, currentUser, chapter.id)
          const otherActivity = demoMode ? CHAPTER_ACTIVITY[otherUser]?.[chapter.id] : latestProgressDate(workspace.progress, otherUser, chapter.id)
          const currentProgressDate = demoMode ? undefined : progressDateValue(workspace.progress, currentUser, chapter.id)

          return (
            <ChapterCard
              key={`${chapter.id}-${currentStatus}-${otherStatus}-${currentProgressDate ?? ''}-${plan?.plannedDate ?? ''}-${plan?.type ?? ''}`}
              chapter={chapter}
              bookId={workspace.book.id}
              plan={plan}
              currentUser={currentUser}
              otherUser={otherUser}
              currentStatus={currentStatus}
              otherStatus={otherStatus}
              currentActivity={currentActivity}
              otherActivity={otherActivity}
              currentProgressDate={currentProgressDate}
              profile={profile}
              demoMode={demoMode}
              comments={comments.filter((comment) => comment.chapterId === chapter.id)}
            />
          )
        })}
      </section>

      {commentsError ? <section className="panel notice-panel"><p>{commentsError}</p></section> : null}
      <ActivityPanel activities={workspace.activities} demoMode={demoMode} />
      <ProfilePanel profile={profile} demoMode={demoMode} />
    </ShellFrame>
  )
}

function MiniProgress({ user, completed, total }: { user: UserKey; completed: number; total: number }) {
  return (
    <div className="mini-progress">
      <span>{USERS[user].name}</span>
      <strong>{completed} / {total} · {Math.round((completed / total) * 100)}%</strong>
    </div>
  )
}

function ChapterCard({
  chapter,
  bookId,
  plan,
  currentUser,
  otherUser,
  currentStatus,
  otherStatus,
  currentActivity,
  otherActivity,
  currentProgressDate,
  profile,
  demoMode,
  comments,
}: {
  chapter: typeof CHAPTERS[number]
  bookId: string
  plan?: PlanDoc
  currentUser: UserKey
  otherUser: UserKey
  currentStatus: Status
  otherStatus: Status
  currentActivity?: string
  otherActivity?: string
  currentProgressDate?: string
  profile: MemberProfile | null
  demoMode: boolean
  comments: CommentDoc[]
}) {
  const chapterStateKey = `reading-expanded:${currentUser}:${bookId}:${chapter.id}`
  const [isCollapsed, setIsCollapsed] = useState(() => sessionStorage.getItem(chapterStateKey) !== '1')
  const [activityDate, setActivityDate] = useState(currentProgressDate ?? todayDateValue())
  const [planDate, setPlanDate] = useState(plan?.plannedDate ?? todayDateValue())
  const [planNote, setPlanNote] = useState('')
  const [planType, setPlanType] = useState<'personal' | 'shared'>('shared')
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState('')

  async function handleStatus(status: Status) {
    if (!profile) return
    setError('')
    const nextActivityDate = currentStatus === 'completed' && status !== 'completed' ? todayDateValue() : activityDate
    setActivityDate(nextActivityDate)
    try {
      await updateProgress(profile, chapter.id, status, nextActivityDate, bookId)
    } catch {
      setError('Durum kaydedilemedi.')
    }
  }

  async function handlePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setError('')
    try {
      await savePlan(profile, chapter.id, planDate, planNote, planType, plan?.id, bookId)
      setPlanNote('')
    } catch {
      setError('Plan kaydedilemedi.')
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setError('')
    try {
      await addComment(profile, chapter.id, commentText, bookId)
      setCommentText('')
    } catch {
      setError('Yorum kaydedilemedi.')
    }
  }

  return (
    <article className="chapter-card">
      <div className="chapter-head">
        <div className="chapter-number">{String(chapter.id).padStart(2, '0')}</div>
        <div className="chapter-meta">
          <h4>{chapter.title}</h4>
          <p>s. {chapter.startPage}-{chapter.endPage === 'end' ? 'son' : chapter.endPage}</p>
        </div>
        <button type="button" className="chapter-toggle" onClick={() => {
          setIsCollapsed((value) => {
            sessionStorage.setItem(chapterStateKey, value ? '1' : '0')
            return !value
          })
        }}>
          {isCollapsed ? 'Genişlet' : 'Gizle'}
        </button>
      </div>

      {plan && !isCollapsed ? (
        <div className="plan-badge">
          {formatActivityDate(plan.plannedDate)} · {plan.type === 'shared' ? 'ortak' : USERS[plan.createdBy].shortName}
          {profile ? <button type="button" onClick={() => void cancelPlan(profile, plan.id, chapter.id, bookId)}>İptal</button> : null}
        </div>
      ) : null}

      {isCollapsed ? (
        <div className="chapter-compact-summary">
          <span>{USERS[currentUser].name}: {STATUS_LABELS[currentStatus]}</span>
          <span>{USERS[otherUser].name}: {STATUS_LABELS[otherStatus]}</span>
          {plan ? <span className="chapter-compact-plan">Plan: {formatActivityDate(plan.plannedDate)}</span> : null}
          {comments.length > 0 ? <span>{comments.length} not</span> : null}
        </div>
      ) : (
        <div className="status-stack">
          <PersonStatus user={currentUser} status={currentStatus} activity={currentActivity} />
          <PersonStatus user={otherUser} status={otherStatus} activity={otherActivity} readOnly />
        </div>
      )}

      {!isCollapsed ? (
        <>
          <div className="status-controls" aria-label={`${chapter.title} için durum seçimi`}>
            {(['not_started', 'reading', 'completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={currentStatus === status ? 'segment active' : 'segment'}
                onClick={() => void handleStatus(status)}
                disabled={demoMode || !profile}
              >
                {STATUS_ICONS[status]} {STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          <div className="chapter-action-group">
            <p className="action-title">Okuma durumu</p>
            <label>
              Durum tarihi
              <input
                type="date"
                lang="tr-TR"
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
                disabled={demoMode || currentStatus === 'completed'}
              />
            </label>
          </div>

          <form className="chapter-action-group plan-form" onSubmit={handlePlan}>
            <p className="action-title">Okuma planı</p>
            <label>
              Plan tarihi
              <input type="date" lang="tr-TR" value={planDate} onChange={(event) => setPlanDate(event.target.value)} disabled={demoMode} />
            </label>
            <select aria-label="Plan türü" value={planType} onChange={(event) => setPlanType(event.target.value as 'personal' | 'shared')} disabled={demoMode}>
              <option value="shared">Ortak plan</option>
              <option value="personal">Kişisel plan</option>
            </select>
            <input type="text" placeholder="Plan notu" value={planNote} onChange={(event) => setPlanNote(event.target.value)} disabled={demoMode} />
            <button type="submit" className="ghost-button variant-small" disabled={demoMode || !profile}>Planla</button>
          </form>

          <form className="comment-form" onSubmit={handleComment}>
            <input type="text" placeholder="Bu bölüm için kısa not" value={commentText} onChange={(event) => setCommentText(event.target.value)} disabled={demoMode} />
            <button type="submit" className="ghost-button variant-small" disabled={demoMode || !profile}>Yaz</button>
          </form>
        </>
      ) : null}

      {comments.length ? (
        <ul className={isCollapsed ? 'comment-list compact' : 'comment-list'}>
          {comments.map((comment) => (
            <li key={comment.id}>
              {isCollapsed ? comment.text : <><strong>{USERS[comment.authorProfileId]?.shortName ?? 'Üye'}:</strong> {comment.text}</>}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </article>
  )
}

function PersonStatus({ user, status, activity, readOnly = false }: { user: UserKey; status: Status; activity?: string; readOnly?: boolean }) {
  return (
    <div className={readOnly ? 'person-status read-only' : 'person-status'}>
      <span>{USERS[user].name}</span>
      <strong>{STATUS_ICONS[status]} {STATUS_LABELS[status]}</strong>
      {activity ? <em>{activity}</em> : null}
    </div>
  )
}

function ActivityPanel({ activities, demoMode }: { activities: ActivityDoc[]; demoMode: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const items = isExpanded ? activities : activities.slice(0, 5)

  return (
    <section id="activity" className="panel">
      <div className="section-header">
        <h3>Hareketler</h3>
        {activities.length > 5 ? (
          <button type="button" className="ghost-button variant-small" onClick={() => setIsExpanded((value) => !value)}>
            {isExpanded ? 'Gizle' : 'Tümünü göster'}
          </button>
        ) : null}
      </div>
      {activities.length === 0 ? (
        <p className="activity-empty">{demoMode ? 'Demo modunda hareket kaydı tutulmaz.' : 'Bu kitapta henüz hareket yok. Okumaya başlayınca, bölüm tamamlayınca, not yazınca veya plan oluşturunca burada görünecek.'}</p>
      ) : (
        <ul className="activity-list">
          {items.map((item) => (
            <li key={item.id} className="activity-item">
              <span className="dot" aria-hidden="true" />
              <div>
                <strong>{item.text}</strong>
                <small>{formatActivityDate(item.activityDate)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProfilePanel({ profile, demoMode }: { profile: MemberProfile | null; demoMode: boolean }) {
  const [message, setMessage] = useState('')
  const prefs = profile?.notificationPrefs ?? DEFAULT_PREFS

  async function toggle(key: keyof NotificationPrefs) {
    if (!profile) return
    const next = { ...prefs, [key]: !prefs[key] }
    await updateNotificationPrefs(profile, next).catch(() => setMessage('Tercih kaydedilemedi.'))
  }

  const keys = Object.keys(DEFAULT_PREFS) as (keyof NotificationPrefs)[]

  return (
    <section id="profile" className="panel">
      <div className="section-header">
        <h3>Profil</h3>
        {profile ? <button type="button" className="ghost-button" onClick={() => void signOutCurrentUser()}>Çıkış</button> : null}
      </div>
      <div className="profile-card">
        <div className="profile-row">
          <span>Bildirimler</span>
          <span className="status-pill">Tercihler</span>
        </div>
        <div className="toggle-list">
          {keys.map((key, index) => (
            <label key={key} className="toggle-item">
              <input type="checkbox" checked={prefs[key]} onChange={() => void toggle(key)} disabled={demoMode || !profile} />
              <span>{PROFILE_TOGGLES[index] ?? key}</span>
            </label>
          ))}
        </div>
        {message ? <p className="helper-text">{message}</p> : null}
      </div>
    </section>
  )
}

function NotificationSetup({ profile, demoMode }: { profile: MemberProfile | null; demoMode: boolean }) {
  const [environment, setEnvironment] = useState(() => getNotificationEnvironment())
  const [hideInstallGuide, setHideInstallGuide] = useState(() => localStorage.getItem('hide-ios-install-guide') === 'true')
  const [message, setMessage] = useState('')
  const shouldShowInstallGuide =
    !demoMode &&
    Boolean(profile) &&
    environment.isIosSafari &&
    !environment.isStandalone &&
    !hideInstallGuide
  const shouldShowPermissionCard =
    !demoMode &&
    Boolean(profile) &&
    environment.isSupported &&
    (!environment.isIosSafari || environment.isStandalone) &&
    environment.notificationPermission === 'default'
  const shouldShowDeniedState =
    !demoMode &&
    Boolean(profile) &&
    environment.isSupported &&
    (!environment.isIosSafari || environment.isStandalone) &&
    environment.notificationPermission === 'denied'
  const shouldShowEnabledState =
    !demoMode && Boolean(profile) && environment.notificationPermission === 'granted' && supportsWebPush()

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const refresh = () => setEnvironment(getNotificationEnvironment())

    media.addEventListener?.('change', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      media.removeEventListener?.('change', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  // Refresh a granted push subscription whenever the authenticated profile returns.
  useEffect(() => {
    if (!profile || demoMode || !supportsWebPush() || Notification.permission !== 'granted') return
    void registerWebPush(profile).catch((error: unknown) => {
      console.warn('Bildirim aboneliği yenilenemedi.', error)
    })
  }, [profile, demoMode])

  function dismissInstallGuide() {
    setHideInstallGuide(true)
    localStorage.setItem('hide-ios-install-guide', 'true')
  }

  async function enableNotifications() {
    if (!profile || !('Notification' in window)) return

    try {
      if (!supportsWebPush()) throw new Error('Bu cihaz bildirimleri desteklemiyor.')
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      setEnvironment({ ...getNotificationEnvironment(), notificationPermission: permission })

      if (permission === 'granted') {
        await registerWebPush(profile)
        setMessage('Bildirimler etkin ✓')
        window.setTimeout(() => setMessage(''), 2400)
        return
      }

      if (permission === 'denied') {
        setMessage('Bildirimler kapalı')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bildirim bağlantısı kurulamadı.')
    }
  }

  if (shouldShowInstallGuide) {
    return (
      <section className="ios-guide-backdrop" role="dialog" aria-modal="true" aria-labelledby="ios-guide-title">
        <div className="ios-guide panel">
          <h2 id="ios-guide-title">Bildirimleri kaçırmayın 📚</h2>
          <p>Paralel Okuma bildirimlerinin düzgün çalışabilmesi için uygulamayı iPhone ana ekranınıza ekleyin.</p>
          <ol className="ios-steps">
            <li>
              <span>Safari’de Paylaş simgesine dokunun.</span>
              <IosStepImage src="/ios-share.png" alt="Safari paylaş simgesi" fallback="share" />
            </li>
            <li>
              <span>Menüden “Ana Ekrana Ekle” seçeneğine dokunun.</span>
              <IosStepImage src="/ios-add-home.png" alt="Ana Ekrana Ekle seçeneği" fallback="add" />
            </li>
            <li>Ekledikten sonra ana ekrandaki “Paralel Okuma” simgesinden uygulamayı açın.</li>
          </ol>
          <p className="helper-text">Böylece uygulama kapalıyken de Faruk ve Berfin’in okuma hareketlerinden bildirim alabilirsiniz.</p>
          <div className="ios-guide-controls">
            <label className="toggle-item">
              <input
                type="checkbox"
                onChange={(event) => {
                  if (event.currentTarget.checked) dismissInstallGuide()
                }}
              />
              <span>Bir daha gösterme</span>
            </label>
            <button type="button" className="primary-button" onClick={dismissInstallGuide}>Tamam, anladım</button>
          </div>
        </div>
      </section>
    )
  }

  if (shouldShowPermissionCard) {
    return (
      <section className="panel notification-card">
        <h3>Bildirimleri aç 🔔</h3>
        <p>Faruk ve Berfin’in okuma hareketlerinden anında haberdar olun.</p>
        <button type="button" className="primary-button" onClick={() => void enableNotifications()}>Bildirimleri aç</button>
        {message ? <p className="helper-text">{message}</p> : null}
      </section>
    )
  }

  if (shouldShowEnabledState) {
    return (
      <section className="panel notification-card subtle">
        <p>🔔 {message || 'Bildirim izni açık. Faruk ve Berfin’in yeni hareketleri karşı tarafa iletilecek.'}</p>
        <button type="button" className="primary-button" onClick={() => void enableNotifications()}>Bildirim bağlantısını yenile</button>
      </section>
    )
  }

  if (message || shouldShowDeniedState) {
    return (
      <section className="panel notification-card subtle">
        <p>{message || 'Bildirimler kapalı'}</p>
        {shouldShowDeniedState ? <small>Bildirimleri cihazın tarayıcı veya uygulama ayarlarından açabilirsiniz.</small> : null}
      </section>
    )
  }

  return null
}

function IosStepImage({ src, alt, fallback }: { src: string; alt: string; fallback: 'share' | 'add' }) {
  const [hasImage, setHasImage] = useState(true)

  if (!hasImage) {
    return (
      <span className={`ios-step-fallback ${fallback}`} aria-hidden="true">
        {fallback === 'share' ? '↑' : '+'}
      </span>
    )
  }

  return <img className="ios-step-image" src={src} alt={alt} onError={() => setHasImage(false)} />
}

function getNotificationEnvironment() {
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  const userAgent = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android).)*Safari/i.test(userAgent)

  return {
    isStandalone: standaloneMedia || iosStandalone,
    isIos,
    isIosSafari: isIos && isSafari,
    isSupported: 'Notification' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
  }
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Ana gezinme">
      {tabs.map((tab) => (
        <a key={tab.label} href={tab.href} className="nav-item">{tab.label}</a>
      ))}
    </nav>
  )
}

function buildProgressMap(progress: ProgressDoc[]) {
  const map: Record<UserKey, Record<number, Status>> = { faruk: {}, berfin: {} }
  progress.forEach((item) => {
    map[item.userId][item.chapterId] = item.status
  })
  return map
}

function latestProgressDate(progress: ProgressDoc[], user: UserKey, chapterId: number) {
  const item = progress.find((entry) => entry.userId === user && entry.chapterId === chapterId)
  return item ? formatActivityDate(item.activityDate) : undefined
}

function progressDateValue(progress: ProgressDoc[], user: UserKey, chapterId: number) {
  return progress.find((entry) => entry.userId === user && entry.chapterId === chapterId)?.activityDate
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10)
}

function useReadingScrollPosition(userId: UserKey, bookId: string) {
  useEffect(() => {
    const storageKey = `reading-scroll:${userId}:${bookId}`
    // Attach the scroll listener after restoration to avoid overwriting the saved position.
    const savedPosition = Number(sessionStorage.getItem(storageKey))
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (window.location.hash) {
          const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
          target?.scrollIntoView()
        } else if (Number.isFinite(savedPosition) && savedPosition > 0) {
          window.scrollTo(0, savedPosition)
        } else {
          window.scrollTo(0, 0)
        }
        window.addEventListener('scroll', rememberScroll, { passive: true })
        window.addEventListener('pagehide', rememberScroll)
      })
    })
    let secondFrame = 0

    function rememberScroll() {
      sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)))
    }

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.removeEventListener('scroll', rememberScroll)
      window.removeEventListener('pagehide', rememberScroll)
    }
  }, [userId, bookId])
}

function pickReadingQuote(bookId: string) {
  const quotes = quotesByBookId[bookId] ?? ['Her yeni kitap, yeni bir düşünce yolculuğudur.']
  const storageKey = bookId === BOOK.id
    ? 'last-reading-quote-index'
    : `last-reading-quote-index-${bookId}`
  const lastIndex = Number(localStorage.getItem(storageKey) ?? '-1')
  let nextIndex = Math.floor(Math.random() * quotes.length)
  if (quotes.length > 1 && nextIndex === lastIndex) {
    nextIndex = (nextIndex + 1) % quotes.length
  }
  localStorage.setItem(storageKey, String(nextIndex))
  return quotes[nextIndex]
}

export default App
