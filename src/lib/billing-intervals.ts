/** Billing intervals for subscription services. Pure data, safe to import from client components. */
export const BILLING_INTERVALS = {
  monthly: { label: "Monthly", per: "month", cycles: 120 },
  quarterly: { label: "Quarterly", per: "3 months", cycles: 40 },
  "half-yearly": { label: "Half-yearly", per: "6 months", cycles: 20 },
  yearly: { label: "Yearly", per: "year", cycles: 10 },
} as const;

export type BillingInterval = keyof typeof BILLING_INTERVALS;

export const isBillingInterval = (v: unknown): v is BillingInterval => typeof v === "string" && v in BILLING_INTERVALS;

/** "/ month", for a price label. Empty when the interval is not one we know. */
export const intervalSuffix = (interval: unknown) => (isBillingInterval(interval) ? `/ ${BILLING_INTERVALS[interval].per}` : "");
