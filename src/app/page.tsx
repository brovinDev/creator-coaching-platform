import Link from "next/link";
import { BookOpen, Users, CreditCard, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="shadow-[0_1px_0_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <span className="text-xl font-bold text-indigo-600">{process.env.NEXT_PUBLIC_APP_NAME || "Upskill"}</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 hover:shadow-md active:scale-95 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Create, Sell & Manage
            <span className="text-indigo-600"> Online Courses</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Build your creator business with courses, landing pages, payments, and community — all in one platform.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition-all text-lg"
            >
              Start Creating
            </Link>
            <Link
              href="/signup"
              className="bg-gray-100 text-gray-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-200 active:scale-95 transition-all text-lg"
            >
              Start Learning
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Course Builder",
                description: "Create structured courses with modules, lessons, and video content.",
              },
              {
                icon: Zap,
                title: "Landing Pages",
                description: "Build beautiful landing pages to promote your courses.",
              },
              {
                icon: CreditCard,
                title: "Payments",
                description: "Accept payments via Razorpay. Automated enrollment on purchase.",
              },
              {
                icon: Users,
                title: "Community",
                description: "Engage students with channels, posts, and discussions.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200">
                <div className="inline-flex p-4 rounded-xl bg-indigo-50 mb-4">
                  <feature.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-gray-600 mb-8">Join thousands of creators building their business.</p>
          <Link
            href="/signup"
            className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition-all text-lg"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || "Upskill"}. All rights reserved.
      </footer>
    </div>
  );
}
