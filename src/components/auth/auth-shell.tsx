import Link from "next/link";
import { BookOpen, Briefcase, Check, ChevronDown, Compass, CreditCard, Layers, MessageCircle, Monitor, Play, Rocket, Search, Ticket, Users, Video, Zap } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

/** The Open Slate logo (public/openslate-logo.png), as a rounded square. */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/openslate-logo.png"
      alt={APP_NAME}
      width={size}
      height={size}
      className="shrink-0 rounded-[22%] object-cover"
      style={{ width: size, height: size }}
    />
  );
}

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Terms of Service", href: process.env.NEXT_PUBLIC_TERMS_URL || "" },
  { label: "Privacy Policy", href: process.env.NEXT_PUBLIC_PRIVACY_URL || "" },
  { label: "Help Centre", href: process.env.NEXT_PUBLIC_HELP_URL || "" },
];

/** Copyright line and the policy links the platform has addresses for. */
export function AuthFooter() {
  const links = FOOTER_LINKS.filter((l) => l.href);
  return (
    <footer className="mt-12 text-lg text-gray-700">
      <p>
        {APP_NAME} {new Date().getFullYear()}. All rights reserved.
      </p>
      {links.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-base">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline">
              {l.label}
            </a>
          ))}
        </p>
      )}
    </footer>
  );
}

export type Step = { label: string; state: "done" | "active" | "todo" };

/** "1. Register   2. About" shown in the middle of the sign-up header. */
function Stepper({ steps }: { steps: Step[] }) {
  return (
    <nav aria-label="Sign-up steps" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-24 md:flex">
      {steps.map((s, i) => (
        <span
          key={s.label}
          className={`flex items-center gap-2 text-lg ${s.state === "done" ? "text-green-600" : s.state === "active" ? "text-indigo-600" : "text-gray-500"}`}
        >
          {s.state === "done" ? (
            <Check className="h-5 w-5 rounded-full bg-green-600 p-0.5 text-white" strokeWidth={3} />
          ) : (
            <span>{i + 1}.</span>
          )}
          {s.label}
        </span>
      ))}
    </nav>
  );
}

/** White header with the logo, and the steps when there are some. */
export function AuthHeader({ steps }: { steps?: Step[] }) {
  return (
    <header className="relative flex h-[76px] shrink-0 items-center border-b border-gray-200 bg-white px-6">
      <Link href="/" className="flex items-center gap-3" aria-label={APP_NAME}>
        <LogoMark />
      </Link>
      {steps && <Stepper steps={steps} />}
    </header>
  );
}

/** The small dashboard drawn inside the panel: top tabs, sidebar, greeting, checklist and cards. */
function DashboardSketch() {
  const tabs: { label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean }[] = [
    { label: "DASHBOARD", icon: Layers, active: true },
    { label: "FEED", icon: Compass },
    { label: "WORKSHOPS", icon: Video },
    { label: "COURSES", icon: BookOpen },
    { label: "MESSAGES", icon: MessageCircle },
  ];
  const nav: { label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean; caret?: boolean; kids?: string[] }[] = [
    { label: "Get Started", icon: Rocket, active: true },
    { label: "Services", icon: Briefcase },
    { label: "Workshops", icon: Video },
    { label: "Coupons", icon: Ticket },
    { label: "Customers", icon: Users, caret: true },
    { label: "Payments", icon: CreditCard, caret: true },
    { label: "Page Builder", icon: Monitor, caret: true, kids: ["Webinar / Workshop", "1:1 Consultation"] },
    { label: "Automation", icon: Zap, caret: true },
  ];
  const steps = [
    { label: "Create account", done: true },
    { label: "Setup your first offering: We call it a service", done: true },
    { label: "Create & link your digital product", done: true },
    { label: "Setup your bank account", done: false },
  ];

  return (
    <div className="mt-10 h-[900px] w-[1180px] shrink-0 overflow-hidden rounded-t-[30px] border-[10px] border-b-0 border-[#111] bg-white shadow-2xl">
      {/* top bar */}
      <div className="flex h-[52px] items-center border-b border-gray-100 px-4">
        <span className="w-[270px] text-[17px] font-bold tracking-tight text-black">{APP_NAME}</span>
        <div className="flex flex-1 items-end justify-center gap-7">
          {tabs.map((t) => (
            <span
              key={t.label}
              className={`flex flex-col items-center gap-0.5 border-b-2 px-1 pb-1 text-[8px] font-semibold tracking-wider ${
                t.active ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-600"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </span>
          ))}
        </div>
        <div className="flex w-[160px] items-center justify-end gap-2">
          <span className="h-5 w-5 rounded-full bg-gray-100" />
          <span className="relative h-5 w-5 rounded-full bg-gray-100">
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="h-6 w-6 rounded-full bg-gray-300" />
        </div>
      </div>

      <div className="flex h-full">
        {/* sidebar */}
        <div className="w-[250px] shrink-0 border-r border-gray-100 p-3">
          <div className="mb-3 flex h-8 items-center gap-2 rounded-md border border-gray-200 px-2.5 text-[11px] text-gray-500">
            <Search className="h-3 w-3" /> Search...
          </div>
          <div className="space-y-1">
            {nav.map((n) => (
              <div key={n.label}>
                <div
                  className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[12px] ${
                    n.active ? "bg-indigo-50 font-semibold text-black" : "text-gray-700"
                  }`}
                >
                  <n.icon className={`h-3.5 w-3.5 ${n.active ? "text-indigo-600" : "text-gray-600"}`} />
                  <span className="flex-1">{n.label}</span>
                  {n.caret && <ChevronDown className="h-3 w-3 text-gray-500" />}
                </div>
                {n.kids && (
                  <div className="mt-1 space-y-1 rounded-md bg-gray-50 py-1">
                    {n.kids.map((k) => (
                      <div key={k} className="flex h-7 items-center gap-2 pl-9 text-[11px] text-gray-600">
                        <span className="h-1 w-1 rounded-full bg-gray-500" /> {k}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* page */}
        <div className="flex-1 bg-gray-50 px-4 pt-3">
          <p className="text-[22px] font-bold leading-tight text-black">Hello Priya, welcome!</p>
          <p className="mt-0.5 text-[10px] text-gray-600">Your journey on {APP_NAME} starts here!</p>

          <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="p-4">
              <p className="text-[14px] font-semibold text-black">Let&rsquo;s get started</p>
              <p className="mt-0.5 text-[10px] text-gray-500">3 out of 4 steps completed</p>
              <div className="mt-3 space-y-2.5">
                {steps.map((st, i) => (
                  <p key={st.label} className="flex items-center gap-2 text-[10px] text-gray-700">
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] ${
                        st.done ? "bg-green-600 text-white" : "border border-gray-300 text-gray-500"
                      }`}
                    >
                      {st.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={st.done ? "text-gray-500 line-through" : ""}>{st.label}</span>
                  </p>
                ))}
              </div>
            </div>
            {/* a still of a walkthrough video */}
            <div className="relative flex min-h-[180px] flex-col justify-end bg-gradient-to-br from-[#1d1b2e] to-[#0c0b14] p-3">
              <div className="mb-auto space-y-1.5 rounded-md bg-white/10 p-2">
                <div className="h-1.5 w-1/3 rounded bg-white/30" />
                <div className="h-1.5 w-2/3 rounded bg-white/15" />
                <div className="h-8 rounded bg-white/10" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[9px] text-white">
                <Play className="h-3 w-3 fill-white" /> 0:00 / 4:29
              </div>
              <div className="mt-1.5 h-[2px] rounded bg-white/30" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {["Create a Service", "Build a Course"].map((title) => (
              <div key={title} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
                <span className="h-5 w-5 rounded-full bg-gray-100" />
                <span className="flex-1 text-[11px] font-semibold text-black">{title}</span>
                <span className="rounded bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-600">Start building</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A tinted, gridded panel: a headline, who it is from, and a sketch of the dashboard running off the edges. */
function ShowcasePanel({ top = "pt-[125px]" }: { top?: string }) {
  return (
    <aside
      className="relative hidden flex-1 overflow-hidden bg-indigo-50 lg:block"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className={`pl-[160px] ${top}`}>
        <p className="max-w-[1050px] text-[38px] font-medium leading-[48px] text-black">
          <strong className="font-semibold">Sell your knowledge from one place.</strong> Courses, workshops and 1:1 sessions, with your
          own pages, payments and community, set up in minutes.
        </p>
        <div className="mt-[34px] flex items-center gap-[22px]">
          <LogoMark size={66} />
          <div>
            <p className="text-xl font-semibold uppercase tracking-wide text-black">{APP_NAME}</p>
            <p className="mt-1 text-2xl text-gray-700">Courses | Workshops | 1:1 sessions</p>
          </div>
        </div>
        <DashboardSketch />
      </div>
    </aside>
  );
}

/** Full-page auth layout: the form on the left, the showcase panel on the right. */
export function AuthShell({
  children,
  steps,
  bare,
}: {
  children: React.ReactNode;
  steps?: Step[];
  /** No header bar: the page puts the logo at the top of the form column and a footer at the bottom (login). */
  bare?: boolean;
}) {
  // One screen, no scrolling anywhere: the outer box is exactly the window, and the scaled content inside is
  // made 125% tall so that after the 0.8 zoom it fills it. The top spacing shrinks on short windows.
  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="flex flex-col" style={{ zoom: 0.8, height: "125vh", fontFamily: "var(--font-poppins), sans-serif" }}>
        {!bare && <AuthHeader steps={steps} />}
        <div className="flex min-h-0 flex-1">
          <main
            className={`flex w-full flex-col px-6 sm:px-12 lg:w-[590px] lg:shrink-0 lg:px-[60px] ${
              bare ? "justify-between pb-8 pt-16 lg:pt-[min(119px,11vh)]" : "justify-center py-12"
            }`}
          >
            {children}
          </main>
          <ShowcasePanel top={bare ? "pt-[125px]" : "pt-[165px]"} />
        </div>
      </div>
    </div>
  );
}
