# 03 — User Flow

## Login
1. Isi username/password.
2. Server memvalidasi kredensial dan status akun.
3. Jika password sementara, user wajib ke halaman change-password.
4. Setelah berhasil, user diarahkan ke dashboard sesuai role.
5. Error login generik, tidak mengungkap username valid/tidak.

## Admin membuat akun
1. Buka People & Access → Tambah personel.
2. Isi display name, username, role, skill/instrumen, asal jemaat opsional.
3. Sistem menghasilkan temporary password kuat atau admin menjalankan reset aman.
4. Simpan hash saja; `mustChangePassword=true`.
5. Tampilkan password sementara satu kali bila sistem yang membuatnya.
6. Admin mengirimkan melalui kanal privat, bukan grup.
7. User login dan mengganti password.

## Observer/pemantau
1. Admin membuat akun `OBSERVER` (Personel & Akses), kirim link undangan via japri.
2. Observer login, ganti password, membuka dashboard pantau (lagu publish saja).
3. Observer memantau progres semua personel, batch, rehearsal, dan equipment.
4. Observer mengirim usulan per lagu/part (judul `[Usulan - Part] …`, min. 10 karakter).
5. MD mereview: melengkapi PIC/prioritas/tenggat, menindaklanjuti atau menutup usulan.

## Event brief
1. Admin isi nama, tanggal/jam, lokasi, tema, durasi, PIC, link rundown/liturgi.
2. Tandai draft/pending/confirmed.
3. Dashboard menonjolkan informasi yang belum terkonfirmasi.
4. Perubahan keputusan dicatat.

## Menyiapkan lagu
1. Admin membuat lagu dan menautkan original.
2. MD mengisi key/BPM/groove/struktur/cue ketika sudah ditentukan.
3. MD menyiapkan dan mereview arrangement reference.
4. Admin menautkan part guide dan versi aktif.
5. Lagu dimasukkan batch dan dipublikasikan.
6. Personel melihat lagu sesuai assignment.
7. Personel berlatih lalu update status.
8. MD melihat progres, komentar, dan blocker.
9. Rehearsal menghasilkan catatan/task.
10. Versi final dikunci setelah review.

## Batch release
1. Pilih sekitar 2 lagu yang siap dipelajari.
2. Tetapkan release date dan target review.
3. Pastikan original reference dan arahan awal tersedia.
4. Publish batch.
5. User belajar mandiri dan update status.
6. Online monitoring menyelesaikan pertanyaan.
7. MD menentukan lagu siap dibawa ke onsite rehearsal atau perlu revisi.

## Online monitoring
1. Admin buat sesi, link, agenda, dan lagu.
2. User update status sebelum sesi.
3. MD catat isu key/tempo/form/part/cue.
4. Isu menjadi task dengan PIC dan due date.
5. Status ditindaklanjuti di dashboard.

## Onsite/full rehearsal
1. Personel melihat jadwal, lokasi, agenda, dan lagu.
2. Catat kehadiran.
3. MD mengecek timing, groove, dinamika, transisi, cue, ending, chemistry.
4. Catat keputusan dan action items.
5. Update readiness lagu.
6. Full rehearsal menjalankan set dalam urutan liturgi final.

## Gladi bersih/hari-H
1. Pastikan rundown final dari panitia.
2. Cek alat, routing, click/cue/backing, power, monitor, dan backup.
3. Soundcheck dengan sistem yang akan dipakai.
4. Lock versi live; perubahan mendadak dicatat.
5. Setelah acara, simpan evaluasi dan tindak lanjut.

## Personel keluar tim
Admin menonaktifkan akun/assignment aktif; histori progres, komentar, dan attendance tetap dipertahankan.
