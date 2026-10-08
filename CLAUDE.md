@AGENTS.md

# Open Slate — Creator Coaching Platform

## Overview
Online course platform (like Teachable/Thinkific) where creators sell courses and students learn. Built with Next.js 16 App Router + TypeScript + Tailwind CSS 4. App name is configurable via `NEXT_PUBLIC_APP_NAME` env var (currently "Open Slate").

## Project Structure
```
open-slate/
├── web/            ← This Next.js app (you are here)
└── nocode-backend/ ← Express.js + TypeORM backend (branch: app/open-slate/main, from aaga/main/qa)
```

## Architecture — Nocode Backend Migration (COMPLETED)
All backend data operations have been migrated from Prisma/PostgreSQL to a **nocode backend** (Express.js + TypeORM + PostgreSQL). The Next.js app is now a pure UI + API layer that calls the nocode backend via HTTP.

### What's kept direct (NOT through nocode):
- **NextAuth v5** — session management (Credentials provider authenticates via nocode backend)
- **Razorpay** — payment processing (direct API calls for order creation/verification)
- **Cloudinary** — file/video uploads (direct upload via `src/lib/upload.ts`)

### Nocode client library:
- `src/lib/nocode/client.ts` — Low-level HTTP client. Exports: `nocodeSignin`, `nocodeSignup`, `nocodeForgotPassword`, `nocodeResetPassword`, `insertData`, `getData`, `getDataById`, `updateData`, `updateDataByWhere`, `deleteData`, `getModules`, `createModule`, `sendEmail`, `NocodeApiError`
- `src/lib/nocode/db.ts` — High-level data access with `NocodeModel` class (Prisma-like API: `findMany`, `findUnique`, `findFirst`, `create`, `update`, `updateWhere`, `delete`, `deleteWhere`, `count`). Pre-built instances exported as `nocodeDb` with models for all 14 modules.
- `src/lib/db.ts` — Legacy stub, re-exports from nocode. Do NOT use directly.

### 14 Nocode Modules:
courses, course_modules, lessons, lesson_progress, enrollments, orders, landing_pages, landing_page_sections, communities, community_channels, community_posts, community_comments, email_otps, user_profiles

### Module setup script:
`scripts/setup-nocode-modules.ts` — Run with `npx tsx scripts/setup-nocode-modules.ts` to create all modules in the nocode backend.

## Nocode Backend
Located at `../nocode-backend/` (sibling folder). Branch: `app/open-slate/main`. Its Open Slate code lives in `src/open-slate/` (see the README there). Remotes: `origin` = `https://github.com/nbitspace01/openslate-web-backend.git`, `aaga` = `https://github.com/nbitspace01/nocode-backend.git`. The branch has no upstream set, so push with the remote named: `git push origin app/open-slate/main`.
- Express.js + TypeORM + PostgreSQL
- Multi-tenant (appId/orgId)
- Auth: POST `/api/:appId/auth/signin` returns `{success, data: {id, first_name, last_name, email, jwt, organizations}}`
- Data API: REST CRUD at `/api/:appId/:orgId/data/:moduleId`
- Module names work as identifiers (not just numeric IDs)
- Email API supports 6 providers

## Key Files
- `src/lib/auth.ts` — NextAuth config (sign-in by emailed code) + `getNocodeToken()` (returns the system token)
- `src/lib/email.ts` — Email via nocode backend's email API using `NOCODE_SYSTEM_TOKEN`
- `src/lib/upload.ts` — Direct Cloudinary upload (no nocode dependency)
- `src/lib/utils.ts` — Shared utilities including `formatPrice`, `slugify`

## Auth Flow
- Sign-in is by a one-time code emailed to the person (6 digits, 10 minutes, single use, 5 wrong tries, 30 s between codes). There are no passwords: `src/lib/otp-auth.ts` holds the code logic, `src/lib/account.ts` creates accounts.
- NextAuth Credentials provider takes `{ email, otp }`, uses the code up, and finds the account through the backend's `GET /api/open-slate/users/by-email`. The session has no nocode JWT; server calls use `NOCODE_SYSTEM_TOKEN`.
- The backend still needs a password per account, so new accounts get a random one nobody sees.
- User profile (role, bio, avatar) stored in the `user_profiles` nocode module
- Roles: CREATOR (public sign-up), STUDENT (created at a service's checkout)

## Environment Variables
```
NOCODE_API_URL, NOCODE_APP_ID, NOCODE_ORG_ID, NOCODE_ADMIN_TOKEN, NOCODE_SYSTEM_TOKEN
NEXTAUTH_URL, NEXTAUTH_SECRET
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME
```

## Important Patterns
- No JOINs in nocode backend — do multiple sequential queries + client-side filtering
- `NOCODE_SYSTEM_TOKEN` used for server-to-server calls without user session (public routes, email sending)
- Field names use snake_case in nocode (e.g., `course_id`, `creator_id`, `video_url`)
- Content fields (landing page sections) stored as JSON strings in nocode

## Git Remotes (web app)
- `origin` = `https://github.com/nbitspace01/openslate-web-app.git` (the company repository; the branch `feat/web-services-and-fixes` tracks it)
- `brovin` = `https://github.com/brovinDev/creator-coaching-platform.git` (personal; `main` tracks it)

## Pending Cleanup
- Remove `bcryptjs` dependency (no longer used after nocode migration)
