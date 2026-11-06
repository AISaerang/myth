# 04 — UI/UX Design

## Principles
Mobile-first, ringkas, Bahasa Indonesia konsisten, status memakai teks + warna, tidak mengandalkan warna saja, minim tabel lebar, accessible forms, loading/empty/error states.

## Navigation
Admin: Dashboard, Event Brief, Lagu, Batch, Personel & Akses, Tasks/Blockers, Rehearsal, Equipment & Teknis, Decisions/Notes, Settings.  
User: Beranda, Lagu Saya, Task Saya, Rehearsal, Materi/Drive, Profil & Password.  
Observer (Pantau): Dashboard pantau, Event Brief, Lagu (semua publish), Batch (read-only), Tasks & Usulan, Rehearsal, Equipment & Teknis, Profil & Password. Tanpa Personel & Akses, Broadcast, Keputusan, dan semua form admin.

## Login page
Brand, username, password, tombol Masuk, error generik, instruksi hubungi admin. Tidak ada sign-up. Jangan simpan password di localStorage.

## Admin dashboard
- Header nama event, tanggal/status konfirmasi, lokasi.
- Summary: total lagu, lagu perlu perhatian, progres batch, overdue task, blocker teknis, rehearsal berikutnya.
- Needs attention list.
- Song readiness.
- Upcoming rehearsals.
- Latest updates.
- Technical checklist.

Angka dashboard harus dapat diklik menuju data yang perlu ditindaklanjuti.

## User dashboard
- Event dan rehearsal berikutnya.
- Lagu yang ditugaskan.
- Task aktif.
- Materi terbaru.
- Tombol cepat Update progres.
Jangan tampilkan kontak pribadi personel lain.

## Song list/detail
Song list menampilkan judul, fungsi liturgi, key, BPM, batch, status, penugasan, updated date. Mobile memakai cards.

Song detail:
1. Overview.
2. Musical direction: groove, dynamics, intro, structure, ending, transitions.
3. Assigned personnel/instruments.
4. Materials and active version.
5. Practice progress.
6. Catatan Part: daftar lengkap dengan filter status/bagian/POV penulis; catatan section umum tampil di sisi lirik pada desktop dan ditumpuk setelah chart di mobile. Catatan bertarget tampil sebagai callout ringkas di atas section. Composer berada di disclosure per-section agar chart tetap ringkas; semua catatan juga tersedia dalam daftar, dengan balasan, edit/hapus sesuai izin, dan status selesai.
7. Version history.
8. Tasks/issues.
9. Decision notes.

Materi aktif harus mudah dikenali; versi lama ditandai superseded/archive.

Chord viewer: chord bertumpuk sejajar di atas suku kata lirik (font monospace), label seksi ditandai, baris panjang scroll horizontal di mobile. Mode Lirik+Chord / Lirik saja / Chord saja, dengan transpose ±½ dan reset ke basis C. Admin dapat mengedit chart aktif langsung (konten basis C) atau menambah versi baru dari nada asal lain.

Baris not angka — biasanya di bagian Intro — dirender sebagai notasi CSS (bukan teks mentah dan bukan font khusus) di preview master bagian, tampilan aransemen, chart lagu, dan halaman latihan. Angka 1–7 dan 0 seukuran baris lirik (`text-sm`, `leading-6`); garis birama memakai karakter `|` setinggi angka. Oktaf atas `'` menjadi titik di atas angka; oktaf bawah `,` atau titik di depan (`.6`, `..6`) menjadi titik di bawah — beberapa tanda berarti beberapa titik. `#4` digambar dengan garis `/` menembus angka (naik ke kanan), `b7` dengan garis `\`. `[5 6]` satu garis horizontal di atas kelompok, `[[5 6 5 6]]` dua garis, `(5 6)` busur di atas. `/` dan `//` di belakang nada tetap garis bawah; `-` perpanjangan. Kunci tetap di kolom editor karena tanda yang dilipat tidak menggeser kolom. Baris nada sedikit lebih tinggi dari satu baris lirik agar titik dan garis tidak terpotong di ponsel. Transpose menggeser kunci saja; angka (do = 1) tidak berubah. Bila chart berisi not angka, rumus nada (cth. `C + 2 = D`) tampil sekali di kontrol transpose chart itu, bukan di tiap bagian dan bukan di kartu intro terpisah. Intro diedit sebagai bagian master bertipe Intro dan heading-nya tampil "Intro". Chart lama tanpa `{Intro}` yang isinya hanya not angka tidak lagi jatuh ke label "Bagian n" (yang CSS `uppercase` menampilkan sebagai BAGIAN 1).

Chord editor: semua form edit chord (bagian di `/songs/[id]/chart`, chart aktif, dan tambah chart baru) memakai editor berformat "kunci di atas lirik" — tiap baris lirik punya baris chord di atasnya, posisi digeser pakai spasi, sehingga editing mirip tampilan final (termasuk chord tepat di pemisah suku kata, cth. `ha-[D]ti-ku`). Tempel dari internet dapat dalam format ini maupun ChordPro `[bracket]` dan dideteksi otomatis. Toggle "Teks ChordPro" tersedia untuk editing sintaks mentah. Nilai yang dikirim ke server tetap ChordPro — konversi over-under ⇄ ChordPro terjadi di klien; format tersimpan di database tidak berubah (basis C).

Aransemen lagu: halaman `/songs/[id]/chart` berisi master bagian (Verse/Chorus/Bridge/Intro/Interlude dan lainnya) serta pembangun aransemen per lagu. Editor bagian memakai editor "kunci di atas lirik" + preview akhir real-time; urutan bagian bisa diulang, dipindah, dihapus, dan diberi label tampil. Satu aransemen aktif per lagu. Chart lama tetap tersedia sebagai fallback/riwayat dan bisa diimpor otomatis untuk direview admin. Tampilan publik memakai aransemen aktif, lalu chart lama aktif, lalu empty state.

## Practice status
Pilihan: Belum mulai; Sedang dipelajari; Sudah mencoba dengan referensi; Perlu bantuan; Siap untuk rehearsal. Catatan opsional, timestamp otomatis. User hanya mengubah status sendiri.

## Batch page
Nama, release date, target review, lagu, progress, jumlah personel yang update, blocker, Publish/Unpublish, Mark reviewed.

## Rehearsal page
Tipe, tanggal/jam, lokasi/link, agenda, lagu, attendance, catatan, keputusan, action items. Status: scheduled/completed/cancelled/rescheduled.

## Equipment page
Checklist mobile: item, kategori, PIC, sumber/pemilik, status, due date, notes. Filter belum dicek, butuh konfirmasi, blocked, tested.

## People & Access
Tambah/edit personel, username, role, skill, assignment, deactivate, reset password. Password sementara hanya terlihat sekali; admin tidak dapat melihat password lama.

## Design system
Gunakan Button, Input, Select, Badge, Card, Dialog, Tabs, Table, Alert, Toast, Skeleton, Empty State. Status: green ready/done; amber in progress/review; red blocked/overdue; gray draft/not checked. Pastikan kontras baik, focus state terlihat, target sentuh cukup besar.

## Responsive/accessibility
Label input, keyboard navigation, semantik HTML, focus state, tidak wajib drag-and-drop, uji mobile/tablet/desktop. Error harus membantu tanpa menampilkan stack trace.
