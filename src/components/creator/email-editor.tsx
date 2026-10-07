"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Builder, useBuilder, type IToken, type IEntityContentJson } from "@beefree.io/react-email-builder";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BEEFREE_MERGE_TAGS, EMAIL_PLACEHOLDERS, placeholderToken } from "@/lib/email-merge-tags";

const LIST_URL = "/creator/automation/email";
const BUILDER_ID = "service-email-builder";
const BLANK_TEMPLATE = { comments: {}, page: {} } as unknown as IEntityContentJson;

const STARTER_SUBJECT = "Welcome to {service.name}";
const STARTER_BODY = `Hi {contact.firstname},

Thanks for registering for {service.name}. You can access everything from your dashboard:
{link.dashboard}

If you have any questions, just reply to this email.

{creator.name}`;

type Format = "text" | "html";
type Tab = "text" | "design";
type Mode = "save" | "test" | "generate";

interface Saved {
  serviceTitle: string;
  exists: boolean;
  enabled: boolean;
  /** A visual design is already stored for this email. */
  hasDesign: boolean;
  designJson: string | null;
}

interface DesignerSession {
  token: IToken;
  uid: string;
  template: IEntityContentJson;
}

interface DesignerApi {
  save: () => Promise<unknown>;
  preview: () => void;
}

function parseDesign(raw: string | null): IEntityContentJson {
  if (!raw) return BLANK_TEMPLATE;
  try {
    return JSON.parse(raw);
  } catch {
    return BLANK_TEMPLATE;
  }
}

/** The Beefree builder. Only mounted once the creator opens the designer, so plain-text emails never start a session. */
function DesignerPane({
  session,
  onSaved,
  onApi,
  onError,
}: {
  session: DesignerSession;
  onSaved: (designJson: string, html: string) => void;
  onApi: (api: DesignerApi) => void;
  onError: (err: unknown) => void;
}) {
  const { save, preview } = useBuilder({
    uid: session.uid,
    container: BUILDER_ID,
    language: "en-US",
    mergeTags: BEEFREE_MERGE_TAGS,
  });

  useEffect(() => {
    onApi({ save, preview });
  });

  return (
    <Builder
      id={BUILDER_ID}
      token={session.token}
      template={session.template}
      height="100%"
      onSave={(pageJson, pageHtml) => onSaved(pageJson, pageHtml)}
      onError={onError}
    />
  );
}

/**
 * One editor for the confirmation email. It keeps both versions: a plain-text email and a
 * designed (HTML) one from the visual designer. `format` picks what learners receive; a designed
 * email always carries a plain-text part, either the text written here or one made from the design.
 *
 * With a serviceId it edits that service's email; without one, the creator's default.
 */
export default function EmailEditor({ serviceId }: { serviceId?: string }) {
  const router = useRouter();
  const base = serviceId ? `/api/services/${serviceId}/email-template` : "/api/email-automation/default-template";

  const [saved, setSaved] = useState<Saved | null>(null);
  const [loadError, setLoadError] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [format, setFormat] = useState<Format>("text");
  const [tab, setTab] = useState<Tab>("text");
  const [designer, setDesigner] = useState<DesignerSession | null>(null);
  const [designerLoading, setDesignerLoading] = useState(false);
  const [busy, setBusy] = useState<Mode | null>(null);

  const subjectInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "body">("body");
  const designerApi = useRef<DesignerApi | null>(null);
  const modeRef = useRef<Mode>("save");
  // The builder calls back from outside React's render cycle, so it reads the latest values from here.
  const latest = useRef({ subject, body, format, saved });
  useEffect(() => {
    latest.current = { subject, body, format, saved };
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(base);
        if (!res.ok) throw new Error("Could not load the saved email");
        const data = await res.json();
        const hasDesign = !!data.exists && (data.format === "html" || !!data.design_json);
        setSaved({
          serviceTitle: data.service_title || "",
          exists: !!data.exists,
          enabled: !!data.enabled,
          hasDesign,
          designJson: data.design_json || null,
        });
        setSubject(data.subject || STARTER_SUBJECT);
        setFormat(data.exists ? data.format : "text");
        // Nothing written yet: start from a sensible message, not a blank box. A designed email may
        // deliberately have no text of its own (one is generated from the design).
        setBody(data.body_text || (data.exists && data.format === "html" ? "" : STARTER_BODY));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load the email");
      }
    }
    load();
  }, [base]);

  async function openDesigner() {
    setTab("design");
    if (designer || designerLoading || !saved) return;
    setDesignerLoading(true);
    try {
      const res = await fetch("/api/email-builder/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load the email builder");
      }
      const { uid, ...token } = await res.json();
      setDesigner({ token: token as IToken, uid, template: parseDesign(saved.designJson) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the email builder");
      setTab("text");
    } finally {
      setDesignerLoading(false);
    }
  }

  function insertPlaceholder(key: string) {
    const token = placeholderToken(key);
    const toSubject = lastField.current === "subject";

    // The designer has its own merge tags menu; here a click just copies the placeholder.
    if (!toSubject && tab !== "text") {
      navigator.clipboard?.writeText(token).then(
        () => toast.success(`Copied ${token}`),
        () => toast.error("Could not copy")
      );
      return;
    }
    const target = toSubject ? subjectInput.current : bodyInput.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const next = target.value.slice(0, start) + token + target.value.slice(end);
    if (toSubject) setSubject(next.slice(0, 200));
    else setBody(next);
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function sendJson(url: string, method: string, payload: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  /** Writes the email. `design` is only included when the designer was opened, so an untouched design is never overwritten. */
  async function persist(design?: { designJson: string; html: string }) {
    const { subject, body, format, saved } = latest.current;
    if (!saved) return;
    await sendJson(base, "PUT", {
      subject,
      body_text: body,
      format,
      ...(design ? { design_json: design.designJson, html: design.html } : {}),
      // A first email turns itself on; after that the switch on the list page decides.
      enabled: saved.exists ? saved.enabled : true,
    });
    setSaved({ ...saved, exists: true, enabled: saved.exists ? saved.enabled : true, hasDesign: saved.hasDesign || !!design });
    toast.success("Email saved");
  }

  async function sendTest(html?: string) {
    const { subject, body, format } = latest.current;
    const data = await sendJson(`${base}/test`, "POST", { subject, format, body_text: body, ...(html ? { html } : {}) });
    toast.success(data.message || "Test email sent");
  }

  async function generateText(html: string) {
    const data = await sendJson("/api/email-automation/html-to-text", "POST", { html });
    setBody(data.text);
    setTab("text");
    toast.success("Plain text generated from your design. Edit it however you like.");
  }

  // Called by the builder with its current design after save() is requested.
  async function handleDesignSaved(designJson: string, html: string) {
    try {
      const mode = modeRef.current;
      if (mode === "generate") await generateText(html);
      else if (mode === "test") await sendTest(html);
      else await persist({ designJson, html });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function run(mode: Mode) {
    const { subject, body, format, saved } = latest.current;
    if (!saved) return;
    if (mode !== "generate" && !subject.trim()) {
      toast.error("Add an email subject first");
      return;
    }
    if (mode !== "generate" && format === "text" && !body.trim()) {
      toast.error("Write the plain text email first");
      return;
    }
    if (mode !== "generate" && format === "html" && !designer && !saved.hasDesign) {
      toast.error("Open the Visual designer and design the email first");
      return;
    }

    modeRef.current = mode;
    setBusy(mode);

    // With the designer open, ask it for its current design; handleDesignSaved takes it from there.
    if (designer && designerApi.current) {
      designerApi.current.save().catch(() => {
        setBusy(null);
        toast.error("Failed to read the email design");
      });
      return;
    }
    try {
      if (mode === "test") await sendTest();
      else await persist();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const title = serviceId
    ? `Confirmation Email on Service Purchase${saved?.serviceTitle ? ` · ${saved.serviceTitle}` : ""}`
    : "Confirmation Email on Service Purchase · Default for all services";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100">
      <header className="flex items-center justify-between gap-4 bg-white px-5 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => router.push(LIST_URL)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Back to Email Automation"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Edit email</h1>
            <p className="truncate text-sm text-gray-500">{title}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {tab === "design" && designer && (
            <Button variant="outline" onClick={() => designerApi.current?.preview()}>
              Preview
            </Button>
          )}
          <Button
            variant="secondary"
            className="bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => run("test")}
            loading={busy === "test"}
            disabled={!saved || (busy !== null && busy !== "test")}
          >
            Send test email
          </Button>
          <Button onClick={() => run("save")} loading={busy === "save"} disabled={!saved || (busy !== null && busy !== "save")}>
            Save
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      ) : !saved ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <aside className="w-full shrink-0 space-y-5 bg-white p-4 lg:w-96 lg:overflow-y-auto">
            {!serviceId && (
              <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                Services without their own email use this one. A service&apos;s own email always takes priority.
              </p>
            )}

            <div>
              <label htmlFor="email-subject" className="mb-1 block text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> Email subject
              </label>
              <input
                id="email-subject"
                ref={subjectInput}
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => (lastField.current = "subject")}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">Learners receive</legend>
              <div className="space-y-2">
                {(
                  [
                    ["text", "Simple text email", "A plain email with no design."],
                    [
                      "html",
                      "Designed email (HTML)",
                      "The design from the Visual designer, sent together with a plain-text version for mail apps that don't show HTML.",
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                      format === value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="email-format"
                      checked={format === value}
                      onChange={() => setFormat(value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {format === "html" && (
                <p className="mt-2 text-xs text-gray-500">
                  The plain-text version is what you write in the Plain text tab. If it&apos;s empty, one is generated
                  from the design.
                </p>
              )}
            </fieldset>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Add placeholders to your email</p>
              <p className="mt-2 text-xs text-gray-600">
                Placeholders are replaced with each learner&apos;s details when the email is sent.{" "}
                {tab === "text"
                  ? "Click one to add it where your cursor is, in the subject or the body."
                  : "Click one to copy it, or pick one from the designer's merge tags menu."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EMAIL_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertPlaceholder(p.key)}
                    className="cursor-pointer rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    {placeholderToken(p.key)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex min-h-[28rem] min-w-0 flex-1 flex-col p-4">
            <div role="tablist" className="mb-3 inline-flex self-start rounded-lg bg-gray-200 p-1">
              {(
                [
                  ["text", "Plain text"],
                  ["design", "Visual designer"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => (value === "design" ? openDesigner() : setTab("text"))}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    tab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={cn("min-h-0 flex-1 flex-col", tab === "text" ? "flex" : "hidden")}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="email-body" className="block text-sm font-medium text-gray-700">
                  Plain text version
                </label>
                {designer ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run("generate")}
                    loading={busy === "generate"}
                    disabled={busy !== null && busy !== "generate"}
                  >
                    Generate from design
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">Open the Visual designer to generate text from a design</span>
                )}
              </div>
              <textarea
                id="email-body"
                ref={bodyInput}
                value={body}
                maxLength={20000}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => (lastField.current = "body")}
                className="min-h-0 flex-1 resize-none rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className={cn("min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white", tab === "design" ? "block" : "hidden")}>
              {designerLoading && (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading email builder...
                </div>
              )}
              {designer && (
                <DesignerPane
                  session={designer}
                  onSaved={handleDesignSaved}
                  onApi={(api) => (designerApi.current = api)}
                  onError={(err) => {
                    console.error("[email-builder]", err);
                    setBusy(null);
                  }}
                />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
