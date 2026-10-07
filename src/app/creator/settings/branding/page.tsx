"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_THEME_COLOR, buttonStyle } from "@/lib/branding-colors";

interface BrandingForm {
  brand_name: string;
  logo_url: string;
  email_logo_url: string;
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
  logo_url: "",
  email_logo_url: "",
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
    logo_url: b.logoUrl || "",
    email_logo_url: b.emailLogoUrl || "",
    favicon_url: b.faviconUrl || "",
    theme_color: b.themeColor || "",
    preview_title: b.previewTitle || "",
    preview_description: b.previewDescription || "",
    preview_image_url: b.previewImageUrl || "",
    terms_url: b.termsUrl || "",
    privacy_url: b.privacyUrl || "",
  };
}

function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
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
      onChange(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 hover:border-indigo-400 transition-colors cursor-pointer disabled:cursor-wait"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="max-h-20 max-w-[70%] object-contain" />
        ) : null}
        <span>{uploading ? "Uploading..." : value ? "Replace" : "Select image"}</span>
      </button>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-gray-400">{hint}</p>
        {value && !uploading && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-gray-500 hover:text-red-600 cursor-pointer">
            Remove
          </button>
        )}
      </div>
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

export default function BrandingPage() {
  const [form, setForm] = useState<BrandingForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setForm(formFromApi(b)))
      .catch(() => toast.error("Could not load your branding"))
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

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Platform Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your logo and colour appear on your service pages, checkout and payment pages, and your learners see your colour across the app. Anything left empty uses the default.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Naming</h2></CardHeader>
          <CardContent>
            <Input
              id="brand-name"
              label="Brand name"
              value={form.brand_name}
              maxLength={100}
              placeholder="Shown instead of your own name on your pages"
              onChange={(e) => set("brand_name", e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Logo and images</h2></CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <ImageField label="Platform logo" hint="Square, PNG or JPG" value={form.logo_url} onChange={(v) => set("logo_url", v)} />
              <ImageField label="Email header logo" hint="Shown at the top of built-in emails" value={form.email_logo_url} onChange={(v) => set("email_logo_url", v)} />
              <ImageField label="Favicon" hint="Small square icon for the browser tab" value={form.favicon_url} onChange={(v) => set("favicon_url", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Colours</h2></CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-gray-700 mb-2">Primary / theme colour</p>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="color"
                aria-label="Theme colour"
                value={color}
                onChange={(e) => set("theme_color", e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
              />
              <div className="w-32">
                <Input
                  id="theme-hex"
                  aria-label="Theme colour hex"
                  value={form.theme_color}
                  maxLength={7}
                  placeholder={DEFAULT_THEME_COLOR}
                  onChange={(e) => set("theme_color", e.target.value)}
                />
              </div>
              <span className="rounded-lg px-6 py-2.5 text-sm font-semibold" style={buttonStyle(form.theme_color)}>
                Buy Now
              </span>
              {form.theme_color && (
                <button type="button" onClick={() => set("theme_color", "")} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">
                  Reset to default
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">Used throughout your site and products: buttons, links, highlights and the active tab.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Link preview</h2></CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Input
                  id="preview-title"
                  label="Title"
                  value={form.preview_title}
                  maxLength={100}
                  onChange={(e) => set("preview_title", e.target.value)}
                />
                <div>
                  <label htmlFor="preview-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="preview-description"
                    value={form.preview_description}
                    maxLength={150}
                    rows={3}
                    onChange={(e) => set("preview_description", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-right text-xs text-gray-400">{form.preview_description.length} / 150</p>
                </div>
                <ImageField label="Preview image" hint="At least 200 x 200, JPG or PNG" value={form.preview_image_url} onChange={(v) => set("preview_image_url", v)} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">How it looks when shared</p>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex h-44 items-center justify-center bg-gray-900">
                    {form.preview_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.preview_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-400">No image</span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="text-sm font-semibold text-gray-900">{form.preview_title || form.brand_name || "Your service title"}</p>
                    <p className="text-xs text-gray-500">{form.preview_description || "Your service description"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Applies when a service link is shared. If left empty, the service&apos;s own title and description are used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Policies</h2></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Links shown on your service and checkout pages.</p>
            <Input
              id="terms-url"
              label="Terms and conditions link"
              value={form.terms_url}
              placeholder="https://"
              onChange={(e) => set("terms_url", e.target.value)}
            />
            <Input
              id="privacy-url"
              label="Privacy policy link"
              value={form.privacy_url}
              placeholder="https://"
              onChange={(e) => set("privacy_url", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
