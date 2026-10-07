"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIMEZONES, weekdayOf } from "@/lib/workshop-time";

interface ServiceOption {
  id: string;
  title: string;
  status: string;
}

interface Form {
  title: string;
  description: string;
  thumbnailUrl: string;
  meetingUrl: string;
  timezone: string;
  startDate: string;
  startTime: string;
  hours: number;
  minutes: number;
  recurring: boolean;
  recurrenceDays: number[];
  recurrenceEnd: string;
  serviceIds: string[];
  excludeServiceIds: string[];
}

const DAYS = [
  { label: "S", name: "Sunday" },
  { label: "M", name: "Monday" },
  { label: "Tu", name: "Tuesday" },
  { label: "W", name: "Wednesday" },
  { label: "Th", name: "Thursday" },
  { label: "F", name: "Friday" },
  { label: "S", name: "Saturday" },
];

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function emptyForm(): Form {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = isoDate(tomorrow);
  return {
    title: "",
    description: "",
    thumbnailUrl: "",
    meetingUrl: "",
    timezone: "Asia/Kolkata",
    startDate,
    startTime: "",
    hours: 1,
    minutes: 0,
    recurring: false,
    recurrenceDays: [weekdayOf(startDate)],
    recurrenceEnd: addDays(startDate, 28),
    serviceIds: [],
    excludeServiceIds: [],
  };
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-gray-300")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function ServiceChecklist({
  services,
  selected,
  disabledIds,
  onChange,
  empty,
}: {
  services: ServiceOption[];
  selected: string[];
  disabledIds: string[];
  onChange: (ids: string[]) => void;
  empty: string;
}) {
  if (services.length === 0) return <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">{empty}</p>;
  return (
    <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
      {services.map((s) => {
        const disabled = disabledIds.includes(s.id);
        return (
          <label
            key={s.id}
            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm", disabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer hover:bg-gray-50")}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(s.id)}
              onChange={() => onChange(selected.includes(s.id) ? selected.filter((x) => x !== s.id) : [...selected, s.id])}
            />
            <span className="flex-1 truncate">{s.title}</span>
          </label>
        );
      })}
    </div>
  );
}

export function WorkshopDrawer({
  workshopId,
  hostName,
  onClose,
  onSaved,
}: {
  /** null to create a new workshop. */
  workshopId: string | null;
  hostName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(workshopId !== null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ServiceOption[]) => setServices(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (workshopId === null) return;
    fetch(`/api/workshops/${workshopId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((w) =>
        setForm({
          title: w.title,
          description: w.description,
          thumbnailUrl: w.thumbnailUrl,
          meetingUrl: w.meetingUrl,
          timezone: w.timezone,
          startDate: w.startDate,
          startTime: w.startTime,
          hours: Math.floor(w.durationMinutes / 60),
          minutes: w.durationMinutes % 60,
          recurring: w.recurring,
          recurrenceDays: w.recurrenceDays.length ? w.recurrenceDays : [weekdayOf(w.startDate)],
          recurrenceEnd: w.recurrenceEnd || addDays(w.startDate, 28),
          serviceIds: w.serviceIds,
          excludeServiceIds: w.excludeServiceIds,
        })
      )
      .catch(() => {
        toast.error("Could not load the workshop");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [workshopId, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setStartDate(startDate: string) {
    setForm((f) => {
      const day = startDate ? weekdayOf(startDate) : null;
      return {
        ...f,
        startDate,
        // Keep the first session's weekday among the repeat days.
        recurrenceDays: day !== null && !f.recurrenceDays.includes(day) ? [...f.recurrenceDays, day].sort() : f.recurrenceDays,
        recurrenceEnd: f.recurrenceEnd && f.recurrenceEnd >= startDate ? f.recurrenceEnd : startDate ? addDays(startDate, 28) : "",
      };
    });
  }

  async function uploadThumbnail(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Max 5MB");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      set("thumbnailUrl", data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(workshopId ? `/api/workshops/${workshopId}` : "/api/workshops", {
        method: workshopId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          thumbnailUrl: form.thumbnailUrl,
          meetingUrl: form.meetingUrl,
          timezone: form.timezone,
          startDate: form.startDate,
          startTime: form.startTime,
          durationMinutes: form.hours * 60 + form.minutes,
          recurring: form.recurring,
          recurrenceDays: form.recurrenceDays,
          recurrenceEnd: form.recurring ? form.recurrenceEnd : "",
          serviceIds: form.serviceIds,
          excludeServiceIds: form.excludeServiceIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the workshop");
      toast.success(workshopId ? "Workshop updated" : "Workshop scheduled");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the workshop");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!workshopId) return;
    if (!window.confirm("Delete this workshop? All of its sessions will be removed.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Workshop deleted");
      onSaved();
    } catch {
      toast.error("Could not delete the workshop");
      setSaving(false);
    }
  }

  const timezones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];
  const duration = form.hours * 60 + form.minutes;
  const ready =
    form.title.trim() && form.meetingUrl.trim() && form.startDate && form.startTime && duration >= 15 && form.serviceIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <aside className="relative flex h-full w-full flex-col bg-white shadow-xl sm:max-w-xl">
        <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm text-gray-500">{hostName} - Host</p>
            <h2 className="text-xl font-bold text-gray-900">{workshopId ? "Edit Workshop" : "Create Workshop"}</h2>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <div className="relative">
                <input
                  value={form.title}
                  maxLength={100}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Add title"
                  aria-label="Title"
                  className={cn(inputClass, "pr-16")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{form.title.length} / 100</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Thumbnail</p>
                <p className="text-xs text-gray-500">Images should be horizontal. Recommended size is 1280x720px</p>
                {form.thumbnailUrl && (
                  <button type="button" onClick={() => set("thumbnailUrl", "")} className="mt-2 cursor-pointer text-xs text-gray-500 hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-28 w-44 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 hover:border-indigo-400"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : form.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex items-center gap-2">
                    Upload image <Upload className="h-4 w-4" />
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadThumbnail(file);
                  e.target.value = "";
                }}
              />
            </div>

            <Field label="Meeting platform">
              <select aria-label="Meeting platform" value="custom" onChange={() => {}} className={inputClass}>
                <option value="custom">Custom meeting platform (like Google Meet, Zoom, etc.)</option>
                <option value="zoom" disabled>
                  In-built Zoom meeting (coming soon)
                </option>
              </select>
            </Field>

            <Field label="Meeting link" hint="Learners get this link 15 minutes before the session starts.">
              <input
                type="url"
                value={form.meetingUrl}
                onChange={(e) => set("meetingUrl", e.target.value)}
                placeholder="https://meet.google.com/..."
                className={inputClass}
              />
            </Field>

            <Field label="Timezone for the times below">
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputClass}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" value={form.startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Start time">
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputClass} />
              </Field>
            </div>

            <Field label="Duration">
              <div className="flex items-center gap-2">
                <select aria-label="Hours" value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} className={cn(inputClass, "w-24")}>
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">hr</span>
                <select aria-label="Minutes" value={form.minutes} onChange={(e) => set("minutes", Number(e.target.value))} className={cn(inputClass, "w-24")}>
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">min</span>
              </div>
            </Field>

            <div className="rounded-lg bg-gray-50">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Recurring workshop</p>
                  {form.recurring && form.recurrenceDays.length > 0 && form.recurrenceEnd && (
                    <p className="text-xs text-indigo-600">
                      Weekly on {form.recurrenceDays.map((d) => DAYS[d].name).join(", ")} until {form.recurrenceEnd}
                    </p>
                  )}
                </div>
                <Switch checked={form.recurring} onChange={(v) => set("recurring", v)} label="Recurring workshop" />
              </div>
              {form.recurring && (
                <div className="space-y-4 border-t border-gray-200 px-4 py-4">
                  <div>
                    <p className="mb-2 text-sm text-gray-700">Repeat on</p>
                    <div className="flex gap-2">
                      {DAYS.map((day, i) => {
                        const on = form.recurrenceDays.includes(i);
                        // The first session's own day can't be switched off.
                        const locked = form.startDate && weekdayOf(form.startDate) === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            title={day.name}
                            aria-pressed={on}
                            disabled={!!locked}
                            onClick={() =>
                              set("recurrenceDays", on ? form.recurrenceDays.filter((d) => d !== i) : [...form.recurrenceDays, i].sort())
                            }
                            className={cn(
                              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xs font-semibold",
                              on ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300",
                              locked && "cursor-not-allowed"
                            )}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Field label="Ends on">
                    <input
                      type="date"
                      min={form.startDate}
                      value={form.recurrenceEnd}
                      onChange={(e) => set("recurrenceEnd", e.target.value)}
                      className={cn(inputClass, "max-w-[220px]")}
                    />
                  </Field>
                </div>
              )}
            </div>

            <Field label="Link services" hint="Learners who own any of these services can attend.">
              <ServiceChecklist
                services={services}
                selected={form.serviceIds}
                disabledIds={[]}
                onChange={(ids) => setForm((f) => ({ ...f, serviceIds: ids, excludeServiceIds: f.excludeServiceIds.filter((id) => !ids.includes(id)) }))}
                empty="Create a service first, then link it here."
              />
            </Field>

            <Field
              label="Exclude common customers from other services (optional)"
              hint="Customers of these services are left out even if they also own a linked service."
            >
              <ServiceChecklist
                services={services}
                selected={form.excludeServiceIds}
                disabledIds={form.serviceIds}
                onChange={(ids) => set("excludeServiceIds", ids)}
                empty="You have no services yet."
              />
            </Field>

            <Field label="Description (optional)">
              <textarea
                value={form.description}
                maxLength={2000}
                rows={5}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Add description"
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || uploading || !ready}
            className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? "Saving..." : workshopId ? "Save changes" : "Schedule workshop"}
          </button>
          {workshopId && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
