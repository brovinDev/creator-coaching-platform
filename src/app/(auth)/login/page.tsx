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

/** Sign in with a code emailed to you. There is no password. */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
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
      const res = await fetch("/api/auth/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.error || "Could not send the code");
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
      const result = await signIn("credentials", { email, otp: code, redirect: false });
      if (result?.error) {
        toast.error("That code is not right, or it has expired. Ask for a new one.");
        setDigits(emptyCode());
        return;
      }
      const session = await (await fetch("/api/auth/session")).json();
      router.push(session?.user?.role === "CREATOR" ? "/creator" : "/student");
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
            onClick={() => setStep("email")}
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
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
          </div>

          <div className="mb-6">
            <CodeInput digits={digits} onChange={setDigits} onSubmit={verify} />
          </div>

          <Button onClick={verify} className="w-full" loading={loading}>
            Sign In
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">We will email you a code to sign in</p>
        </div>

        <form onSubmit={sendCode} className="space-y-4">
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

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
