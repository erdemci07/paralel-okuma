import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const projectId = process.argv.find((arg) => arg.startsWith('--projectId='))?.split('=')[1]
if (projectId !== 'paralel-okuma') {
  console.error('Usage: node scripts/seed-insan-olmak.mjs --projectId=paralel-okuma')
  process.exit(1)
}

const app = getApps()[0] ?? initializeApp({ projectId })
const db = getFirestore(app)
const bookId = 'insan-olmak'
const bookRef = db.collection('books').doc(bookId)
const chapters = [
  ['Birey ve Toplum', 17, 32],
  ['Ana-Baba ve Çocuk', 33, 51],
  ['İnsanlardan Korkmak', 52, 56],
  ['Öfke ve Düşmanlık', 57, 75],
  ['Değersizlik Duygusu', 76, 85],
  ['Kaygı', 86, 96],
  ['Sorumluluktan Kaçış', 97, 107],
  ['Yalnızlık', 108, 120],
  ['Ortakyaşam İlişkisi', 121, 143],
  ['Nevrotik Kısırdöngü', 144, 153],
  ['Yaşam ve Ölüm', 154, 161],
  ['Kendini Yaşamak', 162, 174],
]
const book = {
  title: 'İnsan Olmak',
  author: 'Engin Geçtan',
  authors: ['Engin Geçtan'],
  publisher: 'Metis Yayınları',
  coverUrl: '/insan-olmak-cover.jpg',
  cover: '/insan-olmak-cover.jpg',
  description: 'İnsan ilişkileri, duygular ve kendini tanıma üzerine.',
  chapterCount: chapters.length,
  externalProvider: 'manual_seed',
  externalId: bookId,
}
const existing = await bookRef.get()
if (!existing.exists) {
  await bookRef.set({ ...book, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
} else {
  await bookRef.set({ chapterCount: chapters.length, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}
for (const [index, [title, startPage, endPage]] of chapters.entries()) {
  const ref = bookRef.collection('chapters').doc(String(index + 1).padStart(2, '0'))
  if (!(await ref.get()).exists) {
    await ref.set({ id: index + 1, title, startPage, endPage, summary: '', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  }
}
console.log('İnsan Olmak: 12 bölüm doğrulandı. Mevcut okuma kayıtlarına dokunulmadı.')
