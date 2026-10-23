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
6. Version history.
7. Tasks/issues.
8. Decision notes.

Materi aktif harus mudah dikenali; versi lama ditandai superseded/archive.

Chord viewer: chord bertumpuk sejajar di atas suku kata lirik (font monospace), label seksi ditandai, baris panjang scroll horizontal di mobile. Mode Lirik+Chord / Lirik saja / Chord saja, dengan transpose ±½ dan reset ke basis C. Admin dapat mengedit chart aktif langsung (konten basis C) atau menambah versi baru dari nada asal lain.

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
