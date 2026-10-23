# 10 — Testing Plan

## Layers
Unit tests for validators/status transitions/permissions; integration tests for database services; Playwright E2E for critical journeys; manual mobile QA; security tests.

## Unit tests
- Username normalization/uniqueness.
- Inactive account rejection.
- Temporary password forces change.
- Role/ownership permission helpers.
- Invalid BPM/duration rejected.
- Only one active arrangement version per song.
- Chart legacy parser recognizes section headings (Verse/Chorus/Reff/Tagline/Prechorus/Interlude/Bridge/Modulation→Key Change/Coda/Outro/Intro, plus Post-Chorus/Solo/Hook/Breakdown/Vamp/Turnaround/Ad-lib/Spoken/Transition/Reprise), keeps repeated sections, and ignores empty blocks.
- Arrangement composition keeps item order/duplicates and applies label overrides.
- Chart section/arrangement validation rejects empty labels/content, duplicate labels, invalid item payloads, and over-limit sequences.
- Setlist lyric seed keeps unique labels, non-empty content, and arrangement items that reference existing sections.
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
