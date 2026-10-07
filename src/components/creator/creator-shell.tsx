"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Ticket,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductName } from "@/components/product-name";

type Icon = React.ComponentType<{ className?: string }>;

interface Item {
  label: string;
  href: string;
  icon: Icon;
  exact?: boolean;
}

interface Group {
  label: string;
  icon: Icon;
  items: { label: string; href: string }[];
}

const ITEMS: Item[] = [
  { label: "Overview", href: "/creator", icon: LayoutDashboard, exact: true },
  { label: "Services", href: "/creator/services", icon: Briefcase },
  { label: "Workshops", href: "/creator/workshops", icon: Video },
  { label: "Landing Pages", href: "/creator/landing-pages", icon: FileText },
  { label: "Community", href: "/creator/community", icon: MessageSquare },
  { label: "Coupons", href: "/creator/coupons", icon: Ticket },
  { label: "Customers", href: "/creator/customers", icon: Users },
  { label: "Payments", href: "/creator/payments", icon: CreditCard },
];

const GROUPS: Group[] = [
  { label: "Automation", icon: Zap, items: [{ label: "Email Automation", href: "/creator/automation/email" }] },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Platform Settings", href: "/creator/settings/branding" },
      { label: "Profile", href: "/creator/settings" },
    ],
  },
];

/** These top tabs have their own layout, so the dashboard sidebar is not shown. */
const NO_SIDEBAR = ["/creator/feed", "/creator/courses"];

const linkClass = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  );

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const product = useProductName();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav className="space-y-1">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
            <item.icon className="h-5 w-5" />
            {item.href === "/creator/services" ? product.Many : item.label}
          </Link>
        );
      })}

      {GROUPS.map((group) => {
        // Stays open while you are inside it; otherwise it follows the last click.
        const inside = group.items.some((i) => pathname.startsWith(i.href));
        const open = inside || openGroup === group.label;
        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => setOpenGroup(open && !inside ? null : group.label)}
              aria-expanded={open}
              className={cn(linkClass(false), "w-full cursor-pointer")}
            >
              <group.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div className="mt-1 space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(linkClass(pathname === item.href), "py-2 pl-11")}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function CreatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSidebar = !NO_SIDEBAR.some((p) => pathname.startsWith(p));

  if (!showSidebar) {
    return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>;
  }

  return (
    <div className="lg:flex">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3 lg:block">
        <SidebarNav />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-gray-200 bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"
          >
            <Menu className="h-5 w-5" /> Menu
          </button>
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-3 shadow-xl">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="mb-2 ml-auto block cursor-pointer rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
