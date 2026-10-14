# 02 — Tech Stack & Architecture

## Stack yang direkomendasikan
- Next.js App Router
- TypeScript strict
- Tailwind CSS + accessible component library
- TiDB Cloud Serverless (MySQL-compatible; Prisma provider `mysql`)
- Prisma ORM 7 + migrations (TCP) + `@prisma/adapter-mariadb` (runtime)
- Session authentication setara username/password (opaque token, cookie HttpOnly)
- Zod untuk validasi
- React Hook Form bila berguna
- Vercel untuk app hosting (proyek **MYTH — Music Youth Team Hub**)
- Google Drive untuk file
- GitHub untuk version control
- Playwright untuk end-to-end; Vitest/Jest untuk unit tests

## Architecture
Browser → Next.js UI (Vercel, Node runtime) → server actions/route handlers → server-side auth/validation → Prisma + MariaDB driver → TiDB Cloud (TLS, port 4000). Google Drive diakses melalui URL manual pada MVP; Drive API fase berikutnya.

Catatan TiDB: query runtime lewat TCP + TLS langsung (pool kecil, `connectionLimit: 5`, timeout 30 dtk untuk cold start Serverless). Adapter HTTPS `@tidbcloud` hanya dibutuhkan bila deploy ke edge runtime — tidak dipakai karena aplikasi jalan di Node runtime. MySQL collation `_ci` sudah case-insensitive sehingga filter `mode: insensitive` tidak tersedia/tidak diperlukan.

## Struktur folder
```text
src/
  app/
    (auth)/login/
    (auth)/change-password/
    (app)/dashboard/
    (app)/event/
    (app)/people/
    (app)/songs/
    (app)/batches/
    (app)/tasks/
    (app)/rehearsals/
    (app)/equipment/
    (app)/settings/
  components/
  lib/auth/
  lib/db/
  lib/permissions/
  lib/validation/
  lib/drive/
  lib/audit/
  server/actions/
  server/services/
prisma/schema.prisma
tests/unit/
tests/e2e/
```

## Data flow
Read: session → role/scope check → Prisma query → UI.  
Write: session → input validation → authorization + record ownership check → transaction if needed → audit event → response.

## Environment
`.env.example` boleh berisi placeholder saja:
`DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, optional Google OAuth vars. Jangan commit `.env.local`.

## Security
Cookie HttpOnly/Secure di production/SameSite sesuai kebutuhan; login error generik; throttling login bila tersedia; Argon2id atau bcrypt; tidak ada secret di client bundle/log. Bootstrap admin harus idempotent dan dinonaktifkan setelah digunakan.

## Drive strategy
MVP: admin memasukkan link Drive, judul, kategori, version label dan song relation. Tahap berikutnya dapat menambahkan Picker/API, dengan OAuth scope minimum dan token terlindungi.

## Deployment
Local → preview/staging dengan DB terpisah → production. Jalankan migration dengan prosedur aman, verifikasi bootstrap admin, permission, timezone, Drive links, dan backup/restore.

## Keputusan yang ditunda
Provider DB final, OAuth Drive penuh, email notifications, calendar export, PWA, multi-event, upload media langsung, dan otomatisasi generasi AI.
