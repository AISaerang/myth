# 10 — Testing Plan

## Layers
Unit tests for validators/status transitions/permissions; integration tests for database services; Playwright E2E for critical journeys; manual mobile QA; security tests.

## Unit tests
- Username normalization/uniqueness.
- New/changed passwords reject only empty input (minimum 1, maximum 256). Admin create accepts an explicit password such as `1234567890ais`, and a blank password field is omitted so the server generates one. `mustChangePassword` stays set for both. `DEFAULT_TEMP_PASSWORD` overrides the shared fallback; missing, empty, or over-long values use `1234567890ais`. Direct invite messages include that password and still keep `[LINK UNDANGAN]` until a per-user link is inserted.
- Inactive account rejection.
- Temporary password forces change.
- Role/ownership permission helpers.
- Invalid BPM/duration rejected.
- Only one active arrangement version per song.
- Chart legacy parser recognizes section headings (Verse/Chorus/Reff/Tagline/Prechorus/Interlude/Bridge/Modulation→Key Change/Coda/Outro/Intro, plus Post-Chorus/Solo/Hook/Breakdown/Vamp/Turnaround/Ad-lib/Spoken/Transition/Reprise), keeps repeated sections, and ignores empty blocks.
- Arrangement composition keeps item order/duplicates and applies label overrides.
- Chart section/arrangement validation rejects empty labels/content, duplicate labels, invalid item payloads, and over-limit sequences.
- Setlist lyric seed keeps unique labels, non-empty content, and arrangement items that reference existing sections.
- Intro-column migration builds a ChordPro Intro section (chords over not angka, note as a `#` comment), skips songs that already have an Intro section, and blocks `--apply` when the DB user prefix is `rGq` unless prod is explicitly allowed.
- Event brief date inputs use the Asia/Jakarta calendar day (midnight WIB round-trips; a UTC date slice does not). Saving the brief keeps the stored confirmation status unless the status field was changed.
- Membership backfill selects only active users with zero event memberships for the newest non-cancelled regional event, leaves anyone who already belongs to an event untouched, and blocks `--apply` when the DB user prefix is `rGq` unless prod is explicitly allowed.
- Chart viewer renders not angka in one arrangement body and shows the transpose formula once, next to the transpose controls.
- An Intro of three chord+notation lines, the last with `Csus4` and trailing `| |`, renders every line at the lyric size (`text-sm` / `leading-6`) in Lirik+Chord, Lirik saja, and Chord saja; transpose changes chords only.
- Not angka parser accepts comma and leading-dot lower octaves, chromatic prefixes, beam groups `[ ]` / `[[ ]]`, and slurs `( )`. CSS markup draws octave dots, a slash or backslash through the digit, and beams/slurs above the group. Chords stay on the same column. A notation section labeled `Bagian 1` displays Intro. `canonicalizeNotationText` rewrites `.6` to `6,` and leaves lyric lines alone. `planNotationNormalization` prints a per-song diff and is a no-op when nothing changed.
- Adding a rehearsal recording stores the song page's event id. Omitting the event id stores `null` (library), never the string `library`. A database or authorization failure on that action returns a form error instead of throwing.
- Catatan part: body 2–2000 karakter, POV part maks. 80, balasan wajib punya induk top-level di event yang sama dan mewarisi section/audiens induk. MEMBER hanya menulis di lagu publish; EVENT_ADMIN di draft; OBSERVER read-only; ADMIN menulis walau akses event ditutup. Audiens member dibatasi ke catatan umum, target assignment cocok, dan catatan target yang ditulis sendiri; OBSERVER hanya mendapat catatan umum; admin event/global melihat semua. Target skill wajib punya assignment pada EventSong. Hanya penulis/admin yang boleh edit/hapus/resolve; hapus oleh admin atas catatan orang lain menulis audit log.
- Chart notes: section aransemen berulang memakai ID master section yang sama dan menampilkan anotasi di setiap kemunculan; target tampil di callout section, umum di panel desktop dan bertumpuk pada mobile; section tanpa catatan hanya menampilkan disclosure composer ringkas bagi penulis yang berizin. Chart legacy dipetakan ke section master berdasarkan label bila cocok.
- Final lock requires intentional authorized action.
- Overdue task and equipment blocker aggregation.
- Cancelled rehearsal excluded from upcoming list.

## Integration tests
- Create user stores hash, not plaintext.
- Password change clears `mustChangePassword`.
- Reset invalidates previous password.
- Admin creates event/song/assignment/material.
- User updates own progress; admin sees update.
- User cannot update another person's progress.
- Rehearsal/attendance persists.
- Admin imports a legacy chart, reviews sections, saves an arrangement, activates it, and the song page renders the active arrangement instead of the legacy chart.
- Non-admin cannot create/edit sections, arrangements, or import legacy charts.
- Audit log records role change, reset, final lock, chart section/arrangement changes, and legacy import.

## E2E critical flows
1. First login: admin creates user → user logs in → changes password → reaches dashboard.
2. Song: admin creates/publishes song and material → assigned user sees it → updates progress.
3. Rehearsal: admin schedules session → user sees schedule → attendance/notes/task recorded.
4. Equipment: item marked blocked with PIC → dashboard shows blocker → status becomes tested.
5. Authorization: user visits admin URL and attempts cross-user mutation; access denied and data unchanged.

## Manual QA
Test mobile layout, long titles, keyboard navigation, labels, empty/loading/error states, Asia/Jakarta time, Drive permissions, no horizontal overflow, no stack traces, reset flow.

## Security release gate
No secrets in Git; hash passwords; server-side RBAC and validation; safe cookies; no public registration; no role self-escalation; private contacts restricted; no secrets in logs; bootstrap process documented.

Do not release until P0 E2E flows and Admin/User authorization checks pass.
