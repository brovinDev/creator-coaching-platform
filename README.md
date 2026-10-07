# Open Slate — Creator Coaching Platform

A TagMango-style platform where creators sell services (courses, webinars, coaching), take payments, run email automation and manage a community. Learners sign up from a creator's service link, never from the main signup page.

This app is the UI and API layer. All data lives in the **nocode backend** (`../nocode-backend`), which also handles Razorpay payments and file storage.

## Features

- **Services and courses** — create a service, attach course content, set pricing, GST, coupons and custom checkout fields
- **Landing pages and Meta Pixel** — template-based sections, pixel per page
- **Checkout** — Razorpay popup, coupons applied on the server, free services enroll directly
- **Email automation** (sidebar → Automation → Email Automation) — confirmation email on service purchase, a default email per creator and a custom one per service. Each email is either a simple text email or a designed (Beefree) HTML email, with placeholders such as `{contact.firstname}`
- **Community** — channels, posts, comments
- **Learner dashboard** — enrolled courses, progress

## How it fits together

| Concern | Handled by | Configured in |
|---|---|---|
| Data, login | nocode backend modules, NextAuth on top | `.env` (`NOCODE_*`) |
| Payments | nocode **Razorpay integration** (orders and webhook) | Integration on the nocode org |
| File and video uploads | nocode **Cloudinary integration** | Integration on the nocode org |
| Email sending | Nodemailer over SMTP, direct from this app | `.env` (`SMTP_*`) |
| Email design editor | Beefree SDK, direct from this app | `.env` (`BEEFREE_*`) |

## Prerequisites

- Node.js 22+
- The nocode backend running locally, on branch `app/open-slate/main`, with its PostgreSQL database
- A Razorpay account (test mode is fine) and a Cloudinary account
- SMTP credentials (a Gmail app password works)
- Optional: a Beefree developer account for the visual email editor

## Setup

### 1. Start the nocode backend

In `../nocode-backend`:

```bash
npm install
npm run dev
```

On every start the backend runs its initializers. The "Open Slate modules" initializer adds `email`, `first_name` and `last_name` to `user_profiles` and creates the `service_email_templates` and `creator_email_settings` modules. **Restart the backend after pulling changes to it.**

You need an app (`NOCODE_APP_ID`), an organization (`NOCODE_ORG_ID`) and two API tokens, one admin and one system, which start with `AAGA_`.

### 2. Install and configure this app

```bash
cd web
npm install
cp .env.example .env
```

Fill in `.env` (see the table below). The dev server runs on **port 4000**, so `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` should be `http://localhost:4000`.

### 3. Create the data modules

```bash
npx tsx scripts/setup-nocode-modules.ts
```

This creates the core modules (courses, enrollments, orders and so on). It is only needed on a fresh organization.

### 4. Connect Razorpay on the nocode org

Payments use the keys saved on the organization, not the web `.env`.

Connect it in the nocode UI (Integrations → Razorpay), or with the API:

```bash
curl -X POST "$NOCODE_API_URL/api/integrations/connect" \
  -H "Content-Type: application/json" \
  -H "app-id: $NOCODE_APP_ID" -H "org-id: $NOCODE_ORG_ID" \
  -H "x-api-key: $NOCODE_ADMIN_TOKEN" \
  -d '{"integrationId":17,"integrationName":"Open Slate Razorpay","apiKey":"<key secret>","config":{"keyId":"<key id>","webhookSecret":"<webhook secret>"}}'
```

(`integrationId` is Razorpay's id in `GET /api/integrations`; it was 17 in our database.)

Then register the webhook. Otherwise **no payment is ever confirmed and nobody gets enrolled**:

1. In the Razorpay dashboard go to Settings → Webhooks and add `https://<backend-host>/api/payments/webhook/razorpay`.
2. Use the same secret you saved as `webhookSecret`.
3. Subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `payment_link.paid`, `refund.created` and `refund.processed`.

Razorpay cannot reach `localhost`. To test payments locally, expose the backend with a tunnel (for example ngrok) and use that URL, or test on a deployed backend.

After a payment the checkout page waits up to about 24 seconds for the webhook before it gives up.

### 5. Connect Cloudinary on the nocode org

Connect it in the nocode UI (Integrations → Cloudinary) with the cloud name, API key and API secret. The API call is the same as above, with Cloudinary's `integrationId` (30 in our database) and `"config":{"cloudName":"…","keyId":"<api key>"}`, and the API secret as `apiKey`.

Without it the backend stores files on its own disk. Uploads are limited by the backend's `MAX_FILE_SIZE` (100 MB by default), so raise it for large course videos.

### 6. Run

```bash
npm run dev
```

Open http://localhost:4000.

## Environment variables

| Variable | Purpose |
|---|---|
| `NOCODE_API_URL` | Base URL of the nocode backend |
| `NOCODE_APP_ID`, `NOCODE_ORG_ID` | The app and organization to use |
| `NOCODE_ADMIN_TOKEN` | Used by the setup script (`AAGA_…` key) |
| `NOCODE_SYSTEM_TOKEN` | Server-to-server calls with no user session (`AAGA_…` key) |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth. Generate the secret with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` | Public URL and brand name |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Sending email (`EMAIL_FROM` defaults to `SMTP_USER`) |
| `CRON_SECRET` | Shared secret the backend scheduler uses to call `/api/cron/reminders` (workshop reminder emails). Generate with `openssl rand -hex 32` |
| `BEEFREE_CLIENT_ID`, `BEEFREE_CLIENT_SECRET` | Visual email editor. Without them the visual editor reports it is unavailable and the simple text editor still works |

Razorpay and Cloudinary keys are **not** in this file any more. They live on the nocode org (steps 4 and 5).

## Email automation

- **Priority when a learner registers:** the service's own email, if enabled, then the creator's default email, then the built-in email. If the creator switches the confirmation email off, learners get nothing, but the creator is still notified.
- **Simple or designed:** the editor has a "Plain text" tab and a "Visual designer" tab. A designed email is always sent with a plain-text part too, either written by hand or generated from the design.
- **Placeholders:** `{contact.firstname}`, `{contact.lastname}`, `{contact.fullname}`, `{contact.email}`, `{service.name}`, `{order.amount}`, `{order.transaction_id}`, `{creator.name}`, `{link.dashboard}`. Unknown placeholders are left as written.
- **Beefree free plan:** the editor toolbar cannot be hidden, and Beefree's own plain-text export is paid, so plain text is generated here.
- A creator's own email is added to their profile when they sign in, so the registration notification only reaches them after their next sign-in.

## Workshop reminder emails

Learners of a workshop's linked services get a reminder **24 hours**, **1 hour** and **5 minutes** before every session (single or recurring). Creators switch each one on or off under Automation > Email Automation; they are on by default.

- **Who sends:** this app, over SMTP. The nocode backend only provides the clock: a scheduler job in `nocode-backend/src/open-slate/` calls `POST /api/cron/reminders` once a minute with `Authorization: Bearer <CRON_SECRET>`.
- **Backend setup:** set `OPEN_SLATE_WEB_URL` (this app's public URL) and `OPEN_SLATE_CRON_SECRET` (same value as `CRON_SECRET` here) in the backend's `.env`, then restart it once. Without both, nothing is scheduled.
- **At most once:** each (workshop, session, reminder) is recorded in the `workshop_reminders` module before sending, so restarts and retries never email learners twice. If the backend is down, a reminder is skipped once it is more than 10 minutes late rather than sent at the wrong time.
- **Content:** built-in emails using the creator's email logo and theme colour. The 24 hour and 1 hour emails link to the learner's Workshops page; the 5 minute email carries the meeting link. Times are shown in the workshop's timezone.
- **One default, two uses:** `src/lib/workshop-reminder-default.ts` generates the built-in reminder (with the creator's logo and theme colour) and the same email as a Beefree design. Learners get it until a creator saves their own, and the editor opens on exactly that design, so editing starts from what is really sent.
- **Custom wording:** each reminder row in Email Automation has an edit button (same plain-text and visual editor as the confirmation email, saved per creator in `creator_reminder_templates`). Placeholders: `{contact.firstname}`, `{contact.lastname}`, `{contact.fullname}`, `{contact.email}`, `{workshop.title}`, `{workshop.host}`, `{workshop.date}`, `{workshop.time}`, `{workshop.starts_in}`, `{workshop.link}`, `{link.dashboard}`. `{workshop.link}` is the meeting link in the 5 minute reminder and the learner's Workshops page in the others. A custom email that is switched off, or has no subject or body, falls back to the built-in one. Reset removes it.
- **Needs an email address:** learners only get reminders if their profile has an email, which is saved when they sign in.

## Payment flow

1. The checkout page asks `POST /api/checkout/create-order` for an order. The server works out the price from the service, any valid coupon and GST, and never trusts the amount the browser sends.
2. The nocode backend creates the Razorpay order with the org's keys.
3. The learner pays in the Razorpay popup.
4. Razorpay calls the backend webhook, which records the payment.
5. `POST /api/checkout/verify-payment` waits for that record, checks it succeeded for the right amount, then marks the order paid, enrolls the learner, counts the coupon use and sends the emails.

Services that cost nothing, or reach ₹0 with a coupon, enroll through `POST /api/checkout/free-enroll`. The server refuses that route for anything that still costs money.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 4000 |
| `npm run build` | Production build |
| `npm run start` | Start the production build |
| `npm run lint` | Lint |
| `npx tsc --noEmit` | Type check |

The Prisma scripts and the `prisma/` folder are left over from before the move to the nocode backend and are not used.

## Roles

- Signup creates **creators** only.
- Learners register at checkout, from a service link, with an email OTP.

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, creator signup, password reset
│   ├── api/
│   │   ├── checkout/    # create-order, verify-payment, free-enroll, OTP register
│   │   ├── email-automation/  # Settings, templates, default email, test send
│   │   ├── email-builder/     # Beefree token
│   │   ├── services/    # Services and their email templates
│   │   └── upload/      # File uploads (through nocode storage)
│   ├── creator/         # Creator dashboard, including automation/email
│   ├── checkout/        # Checkout page
│   └── p/               # Public landing pages
├── components/creator/  # Sidebar, email editor and other creator UI
└── lib/
    ├── nocode/          # Backend client and data access (nocodeDb)
    ├── auth.ts          # NextAuth setup
    ├── coupons.ts       # Coupon validation and service pricing
    ├── email.ts         # SMTP sending and built-in emails
    ├── email-template-render.ts, email-merge-tags.ts  # Placeholder rendering
    └── registration-emails.ts  # Emails sent on registration
```

## Troubleshooting

- **"No active payment integration found for organization …"** — Razorpay isn't connected on that org (step 4).
- **Payment taken but the learner isn't enrolled** — the webhook didn't arrive in time. Check the webhook URL, its secret, and that the backend is reachable from the internet.
- **Visual email editor unavailable** — set the `BEEFREE_*` variables.
- **Emails not sending** — check `SMTP_*`. Gmail needs an app password.
- **Email modules missing** — restart the nocode backend so its initializers run.
