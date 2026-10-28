# ENS — Certification Expiry Notification System

Track certifications across companies, assign them to users, store the certificate/document,
and see what is expiring or overdue.

## Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | TanStack Start — React 19 with server-side rendering and **server functions** |
| UI        | TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons, sonner (toasts) |
| Data (UI) | TanStack Query (caching), TanStack Router (file-based routes)                 |
| Database  | Microsoft SQL Server via the `mssql` driver                                   |
| Auth      | Own login: scrypt-hashed passwords + HTTP-only session cookie                 |
| Build     | Vite 8; Nitro packages the production build as a standalone Node.js server    |

## How it works

Frontend and backend live in **one project and run as one Node.js process**:

```
Browser (React pages)                         Node.js server
─────────────────────                         ──────────────────────────────────────────
src/routes/*.tsx  ── calls ──►  src/lib/*.functions.ts  ──►  src/server/*.server.ts ──► SQL Server
src/components/*                (server functions: run on      (DB pool, password hashing,
                                 the server; the browser gets   sessions — never sent
                                 only a tiny fetch stub)        to the browser)
```

- **Login:** `signIn` checks the password hash, stores a random token's SHA-256 in
  `dbo.sessions`, and sets it in an HTTP-only cookie (`ens_session`, 30 days, renewed on use).
- **Access rules** (same as before): every signed-in user can view everything and add/edit
  companies and certifications; only administrators can delete companies/certifications and
  manage users. Enforced on the server by `requireAuth` / `requireAdmin`
  (`src/lib/auth-middleware.ts`). At least one administrator always remains.
- **Documents** are stored in SQL Server with the certification row and served by
  `GET /api/documents/:id` to signed-in users only (max 20 MB per file).
- **Database setup is automatic:** on the first request the server connects to `DATABASE_URL`,
  creates the database if it does not exist, and applies `database/schema.sql` (idempotent).
  The sign-in page then asks you to create the first administrator.

## Files

| File                                        | Purpose                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `database/schema.sql`                       | SQL Server tables; applied automatically at startup                     |
| `src/server/db.server.ts`                   | Parses `DATABASE_URL`, connection pool, creates DB + schema             |
| `src/server/crypto.server.ts`               | Password hashing (scrypt), session tokens                               |
| `src/server/auth.server.ts`                 | Create / read / destroy login sessions                                  |
| `src/lib/auth-middleware.ts`                | `requireAuth` / `requireAdmin` guards for server functions              |
| `src/lib/auth.functions.ts`                 | Sign in/out, current session, first-administrator setup                 |
| `src/lib/users.functions.ts`                | List users/roles; admin create, change role, delete                     |
| `src/lib/companies.functions.ts`            | Companies: list, add, rename, delete                                    |
| `src/lib/certifications.functions.ts`       | Certifications: list, get, save (with upload), delete                   |
| `src/routes/api/documents/$id.ts`           | Download/view a certification's document                                |
| `src/lib/queries.ts`, `src/lib/session.tsx` | React Query hooks used by the pages                                     |
| `src/routes/`                               | Pages: `/auth`, `/dashboard`, `/companies`, `/certifications`, `/users` |

## Configuration (`.env`)

| Variable                | Purpose                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `sqlserver://HOST[\INSTANCE][:PORT];database=NAME;user=...;password=...;encrypt=true;trustServerCertificate=true` |
| `SESSION_COOKIE_SECURE` | `true` when the site is served over HTTPS                                                                         |
| `PORT` (optional)       | Port to listen on (default 3000)                                                                                  |

Copy `.env.example` to `.env` and fill it in. The SQL login needs `CREATE DATABASE`
permission the first time if the database does not exist yet (`sa` has it).

## Run locally

Requires Node.js 20.12 or newer.

```sh
npm install        # once, or after package.json changes
npm run dev        # http://localhost:3000, reloads on code changes
```

## Build and host

```sh
npm run build      # creates .output/ (the complete server)
npm start          # runs .output/server/index.mjs with .env, on PORT (default 3000)
```

To deploy, copy **`.output/`, `.env` and `package.json`** to the server (it needs Node.js but
not `node_modules` or the source) and run `npm start` there. Keep it running with pm2 or as a
Windows service (e.g. NSSM), and put IIS (URL Rewrite + ARR) or nginx in front for HTTPS;
then set `SESSION_COOKIE_SECURE=true`.

## Other scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm run lint`   | Check code with ESLint             |
| `npm run format` | Auto-format all code with Prettier |
