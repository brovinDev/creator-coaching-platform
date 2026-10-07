"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Minus, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface ServiceRow {
  id: string;
  title: string;
  free: boolean;
  has_custom: boolean;
  enabled: boolean;
  updated_at: string | null;
}

interface Settings {
  from_name: string;
  reply_to: string;
  confirmation_enabled: boolean;
}

function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-gray-900" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

// Same list as TagMango. Only the confirmation email has a trigger in this app so far;
// the rest are shown for parity but stay switched off until their events exist.
const UPCOMING_TEMPLATE_TYPES = [
  "Reminder Email on Purchase Drop-off",
  "Reminder Email on Failed Purchase",
  "Reminder Email One Day Before Expiry",
  "Notification Email on New Post Creation",
  "Notification Email on Post Comment",
  "Notification Email on Comment Like",
  "Notification Email on Comment Reply",
  "Notification Email on Tagging Someone In A Comment",
  "Promotional Email on Service Creation",
  "Notification Email on Single Workshop Creation",
  "Notification Email on Recurring Workshop Creation",
  "Notification Email on Rescheduling a workshop",
  "Notification Email on Workshop Cancellation",
  "Reminder Email 24 hours before Workshop",
  "Reminder Email 30 mins before Workshop",
  "Reminder Email 15 mins before Workshop",
  "Post Workshop Email 15 mins after Workshop",
  "Notification Email after subscription expired",
  "Notification Email for 10% course completion",
  "Notification Email for 50% course completion",
  "Notification Email for 100% course completion",
  "Confirmation Email on 1-1 Consultation booking",
  "Reminder Email 30 mins before 1-1 Consultation",
  "Cancellation Email on 1-1 Consultation booking cancel",
];

function formatUpdated(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function IconButton({ onClick, label, children, disabled }: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-100"
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export default function EmailAutomationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<Settings>({ from_name: "", reply_to: "", confirmation_enabled: true });
  const [saved, setSaved] = useState({ from_name: "", reply_to: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [hasDefault, setHasDefault] = useState(false);
  const [resetFor, setResetFor] = useState<ServiceRow | null>(null);
  const [resetting, setResetting] = useState(false);
  const [importFor, setImportFor] = useState<ServiceRow | null>(null);
  const [importFrom, setImportFrom] = useState("");
  const [importing, setImporting] = useState(false);

  const loadServices = useCallback(async () => {
    const res = await fetch("/api/email-automation/templates");
    if (!res.ok) throw new Error("Could not load your services");
    const data = await res.json();
    setServices(data.services);
    setHasDefault(!!data.has_default);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const settingsRes = await fetch("/api/email-automation/settings");
        if (!settingsRes.ok) throw new Error("Could not load email settings");
        const s: Settings = await settingsRes.json();
        setSettings(s);
        setSaved({ from_name: s.from_name, reply_to: s.reply_to });
        await loadServices();
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load Email Automation");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadServices]);

  const settingsDirty = settings.from_name !== saved.from_name || settings.reply_to !== saved.reply_to;

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/email-automation/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_name: settings.from_name, reply_to: settings.reply_to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save email settings");
      setSaved({ from_name: settings.from_name.trim(), reply_to: settings.reply_to.trim() });
      setSettings((s) => ({ ...s, from_name: s.from_name.trim(), reply_to: s.reply_to.trim() }));
      toast.success("Email settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save email settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function toggleConfirmation(next: boolean) {
    const previous = settings.confirmation_enabled;
    setSettings((s) => ({ ...s, confirmation_enabled: next }));
    const res = await fetch("/api/email-automation/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation_enabled: next }),
    });
    if (!res.ok) {
      setSettings((s) => ({ ...s, confirmation_enabled: previous }));
      toast.error("Failed to update the email");
    }
  }

  async function toggleService(service: ServiceRow, next: boolean) {
    setServices((list) => list.map((s) => (s.id === service.id ? { ...s, enabled: next } : s)));
    const res = await fetch(`/api/services/${service.id}/email-template`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServices((list) => list.map((s) => (s.id === service.id ? { ...s, enabled: !next } : s)));
      toast.error(data.error || "Failed to update the email");
    }
  }

  async function confirmReset() {
    if (!resetFor) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/services/${resetFor.id}/email-template`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template reset");
      setResetFor(null);
      await loadServices();
    } catch {
      toast.error("Failed to reset the template");
    } finally {
      setResetting(false);
    }
  }

  async function runImport() {
    if (!importFor || !importFrom) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/services/${importFor.id}/email-template/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_service_id: importFrom }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to import template");
      toast.success("Template imported");
      setImportFor(null);
      setImportFrom("");
      await loadServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import template");
    } finally {
      setImporting(false);
    }
  }

  const edit = (id: string) => router.push(`/creator/automation/email/${id}`);
  const importSources = importFor ? services.filter((s) => s.id !== importFor.id) : [];
  // A service without its own design sends the creator's default, so that is what gets copied.
  const canImport = (s: ServiceRow) => s.has_custom || hasDefault;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }
  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <div className="mt-5 space-y-5 rounded-lg bg-gray-50 p-5">
          <div>
            <Input
              id="from-name"
              label="From Name: *"
              placeholder="From Name"
              maxLength={100}
              value={settings.from_name}
              onChange={(e) => setSettings((s) => ({ ...s, from_name: e.target.value }))}
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the sender name your learners will see in the emails sent on your behalf.
            </p>
          </div>
          <div>
            <Input
              id="reply-to"
              type="email"
              label="Reply to Email Address: *"
              placeholder="Reply to Email Address"
              value={settings.reply_to}
              onChange={(e) => setSettings((s) => ({ ...s, reply_to: e.target.value }))}
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the email address your learners&apos; replies will be routed to.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
              loading={savingSettings}
              disabled={!settingsDirty || !settings.from_name.trim() || !settings.reply_to.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white shadow-sm">
        <h2 className="px-6 pt-6 text-2xl font-bold text-gray-900">Templates</h2>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex items-center border-y border-gray-200 px-6 py-3 text-sm font-medium text-gray-700">
              <div className="flex-1 pl-9">Template Type</div>
              <div className="w-32 text-center">Enabled</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            <div className="flex items-center border-b border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Hide services" : "Show services"}
                aria-expanded={expanded}
                className="mr-3 flex h-6 w-6 items-center justify-center rounded border border-gray-400 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 text-base font-medium text-gray-900">Confirmation Email on Service Purchase</div>
              <div className="flex w-32 justify-center">
                <Toggle
                  checked={settings.confirmation_enabled}
                  onChange={toggleConfirmation}
                  label="Send the confirmation email"
                />
              </div>
              <div className="flex w-24 justify-end">
                <IconButton label="Edit default template for all services" onClick={() => router.push("/creator/automation/email/default")}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            {expanded && (
              <div className="bg-gray-50">
                <div className="flex items-center border-b border-gray-200 px-6 py-3 pl-[60px] text-sm font-medium text-gray-700">
                  <div className="flex-1">Service</div>
                  <div className="w-52">Updated on</div>
                  <div className="w-24 text-center">Enabled</div>
                  <div className="w-64 text-right">Actions</div>
                </div>

                {services.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-500">
                    You have no services yet. Create a service to customise its email.
                  </p>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="flex items-center border-b border-gray-200 px-6 py-4 pl-[60px] last:border-b-0">
                      <div className="flex-1 pr-4">
                        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-3">
                          <p className="font-medium text-gray-900">{service.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {service.free && (
                              <span className="rounded-full bg-indigo-700 px-2.5 py-0.5 text-[11px] font-bold text-white">FREE</span>
                            )}
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase text-white",
                                service.has_custom && service.enabled ? "bg-pink-600" : "bg-gray-500"
                              )}
                            >
                              {!service.has_custom
                                ? "Default template is being used"
                                : service.enabled
                                  ? "Custom template is being used"
                                  : "Custom template is off"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-52 text-sm text-gray-700">{service.has_custom ? formatUpdated(service.updated_at) : "—"}</div>
                      <div className="flex w-24 justify-center">
                        <Toggle
                          checked={service.has_custom && service.enabled}
                          disabled={!service.has_custom}
                          onChange={(next) => toggleService(service, next)}
                          label={`Use the custom email for ${service.title}`}
                        />
                      </div>
                      <div className="flex w-64 items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setImportFor(service);
                            setImportFrom("");
                          }}
                        >
                          Import Template
                        </Button>
                        <IconButton label="Edit Template" onClick={() => edit(service.id)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={service.has_custom ? "Reset Template" : "No custom template to reset"}
                          disabled={!service.has_custom}
                          onClick={() => setResetFor(service)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {UPCOMING_TEMPLATE_TYPES.map((type) => (
              <div key={type} className="flex items-center border-b border-gray-100 px-6 py-4 last:border-b-0">
                <span className="mr-3 h-6 w-6" />
                <div className="flex flex-1 items-center gap-3 text-base text-gray-500">
                  {type}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    Coming soon
                  </span>
                </div>
                <div className="flex w-32 justify-center">
                  <Toggle checked={false} disabled onChange={() => {}} label={`${type} (coming soon)`} />
                </div>
                <div className="flex w-24 justify-end">
                  <button
                    type="button"
                    disabled
                    aria-label={`Edit ${type} (coming soon)`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Modal open={!!importFor} onClose={() => setImportFor(null)} title="Import template from">
        <h3 className="text-lg font-semibold text-gray-900">Import Service Template</h3>
        <p className="mt-1 text-sm text-gray-500">Import existing templates to your service</p>

        {importSources.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            You have no other services to import from.
          </p>
        ) : (
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {importSources.map((s) => {
              const selectable = canImport(s);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => setImportFrom(s.id)}
                  aria-pressed={importFrom === s.id}
                  className={cn(
                    "block w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    importFrom === s.id ? "border-gray-900 bg-gray-50" : "border-gray-200",
                    selectable ? "cursor-pointer text-gray-900 hover:bg-gray-50" : "cursor-not-allowed text-gray-400"
                  )}
                >
                  {s.title}
                  {!selectable && <span className="mt-0.5 block text-xs">No email design to import yet</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={runImport} loading={importing} disabled={!importFrom}>
            Import Template to service
          </Button>
        </div>
      </Modal>

      <Modal open={!!resetFor} onClose={() => setResetFor(null)} title="Reset template">
        <p className="text-sm text-gray-600">
          Reset the email for <strong>{resetFor?.title}</strong>? Its custom design will be deleted and the service will
          go back to {hasDefault ? "your default email" : "the built-in email"}.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setResetFor(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmReset} loading={resetting}>Reset Template</Button>
        </div>
      </Modal>
    </div>
  );
}
