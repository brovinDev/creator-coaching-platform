"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, Info as InfoIcon, Loader2, MessageCircle, Pencil, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRODUCT_NAME, DEFAULT_THEME_COLOR, MAX_PRODUCT_NAME, buttonStyle } from "@/lib/branding-colors";

interface BrandingForm {
  brand_name: string;
  product_name: string;
  logo_url: string;
  email_logo_url: string;
  invoice_logo_url: string;
  favicon_url: string;
  theme_color: string;
  preview_title: string;
  preview_description: string;
  preview_image_url: string;
  terms_url: string;
  privacy_url: string;
}

const EMPTY: BrandingForm = {
  brand_name: "",
  product_name: "",
  logo_url: "",
  email_logo_url: "",
  invoice_logo_url: "",
  favicon_url: "",
  theme_color: "",
  preview_title: "",
  preview_description: "",
  preview_image_url: "",
  terms_url: "",
  privacy_url: "",
};

/** The API speaks camelCase; the form uses the stored column names. */
function formFromApi(b: Record<string, string>): BrandingForm {
  return {
    brand_name: b.brandName || "",
    // "service" is the default, so only a name the creator typed is shown in the field.
    product_name: b.productName && b.productName !== DEFAULT_PRODUCT_NAME ? b.productName : "",
    logo_url: b.logoUrl || "",
    email_logo_url: b.emailLogoUrl || "",
    invoice_logo_url: b.invoiceLogoUrl || "",
    favicon_url: b.faviconUrl || "",
    theme_color: b.themeColor || "",
    preview_title: b.previewTitle || "",
    preview_description: b.previewDescription || "",
    preview_image_url: b.previewImageUrl || "",
    terms_url: b.termsUrl || "",
    privacy_url: b.privacyUrl || "",
  };
}

/** The small (i) next to a label, with a hint on hover or keyboard focus. */
function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={text} className="cursor-help text-gray-500 hover:text-gray-800">
        <InfoIcon className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-gray-800 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

function Label({ children, hint, htmlFor }: { children: React.ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1.5 text-base font-medium text-gray-700">
      {children}
      {hint && <Hint text={hint} />}
    </label>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-gray-900">
      {children}
      {hint && <Hint text={hint} />}
    </h2>
  );
}

function Divider() {
  return <hr className="my-8 border-gray-200" />;
}

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function TextField({
  id,
  label,
  hint,
  value,
  max,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="max-w-xl">
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "pr-20")}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
          {value.length} / {max}
        </span>
      </div>
    </div>
  );
}

function useUpload(onChange: (url: string) => void, opts: { maxBytes: number; tooBig: string }) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (file.size > opts.maxBytes) {
      toast.error(opts.tooBig);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  return { uploading, upload };
}

/** A large dashed card showing the current image with "Replace" underneath. */
function LogoCard({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploading, upload } = useUpload(onChange, { maxBytes: 5 * 1024 * 1024, tooBig: "Image is too large. Max 5MB" });

  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-72 w-full cursor-pointer flex-col items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 pb-4 pt-12 text-base text-gray-500 transition-colors hover:border-indigo-400 disabled:cursor-wait"
      >
        <span className="flex flex-1 items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-h-24 max-w-[70%] rounded object-contain" />
          ) : (
            <Upload className="h-8 w-8 text-gray-300" />
          )}
        </span>
        <span>{uploading ? "Uploading..." : value ? "Replace" : "Select image"}</span>
      </button>
      {value && !uploading && (
        <button type="button" onClick={() => onChange("")} className="mt-1 cursor-pointer text-xs text-gray-500 hover:text-red-600">
          Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Link-preview picture: WhatsApp skips images over about 300 KB, so that is enforced. */
function PreviewImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploading, upload } = useUpload(onChange, { maxBytes: 300 * 1024, tooBig: "Preview images must be 300 KB or smaller" });

  return (
    <div>
      <Label hint="This logo will appear as the thumbnail in your metadata">Preview Image</Label>
      <p className="text-sm text-gray-500">Recommended size: up to 300 KB with dimensions of at least 200 × 200 pixels.</p>
      <p className="mb-3 text-sm text-gray-500">Supported formats: JPG and PNG.</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-200 px-5 py-3 text-base font-semibold text-gray-800 hover:bg-gray-300 disabled:cursor-wait"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? "Replace image" : "Select image"}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => onChange("")} className="cursor-pointer text-sm text-gray-500 hover:text-red-600">
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type IconProps = { className?: string };

const FacebookIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);

const InstagramIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

type Platform = "whatsapp" | "facebook" | "instagram";

const PLATFORMS: { id: Platform; label: string; icon: React.ComponentType<IconProps> }[] = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "facebook", label: "Facebook", icon: FacebookIcon },
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
];

/** What a shared link looks like on each platform, built from the saved title, description and image. */
function LinkPreview({ image, title, description }: { image: string; title: string; description: string }) {
  const [platform, setPlatform] = useState<Platform>("whatsapp");
  let host = "yourdomain.com";
  try {
    host = new URL(process.env.NEXT_PUBLIC_APP_URL || "").host || host;
  } catch {}

  const picture = (
    <div className="flex aspect-[1.91/1] items-center justify-center bg-gray-900">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm text-gray-400">No image</span>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
      <p className="mb-3 text-lg font-semibold text-gray-900">How it looks on</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            aria-pressed={platform === p.id}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium",
              platform === p.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
            )}
          >
            <p.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>

      {platform === "whatsapp" && (
        <div className="overflow-hidden rounded-xl bg-[#dff0d3]">
          {picture}
          <div className="space-y-1 p-4">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">{description}</p>
            <p className="pt-2 text-base text-green-700 underline">{host}</p>
          </div>
        </div>
      )}
      {platform === "facebook" && (
        <div className="overflow-hidden border border-gray-300 bg-white">
          {picture}
          <div className="space-y-0.5 border-t border-gray-300 bg-[#f0f2f5] px-3 py-2.5">
            <p className="text-xs uppercase text-gray-500">{host}</p>
            <p className="text-base font-semibold leading-snug text-gray-900">{title}</p>
            <p className="line-clamp-2 text-sm text-gray-500">{description}</p>
          </div>
        </div>
      )}
      {platform === "instagram" && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {picture}
          <div className="space-y-0.5 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="line-clamp-2 text-xs text-gray-500">{description}</p>
            <p className="pt-1 text-xs text-gray-400">{host}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold text-gray-900">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" />
        <input
          id={id}
          ref={ref}
          type="url"
          value={value}
          placeholder="https://"
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base focus:outline-none"
        />
        <button type="button" aria-label={`Edit ${label}`} onClick={() => ref.current?.focus()} className="cursor-pointer text-gray-500 hover:text-gray-800">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "branding", label: "Branding & Customisation" },
  { id: "menu", label: "Customise Menu" },
  { id: "help", label: "Help & Support" },
  { id: "domain", label: "Domain" },
];

export default function PlatformSettingsPage() {
  const [form, setForm] = useState<BrandingForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setForm(formFromApi(b)))
      .catch(() => toast.error("Could not load your platform settings"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      setForm(formFromApi(data));
      toast.success("Platform settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

  const color = form.theme_color || DEFAULT_THEME_COLOR;
  const product = (form.product_name.trim() || DEFAULT_PRODUCT_NAME).toLowerCase();
  const capital = product.charAt(0).toUpperCase() + product.slice(1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="px-6 pt-6 sm:px-8">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Platform Settings</h1>
          <div className="-mx-1 flex gap-6 overflow-x-auto border-b border-gray-200">
            {TABS.map((tab) => {
              const active = tab.id === "branding";
              return (
                <span
                  key={tab.id}
                  title={active ? undefined : "Coming soon"}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={!active}
                  className={cn(
                    "-mb-px whitespace-nowrap border-b-2 px-1 pb-3 text-base font-medium",
                    active ? "border-indigo-600 text-gray-900" : "cursor-not-allowed border-transparent text-gray-400"
                  )}
                >
                  {tab.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8">
          <SectionTitle>Naming Conventions</SectionTitle>
          <div className="space-y-6">
            <div className="max-w-xl">
              <Label htmlFor="brand-name" hint="This would be the name of your platform throughout">
                Brand Name
              </Label>
              <input
                id="brand-name"
                value={form.brand_name}
                maxLength={100}
                onChange={(e) => set("brand_name", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <TextField
                id="product-name"
                label="Product name"
                hint="This is the generic name for all the products in the platform. Keep it short and simple. e.g, Course, Service, Offering, etc."
                value={form.product_name}
                max={MAX_PRODUCT_NAME}
                placeholder={DEFAULT_PRODUCT_NAME}
                onChange={(v) => set("product_name", v)}
              />
              <p className="mt-2 text-sm text-gray-500">
                Every product on your platform will be called as{" "}
                <strong className="text-gray-700">
                  {capital}/{capital}s
                </strong>
              </p>
            </div>
          </div>

          <Divider />

          <SectionTitle hint="Customize how your page link appears when shared on social media by setting a custom title, description, and thumbnail.">Link Preview Settings</SectionTitle>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <TextField
                id="preview-title"
                label="Title"
                hint="Enhance the metadata link preview"
                value={form.preview_title}
                max={100}
                onChange={(v) => set("preview_title", v)}
              />
              <div className="max-w-xl">
                <Label htmlFor="preview-description" hint="Add a short description to tell viewers more about your content">
                  Description
                </Label>
                <textarea
                  id="preview-description"
                  value={form.preview_description}
                  maxLength={150}
                  rows={4}
                  onChange={(e) => set("preview_description", e.target.value)}
                  className={fieldClass}
                />
                <p className="text-right text-sm text-gray-500">{form.preview_description.length} / 150</p>
              </div>
              <PreviewImagePicker value={form.preview_image_url} onChange={(v) => set("preview_image_url", v)} />
              <div className="max-w-xl rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-gray-700">
                <p>
                  <InfoIcon className="mr-1.5 inline h-4 w-4 -translate-y-px fill-gray-900 text-white" />
                  <strong>Note:</strong> These settings apply only when your platform link is shared directly by copying from the browser address bar.
                  They do not override previews generated through Share buttons (Course Chapters, Feed Posts, and Webinars). If any field is left
                  blank, default text will appear for that field when the link is shared (as will be shown in the preview).
                </p>
              </div>
            </div>
            <div>
              <LinkPreview
                image={form.preview_image_url}
                title={form.preview_title || form.brand_name || "Your service title"}
                description={form.preview_description || (form.brand_name ? `Welcome to ${form.brand_name}` : "Your service description")}
              />
            </div>
          </div>

          <Divider />

          <SectionTitle>Logo &amp; Images</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            <LogoCard label="Platform Logo" hint="Shown on your pages and in the top bar." value={form.logo_url} onChange={(v) => set("logo_url", v)} />
            <LogoCard label="Invoice Header Logo" hint="Shown at the top of invoices." value={form.invoice_logo_url} onChange={(v) => set("invoice_logo_url", v)} />
            <LogoCard label="Email Header Logo" hint="Shown at the top of built-in emails." value={form.email_logo_url} onChange={(v) => set("email_logo_url", v)} />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <LogoCard label="Favicon logo" hint="The small icon shown in the browser tab." value={form.favicon_url} onChange={(v) => set("favicon_url", v)} />
          </div>

          <Divider />

          <SectionTitle>Colors</SectionTitle>
          <Label hint="This color is used throughout your site and products.">Primary/Theme Color</Label>
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="color"
              aria-label="Theme colour"
              value={color}
              onChange={(e) => set("theme_color", e.target.value)}
              className="h-14 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white p-1.5"
            />
            <div className="w-36">
              <input
                id="theme-hex"
                aria-label="Theme colour hex"
                value={form.theme_color}
                maxLength={7}
                placeholder={DEFAULT_THEME_COLOR}
                onChange={(e) => set("theme_color", e.target.value)}
                className={fieldClass}
              />
            </div>
            <span className="rounded-lg px-6 py-2.5 text-sm font-semibold" style={buttonStyle(form.theme_color)}>
              Buy Now
            </span>
            {form.theme_color && (
              <button type="button" onClick={() => set("theme_color", "")} className="cursor-pointer text-sm text-gray-500 hover:text-gray-800">
                Reset to default
              </button>
            )}
          </div>

          <Divider />

          <SectionTitle>Platform Policies Page</SectionTitle>
          <p className="-mt-3 mb-5 text-base text-gray-500">
            Build trust with your audience by adding your own Terms &amp; Conditions and Privacy Policy. These will appear on your service and checkout pages.
          </p>
          <div className="space-y-5">
            <PolicyField id="terms-url" label="Terms & Conditions" value={form.terms_url} onChange={(v) => set("terms_url", v)} />
            <PolicyField id="privacy-url" label="Privacy Policy" value={form.privacy_url} onChange={(v) => set("privacy_url", v)} />
          </div>

          <div className="mt-10 flex justify-end">
            <Button onClick={save} disabled={saving} size="lg">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
