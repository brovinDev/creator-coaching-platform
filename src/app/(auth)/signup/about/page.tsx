import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AboutSurvey } from "@/components/auth/about-survey";

/** Step 2 of sign-up. Only a signed-in creator gets here, straight after verifying their email. */
export default async function SignupAboutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CREATOR") redirect("/courses");
  return <AboutSurvey />;
}
