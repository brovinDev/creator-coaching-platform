import Link from "next/link";
import { Check, Play } from "lucide-react";
import { MdBook, MdChevronRight, MdLanguage, MdVideocam, MdWork } from "react-icons/md";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { getBranding } from "@/lib/branding";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";
// Walkthrough videos for the right-hand side of the first and the course cards. Until they are set,
// those spots show a "coming soon" panel so the layout stays the same.
const INTRO_VIDEO = process.env.NEXT_PUBLIC_GETSTARTED_VIDEO_URL || "";
const COURSE_VIDEO = process.env.NEXT_PUBLIC_GETSTARTED_COURSE_VIDEO_URL || "";

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-800">{children}</span>;
}

/** The video beside a card, flush with its edge; a dark "coming soon" panel when there is no video yet. */
function Walkthrough({ src, label }: { src: string; label: string }) {
  return src ? (
    <video src={src} controls className="h-full min-h-[300px] w-full bg-black object-cover" />
  ) : (
    <div className="relative flex min-h-[300px] w-full flex-col items-center justify-center gap-4 bg-[#16151c] text-white">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
        <Play className="h-7 w-7 fill-white text-white" />
      </span>
      <p className="text-base text-white/70">{label}</p>
    </div>
  );
}

/** Icon, title, paragraph and a button. `primary` marks the step to do next. */
function CardBody({
  icon,
  title,
  text,
  href,
  button,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  button: string;
  primary?: boolean;
}) {
  return (
    <div className="flex h-full flex-col p-[30px]">
      <div className="flex items-center gap-[14px]">
        <Chip>{icon}</Chip>
        <h3 className="text-[22px] font-semibold text-black">{title}</h3>
      </div>
      <p className="mt-[18px] flex-1 text-lg leading-[27px] text-gray-600">{text}</p>
      <div className="mt-10">
        <Link
          href={href}
          className={`inline-flex h-[45px] items-center rounded-md px-5 text-lg font-semibold ${
            primary ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          }`}
        >
          {button}
        </Link>
      </div>
    </div>
  );
}

/** A whole-card link with an arrow, for the shorter entries. */
function LinkCard({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-6 rounded-xl border border-gray-200 bg-white p-[30px] transition-shadow hover:shadow-md"
    >
      <div>
        <div className="flex items-center gap-[14px]">
          <Chip>{icon}</Chip>
          <h3 className="text-[22px] font-semibold text-black">{title}</h3>
        </div>
        <p className="mt-[18px] text-lg leading-[27px] text-gray-600">{text}</p>
      </div>
      <MdChevronRight className="h-8 w-8 shrink-0 text-gray-900" />
    </Link>
  );
}

/** The first page a new creator lands on: what to do first, with a checklist that ticks itself. */
export default async function GetStartedPage() {
  const session = await auth();
  const userId = session!.user.id;
  const token = await getNocodeToken();

  const [services, courses, branding] = await Promise.all([
    nocodeDb.services.findMany({ where: { creator_id: userId } }, token),
    nocodeDb.courses.findMany({ where: { creator_id: userId } }, token),
    getBranding(userId),
  ]);
  const product = branding.productName || "service";
  const Product = product.charAt(0).toUpperCase() + product.slice(1);

  const linkedCourse = services.some((s) => String(s.course_id || "").trim() !== "");
  const steps = [
    { label: "Create account", done: true, href: "/creator/getstarted" },
    { label: `Setup your first offering: We call it a ${product}`, done: services.length > 0, href: "/creator/services/new" },
    { label: "Create & link your digital product", done: courses.length > 0 && linkedCourse, href: "/creator/courses" },
    // Payouts are not built yet: shown so the list matches, but it cannot be opened or finished.
    { label: "Setup your bank account", done: false, href: "", soon: true },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done && !s.soon);

  const firstName = (session!.user.name || "").trim().split(/\s+/)[0] || "there";

  const card = "overflow-hidden rounded-xl border border-gray-200 bg-white";

  return (
    // The creator layout pads the page 32px each side; the reference uses about 16px on the left and
    // runs nearly to the right edge, so the cards are as wide as theirs. (Margins are outside the zoom.)
    <div className="lg:-ml-4 lg:-mr-6 lg:pt-2">
    <div style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}>
      <h1 className="text-[40px] font-bold leading-tight text-black">Hello {firstName}, welcome!</h1>
      <p className="mt-1 text-lg text-gray-700">Your journey on {APP_NAME} starts here!</p>

      {/* Checklist with the walkthrough beside it */}
      <section className={`mt-[26px] grid md:grid-cols-2 ${card}`}>
        <div className="p-[30px]">
          <h2 className="text-[26px] font-semibold leading-tight text-black">Let&rsquo;s get started</h2>
          <p className="mt-3 text-xl text-gray-600">
            {doneCount} out of {steps.length} steps completed
          </p>
          <ol className="mt-8 space-y-5">
            {steps.map((s, i) => (
              <li key={s.label}>
                {s.soon ? (
                  <div className="flex items-center gap-[15px] text-lg" aria-disabled>
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-gray-300 text-base text-gray-600">
                      {i + 1}
                    </span>
                    <span className="text-gray-600">{s.label}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Coming soon</span>
                  </div>
                ) : (
                  <Link href={s.href} className="flex items-center gap-[15px] text-lg hover:opacity-80">
                    <span
                      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-base ${
                        s.done
                          ? "bg-green-600 text-white"
                          : i === currentIndex
                            ? "border-2 border-green-600 text-green-700"
                            : "border border-gray-300 text-gray-600"
                      }`}
                    >
                      {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={s.done ? "text-gray-600 line-through" : "text-black"}>{s.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
        <Walkthrough src={INTRO_VIDEO} label="Walkthrough video coming soon" />
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className={card}>
          <CardBody
            icon={<MdWork className="h-6 w-6" />}
            title={`Create a ${Product}`}
            text={`A ${product} is what you sell. It is a payment page that you can link with workshops, courses and more. Anyone who buys a ${product} gets access to everything linked to it.`}
            href="/creator/services/new"
            button="Start building"
            primary={currentIndex === 1}
          />
        </div>
      </div>

      <h2 className="mb-[23px] mt-11 text-[26px] font-semibold leading-tight text-black">Create Digital Products</h2>
      <section className={`grid md:grid-cols-2 ${card}`}>
        <CardBody
          icon={<MdBook className="h-6 w-6" />}
          title="Build a Course"
          text="Create a recorded course with videos, audio, images, PDFs and more. Add chapters and arrange them in sections to make it a fun learning experience."
          href="/creator/courses"
          button="Start building"
          primary={currentIndex === 2}
        />
        <Walkthrough src={COURSE_VIDEO} label="Course walkthrough coming soon" />
      </section>
      <div className="mt-5 grid md:grid-cols-2">
        <LinkCard
          icon={<MdVideocam className="h-6 w-6" />}
          title="Create a Workshop"
          text="Conduct workshops, live Q&As, community calls and more. Reminders by email can be set up from Automation."
          href="/creator/workshops"
        />
      </div>

      <h2 className="mb-[23px] mt-11 text-[26px] font-semibold leading-tight text-black">Create a Page</h2>
      <div className="mb-10 grid md:grid-cols-2">
        <LinkCard
          icon={<MdLanguage className="h-6 w-6" />}
          title="Build a Landing Page"
          text={`Choose a template or build a landing page from scratch to promote your ${product}s to your audience and increase your conversions.`}
          href="/creator/landing-pages"
        />
      </div>
    </div>
    </div>
  );
}
