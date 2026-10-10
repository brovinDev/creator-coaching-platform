"use client";

import { ChevronDown } from "lucide-react";
import { BILLING_INTERVALS, type BillingInterval } from "@/lib/billing-intervals";

/** How often a subscription service charges. Shown only when the service type is "Subscription". */
export function BillingIntervalField({ value, onChange }: { value: BillingInterval; onChange: (v: BillingInterval) => void }) {
  return (
    <div>
      <label htmlFor="billing-interval" className="block text-sm font-medium text-gray-700 mb-1">
        Enable subscription / recurring payment
      </label>
      <div className="relative max-w-xs">
        <select
          id="billing-interval"
          value={value}
          onChange={(e) => onChange(e.target.value as BillingInterval)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {(Object.keys(BILLING_INTERVALS) as BillingInterval[]).map((k) => (
            <option key={k} value={k}>
              {BILLING_INTERVALS[k].label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
      <p className="mt-1 text-xs text-gray-500">Learners are charged this price automatically every {BILLING_INTERVALS[value].per} until they cancel.</p>
    </div>
  );
}
