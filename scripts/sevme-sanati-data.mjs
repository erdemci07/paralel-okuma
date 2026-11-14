// Say Yayınları, Işıtan Gündüz çevirisi, 200 sayfa (ISBN 9786050207941).
// Okuma birimleri kitabın içindekilerindeki başlık ve sayfalara göre ayrılmıştır.
// Üst başlık "Sevgi Kuramı"nın alt bölümleri çakışma olmadan ayrı izlenir.
export const bookId = 'sevme-sanati'

export const book = {
  title: 'Sevme Sanatı',
  author: 'Erich Fromm',
  authors: ['Erich Fromm'],
  publisher: 'Say Yayınları',
  isbn: '9786050207941',
  cover: '/sevme-sanati-cover.webp',
  coverUrl: '/sevme-sanati-cover.webp',
  description: 'Bir Eylem Olarak Sevmek. Sevginin kuramını, farklı biçimlerini ve günlük hayatta uygulanmasını inceleyen eser.',
  chapterCount: 14,
  pageCount: 200,
  externalProvider: 'manual_seed',
  externalId: bookId,
}

// title, first page, last page, independent chapter description
const ranges = [
  ['Giriş (Peter D. Kramer)', 7, 14, 'Kitabın yaklaşımına ve önemine giriş.'],
  ['Önsöz', 15, 18, 'Sevme sanatının konusuna hazırlık.'],
  ['Sevmek Bir Sanat mıdır?', 19, 26, 'Sevmeyi öğrenilmesi ve uygulanması gereken bir sanat olarak ele alma.'],
  ['Sevgi Kuramı: İnsanın Varoluş Sorununun Yanıtı', 27, 58, 'Ayrılık, birleşme isteği ve olgun sevginin temel nitelikleri.'],
  ['Anne Babayla Çocuk Arasındaki Sevgi', 59, 65, 'Anne, baba ve çocuğun sevgi ilişkilerinin gelişimi.'],
  ['Kardeşlik Sevgisi', 66, 68, 'İnsanlara yönelik ortaklık ve dayanışma temelli sevgi.'],
  ['Anne Sevgisi', 69, 71, 'Karşılıksız ilgi, bakım ve büyümeyi destekleyen sevgi.'],
  ['Cinsel Sevgi', 72, 76, 'Yakınlık, bağlılık ve birleşme arzusunun farklı yönleri.'],
  ['Kendini Sevme', 77, 82, 'Kendine saygı ile bencilliğin ayrımı.'],
  ['Tanrı Sevgisi', 83, 100, 'Dinsel geleneklerde ve düşüncede sevgi anlayışı.'],
  ['Sevgi ve Çağdaş Batı Toplumunda Sevginin Yozlaştırılması', 101, 124, 'Modern toplumun ilişkiler ve sevgi üzerindeki etkileri.'],
  ['Sevginin Uygulanması', 125, 150, 'Sevmeyi geliştirmek için disiplin, yoğunlaşma ve sabır.'],
  ['Sonsöz: Görüşleri, Röportajları ve Daha Fazlası', 151, 188, 'Yazar, eser ve düşüncelerine ilişkin ek değerlendirmeler.'],
  ['Ek Okuma', 189, 'end', 'İlgili kaynaklar ve ileri okumalar.'],
]

export const chapters = ranges.map(([title, startPage, endPage, summary], index) => ({
  id: index + 1,
  title,
  startPage,
  endPage,
  summary,
}))
