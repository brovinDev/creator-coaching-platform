"use client";

import { use } from "react";
import dynamic from "next/dynamic";

// The email builder touches `window`, so the editor can only render in the browser.
const EmailEditor = dynamic(() => import("@/components/creator/email-editor"), { ssr: false });

export default function EditServiceEmailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params);
  return <EmailEditor serviceId={serviceId} />;
}
