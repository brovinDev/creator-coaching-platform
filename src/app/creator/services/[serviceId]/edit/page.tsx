"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, ImageIcon, Loader2, Trash2, Check } from "lucide-react";
import toast from "react-hot-toast";

type Tab = "details" | "payment" | "success";
type ServiceType = "one-time" | "subscription" | "free";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.serviceId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("one-time");
  const [enableGst, setEnableGst] = useState(false);
  const [price, setPrice] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [published, setPublished] = useState(false);
  const [courseIds, setCourseIds] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [serviceRes, coursesRes] = await Promise.all([
          fetch(`/api/services/${serviceId}`),
          fetch("/api/courses"),
        ]);
        if (!serviceRes.ok) throw new Error("Not found");
        const data = await serviceRes.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCoverImage(data.cover_image || "");
        setServiceType(data.service_type || "one-time");
        setEnableGst(!!data.enable_gst);
        setPrice(data.price ? String(data.price) : "");
        setHasDiscount(!!data.discounted_price);
        setDiscountedPrice(data.discounted_price ? String(data.discounted_price) : "");
        setPublished(!!data.published);
        const ids = (data.course_id || "").split(",").filter(Boolean);
        setCourseIds(new Set(ids));

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.map((c: Record<string, unknown>) => ({ id: c.id, title: c.title })));
        }
      } catch {
        toast.error("Service not found");
        router.push("/creator/services");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [serviceId, router]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCoverImage(data.secure_url || data.url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Service title is required");
      return;
    }
    if (serviceType !== "free" && !price) {
      toast.error("Price is required for paid services");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cover_image: coverImage || null,
          service_type: serviceType,
          enable_gst: enableGst,
          price: serviceType === "free" ? 0 : Number(price),
          discounted_price: hasDiscount ? Number(discountedPrice) : null,
          published,
          course_id: Array.from(courseIds).join(",") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update service");
      }
      toast.success("Service updated!");
      router.push("/creator/services");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this service?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Service deleted");
      router.push("/creator/services");
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setDeleting(false);
    }
  }

  const displayPrice = serviceType === "free" ? 0 : Number(price) || 0;
  const displayDiscounted = hasDiscount && discountedPrice ? Number(discountedPrice) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/creator/services"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit service</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { key: "details", label: "Service details" },
              { key: "payment", label: "Payment details" },
              { key: "success", label: "Payment success page" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPublished(!published)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    published ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      published ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {published ? "Published (visible to learners)" : "Draft (not visible)"}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Service title
                  </label>
                  <span className="text-xs text-gray-400">
                    {title.length} / 100
                  </span>
                </div>
                <Input
                  placeholder="Enter service title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Service cover
                  </label>
                  <span className="text-gray-400 text-xs">i</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Images should be horizontal, at least 1280x720px.
                </p>
                {coverImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-5 w-5" />
                      )}
                      <span className="text-sm">
                        {uploading ? "Uploading..." : "No cover images or videos uploaded."}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                      Upload images or videos
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service description
                </label>
                <Textarea
                  placeholder="Add Service description here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[160px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linked courses
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Select courses to include in this service. Learners who purchase will get access to all linked courses.
                </p>
                {courses.length === 0 ? (
                  <p className="text-sm text-gray-400">No courses created yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {courses.map((c) => {
                      const isSelected = courseIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setCourseIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            })
                          }
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            isSelected
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                            {c.title}
                          </span>
                          <div
                            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-gray-900 border-gray-900"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service type
                </label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  {([
                    { key: "one-time", label: "One-time" },
                    { key: "subscription", label: "Subscription" },
                    { key: "free", label: "Free service" },
                  ] as const).map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setServiceType(type.key)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        serviceType === type.key
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEnableGst(!enableGst)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    enableGst ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enableGst ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Enable GST
                </span>
              </div>

              {serviceType !== "free" && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Pricing
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700">
                          INR
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selling price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            &#8377;
                          </span>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="checkbox"
                            id="hasDiscount"
                            checked={hasDiscount}
                            onChange={(e) => setHasDiscount(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label
                            htmlFor="hasDiscount"
                            className="text-sm font-medium text-gray-700"
                          >
                            Discounted price
                          </label>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            &#8377;
                          </span>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={discountedPrice}
                            onChange={(e) => setDiscountedPrice(e.target.value)}
                            disabled={!hasDiscount}
                            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer">
                      + Add different price for international customers
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "payment" && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">Payment details</p>
                <p className="text-sm mt-1">Configuration coming soon</p>
              </div>
            </div>
          )}

          {activeTab === "success" && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">Payment success page</p>
                <p className="text-sm mt-1">Configuration coming soon</p>
              </div>
            </div>
          )}
        </div>

        <div className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-8">
            <div className="mx-auto w-[280px] rounded-[2rem] border-4 border-gray-800 bg-white shadow-xl overflow-hidden">
              <div className="h-6 bg-gray-800 flex items-center justify-center">
                <div className="w-16 h-3 bg-gray-700 rounded-full" />
              </div>

              <div className="h-[500px] flex flex-col">
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex justify-center mb-3">
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                      OS
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-900 text-center">
                      by <span className="font-semibold">Creator</span>
                    </p>
                  </div>

                  {coverImage && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <img
                        src={coverImage}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  {title && (
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">
                      {title}
                    </h3>
                  )}

                  {description && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-3">
                      {description}
                    </p>
                  )}

                  <p className="mt-4 text-[10px] text-gray-400 leading-tight">
                    You agree to share information entered on this page with{" "}
                    {process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"} (owner of
                    this page) and Razorpay, adhering to applicable laws.
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"} 2026.</span>
                    <span>Privacy</span>
                    <span>Terms</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-white">
                  <span className="text-base font-bold text-gray-900">
                    &#8377;{displayDiscounted ?? displayPrice}
                    {displayDiscounted !== null && (
                      <span className="text-xs text-gray-400 line-through ml-1">
                        &#8377;{displayPrice}
                      </span>
                    )}
                  </span>
                  <button className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    {serviceType === "free" ? "Register" : "Buy Now"}
                  </button>
                </div>
              </div>

              <div className="h-4 bg-gray-800 flex items-center justify-center">
                <div className="w-20 h-1 bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
