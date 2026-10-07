"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  Layers,
  LogOut,
  MessageSquare,
  Compass,
  User,
  Video,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Highlight only on this exact path (the home tab). */
  exact?: boolean;
  /** Not built yet: shown greyed out. */
  soon?: boolean;
}

const CREATOR_TABS: Tab[] = [
  { label: "Dashboard", href: "/creator", icon: Layers, exact: true },
  { label: "Feed", href: "/creator/feed", icon: Compass },
  { label: "Workshops", href: "/creator/workshops", icon: Video, soon: true },
  { label: "Courses", href: "/creator/courses", icon: BookOpen },
];

const STUDENT_TABS: Tab[] = [
  { label: "Feed", href: "/student/feed", icon: Compass },
  { label: "Workshops", href: "/student/workshops", icon: Video, soon: true },
  { label: "Courses", href: "/student", icon: BookOpen, exact: true },
];

const STUDENT_MENU_LINKS = [
  { label: "Payments", href: "/student/payments", icon: CreditCard },
  { label: "Community", href: "/student/community", icon: MessageSquare },
  { label: "Profile", href: "/student/profile", icon: User },
];

export interface TopNavProps {
  role: "CREATOR" | "STUDENT";
  user: { name: string; email?: string | null; image?: string | null };
  logoUrl?: string;
  brandName?: string;
}

/** Wrapper that owns the open state and closes on outside click or Escape. */
function Dropdown({
  trigger,
  children,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && children(() => setOpen(false))}
    </div>
  );
}

function Avatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span className={cn("flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600", className)}>
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function TopNav({ role, user, logoUrl, brandName }: TopNavProps) {
  const pathname = usePathname();
  const isCreator = role === "CREATOR";
  const tabs = isCreator ? CREATOR_TABS : STUDENT_TABS;
  const appName = brandName || process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";
  const home = isCreator ? "/creator" : "/student";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-6">
        <Link href={home} className="mr-2 flex shrink-0 items-center gap-2 sm:mr-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} className="h-10 w-10 rounded-md object-cover" />
          ) : (
            <span className="text-lg font-bold text-indigo-600">{appName}</span>
          )}
        </Link>

        <nav className="flex min-w-0 flex-1 items-stretch justify-start gap-1 overflow-x-auto sm:justify-center sm:gap-6">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const inner = (
              <>
                <tab.icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{tab.label}</span>
                {tab.soon && <span className="sr-only">(coming soon)</span>}
              </>
            );
            const base = "flex h-16 min-w-[64px] flex-col items-center justify-center gap-1 border-b-2 px-3 sm:min-w-[96px]";
            return tab.soon ? (
              <span key={tab.href} title="Coming soon" aria-disabled="true" className={cn(base, "cursor-not-allowed border-transparent text-gray-300")}>
                {inner}
              </span>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(base, "transition-colors", active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900")}
              >
                {inner}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Dropdown
            trigger={({ open, toggle }) => (
              <button type="button" onClick={toggle} aria-label="Account menu" aria-expanded={open} className="cursor-pointer rounded-full">
                <Avatar name={user.name} image={user.image} className="h-10 w-10 text-sm" />
              </button>
            )}
          >
            {(close) => (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                  {user.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
                </div>
                {!isCreator &&
                  STUDENT_MENU_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
