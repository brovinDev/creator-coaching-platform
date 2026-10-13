"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AuthShell } from "@/components/auth/auth-shell";
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
      <AuthShell>
        <button
          onClick={() => setStep("email")}
          className="mb-6 flex w-fit cursor-pointer items-center gap-2 text-lg text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h1 className="text-[40px] font-semibold leading-tight text-black">Check your email</h1>
        <p className="mt-3 text-xl text-gray-700">
          We sent a 6-digit code to <strong className="font-semibold text-black">{email}</strong>
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
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-[48px] font-semibold leading-[1.15] text-black">Welcome back!</h1>
      <p className="mt-6 text-2xl text-black">Enter your email and we will send you a code to log in.</p>

      <form onSubmit={sendCode} className="mt-16 space-y-6">
        <input
          className="h-[62px] w-full rounded-md border border-gray-300 bg-white px-4 text-xl text-black placeholder:text-gray-600 focus:border-gray-500 focus:outline-none"
          type="email"
          placeholder="Enter email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={!email.trim() || loading}
          className="h-[56px] w-full cursor-pointer rounded-md bg-indigo-600 text-xl font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending code..." : "Send code"}
        </button>
      </form>

      <p className="mt-5 text-center text-lg text-black">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="font-medium text-[#1d86ff] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
