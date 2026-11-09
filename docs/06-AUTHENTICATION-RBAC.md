# 06 — Authentication & RBAC

## Roles
**ADMIN:** manages accounts, event, people, songs, batches, assignments, versions, materials, tasks, rehearsals, equipment, decisions, all progress, and audit logs.

**USER:** views relevant published/assigned songs and materials; updates own practice progress; views relevant tasks and rehearsals; may update own profile/password and send suggestions. Cannot create users, change roles, access settings, or modify another user's progress.

**OBSERVER (label UI "Pantau"):** read-only monitor plus suggester. Views all *published* songs/materials, all personnel progress on published songs, general song notes, publish-scoped tasks, batches, rehearsals, equipment, and team roster. Instrument-targeted song notes are hidden. May create suggestions (Task `TODO` without PIC, min. 10-char description, moderated by MD) and revise own suggestions while still `TODO`. Cannot see DRAFT songs, contacts, invite links, or audit; cannot mutate anything else. Enforced server-side (publish/audience filters in services, `requireActionAdmin` on all other mutations).

## Manual accounts
- No public registration.
- Admin creates username and person record.
- Create and reset forms start filled with `DEFAULT_TEMP_PASSWORD` (fallback `1234567890ais`). The admin can edit it. Blank still generates a unique password.
- Store only a one-way hash (Argon2id or bcrypt).
- Set `mustChangePassword=true`.
- If shown to admin, temporary password is shown once only.
- Admin sends it through a private channel, not group chat.
- Admin can reset password but cannot view an existing password.

Example username `AISaerang` is fine if unique. The shared onboarding password is temporary only: `mustChangePassword` stays true for admin-set, default, and generated passwords. Do not reuse it as a lasting password.

## Personal invite links (magic link)
- Admin issues one link per user from `/people` ("Buat link undangan"); shown once, shared via private channel.
- Link: `{APP_URL}/masuk/{token}` — single-use, expires in 7 days; only the latest unused link per user stays valid.
- The `/masuk/[token]` page never consumes the token on GET (chat-link previews must not burn it); redemption happens via POST, then a standard opaque session cookie is set.
- Only the SHA-256 hash is stored (`LoginToken`); redemption is atomic (`usedAt`), throttled 5x/10 min per IP, and audited (`INVITE_CREATED`/`INVITE_REDEEMED`). Inactive accounts cannot redeem.
- First-use links land on mandatory password setup when `mustChangePassword` is set, so username+password remains as fallback login.
- The admin `/broadcast` page composes copy-ready WhatsApp onboarding texts from live data (group message + per-person DM with role variant, skill list, assignment count). Each DM is prefilled with the same default temporary password and still has its own invite-link placeholder; "Buat link undangan" inserts that person's unique link.

## Bootstrap admin
Use environment variables or a secure one-time admin command. It must be idempotent, hash the password immediately, never log it, and be disabled/removed after setup. Never hardcode production credentials in source, seed data, docs, or OpenCode prompts.

## Password/session
- New and changed passwords (change-password, admin create, admin reset): minimum 1 character (reject empty only), maximum 256. Allow paste/password managers.
- Admin create/reset fields and the broadcast DM start with `DEFAULT_TEMP_PASSWORD` (fallback `1234567890ais`). The admin may replace that value or clear the field to auto-generate one. `mustChangePassword` stays true either way. The plaintext is shown once and is never stored or written to the audit log (audit records only `passwordSource`: `admin` or `generated`).
- Every password input has a show/hide toggle (`aria-label` "Tampilkan password" / "Sembunyikan password", `type="button"`).
- Bootstrap admin stays at 12 characters (script check, outside this schema).
- No plaintext storage/logging.
- Login errors are generic.
- Cookies HttpOnly, Secure in production, SameSite appropriate.
- Consider rate limiting.
- Reset should invalidate old sessions where practical.
- Inactive users cannot log in.

## Edit | Preview (event admin)
Global `ADMIN` and an event's `EVENT_ADMIN` can switch the shell between **Edit** and **Preview**. The choice is stored in the HttpOnly cookie `myth_ui_mode` as a list of event ids currently in Preview. It is per browser and per event. It is not a session role.

Preview renders the musician song path: published list, batch badges, own practice progress, and no admin forms. Edit restores the current event-admin screens. Mutations still go through `requireEventManager` / `isAdmin`. A closed event still refuses writes. A member or observer cookie cannot turn Preview into extra access, and Preview cannot open draft songs in the UI.

Privilege is `User.role` plus `EventMembership.role`. Nothing in the request path grants access by username. Operationally, the global admin account is `alvandi` (`ADMIN`, and `EVENT_ADMIN` on the events that need it). The keyboard event admin `aisaerang` stays global `USER` and is `EVENT_ADMIN` only on events assigned at `/event/[id]/members`. Do not promote that account to global `ADMIN`. Hiding Edit controls in Preview is not authorization.

## Song editing (event admin)
An `EVENT_ADMIN` may edit songs on the setlist of an event they manage, while that event's access is open (`accessClosedAt` null). The check is `decideSongEdit` / `requireSongContentEditor`: global `ADMIN`, or `EVENT_ADMIN` of the event in the request. `MEMBER`, `OBSERVER`, and an `EVENT_ADMIN` of a different event are rejected. A closed event stays read-only for the event admin; a global admin can still write.

The request must include that event's `eventId`, and the song must have an `EventSong` row there. Omitting `eventId` is the Pustaka Lagu path and stays global-admin-only.

Chord charts, chart sections, chart arrangements, arrangement versions, and library song fields (title, artist, `Song.key`, tempo, reference URL) live on the shared `Song`. Editing them from one event changes the same record for every event that uses the song. The chart editor and the song form say so when the song is in more than one event. Event-only fields stay on `EventSong`: display key (`eventKey`), liturgical function, arrangement notes, status, publish, and final lock. Event materials (`SongMaterial.eventId`) and assignments follow the event. Library materials (`eventId` null), creating a new library song, archiving/restoring a song, the Pustaka Lagu page, accounts, invites, and personnel account tools stay global `ADMIN`.

Audit rows keep the signed-in actor's user id. Preview mode hides the forms; it does not grant or remove the server check.

## Authorization checklist
For each server request: validate session; active account; role; event scope; ownership/assignment; schema; then mutate. Log sensitive actions. Hidden UI is not authorization.

## Access matrix
| Area | Admin | Observer (Pantau) | User |
|---|---|---|---|
| Dashboard | All summaries | Published-only summaries | Personal summaries |
| Event | Read/write | Published read | Published read |
| Songs/materials | CRUD/publish/lock | Read published + all progress | Read relevant published/assigned |
| Practice progress | Read all/admin correction audited | Read all (published) | Own only |
| Song notes | All audiences | General notes only | General + matching assigned instrument + own targeted notes |
| Suggestions (Task TODO) | Triage all | Create own, revise while TODO | Create own, revise while TODO |
| People/accounts | CRUD/reset/deactivate | Limited team info | Limited team info |
| Tasks | CRUD/assign | Read publish-scoped | Relevant; update assigned if enabled |
| Rehearsal | CRUD/attendance/notes | Read (+ attendance roster) | Read; own attendance if enabled |
| Equipment | CRUD | Read | Read relevant |
| Decisions | Full | None | None |
| Settings/roles/audit | Full | None | None |

## Required security tests
Direct URL access by user denied; User A cannot mutate User B's progress; role cannot be self-updated; inactive account blocked; first login requires password change; logs contain no secrets.
