# 12 — Local Setup (MYTH — Music Youth Team Hub)

Panduan menjalankan MYTH di komputer development.
Prasyarat: Node.js 22+, npm 10+, akses TiDB Cloud Serverless.

## 1. Install dependensi

```powershell
npm.cmd install
```

## 2. Environment variables

Salin contoh ke file lokal (jangan pernah commit file ini):

```powershell
Copy-Item .env.example .env.local
```

Isi minimum untuk development:

| Variable | Contoh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:4000/music_team_hub?sslaccept=strict` | Koneksi TiDB Cloud (TLS) |
| `AUTH_SECRET` | string acak panjang | Session auth |
| `APP_URL` | `http://localhost:3000` (prod: `https://myth-yg.vercel.app`) | Base URL aplikasi |

Catatan: file `.env` (bukan `.env.local`) juga dibaca tooling Prisma
pada Phase 0 ini. Keduanya di-ignore Git; yang boleh di-commit hanya
`.env.example` berisi placeholder.

## 3. Database (TiDB Cloud Serverless)

Buat cluster Serverless + database `music_team_hub` (jangan pakai `sys`),
samakan `DATABASE_URL`, lalu:

```powershell
npm.cmd run db:generate   # generate Prisma Client (tanpa koneksi DB)
npm.cmd run db:migrate    # butuh DB hidup; membuat tabel + migration (TCP+TLS)
```

Skrip `tsx` (bootstrap/seed) butuh dua flag env karena berjalan di luar
bundler Next — jalankan persis seperti di `package.json`:

```powershell
$env:NODE_OPTIONS="--conditions=react-server"; & npm.cmd run bootstrap:admin
$env:NODE_OPTIONS="--conditions=react-server"; & npm.cmd run seed:event
```

Skema awal (Phase 0) hanya memuat `User` + `Role` (`ADMIN|USER`).
Entitas lain (`Person`, `Event`, `Song`, …) menyusul per fase,
mengikuti `docs/05-DATABASE-SCHEMA.md`.

## 4. Perintah harian

```powershell
npm.cmd run dev        # dev server http://localhost:3000
npm.cmd run typecheck  # tsc --noEmit (wajib lolos)
npm.cmd run lint       # eslint (wajib bersih)
npm.cmd run test       # vitest unit tests
npm.cmd run build      # production build (Turbopack)
```

## 5. Status Phase 0 (terverifikasi 14 Okt 2026)

- [x] Next.js 16 (App Router) + TypeScript `strict` + Tailwind v4
- [x] `typecheck`, `lint`, `test` (4/4), `build` lolos
- [x] Prisma 7 + schema `User`, Prisma Client tergenerate
- [x] App shell: layout id, loading/error/not-found states
- [x] UI primitives: Button, Badge, Card, Alert, Skeleton, EmptyState
- [ ] Migration ke DB live (menunggu PostgreSQL tersedia)

## 6. Bootstrap admin pertama (Phase 1)

Butuh DB live (`db:migrate` sudah jalan). Isi di `.env.local`:

```powershell
BOOTSTRAP_ADMIN_USERNAME="nama-admin"
BOOTSTRAP_ADMIN_PASSWORD="password-sementara-min-12-karakter"
```

Lalu:

```powershell
npm.cmd run bootstrap:admin
```

Idempoten: bila username sudah ada, tidak ada perubahan dan password
tidak disentuh. Password di-hash Argon2id segera, tidak pernah di-log.
Setelah admin bisa login, hapus kedua variable dan ganti password
lewat halaman ganti password (wajib saat login pertama).

## 7. Status Phase 1 (terverifikasi 14 Okt 2026)
- [x] Login username/password, error generik, throttle 5x/10 mnt
- [x] Session opaque (token mentah hanya di cookie HttpOnly; DB simpan hash SHA-256)
- [x] Wajib ganti password saat `mustChangePassword`
- [x] Admin: buat akun (temp password tampil sekali), reset, aktif/nonaktif, ubah role/nama
- [x] Proteksi diri: tidak bisa nonaktifkan/ubah role sendiri
- [x] Rotasi sesi saat ganti password/reset; nonaktif mencabut sesi
- [x] Audit log: create/reset/change/activate/deactivate/role-change
- [x] `typecheck`, `lint` bersih, `test` 19/19, `build` lolos
- [ ] Uji E2E + security gate DB-live (butuh PostgreSQL; lihat `docs/10-TESTING-PLAN.md`)

## 8. Status Phase 2 (terverifikasi 14 Okt 2026)

- [x] Event brief: CRUD admin (`/event`, `/event/[id]`), baca untuk user (event berjalan terbaru non-CANCELLED)
- [x] Status konfirmasi Draft/Menunggu/Terkonfirmasi/Selesai/Dibatalkan selalu berlabel; non-final ditandai "belum final"
- [x] Personel: profil terpisah dari akun (`Person` ↔ `User?`), auto-dibuat saat akun dibuat, sync aktif/nama
- [x] Roster user: hanya yang aktif + terkonfirmasi, tanpa kontak/username
- [x] Skill/instrumen: master + assignment per personel + catatan kemampuan
- [x] Kontak personel & kontak PIC hanya untuk admin (allowlist server-side)
- [x] Audit: event create/update (termasuk field jadwal yang berubah), person create/update
- [x] `typecheck`, `lint` bersih, `test` 28/28, `build` lolos

## 9. Status Phase 3 (terverifikasi 14 Okt 2026)

- [x] Lagu: CRUD admin, status 9 tahap, publish/tarik, kunci/buka final (transaksional + audit)
- [x] Batch: CRUD, lifecycle Draft→Publish→Review→Selesai→Arsip yang divalidasi, tambah/keluarkan lagu
- [x] Assignment: personel aktif per lagu + skill (unik per pasangan), tercatat di audit
- [x] Versi aransemen: satu aktif per lagu (transaksi), riwayat dipertahankan, label jelas
- [x] Materi/Drive: satu aktif per (lagu, kategori), URL http(s) divalidasi server
- [x] Akses: user hanya membuka lagu yang dipublikasi + ditugaskan (cek server)
- [x] `typecheck`, `lint` bersih, `test` 38/38, `build` lolos (15 rute)

## 10. Seed data acara (butuh DB live)

Urutan saat PostgreSQL tersedia:

```powershell
npm.cmd run db:migrate       # buat semua tabel
npm.cmd run bootstrap:admin  # admin pertama (lihat §6)
npm.cmd run seed:event       # event + 9 personel + 19 lagu + 3 batch + materi + assignment
```

- Sumber: `prisma/seed-data.local.json` (**di-gitignore**, hanya di mesin ini — berisi nama asli).
- Script `prisma/seed-event.ts` idempoten: mencari by nama/judul dulu, aman di-run ulang.
- Isi: event PENDING_CONFIRMATION; Batch 1 Praise (6 lagu + 6 link YouTube + versi v01 aktif); Batch 2 Worship (4 lagu: Yesus Baik, Ku Hidup, Oceans, Joyful Gathering penutup — 2 slot TBD); Batch 3 ASM (5, ice breaking) + NNBT 15 & 20 (persembahan).
- Assignment: full band (5) + singers (3) di Batch 1–2; ASM/NNBT tanpa assignment band.
- Akun login TIDAK masuk seed — dibuat via `/people` (password sementara per user). Profil seed otomatis tertaut saat akun dibuat (cocok displayName).
- Lagu seed belum dipublikasi; MD mempublikasikan via UI setelah review.

## 11. Status Phase 4 (terverifikasi 14 Okt 2026)

- [x] Progres latihan: personel update progresnya sendiri per lagu (5 status + catatan), harus ditugaskan
- [x] Admin melihat semua progres per lagu, sorotan "perlu bantuan", koreksi tercatat di audit
- [x] Task: CRUD admin per event, PIC wajib personel aktif, relasi lagu satu event
- [x] Blocker wajib punya PIC + tindak lanjut (min. 10 karakter) — divalidasi server
- [x] PIC boleh update status task-nya sendiri (kecuali ke Blocked tanpa tindak lanjut)
- [x] Halaman `/tasks`: filter Semua/Aktif/Blocked/Terlambat/Selesai + kartu "perlu perhatian"; user hanya melihat task relevan
- [x] Task terkait tampil di detail lagu
- [x] `typecheck`, `lint` bersih, `test` 44/44, `build` lolos (16 rute)

## 12. Status Phase 5 (terverifikasi 14 Okt 2026)

- [x] Rehearsal: 5 tipe (monitoring, sectional, full, gladi, soundcheck) + status; lagu per sesi; agenda & catatan
- [x] Kehadiran: catat per personel per sesi (admin); personel melihat statusnya sendiri
- [x] Rehearsal batal/selesai/lalu tidak tampil di upcoming
- [x] Equipment: checklist per event + filter; Blocked wajib punya PIC; perubahan status penting diaudit
- [x] Decision log append-only (musikal/acara/teknis/personel) + relasi lagu/rehearsal, khusus admin
- [x] Task bisa terkait rehearsal (satu event, tervalidasi)
- [x] Dashboard MD: ringkasan klik-able (lagu, batch, overdue, blocked, teknis), daftar tindak lanjut, kesiapan lagu, rehearsal berikut, checklist teknis, update audit
- [x] Dashboard personel: rehearsal berikut, laguku + progres, task aktif, materi terbaru
- [x] `typecheck`, `lint` bersih, `test` 53/53, `build` lolos (20 rute)

## 13. Status TiDB + seed live (terverifikasi 14 Okt 2026)

- [x] Provider `mysql`, `@prisma/adapter-mariadb` (pool 5, TLS, timeout 30 dtk cold start)
- [x] `migrate dev` → 20 tabel app + `_prisma_migrations` di `music_team_hub`
- [x] `bootstrap:admin` → `aisaerang` (ADMIN, wajib ganti password); var bootstrap dihapus dari `.env`
- [x] `seed:event` → 1 event (21 Nov 2026, PENDING_CONFIRMATION), 9 personel, 7 skill, 17 lagu, 3 batch, 6 materi YouTube + v01 aktif, 80 assignment
- [x] Smoke auth live: login argon2 → session → logout OK
- [x] `typecheck`, `lint` bersih, `test` 53/53, `build` lolos (20 rute)
- [ ] 2 lagu Praise belum masuk seed ("Satukanlah Hati Kami", "Obor Pembangunan") — menunggu keputusan MD
- [x] Push GitHub → env Vercel (Production) → deploy `https://myth-yg.vercel.app` → smoke `/login` + `/` 200 OK (15 Okt 2026)

## 14. Status Lirik & Chord + Sort Manual (terverifikasi 15 Okt 2026)

- [x] Model `ChordChart` (ChordPro inline, basis C, satu aktif per lagu, transaksional + audit)
- [x] Transpose engine: mayor/minor/slash-chord/kres-mol, normalisasi nada asal → C saat simpan
- [x] Viewer latihan 3 mode (Lirik+Chord / Lirik saja / Chord saja) + geser nada ±½, reset ke C
- [x] Input admin: tempel ChordPro + nada asal → tersimpan sebagai C; riwayat + aktifkan/hapus
- [x] Contoh live: "Bapa Sentuh Hatiku" (G→C terverifikasi di DB)
- [x] Sort manual: tombol naik/turun urutan lagu di batch & rehearsal (sortOrder transaksional, hanya admin)
- [x] `typecheck`, `lint` bersih, `test` 82/82, `build` lolos (22 rute)
- [ ] Enrichment metadata menunggu persetujuan MD (2 lagu ambigu + Joyful Gathering + key TBD)

## 15. Status Setlist Final 21 Nov (terverifikasi 15 Okt 2026)

Rundown resmi: ice breaking → opening → praise → worship → persembahan → berkat → closing.
- [x] 14 lagu aktif dalam 4 batch manggung (Ice Breaking 4, Opening&Praise 4, Worship 3, Persembahan/Berkat/Closing 3)
- [x] 4 lagu diarsipkan (Yesus Baik, Ku Hidup, Oceans, NNBT 15): unpublish + unassign + DRAFT, histori utuh
- [x] Batch lama diganti (1 PUBLISHED diarsipkan, 2 DRAFT dihapus); sortOrder = urutan manggung
- [x] Assignment: band ke 14 lagu, singers ke 14 lagu (112 via seed)
- [x] Enrichment: artis/key/BPM/fungsi liturgi baru (Opening/Berkat/Closing/Ice breaking)
- [x] ChordPro: NDC (D→C), Sungguh Indah Robert&Lea (A→C), Bapa Sentuh (G→C) — basis C terverifikasi
- [x] ChordPro 4 ASM (versi MD: Mentega D, Satu Anak G, Bapa Abraham D, Kucinta D) + 4 link referensi — basis C terverifikasi; total 8 chart live
- [x] `typecheck`, `lint` bersih, `test` 82/82, `build` lolos (22 rute)
- [x] Joyful Gathering: IT'S GEHC / Benzics Records, key F + ChordPro lengkap (basis C) — Verse 2 mirror Verse 1, MD rapikan di portal
- [x] "Satukanlah Hati Kami" diabaikan sesuai arahan MD (tidak di-seed)
- [ ] Key Ku Tak Pandang + NNBT 20 TBD — MD isi via UI

## 16. Filter Arsip + Hapus Batch (terverifikasi 15 Okt 2026)

- [x] Filter batch: Aktif (default, sembunyikan arsip) / Semua / Arsip
- [x] Hapus batch kosong permanen (admin, konfirmasi 2 langkah, audit `BATCH_DELETED`, tolak bila berisi lagu)
- [x] "Batch 1 — Praise" (arsip, 0 lagu) dihapus dari DB → tinggal 4 batch aktif
- [x] `typecheck`, `lint` bersih, `test` 82/82, `build` lolos, push + deploy produksi Ready
