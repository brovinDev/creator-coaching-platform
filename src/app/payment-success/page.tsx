"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

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

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [successConfig, setSuccessConfig] = useState<SuccessConfig | null>(null);
  const [creatorLogo, setCreatorLogo] = useState<string | null>(null);
  const [creatorInitials, setCreatorInitials] = useState(APP_NAME.slice(0, 2).toUpperCase());
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const transactionId = searchParams.get("txn") || "";
  const amount = searchParams.get("amount") || "0";
  const serviceName = searchParams.get("service") || "Service";
  const paymentMethod = searchParams.get("method") || "Razorpay";
  const serviceId = searchParams.get("sid") || "";

  const now = new Date();
  const paymentTime = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + " at " + now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/public/services/${serviceId}`)
      .then((r) => r.json())
      .then((s) => {
        if (s.creator?.logo) setCreatorLogo(s.creator.logo);
        if (s.creator?.name) {
          setCreatorInitials(s.creator.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2));
        }
        try {
          const sc = typeof s.success_config === "string" ? JSON.parse(s.success_config) : s.success_config;
          if (sc) setSuccessConfig(sc);
        } catch { /* ignore */ }
      })
      .catch(() => {});
  }, [serviceId]);

  useEffect(() => {
    if (!successConfig?.customScript || !successConfig.customScriptCode) return;
    try {
      const script = document.createElement("script");
      script.textContent = successConfig.customScriptCode;
      document.head.appendChild(script);
    } catch { /* ignore */ }
  }, [successConfig]);

  useEffect(() => {
    if (!successConfig?.redirectUrl || !successConfig.redirectUrlValue) return;
    const delay = successConfig.redirectDelay || 0;
    if (delay > 0) {
      setRedirectCountdown(delay);
    } else {
      window.location.href = successConfig.redirectUrlValue;
    }
  }, [successConfig]);

  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) return;
    if (redirectCountdown === 0) {
      window.location.href = successConfig!.redirectUrlValue;
      return;
    }
    const t = setTimeout(() => {
      const next = redirectCountdown - 1;
      if (next <= 0) {
        window.location.href = successConfig!.redirectUrlValue;
      } else {
        setRedirectCountdown(next);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [redirectCountdown, successConfig]);

  function copyTxn() {
    if (!transactionId) return;
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    toast.success("Transaction ID copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const showButton = !(successConfig?.customButton && successConfig.hideButton);
  const buttonText = successConfig?.customButton ? (successConfig.customButtonText || "Login Now") : "Login Now";
  const buttonUrl = successConfig?.customButton ? (successConfig.customButtonUrl || "/student") : "/student";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-0">
          {creatorLogo ? (
            <img src={creatorLogo} alt="" className="w-14 h-14 rounded-xl object-cover shadow-lg relative z-10" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-lg font-bold text-white shadow-lg relative z-10">
              {creatorInitials}
            </div>
          )}
        </div>

        {/* Green success banner */}
        <div className="bg-green-500 rounded-t-2xl pt-10 pb-8 px-6 text-center text-white -mt-7">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full border-3 border-white flex items-center justify-center">
              <Check className="h-7 w-7 text-white" />
            </div>
          </div>
          <p className="text-lg font-semibold">Payment Successful</p>
          <p className="text-4xl font-bold mt-2">
            {Number(amount) === 0 ? "Free" : `₹${Number(amount).toLocaleString("en-IN")}`}
          </p>
        </div>

        {/* Zigzag tear */}
        <div className="h-4 bg-green-500 relative">
          <svg viewBox="0 0 400 16" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path
              d="M0,16 L12,0 L24,16 L36,0 L48,16 L60,0 L72,16 L84,0 L96,16 L108,0 L120,16 L132,0 L144,16 L156,0 L168,16 L180,0 L192,16 L204,0 L216,16 L228,0 L240,16 L252,0 L264,16 L276,0 L288,16 L300,0 L312,16 L324,0 L336,16 L348,0 L360,16 L372,0 L384,16 L396,0 L400,16"
              fill="white"
            />
          </svg>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-b-2xl px-6 pt-2 pb-6 shadow-lg">
          {transactionId && (
            <div className="py-4 border-b border-gray-100">
              <p className="text-xs text-green-600 font-medium mb-1">Transaction ID</p>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-gray-900">{transactionId}</p>
                <button onClick={copyTxn} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
            </div>
          )}

          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Service</p>
            <p className="text-base font-semibold text-gray-900">{serviceName}</p>
          </div>

          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Payment Method</p>
            <p className="text-base font-semibold text-gray-900">{paymentMethod}</p>
          </div>

          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Payment Time</p>
            <p className="text-base font-semibold text-gray-900">{paymentTime}</p>
          </div>

          {redirectCountdown !== null && redirectCountdown > 0 && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Redirecting in {redirectCountdown}s...
            </p>
          )}

          {showButton && (
            <Link
              href={buttonUrl}
              className="mt-6 block w-full py-3.5 bg-gray-900 text-white rounded-xl text-center text-base font-semibold hover:bg-gray-800 transition-colors"
            >
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}
