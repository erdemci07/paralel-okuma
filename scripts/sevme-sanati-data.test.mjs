import test from 'node:test'
import assert from 'node:assert/strict'
import { book, bookId, chapters } from './sevme-sanati-data.mjs'

test('Sevme Sanatı is an independent catalog entry', () => {
  assert.equal(bookId, 'sevme-sanati')
  assert.equal(book.externalId, bookId)
  assert.equal(book.chapterCount, chapters.length)
  assert.equal(book.coverUrl, '/sevme-sanati-cover.webp')
  assert.equal(book.isbn, '9786050207941')
  assert.equal(book.pageCount, 200)
})

test('Say edition reading units cover the text without overlapping pages', () => {
  assert.equal(chapters.length, 14)
  assert.equal(chapters[0].startPage, 7)
  assert.equal(chapters.at(-1).endPage, 'end')
  assert.equal(new Set(chapters.map((chapter) => chapter.title)).size, chapters.length)

  for (const [index, chapter] of chapters.entries()) {
    assert.equal(chapter.id, index + 1)
    assert.ok(chapter.title.length > 0)
    assert.ok(chapter.summary.length > 0)
    if (index > 0) {
      assert.equal(chapter.startPage, chapters[index - 1].endPage + 1)
    }
    if (chapter.endPage !== 'end') {
      assert.ok(chapter.endPage >= chapter.startPage)
    }
  }
})
