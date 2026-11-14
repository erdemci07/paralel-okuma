import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { book, bookId, chapters } from './sevme-sanati-data.mjs'

// Only this book's cover fields, new book document, and yet-uncreated chapter documents are ever written.
// No collection-wide writes, deletions, or updates to progress/plans/comments/activities.
const projectId = process.argv.find((arg) => arg.startsWith('--projectId='))?.slice('--projectId='.length)
if (projectId !== 'paralel-okuma') {
  console.error('Usage: node scripts/seed-sevme-sanati.mjs --projectId=paralel-okuma')
  process.exit(1)
}

const db = getFirestore(getApps()[0] ?? initializeApp({ projectId }))
const bookRef = db.collection('books').doc(bookId)

const existingBook = await bookRef.get()
if (!existingBook.exists) {
  await bookRef.create({
    ...book,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).catch((error) => {
    // A concurrent run may have created the same book in the meantime.
    if (error.code !== 6 && error.code !== 'already-exists') throw error
  })
}

// Keep a previously created book's information and reading history untouched.
// Synchronize ONLY this book's cover fields if the original image path is stale.
const storedBook = await bookRef.get()
const coverChanges = {}
if (storedBook.get('coverUrl') !== book.coverUrl) coverChanges.coverUrl = book.coverUrl
if (storedBook.get('cover') !== book.cover) coverChanges.cover = book.cover
if (Object.keys(coverChanges).length > 0) {
  await bookRef.update({
    ...coverChanges,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

let created = 0
for (const chapter of chapters) {
  const chapterRef = bookRef.collection('chapters').doc(String(chapter.id).padStart(2, '0'))
  if ((await chapterRef.get()).exists) continue
  await chapterRef.create({
    ...chapter,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).then(() => { created += 1 }).catch((error) => {
    // Do not overwrite a chapter another execution has just created.
    if (error.code !== 6 && error.code !== 'already-exists') throw error
  })
}

console.log(`Sevme Sanatı: ${chapters.length} okuma birimi mevcut, ${created} yeni bölüm oluşturuldu, kapak adresi doğrulandı. Diğer kitap ve okuma kayıtlarına dokunulmadı.`)
