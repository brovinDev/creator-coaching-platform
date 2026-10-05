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

interface SidebarProps {
  user: { name: string; email: string };
}

export function CreatorSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {navItems.map((item) => {
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
