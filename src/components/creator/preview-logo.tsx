"use client";

import { useEffect, useState } from "react";
import { buttonStyle } from "@/lib/branding-colors";

export interface PreviewBranding {
  logoUrl: string;
  brandName: string;
  themeColor: string;
}

/** The creator's saved branding, for the mobile previews in the service editors. */
export function usePreviewBranding(): PreviewBranding {
  const [branding, setBranding] = useState<PreviewBranding>({ logoUrl: "", brandName: "", themeColor: "" });

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b) setBranding({ logoUrl: b.logoUrl || "", brandName: b.brandName || "", themeColor: b.themeColor || "" });
      })
      .catch(() => {});
  }, []);

  return branding;
}

/** Logo if set, otherwise the initials of `name`. */
export function PreviewLogo({
  logoUrl,
  name,
  imgClass,
  initialsClass,
}: {
  logoUrl: string;
  name: string;
  imgClass: string;
  initialsClass: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className={imgClass} />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return <div className={`${initialsClass} bg-gray-900 flex items-center justify-center font-bold text-white`}>{initials}</div>;
}

export { buttonStyle };
