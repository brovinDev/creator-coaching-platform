"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FunnelLanding, FunnelThanks } from "@/components/funnel/funnel-pages";
import { FaqList, StringList, TestimonialList, TitledList } from "@/components/funnel/list-editors";
import { LIMITS, THEMES, missingForPublish, type LandingContent, type ThanksContent, type ThemeId } from "@/lib/funnel";
import { cn } from "@/lib/utils";

interface FunnelData {
  id: string;
  title: string;
  slug: string;
  theme: ThemeId;
  serviceId: string;
  published: boolean;
  content: LandingContent;
  thanks: ThanksContent;
}
interface ServiceOption {
  id: string;
  title: string;
  price: number | string;
  service_type?: string;
  slug?: string;
}

type Stage = "landing" | "registration" | "thanks";
const STAGES: { id: Stage; label: string }[] = [
  { id: "landing", label: "Landing page" },
  { id: "registration", label: "Registration" },
  { id: "thanks", label: "Thank you" },
];

/** One mini-problem at a time. `section` is the part of the page the preview scrolls to. */
const STEPS = [
  { id: "event", section: "event", title: "When is your webinar?", hint: "Visitors see this at the top of the page and in the sticky bar.", needs: (c: LandingContent) => !!c.eventDate },
  { id: "headline", section: "event", title: "What is your headline?", hint: "One clear promise. Who it is for and what they will get.", needs: (c: LandingContent) => !!c.headline.trim() },
  { id: "subheadline", section: "event", title: "Add a subheadline", hint: "One or two sentences that back up the headline.", optional: true },
  { id: "cta", section: "event", title: "What should the button say?", hint: "Short and active, like “Reserve my seat”.", optional: true },
  { id: "topics", section: "topics", title: "What will you cover?", hint: "The main topics, in order. Up to 7.", needs: (c: LandingContent) => c.topics.some((t) => t.title.trim()) },
  { id: "outcomes", section: "outcomes", title: "What will people walk away with?", hint: "Concrete results, one line each. Up to 6.", optional: true },
  { id: "audience", section: "audience", title: "Who is this for?", hint: "Up to 4 kinds of people who will benefit most.", optional: true },
  { id: "host", section: "host", title: "Tell people about the host", hint: "Your name, a short bio and a photo build trust.", optional: true },
  { id: "testimonials", section: "testimonials", title: "Add testimonials", hint: "Skip this if you have none yet. Up to 6.", optional: true },
  { id: "bonuses", section: "bonuses", title: "Any bonuses for joining?", hint: "Optional extras such as a recording or a checklist. Up to 3.", optional: true },
  { id: "faqs", section: "faqs", title: "Answer common questions", hint: "Prerequisites, replay, refunds. Up to 6.", optional: true },
  { id: "theme", section: "event", title: "Pick a look", hint: "The thank-you page uses the same look.", optional: true },
] as const;

export default function FunnelBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [stage, setStage] = useState<Stage>("landing");
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadServices = useCallback(async () => {
    const res = await fetch("/api/services");
    if (res.ok) setServices(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/funnels/${id}`);
      if (!res.ok) return router.push("/creator/page-builder/webinar");
      setFunnel(await res.json());
      loaded.current = true;
      const list = await fetch("/api/services");
      if (list.ok) setServices(await list.json());
    })();
  }, [id, router]);

  const save = useCallback(
    async (f: FunnelData) => {
      setSaveState("saving");
      const res = await fetch(`/api/funnels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: f.title, theme: f.theme, content: f.content, thanks: f.thanks, serviceId: f.serviceId }),
      });
      dirty.current = false;
      setSaveState(res.ok ? "saved" : "error");
      return res.ok;
    },
    [id]
  );

  // Autosave shortly after the creator stops typing.
  useEffect(() => {
    if (!funnel || !loaded.current || !dirty.current) return;
    const t = setTimeout(() => save(funnel), 800);
    return () => clearTimeout(t);
  }, [funnel, save]);

  const edit = (fn: (f: FunnelData) => FunnelData) => {
    dirty.current = true;
    setFunnel((f) => (f ? fn(f) : f));
  };
  const setC = (patch: Partial<LandingContent>) => edit((f) => ({ ...f, content: { ...f.content, ...patch } }));
  const setT = (patch: Partial<ThanksContent>) => edit((f) => ({ ...f, thanks: { ...f.thanks, ...patch } }));

  const current = STEPS[step];
  const section = stage === "landing" ? current.section : "";

  // Bring the part of the page being edited into view.
  useEffect(() => {
    const box = previewRef.current;
    const el = section && box?.querySelector<HTMLElement>(`#${section}`);
    if (box && el) box.scrollTo({ top: Math.max(0, el.offsetTop - 70), behavior: "smooth" });
  }, [section, step, funnel?.content.topics.length, funnel?.content.faqs.length]);

  const service = useMemo(() => services.find((s) => s.id === funnel?.serviceId), [services, funnel?.serviceId]);
  if (!funnel) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  const registerHref = service?.slug ? `/s/${service.slug}` : "#";
  const priceLabel = service ? (service.service_type === "free" || !Number(service.price) ? "Free" : `₹${Number(service.price).toLocaleString("en-IN")}`) : "";
  const canNext = !("needs" in current) || current.needs(funnel.content);

  async function go(to: Stage) {
    if (dirty.current && funnel) await save(funnel);
    setStage(to);
  }

  async function uploadPhoto(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) return toast.error("Could not upload the photo");
    setC({ hostPhoto: data.url });
  }

  async function publish(live: boolean) {
    if (!funnel) return;
    setBusy(true);
    const saved = await save(funnel);
    const res = saved
      ? await fetch(`/api/funnels/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: live }) })
      : null;
    setBusy(false);
    if (!res?.ok) return toast.error((await res?.json().catch(() => null))?.error || "Could not save your changes");
    edit((f) => ({ ...f, published: live }));
    dirty.current = false;
    toast.success(live ? "Your webinar page is live" : "Page unpublished");
  }

  const missing = missingForPublish(funnel.content, funnel.serviceId);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/w/${funnel.slug}` : `/w/${funnel.slug}`;
  const host = { brand: "Your brand" };

  const form = (
    <div className="space-y-5">
      {stage === "landing" && (
        <>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Question {step + 1} of {STEPS.length}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{current.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{current.hint}</p>
          </div>

          {current.id === "event" && (
            <div className="space-y-3">
              <Input label="Date and time" type="datetime-local" value={funnel.content.eventDate} onChange={(e) => setC({ eventDate: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="How long" maxLength={40} value={funnel.content.duration} onChange={(e) => setC({ duration: e.target.value })} />
                <Input label="Language" maxLength={40} value={funnel.content.language} onChange={(e) => setC({ language: e.target.value })} />
              </div>
            </div>
          )}
          {current.id === "headline" && <Textarea rows={3} maxLength={LIMITS.headline} placeholder="e.g. AI Engineer Roadmap Masterclass" value={funnel.content.headline} onChange={(e) => setC({ headline: e.target.value })} />}
          {current.id === "subheadline" && <Textarea rows={3} maxLength={LIMITS.sub} value={funnel.content.subheadline} onChange={(e) => setC({ subheadline: e.target.value })} />}
          {current.id === "cta" && <Input maxLength={40} value={funnel.content.ctaText} onChange={(e) => setC({ ctaText: e.target.value })} />}
          {current.id === "topics" && <TitledList items={funnel.content.topics} max={LIMITS.topics} onChange={(topics) => setC({ topics })} addLabel="Add a topic" titleLabel="Topic" textLabel="One line about it (optional)" />}
          {current.id === "outcomes" && <StringList items={funnel.content.outcomes} max={LIMITS.outcomes} onChange={(outcomes) => setC({ outcomes })} addLabel="Add a result" placeholder="e.g. A 90-day action plan" />}
          {current.id === "audience" && <TitledList items={funnel.content.audience} max={LIMITS.audience} onChange={(audience) => setC({ audience })} addLabel="Add a group" titleLabel="Who (e.g. Backend engineers)" textLabel="Why it helps them (optional)" />}
          {current.id === "host" && (
            <div className="space-y-3">
              <Input label="Name" maxLength={80} value={funnel.content.hostName} onChange={(e) => setC({ hostName: e.target.value })} />
              <Textarea label="Short bio" rows={4} maxLength={LIMITS.bio} value={funnel.content.hostBio} onChange={(e) => setC({ hostBio: e.target.value })} />
              <div className="flex items-center gap-3">
                {funnel.content.hostPhoto && <img src={funnel.content.hostPhoto} alt="" className="h-14 w-14 rounded-full object-cover" />}
                <label className="cursor-pointer rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  {funnel.content.hostPhoto ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
                {funnel.content.hostPhoto && <button className="text-sm text-gray-500 hover:text-red-600" onClick={() => setC({ hostPhoto: "" })}>Remove</button>}
              </div>
            </div>
          )}
          {current.id === "testimonials" && <TestimonialList items={funnel.content.testimonials} max={LIMITS.testimonials} onChange={(testimonials) => setC({ testimonials })} />}
          {current.id === "bonuses" && <TitledList items={funnel.content.bonuses} max={LIMITS.bonuses} onChange={(bonuses) => setC({ bonuses })} addLabel="Add a bonus" titleLabel="Bonus" textLabel="What it is (optional)" />}
          {current.id === "faqs" && <FaqList items={funnel.content.faqs} max={LIMITS.faqs} onChange={(faqs) => setC({ faqs })} />}
          {current.id === "theme" && (
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(THEMES) as ThemeId[]).map((k) => (
                <button key={k} type="button" onClick={() => edit((f) => ({ ...f, theme: k }))}
                  className={cn("rounded-xl border-2 p-3 text-left", funnel.theme === k ? "border-indigo-600" : "border-gray-200 hover:border-gray-300")}>
                  <div className="mb-2 flex h-12 items-end rounded-md p-2" style={{ background: THEMES[k].bg, border: `1px solid ${THEMES[k].border}` }}>
                    <span className="h-2 w-8 rounded" style={{ background: THEMES[k].accent }} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{THEMES[k].label}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {step < STEPS.length - 1 ? (
              <div className="flex items-center gap-2">
                {"optional" in current && current.optional && <Button variant="ghost" onClick={() => setStep(step + 1)}>Skip</Button>}
                <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button onClick={() => go("registration")}>Landing page done: next, registration <ArrowRight className="h-4 w-4" /></Button>
            )}
          </div>
        </>
      )}

      {stage === "registration" && (
        <>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choose the service people register for</h2>
            <p className="mt-1 text-sm text-gray-500">The button on your landing page takes people to this service&apos;s page, where they pay or sign up.</p>
          </div>
          {services.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You have no services yet. Create one, then come back and refresh.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => (
                <button key={s.id} type="button" onClick={() => edit((f) => ({ ...f, serviceId: s.id }))}
                  className={cn("flex w-full items-center justify-between rounded-xl border-2 p-3 text-left", funnel.serviceId === s.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300")}>
                  <span className="font-medium text-gray-900">{s.title}</span>
                  <span className="text-sm text-gray-500">{s.service_type === "free" || !Number(s.price) ? "Free" : `₹${Number(s.price).toLocaleString("en-IN")}`}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <a href="/creator/services/new" target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Create a new service</Button></a>
            <Button variant="ghost" size="sm" onClick={loadServices}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => go("landing")}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button disabled={!funnel.serviceId} onClick={() => go("thanks")}>Next: thank-you page <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </>
      )}

      {stage === "thanks" && (
        <>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your thank-you page</h2>
            <p className="mt-1 text-sm text-gray-500">People see this right after they register. It uses the same look as your landing page.</p>
          </div>
          <Input label="Headline" maxLength={LIMITS.headline} value={funnel.thanks.headline} onChange={(e) => setT({ headline: e.target.value })} />
          <Textarea label="Message" rows={3} maxLength={LIMITS.text} value={funnel.thanks.message} onChange={(e) => setT({ message: e.target.value })} />
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">What happens next (optional)</p>
            <StringList items={funnel.thanks.steps} max={5} onChange={(steps) => setT({ steps })} addLabel="Add a line" placeholder="e.g. Check your email" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={funnel.thanks.buttonEnabled} onChange={(e) => setT({ buttonEnabled: e.target.checked })} />
            Show a button (WhatsApp community or any link)
          </label>
          {funnel.thanks.buttonEnabled && (
            <div className="space-y-3">
              <Input label="Button text" maxLength={40} value={funnel.thanks.buttonText} onChange={(e) => setT({ buttonText: e.target.value })} />
              <Input label="Link" placeholder="https://chat.whatsapp.com/..." value={funnel.thanks.buttonUrl} onChange={(e) => setT({ buttonUrl: e.target.value })} />
              {!/^https?:\/\//i.test(funnel.thanks.buttonUrl) && <p className="text-xs text-amber-700">The button only appears with a link that starts with https://</p>}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            {missing.length > 0 && <p className="mb-3 text-sm text-amber-800">Before publishing, add {missing.join(", ")}.</p>}
            {funnel.published && (
              <p className="mb-3 break-all text-sm text-gray-700">
                Live at <a className="font-medium text-indigo-600 underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
              </p>
            )}
            <div className="flex gap-2">
              <Button loading={busy} disabled={missing.length > 0 && !funnel.published} onClick={() => publish(!funnel.published)}>
                {funnel.published ? "Unpublish" : "Publish webinar page"}
              </Button>
              <Link href="/creator/page-builder/webinar"><Button variant="ghost">All pages</Button></Link>
            </div>
          </div>
          <Button variant="ghost" onClick={() => go("registration")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        </>
      )}
    </div>
  );

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col lg:-m-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/creator/page-builder/webinar" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></Link>
          <input
            aria-label="Page name"
            className="rounded px-1 text-base font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={funnel.title}
            maxLength={100}
            onChange={(e) => edit((f) => ({ ...f, title: e.target.value }))}
          />
          <span className="text-xs text-gray-400">{saveState === "saving" ? "Saving..." : saveState === "error" ? "Not saved" : "Saved"}</span>
        </div>
        <ol className="flex items-center gap-1 text-sm">
          {STAGES.map((s, i) => {
            const done = i < STAGES.findIndex((x) => x.id === stage);
            return (
              <li key={s.id} className="flex items-center gap-1">
                <button onClick={() => go(s.id)} className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 font-medium", stage === s.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", stage === s.id ? "bg-white/20" : "bg-gray-200")}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>
                  {s.label}
                </button>
                {i < STAGES.length - 1 && <span className="text-gray-300">›</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(340px,440px)_1fr]">
        <div className="overflow-y-auto border-r border-gray-200 bg-white p-5 lg:max-h-[calc(100vh-8.5rem)]">{form}</div>
        <div className="bg-gray-100 p-4">
          <div
            ref={previewRef}
            onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}
            className="relative mx-auto h-[calc(100vh-10.5rem)] max-w-3xl overflow-y-auto rounded-xl border border-gray-300 bg-white shadow-sm"
          >
            {stage === "thanks" ? (
              <FunnelThanks content={funnel.thanks} theme={funnel.theme} host={host} />
            ) : (
              <FunnelLanding content={funnel.content} theme={funnel.theme} host={host} registerHref={registerHref} priceLabel={priceLabel} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
