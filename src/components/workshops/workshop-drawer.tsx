"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  ChevronDown,
  CircleDot,
  Copy,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Presentation,
  Repeat,
  Tag,
  Timer,
  Trash2,
  Unlink,
  Upload,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TIMEZONES, weekdayOf } from "@/lib/workshop-time";
import { useProductName } from "@/components/product-name";
import { Hint } from "@/components/ui/hint";

interface ServiceOption {
  id: string;
  title: string;
  status: string;
  slug?: string;
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
  upsellServiceId: string;
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
    upsellServiceId: "",
  };
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-gray-900" : "bg-gray-300",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/** One row of the form: an icon in the margin, the field, and an optional (i) on the right. */
function Row({
  icon: Icon,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_20px] items-start gap-x-4">
      <Icon className="mt-3 h-6 w-6 text-gray-600" />
      <div className="min-w-0">{children}</div>
      <div className="mt-3.5">{hint && <Hint text={hint} side="left" />}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const chipClass = "rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500";

/** Pick several services from a dropdown; the choices show as removable chips in the field. */
function ServiceSelect({
  placeholder,
  searchPlaceholder,
  services,
  selected,
  disabledIds,
  onChange,
  emptyText,
}: {
  placeholder: string;
  searchPlaceholder: string;
  services: ServiceOption[];
  selected: string[];
  disabledIds: string[];
  onChange: (ids: string[]) => void;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const chosen = [...new Set(selected)].map((id) => services.find((s) => s.id === id)).filter(Boolean) as ServiceOption[];
  const shown = services.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((v) => !v))}
        className="flex min-h-[50px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {chosen.length === 0 && <span className="px-1 text-gray-500">{placeholder}</span>}
        {chosen.map((s) => (
          <span key={s.id} className="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-100 py-1 pl-2.5 pr-1.5 text-gray-800">
            <span className="truncate">{s.title}</span>
            <button
              type="button"
              aria-label={`Remove ${s.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(selected.filter((id) => id !== s.id));
              }}
              className="cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-500" />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {services.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">{emptyText}</p>
          ) : (
            <>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {shown.length === 0 && <p className="p-2 text-center text-sm text-gray-400">No match</p>}
                {shown.map((s) => {
                  const disabled = disabledIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        disabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer hover:bg-gray-50"
                      )}
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
            </>
          )}
        </div>
      )}
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
  const product = useProductName();
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(workshopId !== null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      // The backend numbers services; the linked ids come back as text, so compare them as text.
      .then((list: ServiceOption[]) => setServices(Array.isArray(list) ? list.map((s) => ({ ...s, id: String(s.id) })) : []))
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
          upsellServiceId: w.upsellServiceId || "",
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
          upsellServiceId: form.upsellServiceId,
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

  // The link to share during the session once the workshop exists.
  const upsell = services.find((s) => s.id === form.upsellServiceId);
  const upsellLink =
    workshopId && upsell?.slug && typeof window !== "undefined" ? `${window.location.origin}/s/${upsell.slug}?ref=workshop-${workshopId}` : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <aside className="relative flex h-full w-full flex-col bg-white shadow-xl sm:max-w-2xl">
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
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-8">
            <Row icon={Presentation}>
              <div className="relative">
                <input
                  value={form.title}
                  maxLength={100}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Add title"
                  aria-label="Title"
                  className={cn(inputClass, "pr-20")}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">{form.title.length} / 100</span>
              </div>
            </Row>

            <Row icon={ImageIcon}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-900">Thumbnail</p>
                  <p className="text-sm text-gray-500">Images should be horizontal. Recommended size is 1280x720px</p>
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
                  className="flex h-28 w-48 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600 hover:border-indigo-400"
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
            </Row>

            <Row icon={Video}>
              <div className="space-y-3">
                <select aria-label="Meeting platform" value="custom" onChange={() => {}} className={cn(inputClass, "text-base")}>
                  <option value="custom">Custom meeting platform (like Google Meet, Zoom, etc.)</option>
                  <option value="zoom" disabled>
                    In-built Zoom meeting (coming soon)
                  </option>
                </select>
                <input
                  type="url"
                  aria-label="Meeting link"
                  value={form.meetingUrl}
                  onChange={(e) => set("meetingUrl", e.target.value)}
                  placeholder="Meeting link, for example https://meet.google.com/..."
                  className={inputClass}
                />
                <p className="text-xs text-gray-500">Learners get this link 15 minutes before the session starts.</p>
              </div>
            </Row>

            <Row icon={Globe}>
              <label className="mb-1.5 block text-sm text-gray-700">
                <span className="text-red-500">*</span> Select timezone for selecting the slots below:
              </label>
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={cn(inputClass, "text-base")}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Row>

            <Row icon={Calendar}>
              <div className="grid grid-cols-2 gap-3">
                <input aria-label="Date" type="date" value={form.startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(inputClass, "border-0", "bg-gray-100")} />
                <input aria-label="Start time" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={cn(inputClass, "border-0", "bg-gray-100")} />
              </div>
            </Row>

            <Row icon={Timer}>
              <div className="flex items-center gap-2">
                <select aria-label="Hours" value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} className={cn(chipClass, "w-28")}>
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-700">hr</span>
                <select aria-label="Minutes" value={form.minutes} onChange={(e) => set("minutes", Number(e.target.value))} className={cn(chipClass, "w-28")}>
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-700">min</span>
              </div>
            </Row>

            <Row icon={Repeat}>
              <div className="rounded-lg bg-gray-50">
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="text-base font-medium text-gray-900">Recurring workshop</p>
                    {form.recurring && form.recurrenceDays.length > 0 && form.recurrenceEnd && (
                      <p className="text-xs text-blue-600">
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
                                on ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300",
                                locked && "cursor-not-allowed"
                              )}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-sm text-gray-700">Ends on</p>
                      <input
                        type="date"
                        aria-label="Ends on"
                        min={form.startDate}
                        value={form.recurrenceEnd}
                        onChange={(e) => set("recurrenceEnd", e.target.value)}
                        className={cn(inputClass, "max-w-[220px]")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Row>

            <Row icon={CircleDot}>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-4">
                <div>
                  <p className="text-base font-medium text-gray-900">Auto-upload workshop recordings to a course</p>
                  <p className="text-sm text-gray-500">Available with the Zoom integration, which is coming soon.</p>
                </div>
                <Switch checked={false} onChange={() => {}} label="Auto-upload workshop recordings to a course" disabled />
              </div>
            </Row>

            <Row icon={Link2}>
              <ServiceSelect
                placeholder={`Link ${product.one} here`}
                searchPlaceholder={`Search ${product.one} by name`}
                services={services}
                selected={form.serviceIds}
                disabledIds={[]}
                onChange={(ids) => setForm((f) => ({ ...f, serviceIds: ids, excludeServiceIds: f.excludeServiceIds.filter((id) => !ids.includes(id)) }))}
                emptyText={`Create a ${product.one} first, then link it here.`}
              />
              <p className="mt-1 text-xs text-gray-500">Learners who own any of these {product.many} can attend.</p>
            </Row>

            <Row
              icon={Unlink}
              hint={`Choose ${product.many} whose customers should be excluded from this workshop if they overlap with your linked ${product.many}. Use this only if there may be common customers between two ${product.many}, and you wish to exclude them from this workshop.`}
            >
              <ServiceSelect
                placeholder={`Exclude common customers from other ${product.many} (optional)`}
                searchPlaceholder={`Search ${product.one} by name`}
                services={services}
                selected={form.excludeServiceIds}
                disabledIds={form.serviceIds}
                onChange={(ids) => set("excludeServiceIds", ids)}
                emptyText={`You have no ${product.many} yet.`}
              />
            </Row>

            <Row
              icon={Tag}
              hint={`Choose the ${product.one} you want to promote in this session. After saving the workshop, you'll get a link to it here to share during the session.`}
            >
              <div className="relative">
                <select
                  aria-label={`${product.One} to upsell`}
                  value={form.upsellServiceId}
                  onChange={(e) => set("upsellServiceId", e.target.value)}
                  className={cn(inputClass, "appearance-none pr-10", form.upsellServiceId ? "text-gray-900" : "text-gray-500")}
                >
                  <option value="">{`${product.One} you want to upsell in this session (optional)`}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
              {form.upsellServiceId && !workshopId && (
                <p className="mt-1 text-xs text-gray-500">The link to share appears here after you save the workshop.</p>
              )}
              {upsellLink && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{upsellLink}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(upsellLink).then(() => toast.success("Link copied"), () => toast.error("Could not copy"))}
                    className="flex cursor-pointer items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              )}
            </Row>

            <Row icon={Layers}>
              <textarea
                value={form.description}
                maxLength={2000}
                rows={5}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Add description (optional)"
                aria-label="Description"
                className={inputClass}
              />
            </Row>
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || uploading || !ready}
            className="cursor-pointer rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
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
