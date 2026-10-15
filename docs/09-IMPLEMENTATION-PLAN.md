# 09 — Implementation Plan

## Phase 0: Foundation
Next.js + TypeScript, lint/typecheck, UI shell, Prisma/PostgreSQL, `.env.example`, local setup documentation.

## Phase 1: Authentication
Login/logout, session, roles, password hashing, first-login password change, bootstrap admin, server-side authorization, disable/reset account.

## Phase 2: Event and people
Event brief with confirmation states, personnel profiles, skills/instruments, account management, assignments.

## Phase 3: Songs and materials
Song CRUD, batches, assignments, arrangement versions, Drive links, publish/active/final states.

## Phase 4: Practice monitoring
User progress, admin overview, tasks, due dates, blockers.

## Phase 5: Rehearsals and equipment
Schedule, song links, attendance, notes, action items, technical checklist, readiness dashboard.

## Phase 6: Release hardening
Audit logs, responsive QA, security tests, backup/restore notes, deployment runbook.

## Priority
**P0:** auth/RBAC, event brief, people, songs/batches/materials, progress, tasks, rehearsal, equipment, Drive links.  
**P1:** audit, attendance, decision log, in-app notices, roster/song export.  
**P2:** Drive API/picker, email notifications, calendar export, PWA, multi-event. (Read-only committee role sudah diimplementasikan sebagai `OBSERVER`/Pantau.)

## Build by vertical slice
1. Admin login → create user → user first login/password change.
2. Admin creates song → assigns user → user sees song.
3. User updates progress → admin sees it.
4. Admin adds Drive link → user opens it.
5. Admin creates rehearsal → user sees schedule.
6. Admin flags equipment blocker → dashboard shows it.
7. Audit, responsive, deployment.

## Seed data
Only fictional development data. Never commit production credentials or real passwords.

## Deployment checklist
Configure production DB and auth secret; run migrations; create admin securely once; disable bootstrap; test admin/user permissions; verify Drive links and timezone; verify backups; ensure no secrets in logs/client/repository.
