# 06 — Authentication & RBAC

## Roles
**ADMIN:** manages accounts, event, people, songs, batches, assignments, versions, materials, tasks, rehearsals, equipment, decisions, all progress, and audit logs.

**USER:** views relevant published/assigned songs and materials; updates own practice progress; views relevant tasks and rehearsals; may update own profile/password. Cannot create users, change roles, access settings, or modify another user's progress.

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

## Bootstrap admin
Use environment variables or a secure one-time admin command. It must be idempotent, hash the password immediately, never log it, and be disabled/removed after setup. Never hardcode production credentials in source, seed data, docs, or OpenCode prompts.

## Password/session
- Recommend minimum 12 characters; allow paste/password managers.
- No plaintext storage/logging.
- Login errors are generic.
- Cookies HttpOnly, Secure in production, SameSite appropriate.
- Consider rate limiting.
- Reset should invalidate old sessions where practical.
- Inactive users cannot log in.

## Authorization checklist
For each server request: validate session; active account; role; event scope; ownership/assignment; schema; then mutate. Log sensitive actions. Hidden UI is not authorization.

## Access matrix
| Area | Admin | User |
|---|---|---|
| Dashboard | All summaries | Personal summaries |
| Event | Read/write | Published read |
| Songs/materials | CRUD/publish/lock | Read relevant published/assigned |
| Practice progress | Read all/admin correction audited | Own only |
| People/accounts | CRUD/reset/deactivate | Limited team info |
| Tasks | CRUD/assign | Relevant; update assigned if enabled |
| Rehearsal | CRUD/attendance/notes | Read; own attendance if enabled |
| Equipment | CRUD | Read relevant |
| Settings/roles/audit | Full | None |

## Required security tests
Direct URL access by user denied; User A cannot mutate User B's progress; role cannot be self-updated; inactive account blocked; first login requires password change; logs contain no secrets.
