import Link from "next/link";
import { LogoMark } from "@/components/auth/auth-shell";
import { ArrowRight, BookOpen, Users, CreditCard, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <section
        className="relative overflow-hidden bg-[#08060a] text-white"
        style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}
      >
        {/* the glow rising from the bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 105%, rgba(99,102,241,0.65), transparent 70%), radial-gradient(ellipse 40% 35% at 50% 70%, rgba(139,92,246,0.18), transparent 70%)",
          }}
        />

        <header className="relative z-10 mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
          <span className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <LogoMark size={44} />
            {process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"}
          </span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-base font-medium text-white/90 hover:text-white">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/10 bg-white/15 px-6 py-3 text-base font-semibold text-white backdrop-blur hover:bg-white/25"
            >
              Get Started
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[640px] max-w-4xl flex-col items-center justify-center px-4 pb-24 pt-10 text-center">
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl">
            Build your
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">coaching business</span>
          </h1>
          <p className="mt-8 text-xl text-white/90 sm:text-2xl">
            Everything you need to launch <span className="text-indigo-300">courses</span>
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
            >
              Start for FREE <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/15 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Login
            </Link>
          </div>

          <ul className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4 text-base text-white/70">
            <li>Courses &amp; workshops</li>
            <li>Payments</li>
            <li>Your own pages</li>
            <li>Community</li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Course Builder",
                description: "Create structured courses with modules, lessons, and video content.",
              },
              {
                icon: Zap,
                title: "Landing Pages",
                description: "Build beautiful landing pages to promote your courses.",
              },
              {
                icon: CreditCard,
                title: "Payments",
                description: "Accept payments via Razorpay. Automated enrollment on purchase.",
              },
              {
                icon: Users,
                title: "Community",
                description: "Engage students with channels, posts, and discussions.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200">
                <div className="inline-flex p-4 rounded-xl bg-indigo-50 mb-4">
                  <feature.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-gray-600 mb-8">Join thousands of creators building their business.</p>
          <Link
            href="/signup"
            className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition-all text-lg"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"}. All rights reserved.
      </footer>
    </div>
  );
}
