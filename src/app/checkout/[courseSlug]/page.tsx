"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Shield, Mail, ArrowLeft, CheckCircle, LogIn } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  price: number;
  slug: string;
  creator: { name: string };
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Step = "details" | "verify" | "payment";

export default function CheckoutPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetchCourse();
  }, [courseSlug]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  async function fetchCourse() {
    const res = await fetch(`/api/public/courses/${courseSlug}`);
    if (!res.ok) {
      router.push("/");
      return;
    }
    setCourse(await res.json());
    setLoading(false);
  }

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.email) return;

    if (!isExistingUser && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP");
      } else {
        toast.success("Verification code sent to your email!");
        setStep("verify");
        setResendTimer(60);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExistingUserLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Signed in!");
        setStep("payment");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout/verify-and-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          otp: otpString,
          name: form.name,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
      } else {
        // Auto sign in
        const result = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (result?.error) {
          toast.error("Account created but auto-login failed. Please sign in manually.");
          setStep("payment");
        } else {
          toast.success("Account created & signed in!");
          setStep("payment");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayment() {
    if (!course) return;
    setSubmitting(true);

    try {
      if (course.price === 0) {
        const res = await fetch("/api/checkout/free-enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: course.id }),
        });
        if (res.ok) {
          router.push("/student");
        } else {
          const data = await res.json();
          toast.error(data.error || "Enrollment failed");
        }
        setSubmitting(false);
        return;
      }

      const orderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        toast.error(orderData.error || "Failed to create order");
        setSubmitting(false);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CreatorPlatform",
        description: course.title,
        order_id: orderData.razorpayOrderId,
        prefill: { name: form.name, email: form.email },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/checkout/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            router.push("/student");
          } else {
            router.push("/payment-failed");
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
        theme: { color: "#4F46E5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Something went wrong");
      setSubmitting(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").split("").slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerifyOtp();
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Checkout</h1>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { key: "details", label: "Account" },
              { key: "verify", label: "Verify" },
              { key: "payment", label: "Pay" },
            ].map((s, i) => {
              const steps: Step[] = ["details", "verify", "payment"];
              const currentIdx = steps.indexOf(step);
              const stepIdx = steps.indexOf(s.key as Step);
              const isDone = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;

              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className={`w-8 h-0.5 ${isDone ? "bg-indigo-600" : "bg-gray-200"}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDone
                          ? "bg-indigo-600 text-white"
                          : isCurrent
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent ? "text-indigo-600" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Course info */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="h-20 w-28 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{course.title}</h2>
                  <p className="text-sm text-gray-500">by {course.creator.name}</p>
                  <p className="text-lg font-bold text-indigo-600 mt-1">
                    {course.price > 0 ? formatPrice(course.price) : "Free"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Account details */}
          {step === "details" && (
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                {!isExistingUser ? (
                  <>
                    <h3 className="font-semibold">Create your account</h3>
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <Input
                        id="name"
                        label="Full Name"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                      <Input
                        id="email"
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                      <Input
                        id="password"
                        label="Password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <Button type="submit" className="w-full" loading={submitting}>
                        Continue
                      </Button>
                    </form>
                    <p className="text-center text-sm text-gray-500">
                      Already have an account?{" "}
                      <button
                        onClick={() => setIsExistingUser(true)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold flex items-center gap-2">
                      <LogIn className="h-4 w-4" /> Sign in to continue
                    </h3>
                    <form onSubmit={handleExistingUserLogin} className="space-y-4">
                      <Input
                        id="login-email"
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                      <Input
                        id="login-password"
                        label="Password"
                        type="password"
                        placeholder="Your password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                      <Button type="submit" className="w-full" loading={submitting}>
                        Sign In & Continue
                      </Button>
                    </form>
                    <p className="text-center text-sm text-gray-500">
                      New here?{" "}
                      <button
                        onClick={() => setIsExistingUser(false)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Create account
                      </button>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: OTP (new users only) */}
          {step === "verify" && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <button
                  onClick={() => { setStep("details"); setOtp(["", "", "", "", "", ""]); }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="text-center mb-6">
                  <div className="inline-flex p-3 rounded-full bg-indigo-50 mb-3">
                    <Mail className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Verify your email</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter the 6-digit code sent to <strong>{form.email}</strong>
                  </p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        handleOtpChange(0, paste);
                      }}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  ))}
                </div>

                <Button onClick={handleVerifyOtp} className="w-full" loading={submitting}>
                  Verify & Create Account
                </Button>

                <div className="text-center mt-4">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-400">Resend code in {resendTimer}s</p>
                  ) : (
                    <button
                      onClick={() => handleSendOtp()}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <>
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Signed in as {form.email}</span>
                  </div>

                  <h3 className="font-semibold mb-3">Order Summary</h3>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{course.title}</span>
                    <span>{course.price > 0 ? formatPrice(course.price) : "Free"}</span>
                  </div>
                  <div className="pt-3 mt-3 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-indigo-600">{course.price > 0 ? formatPrice(course.price) : "Free"}</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePayment}
                loading={submitting}
              >
                {course.price > 0 ? `Pay ${formatPrice(course.price)}` : "Enroll for Free"}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                <Shield className="h-4 w-4" />
                <span>Secure payment powered by Razorpay</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
