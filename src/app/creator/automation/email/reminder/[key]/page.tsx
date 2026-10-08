"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { isEmailKind } from "@/lib/email-notifications";

// The email builder touches `window`, so the editor can only render in the browser.
const EmailEditor = dynamic(() => import("@/components/creator/email-editor"), { ssr: false });

export default function EditReminderEmailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  if (!isEmailKind(key)) notFound();
  return <EmailEditor reminder={key} />;
}
