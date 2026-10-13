"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Upload, X } from "lucide-react";
import { MdInfo, MdLinkOff, MdOutlineEmojiEmotions } from "react-icons/md";
import toast from "react-hot-toast";
import "react-quill-new/dist/quill.snow.css";
import { useProductName } from "@/components/product-name";
import { ImageEditor } from "@/components/creator/image-editor";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export interface CourseInfo {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  creatorName?: string;
  instructor?: string;
  durationHours?: string;
  durationMinutes?: string;
  defaultThumbnail?: string;
  validityDays?: string;
  showAsLocked?: boolean;
  disableQna?: boolean;
  disableComments?: boolean;
}

interface ServiceOption {
  id: string;
  title: string;
  course_id: string | null;
}

interface FormState {
  title: string;
  instructor: string;
  description: string;
  durationHours: string;
  durationMinutes: string;
  thumbnail: string;
  defaultThumbnail: string;
  validityOn: boolean;
  validityDays: string;
  showAsLocked: boolean;
  disableQna: boolean;
  disableComments: boolean;
}

/** The little bit of Quill the toolbar handlers use. */
interface QuillLike {
  format: (name: string, value: unknown) => void;
  getSelection: (focus?: boolean) => { index: number } | null;
  insertText: (index: number, text: string) => void;
  setSelection: (index: number) => void;
}

const idsOf = (courseIdField: string | null) =>
  (courseIdField || "").split(",").map((s) => s.trim()).filter(Boolean);

function Label({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <p className="mb-3 text-xl text-black">
      {children}
      {required && <span className="ml-1.5 align-top text-sm text-red-500">*</span>}
      {optional && <span className="ml-1.5 text-base">(Optional)</span>}
    </p>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[26px] w-[52px] shrink-0 cursor-pointer rounded-full transition-colors ${on ? "bg-indigo-600" : "bg-gray-300"}`}
    >
      <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[29px]" : "left-[3px]"}`} />
    </button>
  );
}

function SettingRow({
  title,
  description,
  on,
  onChange,
  children,
}: {
  title: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-base font-medium text-black">{title}</p>
          <p className="mt-1 text-base text-gray-600">{description}</p>
        </div>
        <Switch on={on} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}

/** The placeholder shown in an empty image box. */
function ImagePlaceholder() {
  return (
    <svg width="82" height="86" viewBox="0 0 82 86" aria-hidden>
      <rect width="82" height="86" rx="9" fill="#ececf0" />
      <circle cx="46" cy="21" r="8" fill="#3d3d4a" />
      <path d="M0 86V68l26-30 28 31v17z" fill="#43434f" />
      <path d="M40 86V72l14-15 28 27v-3a5 5 0 0 1-5 5z" fill="#0f1c3f" />
      <path d="M0 86V76a9 9 0 0 1 9-9h2L0 80z" fill="#43434f" />
    </svg>
  );
}

function ImageBox({
  value,
  onChange,
  text,
  note,
  button,
}: {
  value: string;
  onChange: (url: string) => void;
  text: string;
  note?: string;
  button: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<File | null>(null);

  // Pictures open in the crop editor first; a GIF would lose its animation, so it goes up as it is.
  function pick(file: File) {
    if (file.type === "image/gif") upload(file);
    else setEditing(file);
  }

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
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
      onChange(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid items-center gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-dashed border-gray-300 p-2.5">
        <div className="relative flex aspect-[750/422] items-center justify-center overflow-hidden rounded-md bg-gray-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholder />
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center px-4 text-center">
        <p className="max-w-[560px] text-lg leading-7 text-gray-700">{text}</p>
        {note && <p className="mt-6 text-sm font-semibold text-gray-900">{note}</p>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-10 flex h-[45px] cursor-pointer items-center gap-2.5 rounded-md bg-gray-200 px-5 text-base font-semibold text-black hover:bg-gray-300 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : button}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
            e.target.value = "";
          }}
        />
      </div>
      {editing && (
        <ImageEditor
          file={editing}
          onCancel={() => setEditing(null)}
          onSave={async (blob) => {
            await upload(new File([blob], "image.jpg", { type: "image/jpeg" }));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** Rich text box with TagMango's toolbar: size, bold, underline, italic, lists, link, unlink, emoji. */
function DescriptionEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const id = `tm-${useId().replace(/:/g, "")}`;
  const quillRef = useRef<QuillLike | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${id}`,
        handlers: {
          unlink(this: { quill: QuillLike }) {
            this.quill.format("link", false);
          },
          emoji(this: { quill: QuillLike }) {
            quillRef.current = this.quill;
            setEmojiOpen((open) => !open);
          },
        },
      },
    }),
    [id]
  );

  return (
    <div className="tm-editor relative rounded-md border border-gray-200">
      <div id={id} className="ql-toolbar ql-snow">
        <select className="ql-header" defaultValue="">
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="">Normal</option>
        </select>
        <button type="button" className="ql-bold" aria-label="Bold" />
        <button type="button" className="ql-underline" aria-label="Underline" />
        <button type="button" className="ql-italic" aria-label="Italic" />
        <button type="button" className="ql-list" value="bullet" aria-label="Bulleted list" />
        <button type="button" className="ql-list" value="ordered" aria-label="Numbered list" />
        <button type="button" className="ql-link" aria-label="Link" />
        <button type="button" className="ql-unlink" aria-label="Remove link">
          <MdLinkOff className="h-[18px] w-[18px]" />
        </button>
        <button type="button" className="ql-emoji" aria-label="Emoji">
          <MdOutlineEmojiEmotions className="h-[18px] w-[18px]" />
        </button>
      </div>
      {emojiOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
          <div className="absolute left-4 top-[72px] z-20">
            <EmojiPicker
              width={320}
              height={380}
              onEmojiClick={(e) => {
                const quill = quillRef.current;
                if (quill) {
                  const index = quill.getSelection(true)?.index ?? 0;
                  quill.insertText(index, e.emoji);
                  quill.setSelection(index + e.emoji.length);
                }
                setEmojiOpen(false);
              }}
            />
          </div>
        </>
      )}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder="Add a description here..."
        modules={modules}
        formats={["header", "bold", "underline", "italic", "list", "link"]}
      />
      <style jsx global>{`
        .tm-editor .ql-toolbar.ql-snow {
          border: 0;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 14px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .tm-editor .ql-toolbar.ql-snow button {
          width: 40px;
          height: 40px;
          padding: 0;
          float: none;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #111827;
        }
        .tm-editor .ql-toolbar.ql-snow button svg {
          float: none;
          width: 18px;
          height: 18px;
        }
        .tm-editor .ql-toolbar.ql-snow button:hover,
        .tm-editor .ql-toolbar.ql-snow button.ql-active {
          background: #f3f4f6;
          color: #111827;
        }
        .tm-editor .ql-toolbar.ql-snow .ql-stroke {
          stroke: currentColor;
        }
        .tm-editor .ql-toolbar.ql-snow .ql-fill {
          fill: currentColor;
        }
        .tm-editor .ql-toolbar.ql-snow .ql-picker.ql-header {
          width: 135px;
          height: 40px;
          margin: 0;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 16px;
          font-family: inherit;
        }
        .tm-editor .ql-toolbar.ql-snow .ql-picker-label {
          display: flex;
          align-items: center;
          height: 100%;
          padding: 0 12px;
          border: 0;
        }
        .tm-editor .ql-toolbar.ql-snow .ql-picker-label svg {
          width: 14px;
          height: 14px;
          margin-left: auto;
        }
        .tm-editor .ql-container.ql-snow {
          border: 0;
          font-family: inherit;
          font-size: 18px;
        }
        .tm-editor .ql-editor {
          min-height: 90px;
          padding: 20px 18px;
        }
        .tm-editor .ql-editor.ql-blank::before {
          color: #6b7280;
          font-style: normal;
          left: 18px;
        }
      `}</style>
    </div>
  );
}

/** A video chapter, so a new default thumbnail can be pushed onto it. */
export interface VideoChapterRef {
  moduleId: string;
  lessonId: string;
}

export function CourseInfoTab({
  course,
  videoChapters,
  onSaved,
}: {
  course: CourseInfo;
  videoChapters: VideoChapterRef[];
  onSaved: () => void | Promise<void>;
}) {
  const { many } = useProductName();
  const [bannerOpen, setBannerOpen] = useState(true);

  const initialForm: FormState = {
    title: course.title,
    instructor: course.instructor || "",
    description: course.description || "",
    durationHours: course.durationHours || "",
    durationMinutes: course.durationMinutes || "",
    thumbnail: course.thumbnail || "",
    defaultThumbnail: course.defaultThumbnail || "",
    validityOn: !!course.validityDays,
    validityDays: course.validityDays || "",
    showAsLocked: !!course.showAsLocked,
    disableQna: !!course.disableQna,
    disableComments: !!course.disableComments,
  };
  const [form, setForm] = useState<FormState>(initialForm);
  const [baseline, setBaseline] = useState(JSON.stringify(initialForm));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [servicesBaseline, setServicesBaseline] = useState<string>("[]");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [saving, setSaving] = useState(false);
  // The new default thumbnail waiting for the "existing videos too?" answer, and the answer itself.
  const [thumbPrompt, setThumbPrompt] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState<string | null>(null);

  // Load the creator's services once; the ones whose course list includes this course are the linked ones.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Record<string, unknown>[]) => {
        if (cancelled) return;
        const list = data.map((s) => ({
          id: String(s.id),
          title: String(s.title || ""),
          course_id: s.course_id ? String(s.course_id) : null,
        }));
        const linked = list.filter((s) => idsOf(s.course_id).includes(String(course.id))).map((s) => s.id);
        setServices(list);
        setPicked(linked);
        setServicesBaseline(JSON.stringify([...linked].sort()));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  // Same four fields the labels mark with a red star.
  const missing = [
    !form.title.trim() && "title",
    picked.length === 0 && many,
    !form.description.replace(/<[^>]*>/g, "").trim() && "description",
    !form.thumbnail && "cover image",
  ].filter(Boolean) as string[];

  const dirty = JSON.stringify(form) !== baseline || JSON.stringify([...picked].sort()) !== servicesBaseline;

  async function save() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description === "<p><br></p>" ? "" : form.description,
          thumbnail: form.thumbnail,
          instructor: form.instructor,
          durationHours: form.durationHours,
          durationMinutes: form.durationMinutes,
          defaultThumbnail: form.defaultThumbnail,
          validityDays: form.validityOn ? form.validityDays : "",
          showAsLocked: form.showAsLocked,
          disableQna: form.disableQna,
          disableComments: form.disableComments,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      // Link or unlink the course on each service that changed.
      const was = new Set(JSON.parse(servicesBaseline) as string[]);
      const now = new Set(picked);
      const updated = new Map<string, string | null>();
      for (const svc of services) {
        if (was.has(svc.id) === now.has(svc.id)) continue;
        const ids = idsOf(svc.course_id).filter((cid) => cid !== String(course.id));
        if (now.has(svc.id)) ids.push(String(course.id));
        const r = await fetch(`/api/services/${svc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: ids.join(",") }),
        });
        if (!r.ok) throw new Error(`Could not update "${svc.title}"`);
        updated.set(svc.id, ids.join(",") || null);
      }
      if (updated.size > 0) {
        setServices((list) => list.map((x) => (updated.has(x.id) ? { ...x, course_id: updated.get(x.id) ?? null } : x)));
      }

      // "Update for all chapters": put the new default thumbnail on every video chapter that exists.
      if (applyToAll && applyToAll === form.defaultThumbnail) {
        await Promise.all(
          videoChapters.map((c) =>
            fetch(`/api/courses/${course.id}/modules/${c.moduleId}/lessons/${c.lessonId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ thumbnail: applyToAll }),
            })
          )
        );
        setApplyToAll(null);
      }

      setBaseline(JSON.stringify(form));
      setServicesBaseline(JSON.stringify([...picked].sort()));
      toast.success("Saved!");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const instructorOptions = Array.from(new Set([course.creatorName, form.instructor].filter(Boolean) as string[]));
  const matches = services.filter((s) => s.title.toLowerCase().includes(serviceSearch.toLowerCase()));

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-2xl font-semibold text-black">Set-up your course</h2>
        <button
          onClick={save}
          disabled={!dirty || missing.length > 0 || saving}
          title={missing.length > 0 ? `Required: ${missing.join(", ")}` : undefined}
          className="h-[52px] cursor-pointer rounded-md bg-indigo-600 px-7 text-base font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="space-y-8 px-6 pb-10 pt-6">
        {bannerOpen && (
          <div className="flex items-center justify-between rounded-lg bg-[#e1efff] px-5 py-[18px]">
            <div className="flex items-center gap-3">
              <MdInfo className="h-6 w-6 shrink-0 text-[#1d86ff]" />
              <p className="text-lg text-black">
                Set-up your course with a user-friendly title, a brief description and an appealing cover image. Let&rsquo;s GO!
              </p>
            </div>
            <button onClick={() => setBannerOpen(false)} aria-label="Dismiss" className="cursor-pointer p-1 text-black">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div>
          <Label required>Title</Label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-14 w-full rounded-md border border-gray-200 px-4 text-lg text-black focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div>
          <Label optional>Select Instructor</Label>
          <div className="relative">
            <select
              value={form.instructor}
              onChange={(e) => set("instructor", e.target.value)}
              className={`h-14 w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white px-4 pr-10 text-lg focus:border-gray-400 focus:outline-none ${form.instructor ? "text-black" : "text-gray-500"}`}
            >
              <option value="">Select instructor</option>
              {instructorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
          </div>
        </div>

        <div>
          <Label required>Select {many}</Label>
          <div className="relative">
            <div
              className="flex min-h-14 cursor-pointer flex-wrap items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2"
              onClick={() => setPickerOpen((o) => !o)}
            >
              {picked.length === 0 && <span className="px-2 text-lg text-gray-500">Select {many}</span>}
              {picked.map((sid) => {
                const svc = services.find((s) => s.id === sid);
                return svc ? (
                  <span key={sid} className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-2 text-lg text-black">
                    {svc.title}
                    <button
                      type="button"
                      aria-label={`Remove ${svc.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPicked((p) => p.filter((x) => x !== sid));
                      }}
                      className="cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 p-2">
                    <input
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder={`Search ${many}...`}
                      className="w-full rounded border border-gray-200 px-3 py-2 text-base focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  {matches.length === 0 ? (
                    <p className="px-4 py-3 text-base text-gray-400">No {many} found</p>
                  ) : (
                    matches.map((svc) => {
                      const on = picked.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => setPicked((p) => (on ? p.filter((x) => x !== svc.id) : [...p, svc.id]))}
                          className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-base hover:bg-gray-50 ${on ? "bg-gray-100 font-medium" : ""}`}
                        >
                          <span>{svc.title}</span>
                          {on && <span className="text-xs text-gray-500">&#10003;</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <Label required>Description</Label>
          <DescriptionEditor value={form.description} onChange={(html) => set("description", html)} />
        </div>

        <div>
          <Label optional>Duration</Label>
          <p className="mb-4 text-base text-gray-700">
            Provide the total duration of this course. Students will see this value on the course cards once set
          </p>
          <div className="flex items-center gap-4">
            <input
              inputMode="numeric"
              value={form.durationHours}
              placeholder="0"
              onChange={(e) => set("durationHours", e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="h-[50px] w-[125px] rounded-md border border-gray-200 px-4 text-lg text-black placeholder:text-black focus:border-gray-400 focus:outline-none"
            />
            <span className="mr-6 text-lg text-black">hr</span>
            <input
              inputMode="numeric"
              value={form.durationMinutes}
              placeholder="00"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                set("durationMinutes", digits && Number(digits) > 59 ? "59" : digits);
              }}
              className="h-[50px] w-[125px] rounded-md border border-gray-200 px-4 text-lg text-black placeholder:text-black focus:border-gray-400 focus:outline-none"
            />
            <span className="text-lg text-black">min</span>
          </div>
        </div>

        <div>
          <Label required>Cover image</Label>
          <ImageBox
            value={form.thumbnail}
            onChange={(url) => set("thumbnail", url)}
            text="Upload cover image here. Recommended size: 750px X 422px (.jpg, .jpeg, .gif, or .png)."
            button="Upload Cover"
          />
        </div>

        <div>
          <Label>Default video thumbnail</Label>
          <ImageBox
            value={form.defaultThumbnail}
            onChange={(url) => {
              set("defaultThumbnail", url);
              // Only a new picture raises the question; removing it does not.
              if (url) setThumbPrompt(url);
            }}
            text="Upload your default video chapter thumbnail image here. Recommended size: 750px X 422px (.jpg, .jpeg, .gif, or .png)."
            note="This image will be used as the default thumbnail for all future video chapters."
            button="Upload thumbnail"
          />
        </div>

        <div>
          <Label>Settings</Label>
          <div className="space-y-5">
            <div className="rounded-lg bg-gray-100">
              <SettingRow
                title="Validity"
                description="Select how long your customers can view your course."
                on={form.validityOn}
                onChange={(on) => setForm((f) => ({ ...f, validityOn: on, validityDays: on ? f.validityDays || "365" : "" }))}
              >
                {form.validityOn && (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      inputMode="numeric"
                      value={form.validityDays}
                      onChange={(e) => set("validityDays", e.target.value.replace(/\D/g, "").slice(0, 5))}
                      className="h-11 w-32 rounded-md border border-gray-300 bg-white px-3 text-base text-black focus:border-gray-500 focus:outline-none"
                    />
                    <span className="text-base text-gray-700">days from purchase</span>
                  </div>
                )}
              </SettingRow>
            </div>
            <div className="rounded-lg bg-gray-100">
              <SettingRow
                title="Show as locked"
                description={`Show this course as locked to customers of other ${many}.`}
                on={form.showAsLocked}
                onChange={(on) => set("showAsLocked", on)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <Label>Engagement</Label>
          <div className="rounded-lg bg-gray-100">
            <SettingRow
              title="Disable QnA"
              description="Your customers won't be able to ask questions on your course."
              on={form.disableQna}
              onChange={(on) => set("disableQna", on)}
            />
            <SettingRow
              title="Disable comments"
              description="Your customers won't be able to comment on your course."
              on={form.disableComments}
              onChange={(on) => set("disableComments", on)}
            />
          </div>
        </div>
      </div>

      {thumbPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[650px] rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-2xl font-semibold text-black">Update default thumbnail</h3>
              <button onClick={() => setThumbPrompt(null)} aria-label="Close" className="cursor-pointer p-1 text-black">
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-5 text-lg text-gray-800">Do you also want to update the thumbnails of existing videos?</p>
            <div className="mt-8 grid grid-cols-[1fr_1.05fr] gap-4">
              <button
                onClick={() => {
                  setApplyToAll(thumbPrompt);
                  setThumbPrompt(null);
                }}
                className="h-[45px] cursor-pointer rounded-md bg-gray-200 text-base font-semibold text-black hover:bg-gray-300"
              >
                Update for all chapters
              </button>
              <button
                onClick={() => {
                  setApplyToAll(null);
                  setThumbPrompt(null);
                }}
                className="h-[45px] cursor-pointer rounded-md bg-indigo-600 text-base font-semibold text-white hover:bg-indigo-700"
              >
                Update for new chapters only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
