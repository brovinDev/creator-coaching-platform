"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const transactionId = searchParams.get("txn") || "";
  const amount = searchParams.get("amount") || "0";
  const serviceName = searchParams.get("service") || "Service";
  const paymentMethod = searchParams.get("method") || "Razorpay";

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

  function copyTxn() {
    if (!transactionId) return;
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    toast.success("Transaction ID copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-0">
          <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-lg font-bold text-white shadow-lg relative z-10">
            {APP_NAME.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Green success banner */}
        <div className="bg-green-500 rounded-t-2xl pt-10 pb-8 px-6 text-center text-white -mt-7">
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
          {/* Transaction ID */}
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

          {/* Service */}
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Service</p>
            <p className="text-base font-semibold text-gray-900">{serviceName}</p>
          </div>

          {/* Payment Method */}
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Payment Method</p>
            <p className="text-base font-semibold text-gray-900">{paymentMethod}</p>
          </div>

          {/* Payment Time */}
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-1">Payment Time</p>
            <p className="text-base font-semibold text-gray-900">{paymentTime}</p>
          </div>

          {/* Login Now button */}
          <Link
            href="/student"
            className="mt-6 block w-full py-3.5 bg-gray-900 text-white rounded-xl text-center text-base font-semibold hover:bg-gray-800 transition-colors"
          >
            Login Now
          </Link>
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
