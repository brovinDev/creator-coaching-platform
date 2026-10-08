import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();

  const courses = await nocodeDb.courses.findMany(
    { where: { creator_id: session.user.id } },
    token
  );
  const courseIds = courses.map((c) => String(c.id));

  const allPages = await Promise.all(
    courseIds.map(async (courseId) => {
      const pages = await nocodeDb.landingPages.findMany(
        { where: { course_id: courseId } },
        token
      );
      const course = courses.find((c) => String(c.id) === courseId);
      return pages.map((page) => ({
        ...page,
        courseId: page.course_id,
        metaPixelId: page.meta_pixel_id,
        course: { title: course?.title, price: course?.price },
      }));
    })
  );

  return NextResponse.json(allPages.flat());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const { title, courseId, metaPixelId } = await req.json();
  if (!title || !courseId) {
    return NextResponse.json({ error: "Title and course are required" }, { status: 400 });
  }

  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  if (!course || String(course.creator_id) !== session.user.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  let slug = slugify(title);
  const existing = await nocodeDb.landingPages.findUnique({ slug }, token);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const page = await nocodeDb.landingPages.create(
    {
      title,
      slug,
      course_id: courseId,
      meta_pixel_id: metaPixelId || null,
      published: false,
    },
    token
  );

  const defaultSections = [
    {
      type: "hero",
      position: 0,
      content: JSON.stringify({
        heading: course.title,
        subheading: course.description || "Learn from the best",
        ctaText: "Enroll Now",
        backgroundImage: course.thumbnail || "",
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "course-info",
      position: 1,
      content: JSON.stringify({
        title: "About This Course",
        description: course.description || "",
        features: ["Comprehensive curriculum", "Lifetime access", "Community support"],
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "what-you-learn",
      position: 2,
      content: JSON.stringify({
        title: "What You'll Learn",
        items: ["Core concepts and fundamentals", "Practical hands-on projects", "Best practices and patterns", "Real-world applications"],
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "instructor",
      position: 3,
      content: JSON.stringify({
        name: session.user.name,
        bio: "Experienced instructor passionate about teaching.",
        image: "",
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "pricing",
      position: 4,
      content: JSON.stringify({
        title: "Invest in Your Future",
        price: course.price,
        features: ["Full course access", "Community access", "Certificate of completion"],
        ctaText: "Buy Now",
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "faq",
      position: 5,
      content: JSON.stringify({
        title: "Frequently Asked Questions",
        items: [
          { question: "How long do I have access?", answer: "Lifetime access after purchase." },
          { question: "Is there a refund policy?", answer: "Contact us within 7 days for a full refund." },
        ],
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
    {
      type: "cta",
      position: 6,
      content: JSON.stringify({
        heading: "Ready to Get Started?",
        subheading: "Join hundreds of students already learning",
        ctaText: "Enroll Now",
      }),
      visible: true,
      landing_page_id: String(page.id),
    },
  ];

  for (const section of defaultSections) {
    await nocodeDb.landingPageSections.create(section, token);
  }

  return NextResponse.json(page);
}
