"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Plus, Mail, CheckCircle, LogIn, X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { buttonStyle } from "@/lib/branding-colors";
import { ThemeScope } from "@/components/theme-scope";
import toast from "react-hot-toast";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

interface CustomField {
  id: string;
  type: string;
  title: string;
  helpText?: string;
  hidden?: boolean;
  optional?: boolean;
  options?: string[];
}

interface ServiceData {
  id: string;
  courseId: string;
  title: string;
  description: string;
  coverImage: string | null;
  price: number;
  discountedPrice: number | null;
  enableGst: boolean;
  serviceType: string;
  slug: string;
  creator: { name: string; logo: string | null };
  branding?: { themeColor: string; termsUrl: string; privacyUrl: string };
  customFields: CustomField[];
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type AuthStep = "form" | "otp" | "done";

export default function CheckoutPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string; code: string; discount_type: string; discount_value: number;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  useEffect(() => { fetchService(); }, [courseSlug]);

  useEffect(() => {
    if (session?.user) {
      setAuthStep("done");
      if (session.user.email) setForm((f) => ({ ...f, email: session.user!.email! }));
    }
  }, [session]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  async function fetchService() {
    const serviceRes = await fetch(`/api/public/services/${courseSlug}`);
    if (serviceRes.ok) {
      const s = await serviceRes.json();
      const courseIdStr = String(s.course_id || "");
      const firstCourseId = courseIdStr.split(",").filter(Boolean)[0]?.trim() || "";
      let customFields: CustomField[] = [];
      try {
        const pc = typeof s.payment_config === "string" ? JSON.parse(s.payment_config) : s.payment_config;
        if (pc?.customFields) customFields = pc.customFields.filter((f: CustomField) => !f.hidden);
      } catch { /* ignore */ }
      setService({
        id: s.id, courseId: firstCourseId,
        title: s.title || "", description: s.description || "",
        coverImage: s.cover_image || null,
        price: Number(s.price) || 0,
        discountedPrice: s.discounted_price ? Number(s.discounted_price) : null,
        enableGst: !!s.enable_gst, serviceType: s.service_type || "one-time",
        slug: s.slug || "",
        creator: s.creator || { name: "Creator", logo: null },
        branding: s.branding,
        customFields,
      });
      setLoading(false);
      return;
    }
    const courseRes = await fetch(`/api/public/courses/${courseSlug}`);
    if (courseRes.ok) {
      const c = await courseRes.json();
      setService({
        id: c.id, courseId: c.id,
        title: c.title || "", description: c.description || "",
        coverImage: c.thumbnail || null,
        price: Number(c.price) || 0, discountedPrice: null,
        enableGst: false, serviceType: "one-time", slug: c.slug || "",
        creator: c.creator || { name: "Creator", logo: null },
        customFields: [],
      });
      setLoading(false);
      return;
    }
    router.push("/");
  }

  const basePrice = service ? (service.discountedPrice ?? service.price) : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round(basePrice * appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, basePrice)
    : 0;
  const priceAfterCoupon = Math.max(0, basePrice - couponDiscount);
  const gstAmount = service?.enableGst ? Math.round(priceAfterCoupon * 0.18) : 0;
  const totalAmount = priceAfterCoupon + gstAmount;
  const isFree = service?.serviceType === "free" || totalAmount === 0;

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.email) return;
    if (!isExistingUser) {
      const pw = form.password;
      if (pw.length < 8 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) {
        toast.error("Password needs 8+ chars with uppercase, lowercase, number & special character");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to send OTP");
      else {
        toast.success("Verification code sent!");
        setAuthStep("otp");
        setResendTimer(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setSubmitting(true);
    try {
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) toast.error("Invalid email or password");
      else { toast.success("Signed in!"); setAuthStep("done"); }
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  async function handleVerifyOtp() {
    const otpString = otp.join("");
    if (otpString.length !== 6) { toast.error("Enter the complete 6-digit code"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/verify-and-register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: otpString, name: form.name, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Verification failed");
      else {
        const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (result?.error) toast.error("Account created but login failed.");
        else { toast.success("Account created!"); setAuthStep("done"); }
      }
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").split("").slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
      setOtp(newOtp);
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "Enter") handleVerifyOtp();
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, serviceId: service?.id }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        toast.success(`Coupon "${data.code}" applied!`);
      } else {
        toast.error(data.error || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setShowCoupon(false);
  }

  async function handlePayment() {
    if (!service) return;
    if (authStep !== "done") { toast.error("Please sign in or create an account first"); return; }
    const requiredFields = service.customFields.filter((f) => !f.optional);
    const missingField = requiredFields.find((f) => !customFieldValues[f.id]?.trim());
    if (missingField) { toast.error(`Please fill in "${missingField.title}"`); return; }
    setSubmitting(true);
    try {
      if (isFree) {
        const res = await fetch("/api/checkout/free-enroll", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: service.courseId, serviceId: service.id, couponId: appliedCoupon?.couponId, customFields: customFieldValues }),
        });
        if (res.ok) {
          const p = new URLSearchParams({ amount: "0", service: service.title, method: "Free", sid: service.id });
          router.push(`/payment-success?${p.toString()}`);
        } else { const data = await res.json(); toast.error(data.error || "Enrollment failed"); }
        setSubmitting(false);
        return;
      }
      const orderRes = await fetch("/api/checkout/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: service.courseId, serviceId: service.id, amount: totalAmount, couponId: appliedCoupon?.couponId, customFields: customFieldValues }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) { toast.error(orderData.error || "Failed to create order"); setSubmitting(false); return; }

      const options = {
        key: orderData.key, amount: orderData.amount, currency: orderData.currency,
        name: APP_NAME, description: service.title, order_id: orderData.razorpayOrderId,
        prefill: { name: form.name, email: form.email },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/checkout/verify-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }),
          });
          if (verifyRes.ok) {
            const vd = await verifyRes.json();
            const p = new URLSearchParams({ txn: vd.transactionId || response.razorpay_payment_id, amount: String(vd.amount || ""), service: vd.serviceName || "", method: vd.paymentMethod || "Razorpay", sid: service.id });
            router.push(`/payment-success?${p.toString()}`);
          } else router.push("/payment-failed");
        },
        modal: { ondismiss: () => setSubmitting(false) },
        theme: { color: "#4F46E5" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch { toast.error("Something went wrong"); setSubmitting(false); }
  }

  if (loading || !service) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
  }

  const logoInitials = service.creator.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || APP_NAME.slice(0, 2).toUpperCase();

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <ThemeScope color={service.branding?.themeColor} className="min-h-screen bg-gray-100">
        {/* Top bar with logo */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {service.creator.logo ? (
            <img src={service.creator.logo} alt={service.creator.name} className="h-10 rounded-lg object-cover" />
          ) : (
            <span className="text-xl font-bold text-gray-900">{logoInitials}</span>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT — Service details */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl p-6 lg:p-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {service.title}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  By {service.creator.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {isFree ? "Free" : formatPrice(basePrice)}
                  {service.discountedPrice !== null && (
                    <span className="text-base text-gray-400 line-through ml-2">
                      {formatPrice(service.price)}
                    </span>
                  )}
                </p>

                {service.coverImage && (
                  <div className="mt-6 rounded-lg overflow-hidden">
                    <img src={service.coverImage} alt={service.title} className="w-full object-cover" />
                  </div>
                )}

                {service.description && (
                  <div className="mt-6 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {service.description}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Payment form */}
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="bg-white rounded-xl p-6 lg:sticky lg:top-8">
                <h2 className="text-lg font-bold text-gray-900">Payment details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Complete your purchase by providing your payment details.
                </p>

                {/* Auth */}
                {authStep !== "done" && (
                  <div className="mt-5 border border-gray-200 rounded-xl p-4">
                    {authStep === "form" && !isExistingUser && (
                      <>
                        <p className="text-sm font-medium text-gray-900 mb-3">Verify using email</p>
                        <form onSubmit={handleSendOtp} className="space-y-3">
                          <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                          <Input type="email" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                          <Input type="password" placeholder="Create password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                          <button type="submit" disabled={submitting} className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                            {submitting ? "Sending..." : "Request OTP"}
                          </button>
                        </form>
                        <p className="text-center text-xs text-gray-500 mt-3">
                          OR, <button onClick={() => setIsExistingUser(true)} className="text-indigo-600 font-medium cursor-pointer">Sign in with password</button>
                        </p>
                      </>
                    )}

                    {authStep === "form" && isExistingUser && (
                      <>
                        <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <LogIn className="h-4 w-4" /> Sign in
                        </p>
                        <form onSubmit={handleLogin} className="space-y-3">
                          <Input type="email" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                          <button type="submit" disabled={submitting} className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                            {submitting ? "Signing in..." : "Sign In"}
                          </button>
                        </form>
                        <p className="text-center text-xs text-gray-500 mt-3">
                          OR, <button onClick={() => setIsExistingUser(false)} className="text-indigo-600 font-medium cursor-pointer">Verify using email</button>
                        </p>
                      </>
                    )}

                    {authStep === "otp" && (
                      <>
                        <button onClick={() => { setAuthStep("form"); setOtp(["","","","","",""]); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 mb-3 cursor-pointer">
                          <ArrowLeft className="h-3 w-3" /> Back
                        </button>
                        <div className="text-center mb-4">
                          <div className="inline-flex p-2.5 rounded-full bg-indigo-50 mb-2">
                            <Mail className="h-5 w-5 text-indigo-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">Verify your email</p>
                          <p className="text-xs text-gray-500 mt-1">Code sent to <strong>{form.email}</strong></p>
                        </div>
                        <div className="flex justify-center gap-2 mb-4">
                          {otp.map((digit, i) => (
                            <input
                              key={i}
                              ref={(el) => { otpRefs.current[i] = el; }}
                              type="text" inputMode="numeric" maxLength={6} value={digit}
                              onChange={(e) => handleOtpChange(i, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e)}
                              onPaste={(e) => { e.preventDefault(); handleOtpChange(0, e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); }}
                              className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ))}
                        </div>
                        <button onClick={handleVerifyOtp} disabled={submitting} className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                          {submitting ? "Verifying..." : "Verify & Continue"}
                        </button>
                        <div className="text-center mt-3">
                          {resendTimer > 0 ? (
                            <p className="text-xs text-gray-400">Resend in {resendTimer}s</p>
                          ) : (
                            <button onClick={() => handleSendOtp()} className="text-xs text-indigo-600 font-medium cursor-pointer">Resend code</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {authStep === "done" && (
                  <div className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 truncate">{form.email || session?.user?.email}</span>
                  </div>
                )}

                {/* Custom Fields */}
                {service.customFields.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {service.customFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.title}{!field.optional && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {field.type === "long_text" ? (
                          <textarea
                            placeholder={field.helpText || field.title}
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={!field.optional}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : field.type === "dropdown" ? (
                          <select
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={!field.optional}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Select {field.title}</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                            placeholder={field.helpText || field.title}
                            value={customFieldValues[field.id] || ""}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={!field.optional}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Coupon */}
                <div className="mt-5">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {appliedCoupon.code} ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% off` : `${formatPrice(appliedCoupon.discount_value)} off`})
                        </span>
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : !showCoupon ? (
                    <button
                      onClick={() => setShowCoupon(true)}
                      className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏷️</span>
                        <span>Have a coupon?</span>
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                        {couponCode && (
                          <button onClick={() => { setCouponCode(""); setShowCoupon(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Button variant="outline" onClick={handleApplyCoupon} disabled={applyingCoupon}>
                        {applyingCoupon ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Order summary */}
                <div className="mt-5 border-t border-gray-200 pt-5 space-y-3">
                  <p className="text-sm font-medium text-gray-500">Service</p>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-900">{service.title}</span>
                    <span className="text-sm font-medium text-gray-900 shrink-0">
                      {isFree && !appliedCoupon ? "Free" : formatPrice(basePrice)}
                    </span>
                  </div>

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}

                  {service.enableGst && gstAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>GST (18%)</span>
                      <span>{formatPrice(gstAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Amount to be paid :</span>
                    <span className="text-base font-bold text-gray-900">
                      {isFree ? "Free" : formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Pay button */}
                <button
                  onClick={handlePayment}
                  disabled={submitting || authStep !== "done"}
                  className="w-full mt-5 py-3.5 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                  style={authStep === "done" ? buttonStyle(service.branding?.themeColor) : {}}
                >
                  {submitting ? "Processing..." : isFree ? "Register" : `Proceed to pay ${formatPrice(totalAmount)}`}
                </button>

                {(service.branding?.termsUrl || service.branding?.privacyUrl) && (
                  <p className="mt-3 text-center text-xs text-gray-400">
                    By continuing you agree to the{" "}
                    {service.branding?.termsUrl && (
                      <a href={service.branding.termsUrl} target="_blank" rel="noopener noreferrer" className="underline">Terms</a>
                    )}
                    {service.branding?.termsUrl && service.branding?.privacyUrl && " and "}
                    {service.branding?.privacyUrl && (
                      <a href={service.branding.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>
                    )}
                  </p>
                )}

                {/* Payment method icons */}
                {!isFree && (
                  <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-gray-400 font-medium">
                    <span>UPI</span>
                    <span>Paytm</span>
                    <span>VISA</span>
                    <span>Mastercard</span>
                    <span>RuPay</span>
                    <span>GPay</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ThemeScope>
    </>
  );
}
