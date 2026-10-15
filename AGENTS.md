# OpenCode Agent Instructions

Sebelum coding, baca seluruh dokumen di `docs/`. Periksa repo dan konvensi yang sudah ada sebelum mengubah stack.

## Aturan utama
- Bangun bertahap; jangan mencoba mengimplementasikan seluruh aplikasi sekaligus.
- Gunakan TypeScript strict, Next.js App Router, Prisma 7, TiDB Cloud Serverless (MySQL-compatible), validasi server-side (misalnya Zod), dan session auth yang aman.
- Role `ADMIN` dan `USER`, plus `OBSERVER` (label UI "Pantau", read-only publish-only + pengusul via task TODO yang dimoderasi MD); public registration tidak ada.
- MD bertanggung jawab atas arah musikal, aransemen, kesiapan lagu, dan rehearsal musikal. Panitia/PIC wilayah tetap pemilik konsep acara, rundown final, durasi, dan koordinasi non-musikal.
- Google Drive menyimpan file besar; aplikasi menyimpan metadata/link.
- Semua mutasi harus memiliki validasi dan authorization di server. Menyembunyikan tombol bukan authorization.
- Password harus di-hash Argon2id/bcrypt; jangan simpan atau log plaintext.
- Jangan hardcode kredensial, token, OAuth secret, atau password produksi. Bootstrap admin memakai environment variables/command aman dan wajib ganti password pertama.
- Gunakan audit log untuk perubahan sensitif, empty/loading/error states, dan layout mobile-first.
- Update dokumentasi dan tests bila behavior/schema berubah.

## Urutan implementasi
1. App shell + database.
2. Login, session, RBAC, first-login password change.
3. Event brief + personnel/accounts.
4. Songs, batches, assignments, arrangement versions, Drive links.
5. Practice progress, tasks, blockers.
6. Rehearsals, attendance, equipment.
7. Dashboard readiness, audit log, responsive QA, deployment.

## Definition of done
Fitur tervalidasi di server, akses dites, UI memiliki state yang layak, tests atau langkah QA tersedia, dokumentasi mutakhir, tidak ada secret di Git.
