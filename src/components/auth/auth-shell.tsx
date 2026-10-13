import Link from "next/link";
import { Check } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

/** The product's mark: a rounded tile in the theme colour with its first letter. */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-indigo-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {APP_NAME.charAt(0).toUpperCase()}
    </span>
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

/** A tinted, gridded panel with a headline and a sketch of the product, shown beside the form. */
function ShowcasePanel() {
  return (
    <aside
      className="relative hidden flex-1 overflow-hidden bg-indigo-50 lg:block"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className="mx-auto max-w-[1050px] px-12 pt-20">
        <p className="text-[40px] font-medium leading-[1.2] text-black">
          <strong className="font-semibold">Sell your knowledge from one place.</strong> Courses, workshops and 1:1 sessions, with
          your own pages, payments and community, set up in minutes.
        </p>

        {/* A sketch of the creator dashboard */}
        <div className="mt-14 overflow-hidden rounded-t-2xl border-[6px] border-b-0 border-[#14142b] bg-white shadow-2xl">
          <div className="flex items-center gap-6 border-b border-gray-100 px-6 py-3 text-xs font-semibold tracking-wider text-gray-500">
            <span className="text-base font-bold normal-case tracking-normal text-black">{APP_NAME}</span>
            <span className="border-b-2 border-indigo-600 pb-1 text-indigo-600">DASHBOARD</span>
            <span>FEED</span>
            <span>WORKSHOPS</span>
            <span>COURSES</span>
            <span>MESSAGES</span>
          </div>
          <div className="grid grid-cols-[170px_1fr] gap-0">
            <div className="space-y-2 border-r border-gray-100 p-4">
              {["Get Started", "Analytics", "Services", "Customers", "Marketing"].map((item, i) => (
                <div
                  key={item}
                  className={`rounded-md px-3 py-2 text-sm ${i === 0 ? "bg-indigo-50 font-semibold text-indigo-700" : "text-gray-600"}`}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="p-6">
              <p className="text-2xl font-semibold text-black">Hello, welcome!</p>
              <p className="mt-1 text-sm text-gray-500">Your journey starts here</p>
              <div className="mt-5 rounded-lg border border-gray-200 p-4">
                <p className="font-semibold text-black">Let&rsquo;s get started</p>
                {["Create account", "Set up your first service", "Create and link a course", "Brand your page"].map((step, i) => (
                  <p key={step} className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i === 0 ? "bg-green-600 text-white" : "border border-gray-300 text-gray-500"}`}
                    >
                      {i === 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={i === 0 ? "line-through" : ""}>{step}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Full-page auth layout: the form on the left, the showcase panel on the right. */
export function AuthShell({ children, steps }: { children: React.ReactNode; steps?: Step[] }) {
  return (
    <div className="flex flex-col bg-white" style={{ zoom: 0.8, minHeight: "125vh", fontFamily: "var(--font-poppins), sans-serif" }}>
      <AuthHeader steps={steps} />
      <div className="flex flex-1">
        <main className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[590px] lg:shrink-0 lg:px-[60px]">
          {children}
        </main>
        <ShowcasePanel />
      </div>
    </div>
  );
}
