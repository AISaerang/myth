# 08 — Music Workflow

## Responsibility boundary
**Panitia/PIC wilayah:** concept/theme, final liturgy/rundown, duration, venue, roster confirmation and non-musical coordination.  
**MD:** musical concept, arrangement, key/BPM/groove/dynamics/intro/ending/cues, references, practice monitoring, musical rehearsals, sequencer planning, final musical lock.  
**Musicians:** learn assigned parts, update progress honestly, attend rehearsal, report blockers.  
**Technical PIC:** confirm instruments, sound system, input/output, monitors/IEM, power, cables, and playback routing.

## End-to-end flow
1. Confirm event brief and roster.
2. Confirm song list/order with panitia's liturgy.
3. Share original references.
4. MD drafts musical direction.
5. Use Suno or another tool for reference only where useful.
6. MD critically reviews output.
7. Publish batch and active version.
8. Individual practice + progress update.
9. Online monitoring; convert issues into tasks.
10. Onsite sectional after roughly five songs / early batches.
11. Prepare remaining songs.
12. Full rehearsal in liturgical order.
13. Technical rehearsal/gladi bersih.
14. Event-day soundcheck and execution.
15. Post-event review.

## Jadwal menuju 14 Nov 2026 (WIB)

Keputusan Komisi Wilayah 22 Okt 2026: ibadah dimajukan ke Sabtu 14 Nov 2026 (sebelumnya 21 Nov), karena dua minggu setelah tanggal lama ada katekisasi pelsus dan RMST-39. Jadwal lama (monitoring 21 Okt, sectional 1 Nov, full 8 Nov, gladi 15 Nov, soundcheck 21 Nov) tidak berlaku.

- Sab 24 Okt — materi (lagu, audio aransemen Suno, chord) dibagikan.
- 25 Okt–5 Nov — review + latihan mandiri per batch: B1 25–29 Okt, B2 26–31 Okt, B3 27 Okt–3 Nov, B4 28 Okt–5 Nov.
- Rab 28 Okt 19:00 — monitoring online (cek progres latihan mandiri per batch).
- Sab 31 Okt 10:00 — latihan onsite pertama (sectional); tempat masih dikoordinasikan.
- Sab 7 Nov 10:00: full rehearsal.
- Jum 13 Nov 15:00: gladi bersih.
- Sab 14 Nov 07:00: soundcheck, lalu ibadah. Durasi dan jam selesai belum dikunci.

Sequencer praise masih dikoordinasikan WL dengan beberapa pihak (masih terbuka).

## Song metadata
Title, liturgical function, original reference, key, BPM, groove/feel, structure, intro/ending, transitions/cues, assigned instruments/people, active version, readiness, blockers. Do not finalize key/BPM until MD reviews vocal range and team capability.

## Batch plan
Start with around two songs per batch; adjust by difficulty and schedule. Each batch has release date, target review, source reference, initial musical notes, and assigned musicians.

## Badge batch (POV pemusik)
On Lagu Saya and the song detail header, the number chip is the batch badge: the 1-based rank of `SongBatchItem.sortOrder` inside the active event's `SongBatch`. It matches the admin batch list (including unpublished items, so a hidden draft still occupies its number). It is not `EventSong.sortOrder` and not `SongStatusBadge`. The member and observer lists are grouped by batch (creation order, archived batches last) and then by that rank. A song in two batches appears in both, with each batch's own badge. Songs published but not in any batch stay at the end, under "Belum masuk batch". The list anchor is `#badge-{batchId}-{n}` on `/songs?eventId=…`.

## Medley
A medley is a corridor of songs inside one batch, not a separate table and not `EventSong.sortOrder`. Admin sets an optional label on each batch item (`SongBatchItem.medleyLabel`). Items in the same batch with the same label share `medleyGroupId` and are ordered by `SongBatchItem.sortOrder` (the batch badge). Clearing the label removes the song from the corridor.

On the song page, a song that is not the last visible song in its corridor shows **Lagu berikutnya** linking to the next song in that corridor. **Kembali ke badge** is hidden there. The last song of a medley, and any song that is not in a medley, may show **Kembali ke badge**, which returns to `/songs?eventId=…#badge-{batchId}-{n}`. Members and observers only step to published songs; an unpublished item is skipped for them and remains visible to event admins. If any corridor still has a next song, the back link stays hidden.

## Assign sebatch
Assignments stay per song (unique song+person pair with instrument part). The batch detail page offers a shortcut: pick several personnel (each with own part) plus checked songs, one submit. Existing pairs are skipped (reported per person), personnel must be active, and every created assignment is audited exactly like the manual flow. Fine corrections remain per song.

## Tugaskan sekaligus
On the event song list (Edit mode), an event admin can select many musicians/singers who are active event members (`MEMBER` or `EVENT_ADMIN`) and assign them to every non-archived song in the event, every song in one batch, or specific songs chosen by batch badge and title. Select all is available for people and for the specific-song list. The first skill name on the person becomes the default part. Existing `songId`+`personId` pairs are skipped. A pair already used on another event is reported as an error and is not created. The action returns created, skipped, and error counts. It uses `requireEventManager`, so a closed event cannot be written. Preview mode does not show the form.

## Timeline ke Hari H (dashboard)
A Gantt-style card on the dashboard reads the schedule from besok to H-day: H-day anchor (`Event.eventDate`), batch bars (`releaseAt` → `targetReviewAt`), rehearsal milestones (`startsAt`), task dues (`dueAt`), and equipment dues. Labels use Jakarta calendar days (`H-14`, `Hari ini`, `Terlambat N hari`, `Selesai`); song deadlines follow their batch (no per-song due field). Admins see everything; personnel see H-day plus their published songs' batches, upcoming rehearsals, relevant tasks, and assigned equipment. Undated items appear under "Belum terjadwal". Each dated milestone expands to a breakdown: batch songs with status/publish state, rehearsal song list + attendance count, task PIC/priority/related song, equipment PIC, and H-day venue/times. The timeline is only as complete as the dates admins enter — fill event date/time, batch dates, rehearsal schedule, and task dues for it to be useful.

## Lirik, chord, dan aransemen
MD mengelola master bagian lagu (Intro, Verse, Pre-Chorus, Chorus, Post-Chorus, Bridge, Interlude, Instrumental/Solo, Hook, Vamp, Tag, Key Change, Ad-lib, Spoken, Transition, Reprise, Ending, Coda, dan lainnya) dalam basis C. Setiap bagian boleh berisi chord+lirik, chord saja untuk instrumental, atau lirik saja. Nama aransemen menyusun ulang dan mengulang bagian tanpa menduplikasi konten; mengedit master bagian langsung berlaku ke semua aransemen yang memakainya. Dropdown "Tambah bagian…" di pembangun aransemen juga punya pilihan "+ Bagian baru…" untuk membuat bagian tanpa keluar dari kartu susunan.

Editor chord tampil sebagai "kunci di atas lirik": chord ditulis pada baris tersendiri di atas baris liriknya dan posisinya diatur dengan spasi, sehingga menyisipkan chart dari internet (format ini umum) maupun menggeser kunci ke pemisah suku kata gampang tanpa sintaks `[bracket]`. Di penyimpanan tetap ChordPro inline basis C; konversi format edit ⇄ ChordPro terjadi di klien dan hasil render akhir selalu identik (committed dengan unit test roundtrip). Toggle "Teks ChordPro" tersedia bila perlu mengedit sintaks mentah. Label bagian tetap diisi lewat kolom "Label bagian", bukan `{brace}` di konten.

Intro not angka adalah bagian master bertipe Intro, bukan kartu atau field terpisah di halaman/form lagu. Ditulis dengan cara yang sama seperti bagian lain: baris kunci di atas baris not angka (`C   G` di atas `1' 2 3 .6 [5 6]`). Preview master bagian, tampilan aransemen, chart di halaman lagu, dan latihan (halaman lagu yang dibuka dari rehearsal) merender angka dengan CSS: titik oktaf di atas (`'`) atau di bawah (`,` maupun titik di depan `.6`), garis `/` menembus angka untuk `#`, garis `\` untuk `b`, garis horizontal di atas kelompok `[5 6]` (satu) dan `[[5 6]]` (dua), serta busur `(5 6)`. Kunci tetap di kolomnya. Angka seukuran baris lirik. Transpose menggeser kunci; angka tidak berubah. Rumus (`C + 2 = D`) tampil sekali, di samping kontrol transpose chart, bukan pada setiap bagian. Heading bagian intro tampil "Intro". Penyebab label "BAGIAN 1": parser chart lama menamai blok tanpa `{heading}` menjadi `Bagian n`, lalu CSS `uppercase` menampilkannya sebagai BAGIAN. Blok yang isinya hanya not angka sekarang dinamai Intro, dan viewer juga mengganti label generik `Bagian n` pada bagian bernotasi menjadi Intro.

Kolom `introChords`, `introNotation`, dan `introNote` tetap di database. Skrip `npm run import:intro-sections` (dry-run bawaan; `--apply` untuk menulis) menyalinnya ke bagian Intro dan meletakkannya pertama di aransemen aktif bila bagian itu belum ada. Skrip `npm run normalize:notation` (dry-run bawaan; `--apply`, dan `--allow-prod` bila prefix user DB `rGq`) mengubah titik-di-depan menjadi koma kanonik dan memperbaiki label intro yang masih `Bagian n`, lalu mencetak diff per lagu. String lama tetap bisa dirender tanpa skrip ini.

Alur admin: impor chart lama (opsional) → review pecahan bagian → rapikan label/isi → susun urutan → aktifkan satu aransemen. Hanya satu aransemen aktif per lagu. Chart lama tetap menjadi fallback/riwayat dan tidak ditampilkan selama aransemen aktif ada. Perubahan sensitif dicatat di audit log.

Setlist fixed (acara Sabtu 14 Nov 2026; sebelumnya disebut setlist 21 Nov) dapat diisi sekaligus dengan `npm run import:lyrics` (idempoten; lagu yang sudah punya bagian/aransemen dilewati). Tujuh lagu memakai chart aktif sebagai master lirik + chord; tiga lagu tanpa chart memakai data lirik di `prisma/setlist-lyrics.ts`.

## Suno/reference workflow
Original → MD arrangement concept → AI-assisted reference → MD review → optional instrument guides → publish version. AI can alter structure, harmony, timing, key, duration or instrumentation; it is not automatically authoritative or live-ready.

## Reaper/sequencer workflow
MD plan → reference audio → review → prepare in Reaper → click/cue/pad/FX/optional backing → routing test → final lock. If stems/MIDI are extracted, verify form, timing, key, licensing/terms and musical accuracy.

## Click/cue routing
Document who needs click, spoken/musical cue type, FOH outputs, monitor/IEM outputs, whether click must never reach FOH, interface/cables, and backup plan. A common setup sends click/cue to musician monitors and backing/FX to FOH, but confirm with the actual sound engineer and test on the venue system.

## Practice status
Not started; learning; tried with reference; needs help; ready for rehearsal. User checks active version, learns assigned part, updates status and describes blockers.

## Online monitoring
Confirm everyone has correct reference; check form, key, tempo, vocal range, cues, transitions, part guide clarity and technical constraints. Assign owner and due date for each unresolved issue.

## Onsite rehearsal
Attendance/setup; confirm version; sectional work; groove/timing/dynamics; transitions/cues/endings; click/backing test; notes/action items; update readiness.

## Full rehearsal and final lock
Run all songs in final liturgical order; confirm transitions and duration; test sequencer and backup; mark final only after MD approval and relevant panitia/rundown confirmation. Any change after lock is deliberate and logged.

## Readiness
Draft → Source shared → Arrangement in progress → Reference ready → Practicing → Needs review / Ready for rehearsal → Rehearsal ready → Final locked.

## Post-event
Record musical successes, timing/transition issues, technical problems, sequencer lessons, improvements, permitted recordings, and action owners.
