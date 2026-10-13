import { redirect } from "next/navigation";

/** The Overview page is gone: the dashboard is Get Started. */
export default function CreatorHome() {
  redirect("/creator/getstarted");
}
