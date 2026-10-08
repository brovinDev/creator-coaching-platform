"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Clock, ImageIcon, Loader2, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useProductName } from "@/components/product-name";

interface ServiceOption {
  id: string;
  title: string;
  status: string;
  service_type: string;
}

type Step = "compose" | "include" | "exclude";

const MAX_LENGTH = 5000;

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="h-12 w-12 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600">
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function ServicePicker({
  title,
  help,
  services,
  selected,
  disabledIds,
  onChange,
}: {
  title: string;
  help: string;
  services: ServiceOption[];
  selected: string[];
  disabledIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const product = useProductName();
  const [query, setQuery] = useState("");
  const shown = services.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()));
  const selectable = shown.filter((s) => !disabledIds.includes(s.id));
  const allSelected = selectable.length > 0 && selectable.every((s) => selected.includes(s.id));

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-sm text-gray-500">{help}</p>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${product.one} by name`}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() =>
            onChange(
              allSelected
                ? selected.filter((id) => !selectable.some((s) => s.id === id))
                : [...new Set([...selected, ...selectable.map((s) => s.id)])]
            )
          }
        />
        Select all
      </label>
      <div className="space-y-2">
        {shown.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No {product.many} found</p>}
        {shown.map((s) => {
          const disabled = disabledIds.includes(s.id);
          return (
            <label
              key={s.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border p-3",
                disabled ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60" : "cursor-pointer border-gray-200 hover:border-gray-300"
              )}
            >
              <span>
                <span className="block text-sm font-medium text-gray-900">{s.title}</span>
                <span className="mt-1 flex gap-1.5">
                  <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">{s.status}</span>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    {s.service_type?.replace("_", "")}
                  </span>
                </span>
              </span>
              <input type="checkbox" disabled={disabled} checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function CreatePostModal({
  open,
  onClose,
  onCreated,
  userName,
  userImage,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  userName: string;
  userImage?: string | null;
}) {
  const product = useProductName();
  const [step, setStep] = useState<Step>("compose");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [schedule, setSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || services.length > 0) return;
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ServiceOption[]) => setServices(Array.isArray(list) ? list.map((s) => ({ ...s, id: String(s.id) })) : []))
      .catch(() => {});
  }, [open, services.length]);

  function reset() {
    setStep("compose");
    setContent("");
    setImageUrl("");
    setInclude([]);
    setExclude([]);
    setSchedule(false);
    setPublishAt("");
  }

  function close() {
    if (publishing) return;
    onClose();
  }

  async function uploadImage(file: File) {
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
      setImageUrl(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Taken when the schedule is touched, so rendering stays pure.
  const [now, setNow] = useState(0);
  const scheduledTime = schedule && publishAt ? new Date(publishAt).getTime() : 0;
  const scheduleInvalid = schedule && (!publishAt || scheduledTime <= now);
  const canPublish = (content.trim() || imageUrl) && !uploading && !publishing && !scheduleInvalid;

  async function publish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          imageUrl,
          includeServiceIds: include,
          excludeServiceIds: exclude,
          publishAt: schedule ? new Date(publishAt).toISOString() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not publish");
      toast.success(schedule ? "Post scheduled" : "Post published");
      reset();
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  }

  const serviceName = (id: string) => services.find((s) => s.id === id)?.title || "Service";
  const minDateTime = now ? new Date(now - new Date(now).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

  return (
    <Modal open={open} onClose={close} className="max-w-xl">
      {step !== "compose" ? (
        <div>
          <button
            type="button"
            onClick={() => setStep("compose")}
            className="mb-3 flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step === "include" ? (
            <ServicePicker
              title={`Select ${product.many}`}
              help={`Only learners with access to these ${product.many} will see this post. Leave empty to show it to all your learners.`}
              services={services}
              selected={include}
              disabledIds={exclude}
              onChange={setInclude}
            />
          ) : (
            <ServicePicker
              title={`Select exclude ${product.many}`}
              help={`Learners who have access to these ${product.many} will not be able to see this post.`}
              services={services}
              selected={exclude}
              disabledIds={include}
              onChange={setExclude}
            />
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep("compose")}
              className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-center text-xl font-semibold">Create new post</h2>
          <div className="flex items-start gap-3">
            <Avatar name={userName} image={userImage} />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-base font-semibold text-gray-900">{userName}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStep("include")}
                  className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {include.length > 0 ? `${include.length} ${include.length > 1 ? product.many : product.one}` : `+ ${product.one}`}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("exclude")}
                  className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {exclude.length > 0 ? `${exclude.length} excluded` : `+ exclude ${product.one}`}
                </button>
              </div>
              {(include.length > 0 || exclude.length > 0) && (
                <p className="mt-2 text-xs text-gray-500">
                  {include.length > 0 && <>Visible to: {include.map(serviceName).join(", ")}. </>}
                  {exclude.length > 0 && <>Hidden from: {exclude.map(serviceName).join(", ")}.</>}
                </p>
              )}
            </div>
          </div>

          <textarea
            value={content}
            maxLength={MAX_LENGTH}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to share about?"
            rows={7}
            className="mt-4 w-full resize-none border-0 p-0 text-base focus:outline-none focus:ring-0"
          />

          {(imageUrl || uploading) && (
            <div className="relative mb-3 inline-block">
              {uploading ? (
                <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-gray-100">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="max-h-48 rounded-lg" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImageUrl("")}
                    className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/60 p-1 text-white hover:bg-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {schedule && (
            <div className="mb-3 rounded-lg bg-gray-50 p-3">
              <label htmlFor="publish-at" className="mb-1 block text-sm font-medium text-gray-700">
                Publish on
              </label>
              <input
                id="publish-at"
                type="datetime-local"
                min={minDateTime}
                value={publishAt}
                onChange={(e) => {
                  setNow(Date.now());
                  setPublishAt(e.target.value);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {scheduleInvalid && publishAt && <p className="mt-1 text-xs text-red-600">Pick a time in the future</p>}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              aria-label="Add image"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
            />
            <span className="h-6 w-px bg-gray-200" />
            <button
              type="button"
              onClick={() => {
                setNow(Date.now());
                setSchedule((v) => !v);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 text-sm font-semibold",
                schedule ? "text-indigo-700" : "text-indigo-600 hover:text-indigo-800"
              )}
            >
              <Clock className="h-5 w-5" />
              {schedule ? "Scheduled" : "Schedule"}
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className="ml-auto cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {publishing ? "Publishing..." : schedule ? "Schedule post" : "Publish"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
