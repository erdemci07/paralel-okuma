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
  USERS,
  normalizeUserKey,
} from './data'
import type { Status, UserKey } from './data'
import { isFirebaseConfigured } from './firebase'
import {
  addComment,
  DEFAULT_PREFS,
  formatActivityDate,
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
import { registerWebPush, showDeviceTestNotification, supportsWebPush } from './notificationClient'
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

const sevmeSanatiQuotes = [
  'Sevmek, kendiliğinden düşülen bir duygu değil; emek verilerek öğrenilen bir eylemdir.',
  'Sevilmeyi beklemek kolaydır; asıl zor olan, sevebilen biri olmaktır.',
  'İlgi göstermediğin bir şeyi gerçekten sevdiğini söyleyemezsin.',
  'Sevgi, karşındakinin olduğu gibi büyümesine alan açabilmektir.',
  'Saygı, birini kendi istediğin biçime sokmaya çalışmamaktır.',
  'Tanımadan sevmek, sevginin yarısında kalmaktır.',
  'Yalnızlık korkusuyla kurulan yakınlık iki insanı birleştirmez; yalnızca yan yana getirir.',
  'Kendine saygı duymayan, başkasına verecek sağlam bir sevgi de bulamaz.',
  'Bencillik kendini fazla sevmek değil, kendini yeterince sevememektir.',
  'Her sanat gibi sevmek de disiplin, sabır ve yoğunlaşma ister.',
  'Sevgide vermek bir kayıp değil, insanın kendi zenginliğini fark etmesidir.',
  'Olgun bir ilişkide iki kişi birleşir, ama ikisi de kendisi olarak kalır.',
  'Sevgi tek bir kişiye yönelmiş bir duygudan çok, insanın dünyaya bakışıdır.',
  'Birini gerçekten dinlemek, sevginin en sessiz ama en derin biçimidir.',
  'Sevgiyi alışveriş gibi hesaplayan, ondan ancak bir sözleşme kadarını alır.',
]

const quotesByBookId: Record<string, readonly string[]> = {
  [BOOK.id]: readingQuotes,
  'insan-olmak': insanOlmakQuotes,
  'filler-sultani': fillerSultaniQuotes,
  'sevme-sanati': sevmeSanatiQuotes,
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
            <img src="/icon.svg" alt="" />
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
  const [quoteTick, setQuoteTick] = useState(0)
  const readingQuote = useMemo(() => pickReadingQuote(workspace.book.id, quoteTick), [workspace.book.id, quoteTick])
  const [filter, setFilter] = useState<ChapterFilter>('all')
  const [openChapterId, setOpenChapterId] = useState<number | null>(null)
  useReadingScrollPosition(currentUser, workspace.book.id)
  const total = workspace.chapters.length
  const completedByCurrent = workspace.chapters.filter((chapter) => currentStatusMap[chapter.id] === 'completed').length
  const completedByOther = workspace.chapters.filter((chapter) => otherStatusMap[chapter.id] === 'completed').length
  const sharedCompleted = workspace.chapters.filter(
    (chapter) => currentStatusMap[chapter.id] === 'completed' && otherStatusMap[chapter.id] === 'completed',
  ).length
  const statusOf = (user: UserKey, chapterId: number): Status =>
    (user === currentUser ? currentStatusMap[chapterId] : otherStatusMap[chapterId]) ?? 'not_started'
  const continueChapter =
    workspace.chapters.find((chapter) => statusOf(currentUser, chapter.id) === 'reading') ??
    workspace.chapters.find((chapter) => statusOf(currentUser, chapter.id) !== 'completed')
  const readingCount = workspace.chapters.filter((chapter) => statusOf(currentUser, chapter.id) === 'reading').length
  const visibleChapters = workspace.chapters.filter((chapter) => {
    const status = statusOf(currentUser, chapter.id)
    if (filter === 'reading') return status === 'reading'
    if (filter === 'left') return status !== 'completed'
    return true
  })
  const openChapter = workspace.chapters.find((chapter) => chapter.id === openChapterId)
  const unitLabel = workspace.book.id === 'filler-sultani' ? 'Kısımlar' : 'Bölümler'
  const chapterDate = (user: UserKey, chapterId: number) =>
    demoMode ? CHAPTER_ACTIVITY[user]?.[chapterId] : latestProgressDate(workspace.progress, user, chapterId)
  const commentCount = (chapterId: number) => comments.filter((comment) => comment.chapterId === chapterId).length

  return (
    <ShellFrame currentUser={currentUser} locationPath={locationPath}>
      <NotificationSetup profile={profile} demoMode={demoMode} />
      {onShowLibrary ? <button type="button" className="library-back" onClick={onShowLibrary}>← Tüm kitaplar</button> : null}
      {library.length > 1 ? <nav className="book-switcher" aria-label="Kitap seçimi">{library.map((book) => <button key={book.id} type="button" className={book.id === workspace.book.id ? 'book-choice active' : 'book-choice'} onClick={() => onSelectBook?.(book.id)}>{book.title}</button>)}</nav> : null}

      <section id="book" className="panel book-panel">
        <div className="book-header">
          <img src={workspace.book.coverUrl || workspace.book.cover} alt={workspace.book.title} className="book-cover" />
          <div className="book-copy">
            <h2>{workspace.book.title}</h2>
            <p className="author">{workspace.book.author}</p>
            <p className="meta">{total} {workspace.book.id === 'filler-sultani' ? 'kısım' : 'bölüm'}</p>
          </div>
        </div>

        <div className="progress-bars">
          <ProgressBar user={currentUser} completed={completedByCurrent} total={total} tone="accent" />
          <ProgressBar user={otherUser} completed={completedByOther} total={total} tone="teal" />
          <p className="shared-line">Birlikte tamamlanan: <strong>{sharedCompleted} / {total}</strong></p>
        </div>

        <figure className="quote-card">
          <blockquote className="book-quote">{readingQuote}</blockquote>
          <button type="button" className="icon-button" aria-label="Başka söz göster" onClick={() => setQuoteTick((value) => value + 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
          </button>
        </figure>
      </section>

      {continueChapter ? (
        <button type="button" className="continue-card" onClick={() => setOpenChapterId(continueChapter.id)}>
          <span className="continue-copy">
            <span className="continue-eyebrow">{statusOf(currentUser, continueChapter.id) === 'reading' ? 'Kaldığın yer' : 'Sıradaki bölüm'}</span>
            <span className="continue-title">{String(continueChapter.id).padStart(2, '0')} · {continueChapter.title}</span>
            <span className="continue-meta">
              {statusOf(currentUser, continueChapter.id) === 'reading' ? 'Okuyorsun' : 'Henüz başlamadın'} · s. {formatPages(continueChapter)}
              {statusOf(currentUser, continueChapter.id) === 'reading' && chapterDate(currentUser, continueChapter.id) ? ` · ${chapterDate(currentUser, continueChapter.id)}` : ''}
            </span>
          </span>
          <span className="continue-action">Güncelle</span>
        </button>
      ) : (
        <p className="all-done">Tüm bölümleri bitirdin. Tebrikler!</p>
      )}

      <section className="panel chapter-panel" id="chapters">
        <div className="chapter-panel-head">
          <div className="section-header">
            <h3>{unitLabel}</h3>
            <span className="chapter-legend">{USERS[currentUser].name[0]} = {USERS[currentUser].name} · {USERS[otherUser].name[0]} = {USERS[otherUser].name}</span>
          </div>
          <div className="chapter-filter" role="group" aria-label="Bölüm filtresi">
            {CHAPTER_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                className={filter === item.id ? 'active' : ''}
                onClick={() => setFilter(item.id)}
              >
                {item.id === 'all' ? `Tümü · ${total}` : item.id === 'reading' ? `Okuyorum${readingCount ? ` · ${readingCount}` : ''}` : `Kalanlar · ${total - completedByCurrent}`}
              </button>
            ))}
          </div>
        </div>

        <ul className="chapter-rows">
          {visibleChapters.map((chapter) => {
            const mine = statusOf(currentUser, chapter.id)
            const theirs = statusOf(otherUser, chapter.id)
            const notes = commentCount(chapter.id)
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={mine === 'reading' ? 'chapter-row current' : 'chapter-row'}
                  onClick={() => setOpenChapterId(chapter.id)}
                >
                  <span className="chapter-row-number">{String(chapter.id).padStart(2, '0')}</span>
                  <span className="chapter-row-copy">
                    <span className="chapter-row-title">{chapter.title}</span>
                    <span className="chapter-row-meta">
                      s. {formatPages(chapter)}{notes ? ` · ${notes} not` : ''}{mine === 'reading' ? ' · okuyorsun' : ''}
                    </span>
                  </span>
                  <span className="chapter-row-badges">
                    <StatusBadge user={currentUser} status={mine} />
                    <StatusBadge user={otherUser} status={theirs} />
                  </span>
                  <svg className="chapter-row-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </li>
            )
          })}
        </ul>
        {visibleChapters.length === 0 ? <p className="chapter-empty">Bu filtrede bölüm yok.</p> : null}
      </section>

      {commentsError ? <section className="panel notice-panel"><p>{commentsError}</p></section> : null}
      <ActivityPanel activities={workspace.activities} demoMode={demoMode} />
      <ProfilePanel profile={profile} demoMode={demoMode} />

      {openChapter ? (
        <ChapterSheet
          key={`${openChapter.id}-${statusOf(currentUser, openChapter.id)}`}
          chapter={openChapter}
          bookId={workspace.book.id}
          bookTitle={workspace.book.title}
          currentUser={currentUser}
          otherUser={otherUser}
          currentStatus={statusOf(currentUser, openChapter.id)}
          otherStatus={statusOf(otherUser, openChapter.id)}
          otherActivity={chapterDate(otherUser, openChapter.id)}
          currentProgressDate={demoMode ? undefined : progressDateValue(workspace.progress, currentUser, openChapter.id)}
          profile={profile}
          demoMode={demoMode}
          comments={comments.filter((comment) => comment.chapterId === openChapter.id)}
          onClose={() => setOpenChapterId(null)}
        />
      ) : null}
    </ShellFrame>
  )
}

type ChapterFilter = 'all' | 'reading' | 'left'

const CHAPTER_FILTERS: { id: ChapterFilter }[] = [{ id: 'all' }, { id: 'reading' }, { id: 'left' }]

const STATUS_WORDS: Record<Status, string> = {
  not_started: 'başlamadı',
  reading: 'okuyor',
  completed: 'bitirdi',
}

const MY_STATUS_WORDS: Record<Status, string> = {
  not_started: 'başlamadın',
  reading: 'okuyorsun',
  completed: 'bitirdin',
}

const STATUS_BUTTON_LABELS: Record<Status, string> = {
  not_started: 'Başlamadım',
  reading: 'Okuyorum',
  completed: 'Bitirdim',
}

function formatPages(chapter: typeof CHAPTERS[number]) {
  return `${chapter.startPage}–${chapter.endPage === 'end' ? 'son' : chapter.endPage}`
}

function ProgressBar({ user, completed, total, tone }: { user: UserKey; completed: number; total: number; tone: 'accent' | 'teal' }) {
  const percent = total ? Math.round((completed / total) * 100) : 0
  return (
    <div className="progress-bar-row">
      <div className="progress-bar-label">
        <span>{USERS[user].name}</span>
        <span>{completed} / {total} · %{percent}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label={`${USERS[user].name} ilerlemesi`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
        <div className={`progress-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ user, status }: { user: UserKey; status: Status }) {
  return (
    <span className={`status-badge ${status}`} title={`${USERS[user].name}: ${STATUS_WORDS[status]}`} aria-label={`${USERS[user].name} ${STATUS_WORDS[status]}`}>
      {USERS[user].name[0]}
    </span>
  )
}

function ChapterSheet({
  chapter,
  bookId,
  bookTitle,
  currentUser,
  otherUser,
  currentStatus,
  otherStatus,
  otherActivity,
  currentProgressDate,
  profile,
  demoMode,
  comments,
  onClose,
}: {
  chapter: typeof CHAPTERS[number]
  bookId: string
  bookTitle: string
  currentUser: UserKey
  otherUser: UserKey
  currentStatus: Status
  otherStatus: Status
  otherActivity?: string
  currentProgressDate?: string
  profile: MemberProfile | null
  demoMode: boolean
  comments: CommentDoc[]
  onClose: () => void
}) {
  const [status, setStatus] = useState<Status>(currentStatus)
  const [activityDate, setActivityDate] = useState(currentProgressDate ?? todayDateValue())
  const [noteText, setNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const readOnly = demoMode || !profile
  const today = todayDateValue()
  const yesterday = todayDateValue(-1)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function pickStatus(next: Status) {
    setStatus(next)
    if (currentStatus === 'completed' && next !== 'completed') setActivityDate(today)
  }

  const statusChanged = status !== currentStatus
  const dateChanged = status !== 'not_started' && activityDate !== (currentProgressDate ?? today)
  const hasNote = noteText.trim().length > 0
  const canSave = !readOnly && !isSaving && (statusChanged || dateChanged || hasNote)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !canSave) return
    setError('')
    setIsSaving(true)
    try {
      if (statusChanged || dateChanged) {
        await updateProgress(profile, chapter.id, status, activityDate, bookId, bookTitle)
      }
      if (hasNote) {
        await addComment(profile, chapter.id, noteText, bookId)
        setNoteText('')
      }
      onClose()
    } catch {
      setError('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.')
      setIsSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`sheet-title-${chapter.id}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSave}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <div className="sheet-head-copy">
            <span className="sheet-eyebrow">Bölüm {String(chapter.id).padStart(2, '0')} · s. {formatPages(chapter)}</span>
            <h3 id={`sheet-title-${chapter.id}`}>{chapter.title}</h3>
          </div>
          <button type="button" className="sheet-close" aria-label="Kapat" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="sheet-people">
          <span className={`sheet-person ${status}`}><strong>Sen</strong> · {MY_STATUS_WORDS[status]}</span>
          <span className={`sheet-person ${otherStatus}`}>
            <strong>{USERS[otherUser].name}</strong> · {STATUS_WORDS[otherStatus]}{otherStatus !== 'not_started' && otherActivity ? ` · ${otherActivity}` : ''}
          </span>
        </div>

        <div className="sheet-field">
          <p className="sheet-label">Okuma durumun</p>
          <div className="sheet-status" role="group" aria-label="Okuma durumu">
            {(['not_started', 'reading', 'completed'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={status === item}
                className={status === item ? `active ${item}` : ''}
                onClick={() => pickStatus(item)}
                disabled={readOnly}
              >
                {STATUS_BUTTON_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        {status !== 'not_started' ? (
          <div className="sheet-field">
            <label className="sheet-label" htmlFor={`sheet-date-${chapter.id}`}>{status === 'completed' ? 'Bitirdiğin tarih' : 'Başladığın tarih'}</label>
            <div className="sheet-date">
              <button type="button" className={activityDate === today ? 'active' : ''} onClick={() => setActivityDate(today)} disabled={readOnly}>Bugün</button>
              <button type="button" className={activityDate === yesterday ? 'active' : ''} onClick={() => setActivityDate(yesterday)} disabled={readOnly}>Dün</button>
              <input
                id={`sheet-date-${chapter.id}`}
                type="date"
                lang="tr-TR"
                max={today}
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value || today)}
                disabled={readOnly}
              />
            </div>
          </div>
        ) : null}

        <div className="sheet-field sheet-notes-field">
          <p className="sheet-label">Notlar{comments.length ? ` · ${comments.length}` : ''}</p>
          {comments.length ? (
            <ul className="sheet-notes">
              {comments.map((comment) => {
                const isMine = comment.authorProfileId === currentUser
                const when = formatCommentDate(comment.createdAt)
                return (
                  <li key={comment.id} className={isMine ? 'mine' : 'theirs'}>
                    <strong>{isMine ? 'Sen' : USERS[comment.authorProfileId]?.shortName ?? 'Üye'}{when ? ` · ${when}` : ''}</strong>
                    {comment.text}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="sheet-notes-empty">Bu bölüm için henüz not yok.</p>
          )}
          <label className="visually-hidden" htmlFor={`sheet-note-${chapter.id}`}>Not ekle</label>
          <textarea
            id={`sheet-note-${chapter.id}`}
            rows={2}
            placeholder="Bu bölüm için not yaz…"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            disabled={readOnly}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="primary-button sheet-save" disabled={!canSave}>
          {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>
    </div>
  )
}

function formatCommentDate(value: unknown) {
  if (!value || typeof value !== 'object' || !('toDate' in value)) return ''
  const toDate = (value as { toDate?: () => Date }).toDate
  if (typeof toDate !== 'function') return ''
  const date = toDate.call(value)
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(date)
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
        <p className="activity-empty">{demoMode ? 'Demo modunda hareket kaydı tutulmaz.' : 'Bu kitapta henüz hareket yok. Okumaya başlayınca, bölüm tamamlayınca, veya not yazınca burada görünecek.'}</p>
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
          {keys.map((key, index) => key === 'notifyPlanChanges' ? null : (
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
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const shouldShowInstallGuide =
    !demoMode &&
    Boolean(profile) &&
    environment.isIosSafari &&
    !environment.isStandalone &&
    environment.notificationPermission !== 'granted' &&
    !hideInstallGuide

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

  // A subscription may be lost or rotated by the browser; restore it on sign-in.
  const profileUid = profile?.uid
  useEffect(() => {
    if (!profileUid || demoMode || !supportsWebPush() || Notification.permission !== 'granted') return
    let cancelled = false
    void registerWebPush(profileUid).then(() => {
      if (!cancelled) {
        setConnected(true)
      }
    }).catch(() => {
      if (!cancelled) {
        setConnected(false)
      }
    })
    return () => { cancelled = true }
  }, [profileUid, demoMode])

  function dismissInstallGuide() {
    setHideInstallGuide(true)
    localStorage.setItem('hide-ios-install-guide', 'true')
  }

  async function enableNotifications() {
    if (!profile || !('Notification' in window) || isConnecting) return
    setIsConnecting(true)
    setMessage('Bildirim bağlantısı kontrol ediliyor…')
    try {
      if (!supportsWebPush()) throw new Error('Bu cihaz web bildirimlerini desteklemiyor.')
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      setEnvironment(getNotificationEnvironment())
      if (permission === 'denied') throw new Error('Bildirim izni kapalı. Tarayıcı ayarlarından izin verin.')
      if (permission !== 'granted') throw new Error('Bildirim izni verilmedi.')
      await registerWebPush(profile.uid)
      setConnected(true)
      setMessage('Cihazınız başarıyla bağlandı ✓')
    } catch (error) {
      setConnected(false)
      setMessage(error instanceof Error ? error.message : 'Bildirim bağlantısı kurulamadı.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function testDeviceNotification() {
    if (isTesting) return
    setIsTesting(true)
    try {
      await showDeviceTestNotification()
      setMessage('Deneme bildirimi bu cihazda gösterildi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deneme bildirimi gösterilemedi.')
    } finally {
      setIsTesting(false)
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
          <p className="helper-text">Böylece uygulama kapalıyken de okuma hareketleriniz karşı tarafa bildirim olarak iletilir.</p>
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

  if (demoMode || !profile) return null

  const permissionAvailable = supportsWebPush() && (!environment.isIosSafari || environment.isStandalone)
  const status = !permissionAvailable || environment.notificationPermission === 'denied'
    ? 'Kapalı'
    : environment.notificationPermission !== 'granted'
      ? 'İzin gerekli'
      : connected
        ? 'Aktif'
        : 'Kontrol ediliyor'

  return (
    <section className="panel notification-card" aria-live="polite">
      <button
        type="button"
        className="notification-summary"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        aria-controls="notification-settings"
      >
        <span className="notification-bell" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M18 10a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <span className="notification-title">Bildirimler</span>
        <span className={`notification-status ${status === 'Aktif' ? 'is-active' : ''}`}>{status}</span>
        <span className="notification-chevron" aria-hidden="true">{isExpanded ? '⌃' : '⌄'}</span>
      </button>
      {isExpanded ? (
        <div id="notification-settings" className="notification-settings">
          <p>Okuma hareketleri, bildirim izni veren diğer kullanıcıya iletilir.</p>
          {status === 'İzin gerekli' ? <button type="button" className="primary-button" onClick={() => void enableNotifications()} disabled={isConnecting}>{isConnecting ? 'Bağlanıyor…' : 'Bildirim izni ver'}</button> : null}
          {status === 'Kapalı' ? <p className="helper-text">Bildirim görünmüyorsa cihazınızın ve tarayıcınızın bildirim izinlerini kontrol edin.</p> : null}
          {permissionAvailable && environment.notificationPermission === 'granted' ? (
            <div className="notification-actions">
              <button type="button" className="secondary-button" disabled={isTesting || isConnecting} onClick={() => void testDeviceNotification()}>{isTesting ? 'Gösteriliyor…' : 'Bu cihazda dene'}</button>
              <button type="button" className="primary-button" disabled={isConnecting} onClick={() => void enableNotifications()}>{isConnecting ? 'Yenileniyor…' : 'Bildirim bağlantısını yenile'}</button>
            </div>
          ) : null}
          {permissionAvailable && environment.notificationPermission === 'granted' ? <small>Deneme bildirimi yalnızca bu cihazda gösterilir.</small> : null}
          {permissionAvailable && environment.notificationPermission === 'granted' ? <small>Bu cihazın bildirim bağlantısını yeniden kaydeder.</small> : null}
          <button type="button" className="text-button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp}>{showHelp ? 'Yardımı gizle' : 'Nasıl çalışır?'}</button>
          {showHelp ? <p className="notification-help">Okuma hareketleri tercihleri açık olan diğer kullanıcıya iletilir. Bildirim görünmüyorsa cihazınızın ve tarayıcınızın bildirim izinlerini kontrol edin.</p> : null}
          {message ? <p className="helper-text">{message}</p> : null}
        </div>
      ) : null}
    </section>
  )
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

function todayDateValue(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
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

// `refresh` only forces a new pick when the reader asks for another quote.
function pickReadingQuote(bookId: string, refresh = 0) {
  void refresh
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
