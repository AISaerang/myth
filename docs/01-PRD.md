# 01 — Product Requirements Document

## Goal
Membuat hub operasional untuk persiapan tim musik dari pembagian lagu hingga hari-H, tanpa menggantikan peran panitia.

## Personas
**Admin/MD:** mengelola event brief, personel, lagu, batch, materi, progres semua personel, task, rehearsal, equipment, keputusan, dan akun.

**User/personel:** melihat lagu yang ditugaskan, materi aktif, task sendiri, jadwal rehearsal, memperbarui progres latihan, dan mengirim usulan.

**Observer/pemantau:** melihat semua lagu publish, progres semua personel di lagu publish, task/batch/rehearsal/equipment terkait, serta mengirim usulan (termasuk teknis per part) yang dimoderasi MD. Tidak bisa mengubah data musikal maupun akun.

**Panitia/PIC:** pemilik keputusan acara keseluruhan. Tidak perlu role aplikasi di MVP; role baca saja dapat ditambahkan bila dibutuhkan.

## Functional requirements
### Authentication
- Login username/password, no public sign-up.
- Admin membuat dan menonaktifkan akun.
- Temporary password memaksa perubahan saat login pertama.
- Admin dapat reset, bukan melihat password lama.
- Password hanya disimpan sebagai hash.

### Event brief
Nama acara, tanggal/jam, lokasi, tema, target durasi, status konfirmasi, PIC panitia, link liturgi/rundown, notes. Data belum final diberi label Draft/Pending confirmation.

### Personnel
Nama, username, asal jemaat opsional, skill/instrumen, status konfirmasi, assignment lagu, akun aktif/nonaktif. Kontak pribadi dibatasi.

### Songs and batches
Lagu menyimpan judul, fungsi liturgi, original reference, key, BPM, time signature, durasi, musical notes, status, assignment, batch, materials, version history. Batch mengelompokkan lagu (misalnya sekitar dua lagu per rilis).

Status lagu: `DRAFT`, `SOURCE_SHARED`, `ARRANGEMENT_IN_PROGRESS`, `REFERENCE_READY`, `PRACTICING`, `NEEDS_REVIEW`, `READY_FOR_REHEARSAL`, `REHEARSAL_READY`, `FINAL_LOCKED`.

### Materials
Kategori: Original, Arrangement Reference, Part Guide, Chord Chart, Lyrics, Click/Cue, Sequencer, Rehearsal Recording, Final Asset, Other. Setiap materi memiliki URL, label versi, ringkasan perubahan, dan status aktif.

### Practice progress
Status: `NOT_STARTED`, `LEARNING`, `TRIED_WITH_REFERENCE`, `NEEDS_HELP`, `READY_FOR_REHEARSAL`. User hanya mengubah progres sendiri; admin melihat semua.

### Tasks/issues
Judul, deskripsi, PIC, due date, prioritas, status, relasi lagu/rehearsal/equipment. Status: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`. Blocker harus punya owner dan tindak lanjut. Usulan dari USER/OBSERVER dibuat sebagai task `TODO` tanpa PIC (prioritas `MEDIUM`, deskripsi min. 10 karakter, lagu terkait wajib publish) dan dimoderasi MD; pemilik boleh revisi selama masih `TODO`.

### Rehearsals
Online monitoring, onsite sectional, full rehearsal, technical rehearsal/gladi bersih, event-day soundcheck. Simpan waktu, lokasi/link, agenda, lagu, attendance, notes, decisions, action items.

### Equipment readiness
Item, kategori, quantity, pemilik/sumber, PIC, due date, status, notes. Status: `NOT_CHECKED`, `NEEDED`, `CONFIRMED`, `TESTED`, `BLOCKED`, `NOT_APPLICABLE`.

### Dashboard
Admin: status lagu/batch, blocker, overdue tasks, rehearsal berikutnya, technical readiness, update terbaru. User: lagu dan task saya, materi terbaru, rehearsal berikutnya.

### Drive
MVP menggunakan tautan manual. API integration ditunda sampai dibutuhkan.

### Audit
Catat perubahan akun/role, aktivasi versi, final lock, jadwal, dan item teknis penting. Jangan pernah memasukkan secret ke audit metadata.

## Non-functional requirements
Responsive, server-side authorization, validasi server, password hashing, secrets in env, timezone `Asia/Jakarta`, no media blobs in DB, error messages aman, data pribadi dibatasi.

## Acceptance criteria
1. Admin membuat user; user mengganti password sementara.
2. User tidak bisa membuka/menjalankan fungsi admin.
3. Admin membuat event, lagu, batch, materi, task, rehearsal, dan equipment.
4. User melihat materi aktif dan memperbarui progres sendiri.
5. Admin melihat progres semua personel dan blocker.
6. Drive links mengikuti permission Google Drive.
7. Final version jelas dan histori tidak hilang.
8. Semua critical flows dites.
