# QA layout polish (round 3)

Artefak QA untuk PR `fix/layout-polish-3`. Diambil dari dev server lokal
(Next.js 16.4.6) memakai sesi ADMIN sementara; tidak ada perubahan data.

| File | Yang dibuktikan |
| --- | --- |
| `song-375.png` | Halaman lagu di 375px: sheet (not angka/chord) tampil lebih dulu, Overview/Medley menyusul; tidak ada geser horizontal. |
| `song-1280.png` | Halaman lagu di 1280px: header dua baris, seluruh tautan nav terlihat, chart kiri + ringkasan kanan. |
| `dashboard-375.png` | Dashboard di 375px: header sticky, tombol drawer, tidak ada geser horizontal. |
| `dashboard-1280.png` | Dashboard di 1280px: nav utama + menu "Lainnya" tanpa strip scroll. |

Pengukuran pendukung (60 kombinasi halaman × lebar 360/375/768/1280/1920):
`document.documentElement.scrollWidth === clientWidth`, `header.top === 0`,
`header.left === 0`, `window.scrollX === 0`, dan baris nav tidak overflow.
