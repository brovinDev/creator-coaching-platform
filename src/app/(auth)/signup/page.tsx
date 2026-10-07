"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
      } else {
        toast.success("OTP sent to your email!");
        setStep("otp");
        setResendTimer(60);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: otpString }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Verification failed");
      } else {
        toast.success("Email verified! Redirecting to login...");
        router.push("/login");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
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

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  }

  if (step === "otp") {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <button
            onClick={() => { setStep("form"); setOtp(["", "", "", "", "", ""]); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-indigo-50 mb-4">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="text-sm text-gray-500 mt-1">
              We sent a 6-digit code to <strong>{form.email}</strong>
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

          <Button onClick={handleVerifyOtp} className="w-full" loading={loading}>
            Verify & Create Account
          </Button>

          <div className="text-center mt-4">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-400">Resend OTP in {resendTimer}s</p>
            ) : (
              <button
                onClick={() => handleSendOtp()}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Resend OTP
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start your journey today</p>
        </div>

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
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Continue
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
