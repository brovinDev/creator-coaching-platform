import { auth } from "@/lib/auth";
import { PlansView } from "@/components/creator/plans-view";
import { plansForDisplay, planState } from "@/lib/plans";

export default async function PlansPage() {
  const session = await auth();
  const { plans, plan, payment } = await planState(session!.user.id);

  return (
    <PlansView
      plans={plansForDisplay(plans)}
      currentPlanId={plan.id}
      currentInterval={payment?.interval ?? null}
      downgradeScheduled={payment?.downgradeScheduled ?? false}
      currentEndsOn={payment ? payment.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null}
    />
  );
}
