import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const projectId = process.argv.find((arg) => arg.startsWith('--projectId='))?.split('=')[1]
if (projectId !== 'paralel-okuma') {
  console.error('Usage: node scripts/seed-filler-sultani.mjs --projectId=paralel-okuma')
  process.exit(1)
}

const app = getApps()[0] ?? initializeApp({ projectId })
const db = getFirestore(app)
const bookId = 'filler-sultani'
const bookRef = db.collection('books').doc(bookId)
const pageRanges = [[6,37],[38,57],[58,71],[72,87],[88,118],[119,156],[157,192],[193,208]]
const coverUrl = '/filler-sultani-cover.webp'
const book = {
  title: 'Filler Sultanı ile Kırmızı Sakallı Topal Karınca',
  author: 'Yaşar Kemal',
  authors: ['Yaşar Kemal'],
  publisher: 'Yapı Kredi Yayınları',
  coverUrl,
  cover: coverUrl,
  description: 'Filler ve karıncaların hikâyesi üzerinden güç, özgürlük ve dayanışmayı anlatan alegorik roman.',
  chapterCount: pageRanges.length,
  externalProvider: 'manual_seed',
  externalId: bookId,
}

const existingBook = await bookRef.get()
if (!existingBook.exists) {
  await bookRef.set({
    ...book,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
} else {
  // Only correct the chapter count of this book; never touch reading records.
  await bookRef.set({
    chapterCount: pageRanges.length,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

for (const [index, [startPage, endPage]] of pageRanges.entries()) {
  const chapterRef = bookRef.collection('chapters').doc(String(index + 1).padStart(2, '0'))
  if (!(await chapterRef.get()).exists) {
    await chapterRef.set({
      id: index + 1,
      title: `${index + 1}. Kısım`,
      startPage,
      endPage,
      summary: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

console.log('Filler Sultanı: 8 kısım doğrulandı. Diğer kitaplara ve okuma kayıtlarına dokunulmadı.')
