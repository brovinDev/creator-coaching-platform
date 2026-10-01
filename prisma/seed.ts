import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const creatorPassword = await bcrypt.hash("creator123", 12);
  const studentPassword = await bcrypt.hash("student123", 12);

  const creator = await prisma.user.upsert({
    where: { email: "creator@demo.com" },
    update: {},
    create: {
      name: "Demo Creator",
      email: "creator@demo.com",
      passwordHash: creatorPassword,
      role: "CREATOR",
      emailVerified: new Date(),
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@demo.com" },
    update: {},
    create: {
      name: "Demo Student",
      email: "student@demo.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      emailVerified: new Date(),
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "react-masterclass" },
    update: {},
    create: {
      title: "React Masterclass",
      slug: "react-masterclass",
      description:
        "Master React from beginner to advanced. Learn hooks, state management, performance optimization, and build real-world projects.",
      price: 999,
      published: true,
      creatorId: creator.id,
    },
  });

  const module1 = await prisma.courseModule.create({
    data: {
      title: "Getting Started with React",
      position: 0,
      courseId: course.id,
    },
  });

  const module2 = await prisma.courseModule.create({
    data: {
      title: "Advanced Hooks & Patterns",
      position: 1,
      courseId: course.id,
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        title: "Introduction to React",
        content: "Welcome to the React Masterclass! In this lesson, we'll cover the basics of React and why it's the most popular frontend library.",
        position: 0,
        moduleId: module1.id,
      },
      {
        title: "Setting Up Your Development Environment",
        content: "Let's set up Node.js, VS Code, and create our first React application using Vite.",
        position: 1,
        moduleId: module1.id,
      },
      {
        title: "Components & JSX",
        content: "Learn about React components, JSX syntax, and how to structure your application.",
        position: 2,
        moduleId: module1.id,
      },
      {
        title: "useState & useEffect",
        content: "Deep dive into the two most important React hooks: useState for state management and useEffect for side effects.",
        position: 0,
        moduleId: module2.id,
      },
      {
        title: "Custom Hooks",
        content: "Learn how to create reusable custom hooks to share logic across components.",
        position: 1,
        moduleId: module2.id,
      },
    ],
  });

  const freeCourse = await prisma.course.upsert({
    where: { slug: "javascript-basics" },
    update: {},
    create: {
      title: "JavaScript Basics",
      slug: "javascript-basics",
      description: "A free introduction to JavaScript programming. Perfect for beginners.",
      price: 0,
      published: true,
      creatorId: creator.id,
    },
  });

  const jsModule = await prisma.courseModule.create({
    data: {
      title: "JavaScript Fundamentals",
      position: 0,
      courseId: freeCourse.id,
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        title: "What is JavaScript?",
        content: "An introduction to JavaScript and its role in web development.",
        position: 0,
        moduleId: jsModule.id,
      },
      {
        title: "Variables & Data Types",
        content: "Learn about let, const, var, and the different data types in JavaScript.",
        position: 1,
        moduleId: jsModule.id,
      },
    ],
  });

  await prisma.community.upsert({
    where: { creatorId: creator.id },
    update: {},
    create: {
      name: "Demo Creator's Community",
      creatorId: creator.id,
      channels: {
        create: [
          { name: "General", position: 0, description: "General discussion" },
          { name: "Course Discussion", position: 1, description: "Discuss course content" },
          { name: "Announcements", position: 2, description: "Important updates" },
        ],
      },
    },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
    },
  });

  await prisma.landingPage.upsert({
    where: { slug: "react-masterclass" },
    update: {},
    create: {
      title: "React Masterclass",
      slug: "react-masterclass",
      courseId: course.id,
      published: true,
      sections: {
        create: [
          {
            type: "hero",
            position: 0,
            content: {
              heading: "Master React in 2024",
              subheading: "From beginner to building production apps — the only React course you'll ever need.",
              ctaText: "Enroll Now",
              backgroundImage: "",
            },
          },
          {
            type: "what-you-learn",
            position: 1,
            content: {
              title: "What You'll Learn",
              items: [
                "React fundamentals & JSX",
                "Hooks & state management",
                "Performance optimization",
                "Real-world project building",
                "Testing & deployment",
                "Advanced patterns",
              ],
            },
          },
          {
            type: "pricing",
            position: 2,
            content: {
              title: "Invest in Your Future",
              price: 999,
              features: ["Full course access", "Community access", "Lifetime updates", "Certificate of completion"],
              ctaText: "Buy Now — ₹999",
            },
          },
          {
            type: "faq",
            position: 3,
            content: {
              title: "Frequently Asked Questions",
              items: [
                { question: "How long do I have access?", answer: "Lifetime access after purchase." },
                { question: "Is there a refund policy?", answer: "Contact us within 7 days for a full refund." },
                { question: "Do I need prior experience?", answer: "Basic HTML/CSS/JS knowledge is recommended." },
              ],
            },
          },
          {
            type: "cta",
            position: 4,
            content: {
              heading: "Ready to Master React?",
              subheading: "Join hundreds of students already learning",
              ctaText: "Enroll Now",
            },
          },
        ],
      },
    },
  });

  console.log("Seed complete!");
  console.log("---");
  console.log("Demo Creator: creator@demo.com / creator123");
  console.log("Demo Student: student@demo.com / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
