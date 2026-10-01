import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = await db.landingPage.findMany({
    where: { course: { creatorId: session.user.id } },
    include: {
      course: { select: { title: true, price: true } },
      _count: { select: { sections: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, courseId, metaPixelId } = await req.json();
  if (!title || !courseId) {
    return NextResponse.json({ error: "Title and course are required" }, { status: 400 });
  }

  const course = await db.course.findUnique({ where: { id: courseId, creatorId: session.user.id } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let slug = slugify(title);
  const existing = await db.landingPage.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const defaultSections = [
    {
      type: "hero",
      position: 0,
      content: {
        heading: course.title,
        subheading: course.description || "Learn from the best",
        ctaText: "Enroll Now",
        backgroundImage: course.thumbnail || "",
      },
    },
    {
      type: "course-info",
      position: 1,
      content: {
        title: "About This Course",
        description: course.description || "",
        features: ["Comprehensive curriculum", "Lifetime access", "Community support"],
      },
    },
    {
      type: "what-you-learn",
      position: 2,
      content: {
        title: "What You'll Learn",
        items: ["Core concepts and fundamentals", "Practical hands-on projects", "Best practices and patterns", "Real-world applications"],
      },
    },
    {
      type: "instructor",
      position: 3,
      content: {
        name: session.user.name,
        bio: "Experienced instructor passionate about teaching.",
        image: "",
      },
    },
    {
      type: "pricing",
      position: 4,
      content: {
        title: "Invest in Your Future",
        price: course.price,
        features: ["Full course access", "Community access", "Certificate of completion"],
        ctaText: "Buy Now",
      },
    },
    {
      type: "faq",
      position: 5,
      content: {
        title: "Frequently Asked Questions",
        items: [
          { question: "How long do I have access?", answer: "Lifetime access after purchase." },
          { question: "Is there a refund policy?", answer: "Contact us within 7 days for a full refund." },
        ],
      },
    },
    {
      type: "cta",
      position: 6,
      content: {
        heading: "Ready to Get Started?",
        subheading: "Join hundreds of students already learning",
        ctaText: "Enroll Now",
      },
    },
  ];

  const page = await db.landingPage.create({
    data: {
      title,
      slug,
      courseId,
      metaPixelId: metaPixelId || null,
      sections: { create: defaultSections },
    },
  });

  return NextResponse.json(page);
}
