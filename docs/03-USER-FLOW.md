# 03 — User Flow

## Login
1. Isi username/password.
2. Server memvalidasi kredensial dan status akun.
3. Jika password sementara, user wajib ke halaman change-password.
4. Setelah berhasil, user diarahkan ke dashboard sesuai role.
5. Error login generik, tidak mengungkap username valid/tidak.

## Membuka tautan event (`/e/{token}`)
1. Seseorang membuka tautan yang dibagikan admin/event admin. GET awal hanya mengecek token; nama event ditampilkan bila tautan masih aktif, dan kuota belum terpakai.
2. Jika sudah login dengan password final, server mengecek tautan, menambahkan `EventMembership` `MEMBER` bila belum ada, mencatat audit, mengaktifkan event, lalu mengarahkan ke `/event/{id}`. Tidak ada `SongAssignment` otomatis.
3. Jika password masih sementara, user diarahkan ke ganti password dengan `callbackUrl=/e/{token}`, lalu kembali ke tautan setelah login ulang.
4. Jika belum login, halaman menawarkan "Masuk dengan akun" (membawa `callbackUrl` yang hanya boleh berupa `/e/{token}`) atau "Lanjut sebagai Tamu".
5. Tamu mengisi nama tampilan opsional; server membuat sesi tamu, menaruh token mentah di cookie HttpOnly `myth_share_guest`, memakai satu kuota, lalu membuka shell `/e/{token}/tamu`.
6. Shell tamu hanya memuat ringkasan event, setlist/lirik/chord yang diizinkan, rehearsal, dan equipment. Pada halaman lagu tamu, panah prev/next dan kembali ke daftar mengikuti batch yang dipilih dan tetap berada di namespace `/e/{token}/tamu`; daftar lagu memiliki anchor batch untuk kembali ke posisi lagu yang benar.
7. Tamu dapat memilih empat tampilan chart—Chord saja, Chord + lirik, Chord + notasi, atau Detail—tanpa mengubah nada atau data chart.
8. Revoke, kedaluwarsa, event ditutup, atau event dibatalkan langsung menggagalkan permintaan berikutnya.
9. Tombol "Keluar dari mode tamu" menghapus cookie dan kembali ke halaman tautan; login dengan akun mengambil alih sesi tamu.

## Admin membuat akun
1. Buka People & Access → Tambah personel.
2. Isi display name, username, role, skill/instrumen, asal jemaat opsional.
3. Field password sementara sudah terisi `DEFAULT_TEMP_PASSWORD` (fallback `1234567890ais`). Admin boleh mengubahnya, atau mengosongkannya agar sistem menghasilkan password acak. Reset memakai aturan yang sama.
4. Simpan hash saja; `mustChangePassword=true`, termasuk password yang diketik admin.
5. Tampilkan password sementara satu kali.
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

## Catatan part (POV pemusik)
1. Pemusik membuka lagu yang sudah publish di event-nya.
2. Pilih bagian lagu (Intro/Verse/Chorus/dll) atau biarkan "Lagu (umum)".
3. Isi POV part penulis (default dari assignment, misalnya Drum/Keyboard/Gitar) dan catatan teknisnya — pola ritme, layer, fingering, power chord, dan sebagainya.
4. Pilih audiens: semua personel atau instrumen/role musikal yang memiliki assignment pada lagu-event ini. Catatan bertarget hanya terlihat bagi assignment yang cocok, penulisnya, dan admin event.
5. Catatan section umum tampil di samping lirik pada desktop dan di bawah chart pada mobile; catatan bertarget tampil sebagai callout ringkas di atas isi section. Thread yang sama tetap dapat dibuka dan dikelola dari daftar semua catatan.
6. Balasan mewarisi audiens induk. Penulis atau admin menandai selesai; catatan selesai tetap tersedia lewat filter "Selesai".
7. Pemantau (`OBSERVER`) hanya membaca catatan umum. Admin dapat menghapus catatan personel lain dan tindakan itu masuk audit log.

## Batch release
1. Pilih sekitar 2 lagu yang siap dipelajari.
2. Tetapkan release date dan target review.
3. Pastikan original reference dan arahan awal tersedia.
4. Publish batch.
5. User belajar mandiri dan update status.
6. Online monitoring menyelesaikan pertanyaan.
7. MD menentukan lagu siap dibawa ke onsite rehearsal atau perlu revisi.

MEMBER dan OBSERVER dapat membuka Batch untuk melihat batch non-arsip yang memiliki lagu publish dan belum diarsipkan. Transisi medley tersimpan tampil sebagai teks read-only. EVENT_ADMIN/ADMIN dalam Preview melihat batasan baca yang sama; kontrol kelola hanya muncul di Edit mode dan tetap tunduk pada authorization server.

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
