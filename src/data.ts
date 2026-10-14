export type UserKey = 'faruk' | 'berfin'

export type Status = 'not_started' | 'reading' | 'completed'

export type Chapter = {
  id: number
  title: string
  startPage: number
  endPage: number | 'end'
  summary: string
}

export type Book = {
  id: string
  title: string
  author: string
  cover: string
  description: string
  chapterCount: number
}

export type ActivityItem = {
  id: string
  actor: UserKey
  type: 'status_started' | 'status_completed' | 'comment_added' | 'reading_plan_created' | 'reading_plan_updated' | 'book_started'
  text: string
  dateLabel: string
}

export const USERS: Record<UserKey, { id: UserKey; name: string; shortName: string; email: string }> = {
  faruk: { id: 'faruk', name: 'Faruk', shortName: 'Faruk', email: 'faruk@paralel-okuma.local' },
  berfin: { id: 'berfin', name: 'Berfin', shortName: 'Berfin', email: 'berfin@paralel-okuma.local' },
}

export const BOOK: Book = {
  id: 'var-misin',
  title: 'Var mısın?',
  author: 'Doğan Cüceloğlu',
  cover: '/book-cover.jpg',
  description:
    'Personel gelişim, yaşam, iletişim ve anlam arayışı üzerine kısa ve güçlü bir okuma.',
  chapterCount: 14,
}

export const CHAPTERS: Chapter[] = [
  { id: 1, title: 'Hayatın Anlamı Nedir?', startPage: 19, endPage: 36, summary: 'Özgün düşünce ve anlam arayışı.' },
  { id: 2, title: 'İnsan Kendini Nasıl Geliştirir?', startPage: 37, endPage: 50, summary: 'Kişisel gelişim ilkeleri.' },
  { id: 3, title: 'Umutsuzluğu Nasıl Aşarız?', startPage: 51, endPage: 74, summary: 'Zorluklarla baş etme.' },
  { id: 4, title: 'İçimizdeki “Öz”ü Nasıl Buluruz?', startPage: 75, endPage: 90, summary: 'Benlik ve farkındalık.' },
  { id: 5, title: 'Çevremiz Bizi Nasıl Etkiler?', startPage: 91, endPage: 104, summary: 'Çevrenin etkisi.' },
  { id: 6, title: 'Kime Akıl Danışılır?', startPage: 105, endPage: 124, summary: 'Yol gösteren kaynaklar.' },
  { id: 7, title: 'Yaşam Neleri Ödüllendirir?', startPage: 125, endPage: 144, summary: 'Değerler ve ödüller.' },
  { id: 8, title: 'Nasıl Eş Seçilir?', startPage: 145, endPage: 168, summary: 'Seçim ve uyum.' },
  { id: 9, title: 'Zihnimiz Nasıl İşler?', startPage: 169, endPage: 194, summary: 'Zihin ve davranış.' },
  { id: 10, title: 'Nasıl Meslek Seçilir?', startPage: 195, endPage: 224, summary: 'Meslek ve amaç.' },
  { id: 11, title: 'Nasıl Biz Oluruz?', startPage: 225, endPage: 248, summary: 'Kişilik ve gelişim.' },
  { id: 12, title: 'Toplum Nasıl Dönüşür?', startPage: 249, endPage: 266, summary: 'Toplum ve değişim.' },
  { id: 13, title: 'Nasıl Okumalı, Gezmeli ve Ne Dinlemeliyiz?', startPage: 267, endPage: 284, summary: 'Algı ve yorum.' },
  { id: 14, title: 'Neleri Okumalı, Dinlemeli ve Seyretmeliyiz?', startPage: 285, endPage: 'end', summary: 'İçerik ve bilgi seçimi.' },
]

export const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Başlamadı',
  reading: 'Okuyor',
  completed: 'Tamamladı',
}

export const STATUS_ICONS: Record<Status, string> = {
  not_started: '⬜',
  reading: '📖',
  completed: '✅',
}

export const CHAPTER_STATUSES: Record<UserKey, Record<number, Status>> = {
  faruk: {
    1: 'completed',
    2: 'reading',
    3: 'not_started',
    4: 'not_started',
    5: 'not_started',
    6: 'not_started',
    7: 'not_started',
    8: 'not_started',
    9: 'not_started',
    10: 'not_started',
    11: 'not_started',
    12: 'not_started',
    13: 'not_started',
    14: 'not_started',
  },
  berfin: {
    1: 'completed',
    2: 'completed',
    3: 'reading',
    4: 'not_started',
    5: 'not_started',
    6: 'not_started',
    7: 'not_started',
    8: 'not_started',
    9: 'not_started',
    10: 'not_started',
    11: 'not_started',
    12: 'not_started',
    13: 'not_started',
    14: 'not_started',
  },
}

export const CHAPTER_ACTIVITY: Record<UserKey, Record<number, string>> = {
  faruk: {
    1: 'Dün',
    2: 'Bugün',
  },
  berfin: {
    1: 'Bugün',
    2: 'Dün',
    3: 'Bugün',
  },
}

export const SHARED_PLANS: Record<number, { type: 'shared' | 'personal'; owner: UserKey; date: string; note: string }> = {
  4: {
    type: 'shared',
    owner: 'berfin',
    date: 'Yarın',
    note: 'Yarın 4. bölüme başlayalım mı?',
  },
}

export const ACTIVITIES: ActivityItem[] = [
  { id: 'a1', actor: 'berfin', type: 'status_started', text: '2. bölümü okumaya başladı', dateLabel: 'Bugün' },
  { id: 'a2', actor: 'faruk', type: 'status_completed', text: '1. bölümü tamamladı', dateLabel: 'Dün' },
  { id: 'a3', actor: 'berfin', type: 'comment_added', text: 'Bölüm 2 için bir not bıraktı', dateLabel: '12 Eylül' },
  { id: 'a4', actor: 'faruk', type: 'reading_plan_created', text: 'Ortak okuma planı oluşturdu', dateLabel: '15 Eylül için' },
]

export const PROFILE_TOGGLES = [
  'Okumaya başladığında',
  'Bölüm tamamladığında',
  'Yorum yazdığında',
  'Okuma planı oluşturduğunda/değiştirdiğinde',
  'Yeni kitap başladığında',
  'Puanlama olduğunda',
]

export const ROUTE_USERS: UserKey[] = ['faruk', 'berfin']

export function normalizeUserKey(value?: string | null): UserKey | null {
  const normalized = value?.toLowerCase()
  return ROUTE_USERS.includes(normalized as UserKey) ? (normalized as UserKey) : null
}
