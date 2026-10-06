"use client";

import dynamic from "next/dynamic";

// The Beefree SDK touches `window`, so it can only render in the browser.
const EmailTemplateEditor = dynamic(() => import("@/components/creator/email-template-editor"), { ssr: false });

export default function EditDefaultEmailPage() {
  return <EmailTemplateEditor />;
}
