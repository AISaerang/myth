# 06 — Authentication & RBAC

## Roles
**ADMIN:** manages accounts, event, people, songs, batches, assignments, versions, materials, tasks, rehearsals, equipment, decisions, all progress, and audit logs.

**USER:** views relevant published/assigned songs and materials; updates own practice progress; views relevant tasks and rehearsals; may update own profile/password and send suggestions. Cannot create users, change roles, access settings, or modify another user's progress.

**OBSERVER (label UI "Pantau"):** read-only monitor plus suggester. Views all *published* songs/materials, all personnel progress on published songs, publish-scoped tasks, batches, rehearsals, equipment, and team roster. May create suggestions (Task `TODO` without PIC, min. 10-char description, moderated by MD) and revise own suggestions while still `TODO`. Cannot see DRAFT songs, contacts, invite links, or audit; cannot mutate anything else. Enforced server-side (publish filter in services, `requireActionAdmin` on all other mutations).

## Manual accounts
- No public registration.
- Admin creates username and person record.
- Generate a strong unique temporary password.
- Store only a one-way hash (Argon2id or bcrypt).
- Set `mustChangePassword=true`.
- If shown to admin, temporary password is shown once only.
- Admin sends it through a private channel, not group chat.
- Admin can reset password but cannot view an existing password.

Example username `AISaerang` is fine if unique. Do not use a guessable production password like `MusicDirector`. Use a unique temporary password and force a change on first login.

## Personal invite links (magic link)
- Admin issues one link per user from `/people` ("Buat link undangan"); shown once, shared via private channel.
- Link: `{APP_URL}/masuk/{token}` — single-use, expires in 7 days; only the latest unused link per user stays valid.
- The `/masuk/[token]` page never consumes the token on GET (chat-link previews must not burn it); redemption happens via POST, then a standard opaque session cookie is set.
- Only the SHA-256 hash is stored (`LoginToken`); redemption is atomic (`usedAt`), throttled 5x/10 min per IP, and audited (`INVITE_CREATED`/`INVITE_REDEEMED`). Inactive accounts cannot redeem.
- First-use links land on mandatory password setup when `mustChangePassword` is set, so username+password remains as fallback login.
- The admin `/broadcast` page composes copy-ready WhatsApp onboarding texts from live data (group message + per-person DM with role variant, skill list, assignment count); invite links are generated per person on demand.

## Bootstrap admin
Use environment variables or a secure one-time admin command. It must be idempotent, hash the password immediately, never log it, and be disabled/removed after setup. Never hardcode production credentials in source, seed data, docs, or OpenCode prompts.

## Password/session
- Normal minimum 12 characters; allow paste/password managers.
- ⚠️ TEMPORARY onboarding relaxation: minimum removed (any non-empty
  password accepted) so personnel can start easily. MUST revert to 12
  once every account clears `mustChangePassword` (check `/people`
  badges). Bootstrap admin stays at 12.
- No plaintext storage/logging.
- Login errors are generic.
- Cookies HttpOnly, Secure in production, SameSite appropriate.
- Consider rate limiting.
- Reset should invalidate old sessions where practical.
- Inactive users cannot log in.

## Authorization checklist
For each server request: validate session; active account; role; event scope; ownership/assignment; schema; then mutate. Log sensitive actions. Hidden UI is not authorization.

## Access matrix
| Area | Admin | Observer (Pantau) | User |
|---|---|---|---|
| Dashboard | All summaries | Published-only summaries | Personal summaries |
| Event | Read/write | Published read | Published read |
| Songs/materials | CRUD/publish/lock | Read published + all progress | Read relevant published/assigned |
| Practice progress | Read all/admin correction audited | Read all (published) | Own only |
| Suggestions (Task TODO) | Triage all | Create own, revise while TODO | Create own, revise while TODO |
| People/accounts | CRUD/reset/deactivate | Limited team info | Limited team info |
| Tasks | CRUD/assign | Read publish-scoped | Relevant; update assigned if enabled |
| Rehearsal | CRUD/attendance/notes | Read (+ attendance roster) | Read; own attendance if enabled |
| Equipment | CRUD | Read | Read relevant |
| Decisions | Full | None | None |
| Settings/roles/audit | Full | None | None |

## Required security tests
Direct URL access by user denied; User A cannot mutate User B's progress; role cannot be self-updated; inactive account blocked; first login requires password change; logs contain no secrets.
