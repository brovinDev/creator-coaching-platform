import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] });
// TagMango's typeface, used on the pages cloned from it (courses) via var(--font-poppins).
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME || "Open Slate"} - Create & Sell Online Courses`,
  description: "Build, sell, and manage your online courses with ease.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <SessionProvider>
          {children}
          <ToastProvider />
        </SessionProvider>
      </body>
    </html>
  );
}
