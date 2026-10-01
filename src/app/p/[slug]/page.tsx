import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { MetaPixel } from "@/components/meta-pixel";
import { CheckCircle } from "lucide-react";

export default async function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await db.landingPage.findUnique({
    where: { slug },
    include: {
      course: {
        include: { creator: { select: { name: true, bio: true, avatar: true } } },
      },
      sections: { orderBy: { position: "asc" } },
    },
  });

  if (!page || !page.published) notFound();

  const checkoutUrl = `/checkout/${page.course.slug}`;

  return (
    <>
      {page.metaPixelId && <MetaPixel pixelId={page.metaPixelId} />}

      <div className="min-h-screen bg-white">
        {page.sections
          .filter((s) => s.visible)
          .map((section) => {
            const c = section.content as Record<string, unknown>;

            switch (section.type) {
              case "hero":
                return (
                  <section
                    key={section.id}
                    className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-20 px-4"
                    style={
                      (c.backgroundImage as string)
                        ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${c.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : undefined
                    }
                  >
                    <div className="max-w-4xl mx-auto text-center">
                      <h1 className="text-4xl md:text-5xl font-bold mb-4">{c.heading as string}</h1>
                      <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">{c.subheading as string}</p>
                      <Link
                        href={checkoutUrl}
                        className="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all text-lg"
                      >
                        {(c.ctaText as string) || "Enroll Now"}
                      </Link>
                    </div>
                  </section>
                );

              case "course-info":
                return (
                  <section key={section.id} className="py-16 px-4">
                    <div className="max-w-4xl mx-auto">
                      <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">{c.title as string}</h2>
                      <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-8">{c.description as string}</p>
                      {(c.features as string[])?.length > 0 && (
                        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {(c.features as string[]).map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                              <span className="text-gray-700">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );

              case "what-you-learn":
                return (
                  <section key={section.id} className="py-16 px-4 bg-gray-50">
                    <div className="max-w-4xl mx-auto">
                      <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">{c.title as string}</h2>
                      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {((c.items as string[]) || []).map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );

              case "instructor":
                return (
                  <section key={section.id} className="py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                      <h2 className="text-3xl font-bold text-gray-900 mb-8">Meet Your Instructor</h2>
                      <div className="flex flex-col items-center">
                        <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700 mb-4">
                          {(c.name as string)?.charAt(0) || "?"}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{c.name as string}</h3>
                        <p className="text-gray-600 mt-2 max-w-lg">{c.bio as string}</p>
                      </div>
                    </div>
                  </section>
                );

              case "pricing":
                return (
                  <section key={section.id} className="py-16 px-4 bg-gray-50">
                    <div className="max-w-lg mx-auto text-center">
                      <h2 className="text-3xl font-bold text-gray-900 mb-8">{c.title as string}</h2>
                      <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
                        <p className="text-4xl font-bold text-gray-900 mb-2">
                          {page.course.price > 0 ? formatPrice(page.course.price) : "Free"}
                        </p>
                        <p className="text-gray-500 mb-6">One-time payment</p>
                        {(c.features as string[])?.length > 0 && (
                          <ul className="text-left space-y-3 mb-8">
                            {(c.features as string[]).map((f, i) => (
                              <li key={i} className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <span className="text-gray-700">{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href={checkoutUrl}
                          className="block w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] transition-all text-center"
                        >
                          {(c.ctaText as string) || "Buy Now"}
                        </Link>
                      </div>
                    </div>
                  </section>
                );

              case "faq":
                return (
                  <section key={section.id} className="py-16 px-4">
                    <div className="max-w-3xl mx-auto">
                      <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">{c.title as string}</h2>
                      <div className="space-y-4">
                        {((c.items as Array<{ question: string; answer: string }>) || []).map((item, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-5 hover:bg-indigo-50 transition-all">
                            <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                            <p className="text-gray-600">{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );

              case "cta":
                return (
                  <section key={section.id} className="py-16 px-4 bg-indigo-600 text-white">
                    <div className="max-w-4xl mx-auto text-center">
                      <h2 className="text-3xl font-bold mb-4">{c.heading as string}</h2>
                      <p className="text-xl text-white/80 mb-8">{c.subheading as string}</p>
                      <Link
                        href={checkoutUrl}
                        className="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all text-lg"
                      >
                        {(c.ctaText as string) || "Enroll Now"}
                      </Link>
                    </div>
                  </section>
                );

              default:
                return null;
            }
          })}

        <footer className="py-8 px-4 text-center text-sm text-gray-400">
          Powered by CreatorPlatform
        </footer>
      </div>
    </>
  );
}
