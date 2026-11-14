import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { book, bookId, chapters } from './sevme-sanati-data.mjs'

// Only this book's book document and yet-uncreated chapter documents are ever written.
// No collection-wide writes, deletions, or updates to progress/plans/comments/activities.
const projectId = process.argv.find((arg) => arg.startsWith('--projectId='))?.slice('--projectId='.length)
if (projectId !== 'paralel-okuma') {
  console.error('Usage: node scripts/seed-sevme-sanati.mjs --projectId=paralel-okuma')
  process.exit(1)
}

const db = getFirestore(getApps()[0] ?? initializeApp({ projectId }))
const bookRef = db.collection('books').doc(bookId)

if (!(await bookRef.get()).exists) {
  await bookRef.create({
    ...book,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).catch((error) => {
    // A concurrent run may have created the same book in the meantime.
    if (error.code !== 6 && error.code !== 'already-exists') throw error
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

console.log(`Sevme Sanatı: ${chapters.length} okuma birimi mevcut, ${created} yeni bölüm oluşturuldu. Önceki kitap ve okuma kayıtları değiştirilmedi.`)
