import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  LayoutTemplate,
  MessagesSquare,
  Palette,
  Ticket,
  Video,
  Bell,
} from "lucide-react";
import { LogoMark } from "@/components/auth/auth-shell";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

// Policy and social links appear only for the addresses the platform has set.
const LEGAL: { label: string; href: string }[] = [
  { label: "Privacy Policy", href: process.env.NEXT_PUBLIC_PRIVACY_URL || "" },
  { label: "Terms of Use", href: process.env.NEXT_PUBLIC_TERMS_URL || "" },
  { label: "Help Centre", href: process.env.NEXT_PUBLIC_HELP_URL || "" },
].filter((l) => l.href);

/** True facts about the product, in the place TagMango shows its numbers. */
const FACTS = [
  { value: "Courses & workshops", caption: "Sell and host both in one place" },
  { value: "Your own brand", caption: "Logo, colours and name on every page" },
  { value: "Payments built in", caption: "Checkout, coupons and receipts" },
];

const FEATURES: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[] = [
  { icon: BookOpen, title: "Course builder", text: "Sections and chapters with video, audio, PDFs and links, ready to sell." },
  { icon: Video, title: "Live workshops", text: "Run workshops and webinars, with registration and email reminders." },
  { icon: LayoutTemplate, title: "Page builder", text: "Build pages for your workshops and consultations and start selling." },
  { icon: CreditCard, title: "Payments", text: "Take payments with Razorpay and enrol learners automatically." },
  { icon: Ticket, title: "Coupons", text: "Offer discounts and launch deals at checkout." },
  { icon: Palette, title: "Your own brand", text: "Your logo, name and colour across everything your customers see." },
  { icon: MessagesSquare, title: "Community", text: "Messages, comments and questions keep your learners talking." },
  { icon: Bell, title: "Email automation", text: "Welcome emails, receipts and reminders sent for you." },
];

const BLUE_TEXT = "bg-gradient-to-r from-[#8dbcf9] via-[#4f95f4] to-[#2f78e6] bg-clip-text text-transparent";
const PRIMARY_PILL =
  "inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#4b97f5] to-[#2a6fdc] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-950/50 transition hover:brightness-110";
const GLASS_PILL =
  "inline-flex items-center rounded-full border border-white/10 bg-white/15 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/25";

export default function HomePage() {
  return (
    <div className="bg-white" style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}>
      {/* Hero: dark, with a blue glow at the bottom, finished by a white arc */}
      <section className="relative flex min-h-[calc(125vh+130px)] flex-col overflow-hidden bg-[#0b0f1a] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 46% at 50% calc(100% - 110px), rgba(52,132,242,0.8), transparent 72%), radial-gradient(ellipse 30% 25% at 50% 55%, rgba(52,132,242,0.10), transparent 75%)",
          }}
        />

        <header className="relative z-10 mx-auto flex h-[84px] w-full max-w-[1590px] items-center justify-between px-6">
          <span className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <LogoMark size={44} />
            {APP_NAME}
          </span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-base font-medium text-white/90 hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="rounded-full border border-white/10 bg-white/15 px-6 py-3 text-base font-semibold text-white backdrop-blur hover:bg-white/25">
              Get Started
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-[170px] text-center">
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl">
            Build your
            <br />
            <span className={BLUE_TEXT}>coaching business</span>
          </h1>
          <p className="mt-8 text-xl text-white/90 sm:text-2xl">
            Everything you need to launch <span className="text-[#8dbcf9]">courses</span>
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className={PRIMARY_PILL}>
              Start for FREE <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className={GLASS_PILL}>
              Login
            </Link>
          </div>

          <dl className="mt-20 grid justify-center gap-x-16 gap-y-8 sm:auto-cols-max sm:grid-flow-col">
            {FACTS.map((f) => (
              <div key={f.value}>
                <dt className="whitespace-nowrap text-[28px] font-semibold text-white/85">{f.value}</dt>
                <dd className="mt-2 whitespace-nowrap text-base text-white/65">{f.caption}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* the arc into the white section below */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[130px] bg-white"
          style={{ borderTopLeftRadius: "50% 100%", borderTopRightRadius: "50% 100%" }}
        />
      </section>

      {/* What is in it */}
      <section className="relative z-10 -mt-[2px] bg-white px-6 pb-24 pt-6">
        <div className="mx-auto max-w-[1280px] text-center">
          <h2 className="text-[44px] font-bold leading-tight text-[#14161f]">
            Everything you need, in <span className="text-[#2f78e6]">one place</span>
          </h2>
          <p className="mt-3 text-xl text-gray-600">Courses, workshops, pages, payments and community, working together.</p>
          <Link href="/signup" className={`${PRIMARY_PILL} mt-8`}>
            Start for FREE <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="mt-16 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-7 transition-shadow hover:shadow-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#2f78e6]">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-[#14161f]">{f.title}</h3>
                <p className="mt-2 text-base leading-7 text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action and footer, on a dark arc */}
      <section
        className="relative overflow-hidden bg-[#0b0f1a] text-white"
        style={{ borderTopLeftRadius: "50% 130px", borderTopRightRadius: "50% 130px" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 55% 60% at 50% 0%, rgba(52,132,242,0.55), transparent 70%)" }}
        />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pb-[120px] pt-[150px] text-center">
          <h2 className="text-[56px] font-bold leading-tight">Time to start building</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className={PRIMARY_PILL}>
              Start for FREE <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className={GLASS_PILL}>
              Login
            </Link>
          </div>
        </div>

        <footer className="relative z-10 mx-auto max-w-[1280px] px-6">
          <div className="flex flex-wrap items-start justify-between gap-10 pb-12">
            <div className="max-w-sm">
              <span className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <LogoMark size={44} />
                {APP_NAME}
              </span>
              <p className="mt-5 text-base leading-7 text-white/65">Courses, workshops and consultations, under your own brand.</p>
            </div>
            <nav className="flex gap-12 text-base font-medium">
              <Link href="/login" className="hover:text-[#8dbcf9]">
                Login
              </Link>
              <Link href="/signup" className="hover:text-[#8dbcf9]">
                Sign up
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-7 text-sm text-white/60">
            <p>
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            {LEGAL.length > 0 && (
              <p className="flex flex-wrap gap-x-8 gap-y-2 text-base font-medium text-white/85">
                {LEGAL.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {l.label}
                  </a>
                ))}
              </p>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
