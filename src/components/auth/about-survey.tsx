"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { MdGroups, MdHandshake, MdLanguage, MdMoreHoriz, MdPeopleAlt, MdRecordVoiceOver } from "react-icons/md";
import { SiGoogle } from "react-icons/si";
import toast from "react-hot-toast";
import { AuthHeader, type Step } from "@/components/auth/auth-shell";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

const STEPS: Step[] = [
  { label: "Register", state: "done" },
  { label: "About", state: "active" },
];

const STAGES = [
  "Discovering My Niche",
  "Building Courses",
  "Courses Ready, Looking to Launch",
  "Launched, Not Monetizing Yet",
  "Live and Making Money",
];

const REVENUE = ["0", "0-1L", "1-5L", "5-20L", "20-50L", "50L-1Cr", "1-2Cr", "2-5Cr", "5Cr+"];

const SOURCES: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Community or event", label: "Community or event", icon: MdGroups },
  { key: "Partner", label: `${APP_NAME} Partner`, icon: MdHandshake },
  { key: "Referred by a customer", label: "Referred by a customer", icon: MdPeopleAlt },
  { key: "Word of mouth", label: "Word of mouth", icon: MdRecordVoiceOver },
  { key: "Google", label: "Google", icon: SiGoogle },
  { key: "Instagram", label: "Instagram", icon: FaInstagram },
  { key: "Other", label: "Other", icon: MdMoreHoriz },
];

const WHITE_LABEL = ["Yes", "Can know more about it", "No"];

const PLATFORMS: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Instagram", icon: FaInstagram },
  { key: "YouTube", icon: FaYoutube },
  { key: "Facebook", icon: FaFacebook },
  { key: "X", icon: FaXTwitter },
  { key: "LinkedIn", icon: FaLinkedin },
  { key: "Website", icon: MdLanguage },
];

interface Social {
  platform: string;
  url: string;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-[30px]">
      <h2 className="text-xl font-semibold text-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A pill with a round radio mark. */
function Choice({ label, on, onClick, wide }: { label: string; on: boolean; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-[38px] cursor-pointer items-center gap-3 rounded-md border bg-white px-3 text-lg text-gray-800 ${
        on ? "border-indigo-600" : "border-gray-300"
      } ${wide ? "flex-1" : ""}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-indigo-600" : "border-gray-300"}`}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
      </span>
      {label}
    </button>
  );
}

/** Sign-up step 2: the "about you" questions. Every one is optional and the whole step can be skipped. */
export function AboutSurvey() {
  const router = useRouter();
  const [stage, setStage] = useState("");
  const [revenue, setRevenue] = useState(REVENUE[0]);
  const [source, setSource] = useState("");
  const [whiteLabel, setWhiteLabel] = useState("");
  const [socials, setSocials] = useState<Social[]>([{ platform: "Instagram", url: "" }]);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(skipped: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skipped ? { skipped: true } : { stage, revenue, source, whiteLabel, socials }),
      });
      if (!res.ok) throw new Error();
      router.push("/creator/getstarted");
    } catch {
      toast.error("Could not save your answers. You can skip this for now.");
      setSaving(false);
    }
  }

  const setSocial = (i: number, patch: Partial<Social>) =>
    setSocials((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col bg-indigo-50/70" style={{ zoom: 0.8, minHeight: "125vh", fontFamily: "var(--font-poppins), sans-serif" }}>
      <AuthHeader steps={STEPS} />

      <main className="mx-auto w-full max-w-[1034px] px-4 pb-16 pt-14">
        <h1 className="text-center text-[52px] font-bold leading-tight text-black">
          We&rsquo;d <span aria-label="love">&#10084;&#65039;</span> to know you better!
        </h1>
        <p className="mt-3 text-center text-xl text-gray-700">Your input helps us make {APP_NAME} work better for you.</p>

        <div className="mt-10 space-y-9">
          <Card title="1. What stage are you at currently?">
            <div className="flex flex-wrap gap-x-3 gap-y-3">
              {STAGES.map((s) => (
                <Choice key={s} label={s} on={stage === s} onClick={() => setStage(s)} />
              ))}
            </div>
          </Card>

          <Card title="2. What's your annual revenue from the coaching business?">
            <div className="relative">
              <div className="grid grid-cols-9">
                {REVENUE.map((r) => {
                  const on = revenue === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRevenue(r)}
                      aria-pressed={on}
                      className="flex cursor-pointer flex-col items-center gap-2 text-lg text-black"
                    >
                      <span
                        className={`flex items-center justify-center rounded-full border bg-white ${
                          on ? "h-[18px] w-[18px] border-2 border-indigo-600" : "h-[10px] w-[10px] border-gray-300"
                        }`}
                      />
                      <span className={on ? "font-medium" : ""}>{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title="3. How do you know about us?">
            <div className="grid grid-cols-12 gap-4">
              {SOURCES.map((s, i) => {
                const on = source === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSource(s.key)}
                    aria-pressed={on}
                    className={`flex h-[117px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-white px-2 text-lg text-gray-700 ${
                      i < 3 ? "col-span-12 sm:col-span-4" : "col-span-6 sm:col-span-3"
                    } ${on ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <Icon className="h-11 w-11 text-gray-600" />
                    <span className="text-center">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={`4. Do you want the ${APP_NAME} platform under your own brand? (White-labelled)`}>
            <div className="flex flex-wrap gap-3">
              {WHITE_LABEL.map((w) => (
                <Choice key={w} label={w} on={whiteLabel === w} onClick={() => setWhiteLabel(w)} wide />
              ))}
            </div>
          </Card>

          <Card title="5. Can you share your social profile (optional)">
            <div className="space-y-3">
              {socials.map((s, i) => {
                const platform = PLATFORMS.find((p) => p.key === s.platform) ?? PLATFORMS[0];
                const Icon = platform.icon;
                return (
                  <div key={i} className="relative flex h-[60px] rounded-md border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setMenuFor(menuFor === i ? null : i)}
                      className="flex w-[227px] shrink-0 cursor-pointer items-center gap-3 border-r border-gray-200 px-4 text-lg text-black"
                    >
                      <Icon className="h-6 w-6" />
                      <span>{platform.key}</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </button>
                    <input
                      value={s.url}
                      onChange={(e) => setSocial(i, { url: e.target.value })}
                      placeholder={platform.key === "Website" ? "https://" : "Profile link or @handle"}
                      className="min-w-0 flex-1 px-4 text-lg text-black placeholder:text-gray-500 focus:outline-none"
                    />
                    {socials.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSocials((list) => list.filter((_, idx) => idx !== i))}
                        aria-label="Remove"
                        className="cursor-pointer px-4 text-gray-500 hover:text-black"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                    {menuFor === i && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <ul className="absolute left-0 top-full z-20 mt-1 w-[227px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          {PLATFORMS.map((p) => (
                            <li key={p.key}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSocial(i, { platform: p.key });
                                  setMenuFor(null);
                                }}
                                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-base hover:bg-gray-50"
                              >
                                <p.icon className="h-5 w-5" /> {p.key}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSocials((list) => [...list, { platform: "YouTube", url: "" }])}
              disabled={socials.length >= 6}
              className="mt-5 h-[45px] w-full cursor-pointer rounded-md bg-gray-200 text-lg font-semibold text-black hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add More
            </button>
          </Card>
        </div>

        <button
          onClick={() => save(false)}
          disabled={saving}
          className="mt-8 h-[48px] w-full cursor-pointer rounded-md bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Next"}
        </button>
        <p className="mt-4 text-center">
          <button onClick={() => save(true)} disabled={saving} className="cursor-pointer text-lg text-gray-600 hover:text-black hover:underline">
            Skip for now
          </button>
        </p>
      </main>
    </div>
  );
}
