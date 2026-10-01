# CreatorPlatform — Creator Coaching Platform MVP

A TagMango-like creator platform where creators can build courses, publish landing pages, accept payments via Razorpay, and manage a community for their students.

## Features

- **Authentication** — Sign up, login, forgot/reset password, role-based access (Creator/Student)
- **Creator Dashboard** — Overview stats, courses, landing pages, community, customers, payments, settings
- **Course Management** — Create courses with modules and lessons, publish/unpublish, set pricing
- **Landing Page Builder** — Template-based section editor with hero, pricing, FAQ, CTA sections
- **Meta Pixel** — Configure Meta Pixel ID per landing page, tracks PageView/ViewContent events
- **Razorpay Checkout** — Secure payment flow with backend verification before enrollment
- **Student Dashboard** — View enrolled courses, track lesson progress, access community
- **Community** — Channels, posts, comments, replies, creator moderation
- **Email Notifications** — Welcome, password reset, payment confirmation, enrollment, purchase alerts

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL + Prisma 7
- **Auth**: NextAuth.js v5
- **Payments**: Razorpay
- **Email**: Nodemailer (SMTP)

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Razorpay account (test mode)
- SMTP credentials (Gmail app password works)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd creator-coaching-platform
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL, Razorpay keys, SMTP credentials
   ```

3. **Set up database**
   ```bash
   npm run db:push      # Push schema to database
   npm run db:seed      # Seed with demo data
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

### Demo Accounts

After seeding:

| Role    | Email              | Password    |
|---------|--------------------|-------------|
| Creator | creator@demo.com   | creator123  |
| Student | student@demo.com   | student123  |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, password reset
│   ├── api/             # API routes
│   │   ├── auth/        # Auth endpoints
│   │   ├── courses/     # Course CRUD
│   │   ├── landing-pages/ # Landing page CRUD
│   │   ├── community/   # Community endpoints
│   │   ├── checkout/    # Payment creation & verification
│   │   ├── public/      # Public course data
│   │   └── student/     # Student-specific endpoints
│   ├── creator/         # Creator dashboard pages
│   ├── student/         # Student dashboard pages
│   ├── checkout/        # Checkout page
│   ├── p/               # Public landing pages
│   ├── payment-success/ # Payment success page
│   └── payment-failed/  # Payment failure page
├── components/
│   ├── ui/              # Reusable UI components
│   ├── creator/         # Creator-specific components
│   ├── student/         # Student-specific components
│   └── community/       # Community components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── db.ts            # Prisma client
│   ├── email.ts         # Email templates & sending
│   ├── razorpay.ts      # Razorpay client & verification
│   └── utils.ts         # Utility functions
└── generated/prisma/    # Generated Prisma client
```

## Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start development server       |
| `npm run build`   | Build for production           |
| `npm run start`   | Start production server        |
| `npm run db:push` | Push schema to database        |
| `npm run db:seed` | Seed database with demo data   |
| `npm run db:studio` | Open Prisma Studio           |

## User Flows

### Creator Flow
Signup → Dashboard → Create Course → Add Modules/Lessons → Set Price → Create Landing Page → Publish → Share URL

### Student Flow
Open Landing Page → View Course → Buy Now → Checkout → Razorpay Payment → Backend Verification → Enrollment → Dashboard → Access Course → Community

## Payment Security

- Razorpay orders are created server-side
- Payment signatures are verified on the backend using HMAC-SHA256
- Enrollment is only created after successful server-side verification
- Frontend payment callbacks are never trusted alone
