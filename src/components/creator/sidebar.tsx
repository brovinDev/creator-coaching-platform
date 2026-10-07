"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  MessageSquare,
  Ticket,
  Menu,
  X,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/creator", icon: LayoutDashboard },
  { label: "Services", href: "/creator/services", icon: Briefcase },
  { label: "Courses", href: "/creator/courses", icon: BookOpen },
  { label: "Landing Pages", href: "/creator/landing-pages", icon: FileText },
  { label: "Community", href: "/creator/community", icon: MessageSquare },
  { label: "Coupons", href: "/creator/coupons", icon: Ticket },
  { label: "Customers", href: "/creator/customers", icon: Users },
  { label: "Payments", href: "/creator/payments", icon: CreditCard },
  { label: "Settings", href: "/creator/settings", icon: Settings },
];

const settingsItems = [
  { label: "Profile", href: "/creator/settings" },
  { label: "Branding", href: "/creator/settings/branding" },
];

const automationItems = [{ label: "Email Automation", href: "/creator/automation/email" }];

interface SidebarProps {
  user: { name: string; email: string };
}

export function CreatorSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onAutomation = pathname.startsWith("/creator/automation");
  // Stays open while you are inside it; otherwise it follows the last click.
  const [automationOpen, setAutomationOpen] = useState(onAutomation);
  const onSettings = pathname.startsWith("/creator/settings");
  const [settingsOpen, setSettingsOpen] = useState(onSettings);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-[1px_0_3px_rgba(0,0,0,0.05)] flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/creator" className="text-lg font-bold text-indigo-600">
            {process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"}
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden hover:bg-gray-100 rounded-lg p-1 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.filter((i) => i.href !== "/creator/settings").map((item) => {
            const isActive = pathname === item.href || (item.href !== "/creator" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          <div>
            <button
              type="button"
              onClick={() => setAutomationOpen((v) => !v)}
              aria-expanded={automationOpen || onAutomation}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                onAutomation ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Zap className="h-5 w-5" />
              <span className="flex-1 text-left">Automation</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", (automationOpen || onAutomation) && "rotate-180")}
              />
            </button>
            {(automationOpen || onAutomation) && (
              <div className="mt-1 space-y-1">
                {automationItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen || onSettings}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                onSettings ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", (settingsOpen || onSettings) && "rotate-180")}
              />
            </button>
            {(settingsOpen || onSettings) && (
              <div className="mt-1 space-y-1">
                {settingsItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 w-full px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
