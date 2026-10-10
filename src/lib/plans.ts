import { nocodeDb } from "@/lib/nocode/db";

type Row = Record<string, unknown>;

export type PlanId = string;
export type PlanInterval = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly fee in rupees, before GST. */
  monthly: number;
  /** Commission on each sale, in percent. */
  commission: number;
  tagline: string;
  /** What this plan adds on top of the one before it. */
  features: string[];
}

export const GST_RATE = 18;
/** A yearly plan is billed for 10 months: two are free. */
export const YEARLY_BILLED_MONTHS = 10;

/** Used until the plans exist in the backend (they are copied there the first time they are read). */
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    monthly: 0,
    commission: 10,
    tagline: "Pay only when you earn. No fixed monthly commitment.",
    features: [
      "Unlimited services, workshops, courses and 1:1 consultations",
      "Unlimited paid and free users",
      "Unlimited landing pages with 4 templates",
      "Multi-page website with 2 templates",
      "Email and WhatsApp automation",
      "Community feed, banners and chat rooms",
      "In-built Zoom meetings for 300 participants",
      "Coupon codes up to 80% off",
      "Certificate automations",
      "Storefront with unlimited products",
      "Zapier and Pabbly integrations",
      "Up to 20 GB media upload",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 5000,
    commission: 5,
    tagline: "Halve your commission and unlock tools to grow.",
    features: [
      "10+ premium landing page and website templates",
      "50,000 emails every month",
      "Unlimited media upload",
      "Coupon codes up to 100% off",
      "Direct refunds to customers",
      "Customised certificates",
      "Timer on checkout pages",
      "Service details page",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    monthly: 15000,
    commission: 2.5,
    tagline: "A gamified community and learning experience for your audience.",
    features: [
      "Unlimited emails",
      "Channels, channel groups and threads in messages",
      "Gamification and forum with repost",
      "In-built Zoom webinars for 500 participants",
      "Customise menu and integrate custom tools",
      "Affiliates with lifetime linking",
      "Upsells (bump ups)",
      "Free services for courses",
      "Sign-up service",
      "DRM protection against piracy",
      "Add unlimited users manually or via Zapier / Pabbly",
      "No-cost EMI",
      "Override payment gateway logic",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthly: 30000,
    commission: 0,
    tagline: "Everything maxed out, with zero commission.",
    features: [
      "Lowest payment gateway charges (1.5% for Indian payments)",
      "Level Up",
      "Challenges 2.0",
      "Link Up",
      "Level Up Council",
      "Check Up",
      "Connect (TQ)",
    ],
  },
];

export const isInterval = (v: unknown): v is PlanInterval => v === "monthly" || v === "yearly";

/** What a plan costs for an interval, before and after GST. All sums are made here, never in the browser. */
export function quote(plan: Plan, interval: PlanInterval) {
  const base = interval === "yearly" ? plan.monthly * YEARLY_BILLED_MONTHS : plan.monthly;
  const gst = Math.round((base * GST_RATE) / 100);
  return { base, gst, total: base + gst };
}

export function addInterval(from: Date, interval: PlanInterval) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + (interval === "yearly" ? 12 : 1));
  return d;
}

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

function parseFeatures(v: unknown): string[] {
  try {
    const list = typeof v === "string" ? JSON.parse(v) : v;
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * The plans, cheapest first. They live in the backend `plans` module so prices can be changed there
 * without a deploy. An empty module is filled from DEFAULT_PLANS, and if the backend cannot be
 * reached the defaults are used so plans never disappear. The first plan is the free one.
 */
export async function loadPlans(): Promise<Plan[]> {
  try {
    let rows: Row[] = await nocodeDb.plans.findMany({}, SYSTEM_TOKEN);
    if (rows.length === 0) {
      for (const [i, p] of DEFAULT_PLANS.entries()) {
        await nocodeDb.plans.create(
          {
            plan_id: p.id,
            name: p.name,
            monthly_price: String(p.monthly),
            commission: String(p.commission),
            tagline: p.tagline,
            features: JSON.stringify(p.features),
            sort_order: String(i),
            active: "true",
          },
          SYSTEM_TOKEN
        );
      }
      rows = await nocodeDb.plans.findMany({}, SYSTEM_TOKEN);
    }
    const plans = rows
      .filter((r) => r.active !== false && r.active !== "false")
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((r) => ({
        id: String(r.plan_id),
        name: String(r.name),
        monthly: Number(r.monthly_price) || 0,
        commission: Number(r.commission) || 0,
        tagline: String(r.tagline || ""),
        features: parseFeatures(r.features),
      }));
    return plans.length > 0 ? plans : DEFAULT_PLANS;
  } catch (error) {
    console.error("Could not load plans, using the defaults:", error);
    return DEFAULT_PLANS;
  }
}

/** Everything the plans page needs to show, ready to display. */
export function plansForDisplay(plans: Plan[]) {
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    commission: p.commission,
    tagline: p.tagline,
    features: p.features,
    prices: { monthly: quote(p, "monthly").base, yearly: quote(p, "yearly").base },
  }));
}

export interface PlanPayment {
  id: string;
  planId: PlanId;
  /** The plan's name and commission when it was paid for; later price changes do not touch them. */
  planName: string;
  commission: number;
  interval: PlanInterval;
  base: number;
  gst: number;
  total: number;
  invoiceNo: string;
  paidAt: Date;
  expiresAt: Date;
  /** True when the creator chose to move to Basic once this period ends. */
  downgradeScheduled: boolean;
}

/** The creator's paid plan payments, newest first. */
async function paidPlanPayments(creatorId: string, plans: Plan[]): Promise<PlanPayment[]> {
  const rows: Row[] = await nocodeDb.planPayments.findMany({ where: { creator_id: creatorId, status: "paid" } }, SYSTEM_TOKEN);
  return rows
    .flatMap((r) => {
      const plan = plans.find((p) => p.id === String(r.plan_id));
      if (!isInterval(r.billing_interval)) return [];
      const paidAt = new Date(String(r.paid_at || r.created_at || ""));
      const expiresAt = new Date(String(r.expires_at || ""));
      if (isNaN(paidAt.getTime()) || isNaN(expiresAt.getTime())) return [];
      const stored = r.commission === undefined || r.commission === null || r.commission === "" ? null : Number(r.commission);
      return [
        {
          id: String(r.id),
          planId: String(r.plan_id),
          planName: String(r.plan_name || plan?.name || r.plan_id),
          commission: stored ?? plan?.commission ?? 0,
          interval: r.billing_interval,
          base: Number(r.base_amount) || 0,
          gst: Number(r.gst_amount) || 0,
          total: Number(r.amount) || 0,
          invoiceNo: String(r.invoice_no || ""),
          paidAt,
          expiresAt,
          downgradeScheduled: !!r.cancelled_at,
        },
      ];
    })
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
}

/** The plans, the creator's payments, and which plan is in force on a date (Basic when none is). */
export async function planState(creatorId: string, date = new Date()) {
  const plans = await loadPlans();
  const payments = await paidPlanPayments(creatorId, plans);
  const payment = payments.find((p) => p.paidAt <= date && date < p.expiresAt) || null;
  const basic = plans[0];
  const plan = (payment && plans.find((p) => p.id === payment.planId)) || basic;
  return {
    plans,
    payments,
    payment,
    plan,
    /** What applied then: the payment's own commission, or Basic's. */
    commission: payment ? payment.commission : basic.commission,
    planName: payment ? payment.planName : basic.name,
  };
}
