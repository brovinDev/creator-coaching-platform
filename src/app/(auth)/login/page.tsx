"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AuthFooter, AuthShell, LogoMark } from "@/components/auth/auth-shell";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";
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
    if (loading) return;
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
    if (loading) return; // Enter and the button must not send the same code twice: it works once.
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
      router.push(session?.user?.role === "CREATOR" ? "/creator" : "/courses");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <AuthShell bare>
        <div>
          <LogoMark size={60} />
          <button
            onClick={() => setStep("email")}
            className="mt-8 flex w-fit cursor-pointer items-center gap-2 text-lg text-gray-600 hover:text-black"
          >
            <ArrowLeft className="h-5 w-5" /> Back
          </button>
          <h1 className="mt-4 text-[40px] font-semibold leading-tight text-gray-700">Check your email</h1>
          <p className="mt-3 text-[22px] text-black">
            We sent a 6-digit code to <strong className="font-semibold">{email}</strong>
          </p>

          <div className="mt-8">
            <CodeInput digits={digits} onChange={setDigits} onSubmit={verify} />
          </div>

          <button
            onClick={verify}
            disabled={loading}
            className="mt-8 h-[56px] w-full cursor-pointer rounded-md bg-indigo-600 text-xl font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="mt-5 text-center text-lg text-gray-600">
            {resendIn > 0 ? (
              `Send a new code in ${resendIn}s`
            ) : (
              <button onClick={() => sendCode()} className="cursor-pointer font-medium text-indigo-600 hover:underline">
                Send a new code
              </button>
            )}
          </p>
        </div>
        <AuthFooter />
      </AuthShell>
    );
  }

  return (
    <AuthShell bare>
      <div>
        <LogoMark size={60} />
        <h1 className="mt-[33px] text-[48px] font-semibold leading-[1.15] text-gray-700">Continue to use {APP_NAME}</h1>
        <p className="mt-4 text-[22px] text-black">Welcome back! Please enter your details.</p>

        <form onSubmit={sendCode} className="mt-[85px]">
          <input
            className="h-[60px] w-full rounded-md border border-gray-300 bg-white px-4 text-xl text-black placeholder:text-gray-600 focus:border-gray-500 focus:outline-none"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="mt-10 h-[57px] w-full cursor-pointer rounded-md bg-indigo-600 text-xl font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending code..." : "Request OTP"}
          </button>
        </form>

        <p className="mt-12 text-center text-lg text-black">
          Not registered yet?{" "}
          <Link href="/signup" className="font-semibold text-[#1d86ff] hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
      <AuthFooter />
    </AuthShell>
  );
}
