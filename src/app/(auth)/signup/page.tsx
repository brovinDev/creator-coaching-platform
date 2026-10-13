"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AuthShell, type Step } from "@/components/auth/auth-shell";
import { CodeInput, emptyCode } from "@/components/auth/code-input";
import { COUNTRIES, PhoneInput, type Country } from "@/components/auth/phone-input";

const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || "";
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || "";

const STEPS: Step[] = [
  { label: "Register", state: "active" },
  { label: "About", state: "todo" },
];

const inputClass =
  "h-[62px] w-full rounded-md border border-gray-300 bg-white px-4 text-xl text-black placeholder:text-gray-600 focus:border-gray-500 focus:outline-none";

/** A policy name that links when the platform has set its address, and is plain text when it has not. */
function Policy({ href, children }: { href: string; children: React.ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
      {children}
    </a>
  ) : (
    <span className="text-indigo-600">{children}</span>
  );
}

/**
 * Creator sign-up, step 1 of 2: name, email and phone, then the code we email. There is no password.
 * The "About" survey follows.
 */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [digits, setDigits] = useState(emptyCode());
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const ready = form.name.trim().length > 0 && form.email.trim().length > 0 && form.phone.length >= 6 && terms;

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!ready || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
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
    if (loading) return; // Enter and the button must not send the same code twice: it works once.
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
      // Attach the phone number and what they agreed to; the account exists either way.
      await fetch("/api/account/signup-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone,
          countryCode: country.dial,
          termsAccepted: terms,
          marketingOptIn: marketing,
        }),
      }).catch(() => {});
      toast.success("Welcome!");
      router.push("/signup/about");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <AuthShell steps={STEPS}>
        <button
          onClick={() => setStep("form")}
          className="mb-6 flex w-fit cursor-pointer items-center gap-2 text-lg text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h1 className="text-[40px] font-semibold leading-tight text-black">Check your email</h1>
        <p className="mt-3 text-xl text-gray-700">
          We sent a 6-digit code to <strong className="font-semibold text-black">{form.email}</strong>
        </p>

        <div className="mt-8">
          <CodeInput digits={digits} onChange={setDigits} onSubmit={verify} />
        </div>

        <button
          onClick={verify}
          disabled={loading}
          className="mt-8 h-[56px] w-full cursor-pointer rounded-md bg-indigo-600 text-xl font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify & create account"}
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
    <AuthShell steps={STEPS}>
      <h1 className="text-[48px] font-semibold leading-[1.15] text-black">Welcome! First things first...</h1>
      <p className="mt-6 text-2xl text-black">You can always change them later.</p>

      <form onSubmit={sendCode} className="mt-16 space-y-6">
        <input
          className={inputClass}
          placeholder="Enter name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className={inputClass}
          type="email"
          placeholder="Enter email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PhoneInput country={country} onCountry={setCountry} value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />

        <div className="space-y-2 text-lg leading-6 text-gray-800">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded accent-indigo-600"
            />
            <span>
              I have read and agree to the <Policy href={TERMS_URL}>Terms of Service</Policy> and <Policy href={PRIVACY_URL}>Privacy Policy</Policy>.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded accent-indigo-600"
            />
            <span>
              I agree to receive product updates, newsletters, and promotional communications by email. I understand I can unsubscribe at
              any time.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!ready || loading}
          className="h-[56px] w-full cursor-pointer rounded-md bg-indigo-600 text-xl font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending code..." : "Get started"}
        </button>
      </form>

      <p className="mt-5 text-center text-lg text-black">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#1d86ff] hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
