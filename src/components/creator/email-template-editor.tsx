"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Builder, useBuilder, type IToken, type IEntityContentJson } from "@beefree.io/react-email-builder";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { BEEFREE_MERGE_TAGS, EMAIL_MERGE_TAGS } from "@/lib/email-merge-tags";

const BUILDER_ID = "service-email-builder";
const BLANK_TEMPLATE = { comments: {}, page: {} } as unknown as IEntityContentJson;
const LIST_URL = "/creator/automation/email";

function parseDesign(raw: unknown): IEntityContentJson {
  if (typeof raw !== "string" || !raw) return BLANK_TEMPLATE;
  try {
    return JSON.parse(raw);
  } catch {
    return BLANK_TEMPLATE;
  }
}

type SaveMode = "save" | "test";

interface Loaded {
  token: IToken;
  uid: string;
  template: IEntityContentJson;
  serviceTitle: string;
  subject: string;
  exists: boolean;
  enabled: boolean;
}

/**
 * Full-screen editor for the confirmation email, modelled on TagMango's "Edit email".
 * With a serviceId it edits that service's own design; without one it edits the creator's
 * default design, which services without their own design fall back to.
 */
export default function EmailTemplateEditor({ serviceId }: { serviceId?: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState("");

  const base = serviceId ? `/api/services/${serviceId}/email-template` : "/api/email-automation/default-template";

  useEffect(() => {
    async function load() {
      try {
        const [tokenRes, templateRes] = await Promise.all([
          fetch("/api/email-builder/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId }),
          }),
          fetch(base),
        ]);
        if (!tokenRes.ok) {
          const data = await tokenRes.json().catch(() => ({}));
          throw new Error(data.error || "Could not load the email builder");
        }
        if (!templateRes.ok) throw new Error("Could not load the saved email");
        const saved = await templateRes.json();
        const { uid, ...token } = await tokenRes.json();
        setLoaded({
          token: token as IToken,
          uid,
          template: parseDesign(saved.design_json),
          serviceTitle: saved.service_title || "",
          subject: saved.subject || "",
          exists: !!saved.exists,
          enabled: !!saved.enabled,
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load the email builder");
      }
    }
    load();
  }, [base, serviceId]);

  if (loadError || !loaded) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100">
        <header className="flex items-center gap-4 bg-white px-5 py-3 shadow-sm">
          <button
            onClick={() => router.push(LIST_URL)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Back to Email Automation"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Edit email</h1>
        </header>
        {loadError ? (
          <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading email builder...
          </div>
        )}
      </div>
    );
  }

  return <EditorBody base={base} isDefault={!serviceId} loaded={loaded} />;
}

function EditorBody({ base, isDefault, loaded }: { base: string; isDefault: boolean; loaded: Loaded }) {
  const router = useRouter();
  const [subject, setSubject] = useState(loaded.subject);
  const [busy, setBusy] = useState<SaveMode | null>(null);

  // Beefree's onSave fires from inside the builder, so keep the latest values reachable.
  const subjectRef = useRef(subject);
  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);
  const modeRef = useRef<SaveMode>("save");
  // Saving a first design turns a service's email on; after that the table's toggle is the source of truth.
  const existing = useRef({ exists: loaded.exists, enabled: loaded.enabled });

  const { save, preview } = useBuilder({
    uid: loaded.uid,
    container: BUILDER_ID,
    language: "en-US",
    mergeTags: BEEFREE_MERGE_TAGS,
  });

  async function persist(designJson: string, html: string) {
    const res = await fetch(base, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subjectRef.current,
        design_json: designJson,
        html,
        enabled: existing.current.exists ? existing.current.enabled : true,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save email");
    }
    existing.current = { exists: true, enabled: existing.current.exists ? existing.current.enabled : true };
    toast.success("Email saved");
  }

  async function sendTest(html: string) {
    const res = await fetch(`${base}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subjectRef.current, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not send the test email");
    toast.success(data.message || "Test email sent");
  }

  // Both buttons ask the builder for its current design; onSave then routes by mode.
  function run(mode: SaveMode) {
    if (!subjectRef.current.trim()) {
      toast.error("Add an email subject first");
      return;
    }
    modeRef.current = mode;
    setBusy(mode);
    save().catch(() => {
      setBusy(null);
      toast.error("Failed to read the email design");
    });
  }

  async function handleBuilderSave(designJson: string, html: string) {
    try {
      if (modeRef.current === "test") await sendTest(html);
      else await persist(designJson, html);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  function copyTag(key: string) {
    navigator.clipboard?.writeText(`{{${key}}}`).then(
      () => toast.success(`Copied {{${key}}}`),
      () => toast.error("Could not copy")
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100">
      <header className="flex items-center justify-between gap-4 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push(LIST_URL)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Back to Email Automation"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Edit email</h1>
            <p className="truncate text-sm text-gray-500">
              {isDefault
                ? "Confirmation Email on Service Purchase · Default for all services"
                : `Confirmation Email on Service Purchase${loaded.serviceTitle ? ` · ${loaded.serviceTitle}` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" onClick={() => preview()}>
            Preview
          </Button>
          <Button
            variant="secondary"
            className="bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => run("test")}
            loading={busy === "test"}
            disabled={busy === "save"}
          >
            Send test email
          </Button>
          <Button onClick={() => run("save")} loading={busy === "save"} disabled={busy === "test"}>
            Save
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-80 shrink-0 space-y-4 overflow-y-auto bg-white p-4">
          {isDefault && (
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              Services without their own design use this email. A service&apos;s own design always takes priority.
            </p>
          )}
          <div>
            <label htmlFor="email-subject" className="mb-1 block text-sm font-medium text-gray-700">
              <span className="text-red-500">*</span> Email subject
            </label>
            <textarea
              id="email-subject"
              rows={3}
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to {{service_name}}!"
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-gray-900">Add custom variables to your email</p>
            <p className="mt-2 text-xs text-gray-600">
              Personalise the subject and the body with these variables. In the editor you can also pick them from the
              merge tags menu. Click one to copy it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EMAIL_MERGE_TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.name}
                  onClick={() => copyTag(t.key)}
                  className="cursor-pointer rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {`{{${t.key}}}`}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Builder
            id={BUILDER_ID}
            token={loaded.token}
            template={loaded.template}
            height="100%"
            onSave={(pageJson, pageHtml) => handleBuilderSave(pageJson, pageHtml)}
            onError={(err) => {
              console.error("[email-builder]", err);
              setBusy(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
