# Presentasi Personel — Music Youth Team Hub (15–20 mnt)

> Audiens: personel pemain/singer (`USER`) saja. Non-admin, non-observer.
> Format: slide foto + highlight + live demo di `https://myth-yg.vercel.app`.
> Aturan tiap slide: 1 foto, 1–2 kotak highlight, 1 kalimat besar, sisanya diucapkan.

## 0. Persiapan (siang sebelum presentasi)

- [ ] Siapkan 2 akun USER live: 1 band (mis. gitar/keyboard) + 1 singer, keduanya sudah ada assignment di lagu publish.
- [ ] Pastikan 1 lagu publish punya materi aktif + ChordPro (saran: "Bapa Sentuh Hatiku" G→C, atau NDC, atau Sungguh Indah).
- [ ] Pastikan ada 1 rehearsal upcoming (jadwal live: monitoring 21 Okt 19:00, sectional 1 Nov 10:00, full 8 Nov 10:00, gladi 15 Nov 10:00, soundcheck 21 Nov 07:00 WIB).
- [ ] Buka prod di laptop + HP (tampilkan 1x versi mobile biar percaya mobile-first).
- [ ] Siapkan PDF backup / hotspot bila internet mati.
- [ ] Latihan klik urutan §3 sekali tanpa bicara (±2 mnt).

## 1. Daftar screenshot (ambil manual dari browser)

Ambil via `Win+Shift+S`, mobile via DevTools `Ctrl+Shift+M` (390px). Highlight belakangan di PPT/Slides (kotak + panah).

| File | Rute | Viewport | Highlight |
|---|---|---|---|
| `01-dashboard-user.png` | `/dashboard` login USER | desktop 1440px | Kotak di `Laguku`, `Task Aktif`, `Rehearsal Berikutnya` |
| `02-masuk.png` | `/masuk` | desktop | Kolom username/password, tanpa tombol Daftar |
| `03-songs-list.png` | `/songs` login USER | mobile 390px | Hanya lagu publish + ditugaskan yang tampil |
| `04-song-detail.png` | `/songs/[id]` 1 lagu publish | desktop | 3 kotak: `Key/BPM/fungsi liturgi`, badge `Materi Aktif` hijau, `Version history v01` |
| `05-chord-viewer.png` | `/songs/[id]` bagian chord | desktop | Mode `Lirik+Chord / Lirik saja / Chord saja`, tombol `±` transpose, `reset ke C` |
| `06-progress.png` | `/songs/[id]` bagian progres | desktop | Dropdown 5 status (lihat §2 slide 5) |
| `07-tasks.png` | `/tasks` filter `Aktif` | desktop | Filter `Semua/Aktif/Blocked/Terlambat/Selesai`, 1 kartu usulan `[Usulan - Part]` |
| `08-rehearsal.png` | `/rehearsals` + 1 detail `/rehearsals/[id]` | mobile 390px | Judul + jam WIB + jumlah lagu, agenda, status kehadiranmu |

Prod sudah berisi data live: 14 lagu aktif dalam 4 batch manggung (urutan manggung = sortOrder), 8 chord chart basis C, 5 rehearsal, 5 task awal. Tidak perlu seed ulang.

## 2. Slide + naskah (7 slide, ±15 mnt)

### Slide 1 — Kamu dapat apa? (1 mnt)
- Visual: `01-dashboard-user.png`.
- 1 kalimat: "Satu link untuk tahu lagu, tugas, dan jadwalmu."
- Ucapkan:
  - Ibadah Pemuda Wilayah 21 Nov 2026, personel lintas jemaat, 14 lagu dalam 4 batch manggung.
  - Masalah lama: materi nyebar di chat, versi terbaru tidak jelas, siapa sudah latihan tidak terpantau.
  - Solusi: home harianmu = `/dashboard` (Laguku, Task Aktif, Rehearsal Berikutnya, Materi Terbaru).
- Demo: tidak perlu klik.

### Slide 2 — Masuk pertama kali (2 mnt)
- Visual: `02-masuk.png`.
- 1 kalimat: "Akun dibuatkan, kamu tinggal login + ganti password."
- Ucapkan:
  - Tidak ada tombol Daftar. Akun dibuat MD via `/people`, password sementara wajib diganti saat login pertama.
  - Link undangan `/masuk/[token]`: sekali pakai, kedaluwarsa 7 hari, redeem via POST (preview chat tidak menghanguskan).
  - Keamanan 1 kalimat: password di-hash Argon2, session HttpOnly, error login generik.
- Demo live: login sebagai USER → ganti password → mendarat di `/dashboard`.

### Slide 3 — Lagu Saya (4 mnt, INTI)
- Visual: `03-songs-list.png` + `04-song-detail.png`.
- 1 kalimat: "Patokanmu = Materi Aktif, bukan YouTube lama."
- Ucapkan:
  - `/songs` versi USER hanya menampilkan lagu publish + ditugaskan kepadamu. Lagu DRAFT / tidak ditugaskan = tidak tampil, itu normal.
  - Detail lagu: overview (judul, fungsi liturgi, key, BPM), arahan MD (groove, intro, struktur, ending, transisi/cue), personel/instrumen yang ditugaskan, materi + versi aktif, riwayat versi.
  - Status lagu 9 tahap: `DRAFT → SOURCE_SHARED → ARRANGEMENT_IN_PROGRESS → REFERENCE_READY → PRACTICING → NEEDS_REVIEW → READY_FOR_REHEARSAL → REHEARSAL_READY → FINAL_LOCKED`. Kamu hidup di tengahnya (latihan → siap rehearsal).
- Demo live: buka 1 lagu → scroll overview → musical direction → materials → version history.

### Slide 4 — Chord & Lirik (2 mnt)
- Visual: `05-chord-viewer.png`.
- 1 kalimat: "Chord tersimpan basis C, tinggal geser sesuai suaramu."
- Ucapkan:
  - Viewer 3 mode: Lirik+Chord / Lirik saja / Chord saja. Tombol `±` geser nada, `reset ke C`.
  - Chord disimpan dinormalisasi ke C saat admin menempel ChordPro + nada asal; transposemu hanya untuk latihan — key manggung tetap ikut MD.
- Demo live: ganti mode + geser 1 nada di depan mereka.

### Slide 5 — Update progresmu (3 mnt, INTI)
- Visual: `06-progress.png`.
- 1 kalimat: "Jujur update progresmu — itu radar MD."
- Ucapkan 5 pilihan (`06-progress.png` + `src/app/(app)/songs/[id]`):
  1. Belum mulai
  2. Sedang dipelajari
  3. Sudah mencoba dengan referensi
  4. Perlu bantuan ← pilih ini + tulis kendala bila mentok
  5. Siap untuk rehearsal
  - Hanya bisa ubah milikmu sendiri (server menolak bila ubah punya orang: `canUpdateProgress`). Timestamp otomatis, catatan opsional.
- Demo live: ubah statusmu 1x di depan mereka.

### Slide 6 — Task, Usulan & Rehearsal (2,5 mnt)
- Visual: `07-tasks.png` + `08-rehearsal.png`.
- 1 kalimat: "Mentok? Kirim usulan. Ada jadwal? Datang."
- Ucapkan:
  - `/tasks` versi USER hanya menampilkan task relevan (milikmu / lagumu). Filter: Semua/Aktif/Blocked/Terlambat/Selesai.
  - Usulan: judul `[Usulan - Part] …`, deskripsi min. 10 karakter, lagu wajib publish, tanpa PIC — MD yang melengkapi PIC/prioritas/tenggat. Kamu boleh revisi usulanmu selama masih `TODO`.
  - PIC boleh update status task-nya sendiri (kecuali ke Blocked tanpa tindak lanjut min. 10 karakter).
  - `/rehearsals` versi USER: hanya jadwal upcoming (judul, jam WIB `Asia/Jakarta`, jumlah lagu). Detail: agenda, lagu, status kehadiranmu (`EXPECTED/PRESENT/LATE/ABSENT/EXCUSED`).
  - `/equipment`: kamu hanya melihat (cek siapa PIC + status `NEEDED/CONFIRMED/TESTED/BLOCKED` bila terkait bagianmu).
  - `/team`: roster terbatas (nama + skill), tanpa kontak/username.
- Demo live: buat 1 usulan contoh → tunjukkan jadwal rehearsal → buka 1 detail rehearsal.

### Slide 7 — Yang perlu kamu lakukan (1 mnt)
- Tanpa foto, 4 kotak besar:
  1. Login + ganti password hari ini.
  2. Buka Lagu Saya, pelajari Materi Aktif.
  3. Update progres tiap selesai latihan.
  4. Mentok → pilih `Perlu bantuan` / kirim Usulan, jangan diam di chat.
- Ucapkan yang TIDAK kamu lihat (biar tidak bingung): tidak ada menu Personel & Akses, Broadcast, Keputusan, Settings; tidak ada lagu DRAFT; tidak ada kontak personel lain.

## 3. Skrip live klik-per-klik (±10 klik, 8 mnt)

1. `/masuk` → login USER (30 dtk).
2. `/dashboard` → tunjuk Laguku + Rehearsal Berikutnya (1 mnt).
3. `/songs` → tunjuk hanya lagu publish + assignmentmu (30 dtk).
4. `/songs/[id]` → overview + arahan MD (1,5 mnt).
5. Chord viewer → ganti mode + transpose (1 mnt).
6. Update progres → pilih status + simpan (1 mnt).
7. `/tasks?filter=active` → buat usulan `[Usulan - Gitar] …` (1 mnt).
8. `/rehearsals` → buka 1 detail → agenda + lagu (1 mnt).
9. `/equipment` → tunjuk status + PIC (30 dtk).
10. `/team` → tunjuk roster terbatas (30 dtk).

## 4. FAQ personel (jawab 1 kalimat)

- "Kok laguku sedikit?" → Yang tampil hanya publish + ditugaskan kepadamu; sisanya masih DRAFT/MD review.
- "Boleh pakai YouTube lain?" → Boleh untuk belajar, tapi yang dinilai MD = Materi Aktif.
- "Salah chord?" → Kirim usulan `[Usulan - Chord]`, tulis lagu + bagian + yang benar.
- "Ganti key?" → Jangan ganti sendiri; tulis usulan, MD yang putuskan setelah cek vokal.
- "Tidak bisa datang rehearsal?" → Bilang PIC + catat di kehadiran via MD; jangan hanya absen diam.
- "Lupa password?" → Minta reset ke MD/admin, cek kanal privat (bukan grup).

## 5. Yang sengaja TIDAK dibahas (admin/observer)

`/people` (buat/reset/nonaktifkan akun), `/broadcast` (teks WA onboarding), `/decisions` + audit log, dashboard MD (needs attention/overdue/blocker agregat), mode Pantau read-only publish. Sebut 1 kalimat bila ditanya: "itu urusan MD/admin."
