import { THEMES, eventParts, splitHeadline, type LandingContent, type ThanksContent, type ThemeId } from "@/lib/funnel";

/**
 * The webinar landing page and thank-you page, styled after the client's own webinar page. Pure
 * markup with a fixed layout, used by the public pages and by the builder's live preview, so what
 * the creator sees is what visitors get. Empty sections are left out; section ids let the preview
 * scroll to what is being edited.
 */

export interface Host {
  brand: string;
  logo?: string;
}

export interface PriceInfo {
  /** "₹49" or "Free". */
  now: string;
  /** The struck-through price when there is a discount. */
  was?: string;
}

const palette = (theme: ThemeId) => THEMES[theme] ?? THEMES.violet;
type Palette = ReturnType<typeof palette>;

const gradient = (t: Palette) => `linear-gradient(135deg, ${t.accent} 0%, ${t.accent2} 100%)`;
const glow = (t: Palette) => `0 8px 28px ${t.accent}55`;

function Shell({ t, children }: { t: Palette; children: React.ReactNode }) {
  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }} className="min-h-full">
      {children}
    </div>
  );
}

function Cta({ t, href, children }: { t: Palette; href?: string; children: React.ReactNode }) {
  return (
    <a
      href={href || "#"}
      style={{ background: gradient(t), color: t.onAccent, boxShadow: glow(t) }}
      className="inline-block rounded-lg px-8 py-4 text-base font-bold transition-transform hover:-translate-y-0.5 sm:text-lg"
    >
      {children} →
    </a>
  );
}

function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="text-2xl font-extrabold sm:text-4xl">{children}</h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl opacity-70">{sub}</p>}
    </div>
  );
}

function Section({ id, children, wide }: { id: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section id={id} className="px-5 py-16">
      <div className={`mx-auto ${wide ? "max-w-5xl" : "max-w-3xl"}`}>{children}</div>
    </section>
  );
}

function Initials({ t, name, size = 44 }: { t: Palette; name: string; size?: number }) {
  const letters = name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, background: gradient(t), color: t.onAccent }}>
      {letters}
    </div>
  );
}

const chip = (t: Palette) => ({ background: t.card, border: `1px solid ${t.border}` });

export interface LandingProps {
  content: LandingContent;
  theme: ThemeId;
  host: Host;
  /** Where the register button goes (the registration service page). */
  registerHref: string;
  price?: PriceInfo;
}

export function FunnelLanding({ content: c, theme, host, registerHref, price }: LandingProps) {
  const t = palette(theme);
  const when = eventParts(c.eventDate);
  const tz = c.timeZone ? ` ${c.timeZone}` : "";
  const [before, mark, after] = splitHeadline(c.headline || "Your headline appears here", c.highlight);
  const topics = c.topics.filter((x) => x.title.trim());
  const outcomes = c.outcomes.filter((x) => x.title.trim());
  const audience = c.audience.filter((x) => x.title.trim());
  const testimonials = c.testimonials.filter((x) => x.quote.trim());
  const bonuses = c.bonuses.filter((x) => x.title.trim());
  const faqs = c.faqs.filter((x) => x.q.trim());
  const seats = c.seatsClaimed && c.seatsTotal ? { claimed: c.seatsClaimed, total: c.seatsTotal } : null;
  const facts = [
    when && { label: "DATE", value: when.date, icon: "📅" },
    when && { label: "TIME", value: `${when.time}${tz}`, icon: "⏰" },
    c.duration && { label: "DURATION", value: c.duration, icon: "⏱" },
    c.language && { label: "LANGUAGE", value: c.language, icon: "🗣" },
  ].filter(Boolean) as { label: string; value: string; icon: string }[];
  const card = { background: t.card, border: `1px solid ${t.border}` } as const;
  const trust = (
    <p className="mt-4 text-sm" style={{ color: t.muted }}>🔒 Secure payment • Instant confirmation • Limited spots available</p>
  );

  return (
    <Shell t={t}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm" style={{ borderBottom: `1px solid ${t.border}` }}>
        <span className="flex items-center gap-2 font-bold"><span className="h-2 w-2 rounded-full bg-red-500" />LIVE</span>
        {when && <span className="font-semibold">Next Session: {when.date}, {when.time}{tz}</span>}
        {seats ? (
          <span style={{ color: t.muted }}><b style={{ color: t.hi2 }}>{seats.claimed}</b> seats claimed of <b style={{ color: t.hi2 }}>{seats.total}</b></span>
        ) : <span />}
      </div>

      <section id="event" className="px-5 pb-20 pt-16 text-center">
        <div className="mx-auto max-w-4xl">
          {c.badge && (
            <span className="mb-6 inline-block rounded-full px-5 py-2 text-sm font-semibold" style={{ ...chip(t), borderColor: `${t.hi2}66` }}>{c.badge}</span>
          )}
          <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
            {before}
            {mark && <span style={{ backgroundImage: `linear-gradient(135deg, ${t.hi1}, ${t.hi2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{mark}</span>}
            {after}
          </h1>
          {c.subheadline && <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl" style={{ color: t.muted }}>{c.subheadline}</p>}
          {facts.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left" style={chip(t)}>
                  <span className="text-xl">{f.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider" style={{ color: t.muted }}>{f.label}</p>
                    <p className="text-sm font-bold">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-10"><Cta t={t} href={registerHref}>{c.ctaText || "Register Now"}</Cta>{trust}</div>
        </div>
      </section>

      {price && (
        <div className="flex items-center justify-center gap-4 px-5 py-3 text-sm font-semibold" style={{ borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, background: t.alt }}>
          {when && <span>LIVE {when.date} • {when.time}{tz}</span>}
          <span className="flex items-baseline gap-2">
            {price.was && <s style={{ color: t.muted }}>{price.was}</s>}
            <b className="text-lg" style={{ color: t.good }}>{price.now}</b>
          </span>
        </div>
      )}

      {topics.length > 0 && (
        <Section id="topics">
          <Heading>What You Will Learn</Heading>
          <div className="space-y-3">
            {topics.map((x, i) => (
              <div key={i} className="flex gap-4 rounded-xl p-5" style={{ ...card, borderColor: `${t.accent}4d` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ background: gradient(t), color: t.onAccent }}>{i + 1}</span>
                <div>
                  <p className="font-bold">{x.title}</p>
                  {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {outcomes.length > 0 && (
        <Section id="outcomes">
          <Heading>By the end of this session, you&apos;ll walk away with:</Heading>
          <div className="space-y-3">
            {outcomes.map((x, i) => {
              const last = i === outcomes.length - 1 && outcomes.length > 1;
              return (
                <div key={i} className="flex items-start gap-4 rounded-xl p-4" style={{ ...card, ...(last ? { borderColor: t.good, background: `${t.good}1f` } : {}) }}>
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ background: `${t.good}33`, color: t.good }}>✓</span>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider" style={{ color: last ? t.good : t.muted }}>{last ? "THE FINISH LINE" : `STEP ${i + 1}`}</p>
                    <p className="font-bold">{x.title}</p>
                    {x.text && <p className="mt-0.5 text-sm" style={{ color: t.muted }}>{x.text}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {audience.length > 0 && (
        <Section id="audience">
          <Heading>Who Is This Session for?</Heading>
          <div className="grid gap-4 sm:grid-cols-2">
            {audience.map((x, i) => (
              <div key={i} className="rounded-xl p-5" style={card}>
                <p className="font-bold">{x.title}</p>
                {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(c.hostName || c.hostBio) && (
        <Section id="host" wide>
          <Heading>Who&apos;s Teaching This?</Heading>
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="text-center">
              {c.hostPhoto ? (
                <img src={c.hostPhoto} alt={c.hostName} className="mx-auto aspect-[4/5] w-full max-w-xs rounded-2xl object-cover" style={{ border: `1px solid ${t.border}` }} />
              ) : (
                <div className="mx-auto flex aspect-[4/5] w-full max-w-xs items-center justify-center rounded-2xl text-6xl font-bold" style={{ background: gradient(t), color: t.onAccent }}>
                  {(c.hostName || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {c.hostName && <p className="mt-3 font-bold">{c.hostName}</p>}
              {c.hostTitle && <p className="text-sm" style={{ color: t.muted }}>{c.hostTitle}</p>}
            </div>
            {c.hostBio && <p className="whitespace-pre-line leading-relaxed" style={{ color: t.muted }}>{c.hostBio}</p>}
          </div>
        </Section>
      )}

      {testimonials.length > 0 && (
        <Section id="testimonials" wide>
          <Heading>Hear What Others Have to Say</Heading>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((x, i) => (
              <figure key={i} className="rounded-xl p-5" style={card}>
                <div className="mb-3 flex items-center gap-3">
                  <Initials t={t} name={x.name} />
                  <figcaption>
                    <p className="text-sm font-bold">{x.name}</p>
                    {x.role && <p className="text-xs" style={{ color: t.muted }}>{x.role}</p>}
                  </figcaption>
                </div>
                <blockquote className="text-sm leading-relaxed" style={{ color: t.muted }}>{x.quote}</blockquote>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {bonuses.length > 0 && (
        <Section id="bonuses" wide>
          <Heading>Register Now &amp; Get These Bonuses</Heading>
          <div className="grid gap-4 md:grid-cols-3">
            {bonuses.map((x, i) => (
              <div key={i} className="rounded-xl p-5 text-center" style={{ ...card, borderColor: `${t.good}66` }}>
                <p className="text-2xl">🎁</p>
                <p className="mt-2 font-bold">{x.title}</p>
                {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
                {x.value && <p className="mt-3 text-sm font-bold" style={{ color: t.good }}>Value: {x.value}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faqs">
          <Heading>Frequently Asked Questions</Heading>
          <div className="space-y-3">
            {faqs.map((x, i) => (
              <details key={i} className="group rounded-xl px-5 py-4" style={card}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {x.q}<span style={{ color: t.accent }} className="transition-transform group-open:rotate-180">▾</span>
                </summary>
                {x.a && <p className="mt-3 text-sm" style={{ color: t.muted }}>{x.a}</p>}
              </details>
            ))}
          </div>
        </Section>
      )}

      <section id="final" className="px-5 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{c.closingHeadline || "Ready to join us?"}</h2>
          {facts.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl px-4 py-3 text-left" style={chip(t)}>
                  <p className="text-[10px] font-bold tracking-wider" style={{ color: t.muted }}>{f.label}</p>
                  <p className="text-sm font-bold">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8">
            <Cta t={t} href={registerHref}>{price?.now && price.now !== "Free" ? `${c.ctaText || "Register Now"} - Pay Only ${price.now}` : c.ctaText || "Register Now"}</Cta>
            {trust}
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between gap-3 px-5 py-6 pb-24 text-xs" style={{ borderTop: `1px solid ${t.border}`, color: t.muted }}>
        <span className="flex items-center gap-2 font-bold uppercase" style={{ color: t.text }}>
          {host.logo ? <img src={host.logo} alt="" className="h-7 w-7 rounded object-cover" /> : <span className="h-7 w-7 rounded" style={{ background: gradient(t) }} />}
          {host.brand}
        </span>
        <span>© {new Date().getFullYear()} {host.brand}. All rights reserved.</span>
      </footer>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-center gap-4 px-5 py-3" style={{ background: t.bg, borderTop: `1px solid ${t.border}` }}>
        {when && <span className="text-sm font-bold">LIVE {when.date} • {when.time}{tz}</span>}
        {price && (
          <span className="flex items-baseline gap-2 text-sm">
            {price.was && <s style={{ color: t.muted }}>{price.was}</s>}
            <b className="text-xl" style={{ color: t.good }}>{price.now}</b>
          </span>
        )}
        <a href={registerHref || "#"} style={{ background: gradient(t), color: t.onAccent, boxShadow: glow(t) }} className="rounded-lg px-5 py-2.5 text-sm font-bold">Reserve My Seat →</a>
      </div>
    </Shell>
  );
}

export function FunnelThanks({ content: c, theme }: { content: ThanksContent; theme: ThemeId; host: Host }) {
  const t = palette(theme);
  const steps = c.steps.filter((s) => s.trim());
  return (
    <Shell t={t}>
      <section className="px-5 py-14 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ color: t.good, background: `${t.good}1f`, border: `1px solid ${t.good}55` }}>✓ Registration Confirmed</span>
          <h1 className="mt-8 text-4xl font-extrabold uppercase sm:text-6xl" style={{ backgroundImage: "linear-gradient(135deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {c.headline || "Congratulations!"}
          </h1>
          {c.message && <p className="mt-6 text-2xl font-bold sm:text-3xl">{c.message}</p>}
          {c.note && <p className="mx-auto mt-5 max-w-lg text-lg" style={{ color: t.muted }}>{c.note}</p>}
          {c.buttonEnabled && c.buttonUrl && (
            <div className="mt-8">
              <a
                href={c.buttonUrl}
                className="inline-block rounded-lg px-9 py-4 text-lg font-extrabold uppercase text-white"
                style={{ background: "linear-gradient(135deg, #25d366, #128c7e)", boxShadow: "0 8px 28px #25d36655" }}
              >
                💬 {c.buttonText}
              </a>
            </div>
          )}
          {steps.length > 0 && (
            <div className="mt-12 rounded-2xl p-7 text-left" style={{ background: t.card, border: `1px solid ${t.border}` }}>
              <p className="mb-5 text-center text-xl font-bold">What Happens Next?</p>
              <ul className="space-y-4">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3"><span style={{ color: t.good }} className="font-bold">✓</span><span style={{ color: t.muted }}>{s}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
