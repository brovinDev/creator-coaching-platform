"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { BookOpen, MessageSquare, CreditCard, User, LogOut } from "lucide-react";

const navItems = [
  { label: "My Courses", href: "/student", icon: BookOpen },
  { label: "Payments", href: "/student/payments", icon: CreditCard },
  { label: "Community", href: "/student/community", icon: MessageSquare },
  { label: "Profile", href: "/student/profile", icon: User },
];

export function StudentNav({ user }: { user: { name: string } }) {
  const pathname = usePathname();

  return (
    <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/student" className="text-lg font-bold text-indigo-600">
          CreatorPlatform
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 ml-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
