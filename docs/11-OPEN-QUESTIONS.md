# 11 — Open Questions & Assumptions

Do not present unresolved information as confirmed.

## Event
- [x] Confirm official date → **Sabtu 14 November 2026** (keputusan Komisi Wilayah 22 Okt 2026). Menggantikan **21 Nov 2026, pagi–sore** (confirmed 14 Okt 2026). Dimajukan karena dua minggu setelah tanggal lama ada katekisasi pelsus dan RMST-39. Soundcheck **07:00 WIB**, lalu ibadah. Durasi dan jam selesai belum dikunci.
- [ ] Confirm location, theme, total duration, final liturgy/rundown.
- [x] Materi → **Sab 24 Okt 2026**: lagu, audio aransemen Suno, chord dibagikan.
- [x] Batch review + latihan mandiri: B1 25–29 Okt, B2 26–31 Okt, B3 27 Okt–3 Nov, B4 28 Okt–5 Nov.
- [ ] Monitoring online — **Rab 28 Okt 2026 19:00 WIB**.
- [ ] Latihan onsite pertama (sectional) **Sab 31 Okt 2026 10:00 WIB** — tempat masih dikoordinasikan.
- [ ] Full rehearsal — **Sab 7 Nov 2026 10:00 WIB**.
- [ ] Gladi bersih — **Jum 13 Nov 2026 15:00 WIB**.
- [x] Setlist aktif: 13 lagu dalam 4 batch manggung (lihat 12 §19/§21); order final menyusul panitia. (Sebelumnya: 19 lagu: 5 ASM + 6 Praise + 6 Worship + 2 NNBT.)

## People
- [ ] Finalize cross-congregation roster and instrument PICs.
- [ ] Confirm vocalists and availability for rehearsal.
- [ ] Decide whether sequencer is a separate role or handled by MD.

## Music and tech
- [ ] Set key/BPM after MD review.
- [ ] Identify songs requiring sequencer.
- [ ] Sequencer praise — masih dikoordinasikan WL dengan beberapa pihak.
- [ ] Decide click/cue/backing needs and routing.
- [ ] Confirm venue sound system, monitor/IEM, inputs/outputs, DI, cables, power and playback backup.

## Application
- [x] Confirm app name/domain → **MYTH (Music Youth Team Hub)**, `https://myth-yg.vercel.app` (`myth` sudah dipakai orang).
- [x] Choose managed database → **TiDB Cloud Serverless** (`music_team_hub`, provider mysql).
- [ ] Decide if manual Drive links are enough for MVP.
- [x] Decide if email notifications or read-only committee role are needed → **read-only committee role = `OBSERVER` (label "Pantau"), implemented 15 Okt 2026**: publish-only read-all + suggestions moderated by MD. Email notifications still deferred.
- [ ] Store contact data only if operationally necessary.
- [x] Event share link default → **auto-add `EventMembership` `MEMBER`** for a logged-in account that opens a valid `/e/{token}` (audit `source=SHARE_LINK`), with no automatic `SongAssignment` ("Tugaskan") and no `User.role` change. Reason: "masuk via akun" needs `EventMembership`, or `src/proxy.ts` and `getAccessibleEvent` return 404. The alternative — view-only for a logged-in non-member — is **rejected** for now; ask the owner before changing it.
- [x] A guest is a `ShareGuestSession` plus HttpOnly `myth_share_guest` cookie, **not** a `User`, `Person`, `Session`, `EventMembership`, or `OBSERVER`. The guest is read-only and bound to one share link.
- [x] Draft songs in the guest setlist are included **only** when the link was created with "Sertakan lagu draft internal" (`includeDrafts=true`); the default is off, matching the member publish-only view.

## Boundary reminder
MD owns musical preparation and direction. Panitia/PIC owns event-wide decisions, final rundown, cross-division coordination, and non-musical follow-up. For cross-boundary tasks, explicitly assign an owner.
