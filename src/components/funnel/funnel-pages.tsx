import { THEMES, eventLabel, type LandingContent, type ThanksContent, type ThemeId } from "@/lib/funnel";

/**
 * The webinar landing page and thank-you page. Pure markup with a fixed layout, used by the public
 * pages and by the builder's live preview, so what the creator sees is what visitors get. Empty
 * sections are left out; section ids let the preview scroll to what is being edited.
 */

export interface Host {
  brand: string;
  logo?: string;
}

const palette = (theme: ThemeId) => THEMES[theme] ?? THEMES.light;

function Shell({ theme, children }: { theme: ThemeId; children: React.ReactNode }) {
  const t = palette(theme);
  return (
    <div style={{ background: t.bg, color: t.text }} className="min-h-full font-sans">
      {children}
    </div>
  );
}

function Button({ theme, children, href }: { theme: ThemeId; children: React.ReactNode; href?: string }) {
  const t = palette(theme);
  return (
    <a
      href={href || "#"}
      style={{ background: t.accent, color: t.onAccent }}
      className="inline-block rounded-lg px-7 py-3.5 text-base font-semibold shadow-sm transition-opacity hover:opacity-90"
    >
      {children}
    </a>
  );
}

function Section({ id, theme, alt, title, children }: { id: string; theme: ThemeId; alt?: boolean; title?: string; children: React.ReactNode }) {
  const t = palette(theme);
  return (
    <section id={id} style={{ background: alt ? t.alt : t.bg }} className="px-5 py-14">
      <div className="mx-auto max-w-3xl">
        {title && <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

export interface LandingProps {
  content: LandingContent;
  theme: ThemeId;
  host: Host;
  /** Where the register button goes (the registration service page). */
  registerHref: string;
  priceLabel?: string;
}

export function FunnelLanding({ content: c, theme, host, registerHref, priceLabel }: LandingProps) {
  const t = palette(theme);
  const when = eventLabel(c.eventDate);
  const topics = c.topics.filter((x) => x.title.trim());
  const outcomes = c.outcomes.filter((x) => x.trim());
  const audience = c.audience.filter((x) => x.title.trim());
  const testimonials = c.testimonials.filter((x) => x.quote.trim());
  const bonuses = c.bonuses.filter((x) => x.title.trim());
  const faqs = c.faqs.filter((x) => x.q.trim());
  const card = { background: t.card, borderColor: t.border } as const;

  return (
    <Shell theme={theme}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-2 font-semibold">
          {host.logo && <img src={host.logo} alt="" className="h-8 w-8 rounded object-cover" />}
          {host.brand}
        </div>
        {when && (
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: t.accent, color: t.onAccent }}>
            LIVE · {when}
          </span>
        )}
      </div>

      <section id="event" className="px-5 pb-14 pt-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{c.headline || "Your headline appears here"}</h1>
          {c.subheadline && <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: t.muted }}>{c.subheadline}</p>}
          <div className="mt-8">
            <Button theme={theme} href={registerHref}>{c.ctaText || "Register Now"}</Button>
          </div>
          {(when || c.duration || c.language) && (
            <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: t.muted }}>
              {when && <span>📅 {when}</span>}
              {c.duration && <span>⏱ {c.duration}</span>}
              {c.language && <span>🗣 {c.language}</span>}
            </div>
          )}
        </div>
      </section>

      {topics.length > 0 && (
        <Section id="topics" theme={theme} alt title="What we will cover">
          <div className="space-y-3">
            {topics.map((x, i) => (
              <div key={i} className="flex gap-4 rounded-xl border p-4" style={card}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: t.accent, color: t.onAccent }}>{i + 1}</span>
                <div>
                  <p className="font-semibold">{x.title}</p>
                  {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {outcomes.length > 0 && (
        <Section id="outcomes" theme={theme} title="What you will walk away with">
          <ul className="space-y-3">
            {outcomes.map((x, i) => (
              <li key={i} className="flex gap-3"><span style={{ color: t.accent }} className="font-bold">✓</span><span>{x}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {audience.length > 0 && (
        <Section id="audience" theme={theme} alt title="Who this is for">
          <div className="grid gap-4 sm:grid-cols-2">
            {audience.map((x, i) => (
              <div key={i} className="rounded-xl border p-5" style={card}>
                <p className="font-semibold">{x.title}</p>
                {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(c.hostName || c.hostBio) && (
        <Section id="host" theme={theme} title="Meet your host">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {c.hostPhoto ? (
              <img src={c.hostPhoto} alt={c.hostName} className="h-28 w-28 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full text-3xl font-bold" style={{ background: t.accent, color: t.onAccent }}>
                {(c.hostName || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              {c.hostName && <p className="text-xl font-bold">{c.hostName}</p>}
              {c.hostBio && <p className="mt-2 whitespace-pre-line" style={{ color: t.muted }}>{c.hostBio}</p>}
            </div>
          </div>
        </Section>
      )}

      {testimonials.length > 0 && (
        <Section id="testimonials" theme={theme} alt title="What people say">
          <div className="grid gap-4 sm:grid-cols-2">
            {testimonials.map((x, i) => (
              <figure key={i} className="rounded-xl border p-5" style={card}>
                <blockquote className="text-sm">“{x.quote}”</blockquote>
                <figcaption className="mt-3 text-sm font-semibold">
                  {x.name}
                  {x.role && <span className="font-normal" style={{ color: t.muted }}> · {x.role}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {bonuses.length > 0 && (
        <Section id="bonuses" theme={theme} title="Bonuses when you join">
          <div className="grid gap-4 sm:grid-cols-3">
            {bonuses.map((x, i) => (
              <div key={i} className="rounded-xl border p-5" style={card}>
                <p className="font-semibold">🎁 {x.title}</p>
                {x.text && <p className="mt-1 text-sm" style={{ color: t.muted }}>{x.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faqs" theme={theme} alt title="Questions, answered">
          <div className="space-y-3">
            {faqs.map((x, i) => (
              <details key={i} className="rounded-xl border p-4" style={card}>
                <summary className="cursor-pointer font-semibold">{x.q}</summary>
                {x.a && <p className="mt-2 text-sm" style={{ color: t.muted }}>{x.a}</p>}
              </details>
            ))}
          </div>
        </Section>
      )}

      <section id="final" className="px-5 py-16 text-center">
        <h2 className="mx-auto max-w-2xl text-2xl font-bold sm:text-3xl">{c.headline || "Ready to join?"}</h2>
        <div className="mt-6"><Button theme={theme} href={registerHref}>{c.ctaText || "Register Now"}</Button></div>
      </section>

      <footer className="px-5 pb-24 pt-4 text-center text-xs" style={{ color: t.muted }}>© {new Date().getFullYear()} {host.brand}</footer>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3" style={{ background: t.card, borderTop: `1px solid ${t.border}` }}>
        <div className="text-sm">
          {when && <p className="font-semibold">{when}</p>}
          {priceLabel && <p style={{ color: t.muted }}>{priceLabel}</p>}
        </div>
        <Button theme={theme} href={registerHref}>{c.ctaText || "Register Now"}</Button>
      </div>
    </Shell>
  );
}

export function FunnelThanks({ content: c, theme, host }: { content: ThanksContent; theme: ThemeId; host: Host }) {
  const t = palette(theme);
  const steps = c.steps.filter((s) => s.trim());
  return (
    <Shell theme={theme}>
      <div className="flex items-center gap-2 px-5 py-4 font-semibold" style={{ borderBottom: `1px solid ${t.border}` }}>
        {host.logo && <img src={host.logo} alt="" className="h-8 w-8 rounded object-cover" />}
        {host.brand}
      </div>
      <section className="px-5 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border p-8 text-center" style={{ background: t.card, borderColor: t.border }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl" style={{ background: t.accent, color: t.onAccent }}>✓</div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{c.headline || "You're registered!"}</h1>
          {c.message && <p className="mt-3" style={{ color: t.muted }}>{c.message}</p>}
          {c.buttonEnabled && c.buttonUrl && (
            <div className="mt-6"><Button theme={theme} href={c.buttonUrl}>{c.buttonText}</Button></div>
          )}
          {steps.length > 0 && (
            <div className="mt-8 border-t pt-6 text-left" style={{ borderColor: t.border }}>
              <p className="mb-3 font-semibold">What happens next?</p>
              <ul className="space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span style={{ color: t.accent }} className="font-bold">✓</span><span>{s}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
