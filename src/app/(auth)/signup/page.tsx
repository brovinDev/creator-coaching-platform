"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CodeInput, emptyCode } from "@/components/auth/code-input";

/** Creator sign-up: name and email, then the code we email. There is no password. */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [digits, setDigits] = useState(emptyCode());
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.error || "Something went wrong");
      toast.success("We emailed you a code");
      setDigits(emptyCode());
      setStep("code");
      setResendIn(30);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const code = digits.join("");
    if (code.length !== 6) return void toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      // Creates the account once the code is right...
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      // ...and the same code then signs them in.
      const result = await signIn("credentials", { email: form.email, otp: code, redirect: false });
      if (result?.error) {
        toast.error("Your account is ready. Please sign in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome!");
      router.push("/creator");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <button
            onClick={() => setStep("form")}
            className="mb-4 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full bg-indigo-50 p-3">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-1 text-sm text-gray-500">
              We sent a 6-digit code to <strong>{form.email}</strong>
            </p>
          </div>

          <div className="mb-6">
            <CodeInput digits={digits} onChange={setDigits} onSubmit={verify} />
          </div>

          <Button onClick={verify} className="w-full" loading={loading}>
            Verify & Create Account
          </Button>

          <div className="mt-4 text-center">
            {resendIn > 0 ? (
              <p className="text-sm text-gray-400">Send a new code in {resendIn}s</p>
            ) : (
              <button onClick={() => sendCode()} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Send a new code
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
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Start your journey today</p>
        </div>

        <form onSubmit={sendCode} className="space-y-4">
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
          <Button type="submit" className="w-full" loading={loading}>
            Continue
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
