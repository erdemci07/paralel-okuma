import sevmeSanatiCover from './assets/covers/sevme-sanati.webp'

// Bundled covers get a content-hashed URL, so no stale browser/PWA cache or
// Firestore value can hide them.
const BUNDLED_COVERS: Record<string, string> = {
  'sevme-sanati': sevmeSanatiCover,
}

const BUNDLED_COVERS_BY_TITLE: Record<string, string> = {
  'sevme sanatı': sevmeSanatiCover,
}

export function resolveCoverUrl(book: { id: string; title?: string; coverUrl?: string; cover?: string }) {
  const bundled = BUNDLED_COVERS[book.id] ?? BUNDLED_COVERS_BY_TITLE[(book.title ?? '').trim().toLocaleLowerCase('tr-TR')]
  if (bundled) return bundled
  const raw = (book.coverUrl || book.cover || '').trim()
  // Google Books thumbnails often arrive as http://, which an https page blocks.
  return raw.startsWith('http://') ? `https://${raw.slice('http://'.length)}` : raw
}
