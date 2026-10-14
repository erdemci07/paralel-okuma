import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg, index, all) => {
      if (!arg.startsWith('--')) return []
      const [key, inlineValue] = arg.slice(2).split('=')
      return [key, inlineValue ?? all[index + 1]]
    })
    .filter((entry) => entry.length === 2),
)

const projectId = args.projectId

if (!projectId) {
  console.error('Usage: npm run seed -- --projectId="YOUR_FIREBASE_PROJECT_ID"')
  process.exit(1)
}

const app = getApps()[0] ?? initializeApp({ projectId })
const db = getFirestore(app)
const bookId = 'var-misin'

const book = {
  title: 'Var mısın?',
  authors: ['Doğan Cüceloğlu'],
  author: 'Doğan Cüceloğlu',
  coverUrl: '/book-cover.jpg',
  description: 'Personel gelişim, yaşam, iletişim ve anlam arayışı üzerine kısa ve güçlü bir okuma.',
  chapterCount: 14,
  externalProvider: 'manual_seed',
  externalId: bookId,
}

const chapters = [
  [1, 'Hayatın Anlamı Nedir?', 19, 36],
  [2, 'İnsan Kendini Nasıl Geliştirir?', 37, 50],
  [3, 'Umutsuzluğu Nasıl Aşarız?', 51, 74],
  [4, 'İçimizdeki "Öz"ü Nasıl Buluruz?', 75, 90],
  [5, 'Çevremiz Bizi Nasıl Etkiler?', 91, 104],
  [6, 'Kime Akıl Danışılır?', 105, 124],
  [7, 'Yaşam Neleri Ödüllendirir?', 125, 144],
  [8, 'Nasıl Eş Seçilir?', 145, 168],
  [9, 'Zihnimiz Nasıl İşler?', 169, 194],
  [10, 'Nasıl Meslek Seçilir?', 195, 224],
  [11, 'Nasıl Biz Oluruz?', 225, 248],
  [12, 'Toplum Nasıl Dönüşür?', 249, 266],
  [13, 'Nasıl Okumalı, Gezmeli ve Ne Dinlemeliyiz?', 267, 284],
  [14, 'Neleri Okumalı, Dinlemeli ve Seyretmeliyiz?', 285, 'end'],
]

const bookRef = db.collection('books').doc(bookId)
const bookSnapshot = await bookRef.get()

if (bookSnapshot.exists) {
  await bookRef.set(
    {
      chapterCount: 14,
      coverUrl: book.coverUrl,
      cover: book.coverUrl,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
} else {
  await bookRef.set({
    ...book,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

for (const [id, title, startPage, endPage] of chapters) {
  const chapterRef = bookRef.collection('chapters').doc(String(id).padStart(2, '0'))
  const chapterSnapshot = await chapterRef.get()
  if (chapterSnapshot.exists) continue

  await chapterRef.set({
    id,
    title,
    startPage,
    endPage,
    summary: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

console.log(`Seed complete in project ${projectId}. Book and chapters are present; progress, comments, and plans were not touched.`)
