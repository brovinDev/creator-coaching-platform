"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
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
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
      } else {
        toast.success("Code sent to your email!");
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
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setLoading(true);

    try {
      const result = await signIn("otp", {
        email,
        otp: otpString,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid or expired code");
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role === "CREATOR") {
          router.push("/creator");
        } else {
          router.push("/student");
        }
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
            onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }}
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
              We sent a 6-digit code to <strong>{email}</strong>
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
            Verify & Sign In
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
    );
  }

  return (
    <Card>
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            Send code
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
