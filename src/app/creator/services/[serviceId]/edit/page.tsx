"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Upload, ImageIcon, Loader2, Trash2, Check,
  Plus, X, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import toast from "react-hot-toast";

type Tab = "details" | "payment" | "success";
type ServiceType = "one-time" | "subscription" | "free";

interface CustomField {
  id: string;
  type: "short_text" | "long_text" | "number" | "email" | "phone" | "dropdown";
  title: string;
  helpText: string;
  hidden: boolean;
  optional: boolean;
  options?: string[];
}

interface SuccessConfig {
  customScript: boolean;
  customScriptCode: string;
  customButton: boolean;
  customButtonText: string;
  customButtonUrl: string;
  hideButton: boolean;
  redirectUrl: boolean;
  redirectUrlValue: string;
  redirectDelay: number;
}

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dropdown", label: "Dropdown" },
] as const;

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const serviceId = params.serviceId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Service details
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

  // Payment details
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<CustomField>({
    id: "", type: "short_text", title: "", helpText: "", hidden: false, optional: false,
  });
  const [enableTimer, setEnableTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState("15");
  const [enableTerms, setEnableTerms] = useState(false);
  const [termsText, setTermsText] = useState("");

  // Payment success config
  const [successConfig, setSuccessConfig] = useState<SuccessConfig>({
    customScript: false, customScriptCode: "",
    customButton: false, customButtonText: "Go to Dashboard", customButtonUrl: "", hideButton: false,
    redirectUrl: false, redirectUrlValue: "", redirectDelay: 0,
  });

  // Collapsible sections
  const [advanceOpen, setAdvanceOpen] = useState(false);

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

        if (data.payment_config) {
          try {
            const pc = typeof data.payment_config === "string" ? JSON.parse(data.payment_config) : data.payment_config;
            if (pc.customFields) setCustomFields(pc.customFields);
            if (pc.enableTimer !== undefined) setEnableTimer(pc.enableTimer);
            if (pc.timerMinutes) setTimerMinutes(pc.timerMinutes);
            if (pc.enableTerms !== undefined) setEnableTerms(pc.enableTerms);
            if (pc.termsText) setTermsText(pc.termsText);
          } catch { /* ignore parse errors */ }
        }

        if (data.success_config) {
          try {
            const sc = typeof data.success_config === "string" ? JSON.parse(data.success_config) : data.success_config;
            setSuccessConfig((prev) => ({ ...prev, ...sc }));
          } catch { /* ignore parse errors */ }
        }

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
      const paymentConfig = JSON.stringify({
        customFields, enableTimer, timerMinutes, enableTerms, termsText,
      });
      const successConfigStr = JSON.stringify(successConfig);

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
          payment_config: paymentConfig,
          success_config: successConfigStr,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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

  function handleAddField() {
    if (!newField.title.trim()) {
      toast.error("Field title is required");
      return;
    }
    setCustomFields((prev) => [...prev, { ...newField, id: Date.now().toString() }]);
    setNewField({ id: "", type: "short_text", title: "", helpText: "", hidden: false, optional: false });
    setShowAddField(false);
  }

  function removeField(id: string) {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  }

  const displayPrice = serviceType === "free" ? 0 : Number(price) || 0;
  const displayDiscounted = hasDiscount && discountedPrice ? Number(discountedPrice) : null;
  const finalPrice = displayDiscounted ?? displayPrice;
  const gstAmount = enableGst ? Math.round(finalPrice * 0.18) : 0;
  const totalAmount = finalPrice + gstAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading...
      </div>
    );
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
          value ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    );
  }

  // Mobile preview for each tab
  function renderPreview() {
    const creatorAvatar = (session?.user as Record<string, unknown>)?.image as string | undefined;
    const creatorName = session?.user?.name || APP_NAME;
    const logo = (
      <div className="flex justify-center mb-4">
        {creatorAvatar ? (
          <img src={creatorAvatar} alt={creatorName} className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center text-sm font-bold text-white">
            {creatorName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
        )}
      </div>
    );

    if (activeTab === "payment") {
      return (
        <div className="h-[500px] flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {logo}
            <h3 className="text-sm font-bold text-gray-900 text-center">Payment Details</h3>
            <p className="text-[10px] text-gray-500 text-center mt-1">
              Complete your payment by providing your payment details.
            </p>

            {enableTimer && (
              <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-center">
                <span className="text-xs text-red-600 font-medium">
                  Offer expires in {timerMinutes}:00
                </span>
              </div>
            )}

            <div className="mt-3 border border-dashed border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Have a coupon?</span>
              <Plus className="h-3 w-3 text-gray-400" />
            </div>

            {customFields.map((f) => (
              <div key={f.id} className="mt-2">
                <label className="text-[10px] text-gray-500">{f.title}{!f.optional && " *"}</label>
                <div className="mt-0.5 h-6 rounded border border-gray-200 bg-gray-50" />
              </div>
            ))}

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Service</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-900 font-medium">{title || "Service"}</span>
                <span>&#8377;{finalPrice}</span>
              </div>
              {enableGst && gstAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST</span>
                  <span>&#8377;{gstAmount}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-xs font-semibold">
                <span>Amount to be paid:</span>
                <span>&#8377;{totalAmount}</span>
              </div>
            </div>

            {enableTerms && (
              <p className="mt-3 text-[9px] text-gray-400">
                By proceeding you agree to the Terms & Conditions.
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-white">
            <span className="text-sm font-bold">&#8377;{totalAmount}</span>
            <button className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium">
              Pay Now
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === "success") {
      return (
        <div className="h-[500px] flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-100">
            {/* Logo */}
            <div className="flex justify-center pt-4 pb-0">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={creatorName} className="w-10 h-10 rounded-lg object-cover relative z-10" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-[10px] font-bold text-white relative z-10">
                  {creatorName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              )}
            </div>

            {/* Green success banner */}
            <div className="bg-green-500 mx-3 rounded-t-xl pt-6 pb-5 px-4 text-center text-white -mt-3">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-semibold">Payment Successful</p>
              <p className="text-xl font-bold mt-1">&#8377;{totalAmount}</p>
            </div>

            {/* Zigzag tear */}
            <div className="h-2.5 bg-green-500 mx-3 relative">
              <svg viewBox="0 0 280 10" className="absolute bottom-0 w-full" preserveAspectRatio="none">
                <path d="M0,10 L8,0 L16,10 L24,0 L32,10 L40,0 L48,10 L56,0 L64,10 L72,0 L80,10 L88,0 L96,10 L104,0 L112,10 L120,0 L128,10 L136,0 L144,10 L152,0 L160,10 L168,0 L176,10 L184,0 L192,10 L200,0 L208,10 L216,0 L224,10 L232,0 L240,10 L248,0 L256,10 L264,0 L272,10 L280,0 L280,10" fill="white" />
              </svg>
            </div>

            {/* Receipt card */}
            <div className="bg-white mx-3 rounded-b-xl px-4 pt-1 pb-3 shadow-sm">
              {/* Transaction ID */}
              <div className="py-2.5 border-b border-gray-100">
                <p className="text-[9px] text-green-600 font-medium">Transaction ID</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] font-semibold text-gray-900">0987654321</p>
                  <Copy className="h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* Service */}
              <div className="py-2.5 border-b border-gray-100">
                <p className="text-[9px] text-green-600 font-medium">Service</p>
                <p className="text-[11px] font-semibold text-gray-900 mt-0.5">{title || "Service"}</p>
              </div>

              {/* Payment Method */}
              <div className="py-2.5 border-b border-gray-100">
                <p className="text-[9px] text-green-600 font-medium">Payment Method</p>
                <p className="text-[11px] font-semibold text-gray-900 mt-0.5">UPI</p>
              </div>

              {/* Payment Time */}
              <div className="py-2.5 border-b border-gray-100">
                <p className="text-[9px] text-green-600 font-medium">Payment Time</p>
                <p className="text-[11px] font-semibold text-gray-900 mt-0.5">7 April 2023 at 10:32 AM</p>
              </div>

              {/* Billing Details */}
              <div className="py-2.5">
                <p className="text-[9px] text-green-600 font-medium">Billing Details</p>
                <p className="text-[11px] font-semibold text-gray-900 mt-0.5">Subscriber Name</p>
                <p className="text-[10px] text-gray-500">subscriber_name@xyz.com</p>
              </div>
            </div>
          </div>

          {/* Login Now bottom bar */}
          {!(successConfig.customButton && successConfig.hideButton) && (
            <div className="p-3 bg-gray-100">
              <button className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold">
                {successConfig.customButton ? (successConfig.customButtonText || "Login Now") : "Login Now"}
              </button>
            </div>
          )}
        </div>
      );
    }

    // Default: Service details preview
    return (
      <div className="h-[500px] flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {logo}
          {title && (
            <h3 className="text-base font-bold text-gray-900 leading-snug">{title}</h3>
          )}
          <p className="text-xs text-gray-500 mt-1">
            by <span className="font-medium text-gray-700">Creator</span>
          </p>
          {coverImage && (
            <div className="mt-3 rounded-lg overflow-hidden">
              <img src={coverImage} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}
          {description && (
            <p className="mt-3 text-xs text-gray-600 whitespace-pre-line">{description}</p>
          )}
          <p className="mt-4 text-[10px] text-gray-400 leading-tight">
            You agree to share information entered on this page with {APP_NAME} (owner of this page) and Razorpay, adhering to applicable laws.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
            <span>{APP_NAME} 2026.</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
        <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-white">
          <span className="text-base font-bold text-gray-900">
            &#8377;{displayDiscounted ?? displayPrice}
            {displayDiscounted !== null && (
              <span className="text-xs text-gray-400 line-through ml-1">&#8377;{displayPrice}</span>
            )}
          </span>
          <button className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {serviceType === "free" ? "Register" : "Buy Now"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/creator/services" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit service</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button onClick={handleSave} loading={saving}>Save changes</Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {/* Tabs */}
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
                  activeTab === tab.key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========== SERVICE DETAILS TAB ========== */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Toggle value={published} onChange={setPublished} />
                <span className="text-sm font-medium text-gray-700">
                  {published ? "Published (visible to learners)" : "Draft (not visible)"}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Service title</label>
                  <span className="text-xs text-gray-400">{title.length} / 100</span>
                </div>
                <Input placeholder="Enter service title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} maxLength={100} />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-gray-700">Service cover</label>
                </div>
                <p className="text-xs text-gray-400 mb-2">Images should be horizontal, at least 1280x720px.</p>
                {coverImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img src={coverImage} alt="Cover" className="w-full h-48 object-cover" />
                    <button onClick={() => setCoverImage("")} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                      <span className="text-sm">{uploading ? "Uploading..." : "No cover images or videos uploaded."}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-4 w-4" /> Upload images or videos
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service description</label>
                <Textarea placeholder="Add Service description here..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[160px]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service type</label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  {([ { key: "one-time", label: "One-time" }, { key: "subscription", label: "Subscription" }, { key: "free", label: "Free service" } ] as const).map((type) => (
                    <button key={type.key} onClick={() => setServiceType(type.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${serviceType === type.key ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Toggle value={enableGst} onChange={setEnableGst} />
                <span className="text-sm font-medium text-gray-700">Enable GST</span>
              </div>

              {serviceType !== "free" && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Pricing</h3>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700">INR</div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selling price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#8377;</span>
                          <input type="number" placeholder="Enter amount" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <input type="checkbox" id="hasDiscount" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <label htmlFor="hasDiscount" className="text-sm font-medium text-gray-700">Discounted price</label>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#8377;</span>
                          <input type="number" placeholder="Enter amount" value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} disabled={!hasDiscount} className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== PAYMENT DETAILS TAB ========== */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              {/* Custom fields */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Custom field</h3>
                  <span className="text-gray-400 text-xs cursor-help" title="Add custom input fields to collect extra information from buyers">&#9432;</span>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {customFields.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{f.title}</span>
                          <span className="text-xs text-gray-400 ml-2">{FIELD_TYPES.find((t) => t.value === f.type)?.label}</span>
                          {f.optional && <span className="text-xs text-gray-400 ml-2">(Optional)</span>}
                          {f.hidden && <span className="text-xs text-gray-400 ml-2">(Hidden)</span>}
                        </div>
                        <button onClick={() => removeField(f.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowAddField(true)}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add custom field
                </button>
              </div>

              {/* Timer */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Timer</h3>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">NEW</span>
                    <span className="text-gray-400 text-xs cursor-help" title="Add a countdown timer to create urgency">&#9432;</span>
                  </div>
                  <Toggle value={enableTimer} onChange={setEnableTimer} />
                </div>
                {enableTimer && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500">Timer duration (minutes)</label>
                    <Input
                      type="number"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(e.target.value)}
                      className="mt-1 w-32"
                      min="1"
                    />
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Terms & Conditions</h3>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">NEW</span>
                    <span className="text-gray-400 text-xs cursor-help" title="Require buyers to agree to terms before payment">&#9432;</span>
                  </div>
                  <Toggle value={enableTerms} onChange={setEnableTerms} />
                </div>
                {enableTerms && (
                  <div className="mt-3">
                    <Textarea
                      placeholder="Enter your terms & conditions..."
                      value={termsText}
                      onChange={(e) => setTermsText(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </div>

              {/* Advance settings */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setAdvanceOpen(!advanceOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Advance settings</h3>
                    <span className="text-gray-400 text-xs cursor-help" title="Advanced payment configuration">&#9432;</span>
                  </div>
                  {advanceOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {advanceOpen && (
                  <div className="px-4 pb-4 text-sm text-gray-500">
                    Advanced payment settings coming soon.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== PAYMENT SUCCESS PAGE TAB ========== */}
          {activeTab === "success" && (
            <div className="space-y-6">
              {/* Add custom script */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Add custom script</span>
                    <span className="text-gray-400 text-xs cursor-help" title="Add tracking or analytics scripts to the payment success page">&#9432;</span>
                  </div>
                  <Toggle value={successConfig.customScript} onChange={(v) => setSuccessConfig((p) => ({ ...p, customScript: v }))} />
                </div>
                {successConfig.customScript && (
                  <div className="mt-3">
                    <Textarea
                      placeholder="Paste your script here..."
                      value={successConfig.customScriptCode}
                      onChange={(e) => setSuccessConfig((p) => ({ ...p, customScriptCode: e.target.value }))}
                      className="min-h-[100px] font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Customise button */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Customise button</span>
                    <span className="text-gray-400 text-xs cursor-help" title="Add a custom call-to-action button on the success page">&#9432;</span>
                  </div>
                  <Toggle value={successConfig.customButton} onChange={(v) => setSuccessConfig((p) => ({ ...p, customButton: v }))} />
                </div>
                {successConfig.customButton && (
                  <div className="mt-3 space-y-3 border border-dashed border-gray-300 rounded-lg p-4">
                    <div className="relative">
                      <Input
                        value={successConfig.customButtonText}
                        onChange={(e) => { if (e.target.value.length <= 20) setSuccessConfig((p) => ({ ...p, customButtonText: e.target.value })); }}
                        placeholder="Button title"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{successConfig.customButtonText.length} / 20</span>
                    </div>
                    <Input
                      value={successConfig.customButtonUrl}
                      onChange={(e) => setSuccessConfig((p) => ({ ...p, customButtonUrl: e.target.value }))}
                      placeholder="Button url"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={successConfig.hideButton} onChange={(e) => setSuccessConfig((p) => ({ ...p, hideButton: e.target.checked }))} className="rounded border-gray-300" />
                      Hide button
                      <span className="text-gray-400 text-xs cursor-help" title="Hide the button on the success page">&#9432;</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Redirect URL */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Redirect URL</span>
                    <span className="text-gray-400 text-xs cursor-help" title="Automatically redirect buyers to a URL after payment">&#9432;</span>
                  </div>
                  <Toggle value={successConfig.redirectUrl} onChange={(v) => setSuccessConfig((p) => ({ ...p, redirectUrl: v }))} />
                </div>
                {successConfig.redirectUrl && (
                  <div className="mt-3 space-y-3 border border-dashed border-gray-300 rounded-lg p-4">
                    <Input
                      value={successConfig.redirectUrlValue}
                      onChange={(e) => setSuccessConfig((p) => ({ ...p, redirectUrlValue: e.target.value }))}
                      placeholder="Redirect URL"
                    />
                    <div>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={successConfig.redirectDelay}
                        onChange={(e) => setSuccessConfig((p) => ({ ...p, redirectDelay: Math.min(10, Math.max(0, Number(e.target.value) || 0)) }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Max 10 seconds / Min 0</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Preview */}
        <div className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-8">
            <div className="mx-auto w-[280px] rounded-[2rem] border-4 border-gray-800 bg-white shadow-xl overflow-hidden">
              <div className="h-6 bg-gray-800 flex items-center justify-center">
                <div className="w-16 h-3 bg-gray-700 rounded-full" />
              </div>
              {renderPreview()}
              <div className="h-4 bg-gray-800 flex items-center justify-center">
                <div className="w-20 h-1 bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom field modal */}
      {showAddField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddField(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add custom field</h2>
              <button onClick={() => setShowAddField(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <select
                value={newField.type}
                onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value as CustomField["type"] }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <Input
                placeholder="Input title"
                value={newField.title}
                onChange={(e) => setNewField((p) => ({ ...p, title: e.target.value }))}
              />

              <Input
                placeholder="Help text (optional)"
                value={newField.helpText}
                onChange={(e) => setNewField((p) => ({ ...p, helpText: e.target.value }))}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.hidden}
                  onChange={(e) => setNewField((p) => ({ ...p, hidden: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Hidden field</span>
                <span className="text-gray-400 text-xs cursor-help" title="Hidden fields are not visible to buyers">&#9432;</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.optional}
                  onChange={(e) => setNewField((p) => ({ ...p, optional: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Optional field</span>
                <span className="text-gray-400 text-xs cursor-help" title="Optional fields don't require input">&#9432;</span>
              </label>

              <button
                onClick={handleAddField}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
