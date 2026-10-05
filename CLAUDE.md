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
Located at `../nocode-backend/` (sibling folder). Repo: `https://github.com/nbitspace01/nocode-backend.git`, branch: `app/open-slate/main`.
- Express.js + TypeORM + PostgreSQL
- Multi-tenant (appId/orgId)
- Auth: POST `/api/:appId/auth/signin` returns `{success, data: {id, first_name, last_name, email, jwt, organizations}}`
- Data API: REST CRUD at `/api/:appId/:orgId/data/:moduleId`
- Module names work as identifiers (not just numeric IDs)
- Email API supports 6 providers

## Key Files
- `src/lib/auth.ts` — NextAuth config + `getNocodeToken()` helper to extract nocode JWT from session
- `src/lib/email.ts` — Email via nocode backend's email API using `NOCODE_SYSTEM_TOKEN`
- `src/lib/upload.ts` — Direct Cloudinary upload (no nocode dependency)
- `src/lib/utils.ts` — Shared utilities including `formatPrice`, `slugify`

## Auth Flow
- NextAuth Credentials provider calls `nocodeSignin()` for login
- Nocode JWT stored in NextAuth token
- User profile (role, bio, avatar) stored in `user_profiles` nocode module
- Roles: CREATOR, STUDENT
- OTP-based verification for checkout flow (separate from login)

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
- Prisma packages still in package.json but unused — safe to remove

## Git Remotes (web app)
- `origin` = `https://github.com/brovinDev/creator-coaching-platform.git`
- `aaga` = `https://github.com/nbitspace01/upskill.git`

## Pending Cleanup
- Remove Prisma dependencies from package.json (`@prisma/client`, `@prisma/adapter-pg`, `prisma`)
- Remove `prisma/` directory (schema, seed, migrations)
- Remove Prisma-related npm scripts from package.json
- Remove `bcryptjs` dependency (no longer used after nocode migration)
