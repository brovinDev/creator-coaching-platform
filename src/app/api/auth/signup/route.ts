import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, welcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === "CREATOR" ? "CREATOR" : "STUDENT",
      },
    });

    if (user.role === "CREATOR") {
      await db.community.create({
        data: {
          name: `${user.name}'s Community`,
          creatorId: user.id,
          channels: {
            create: [
              { name: "General", position: 0 },
              { name: "Announcements", position: 1 },
            ],
          },
        },
      });
    }

    const emailContent = welcomeEmail(name);
    sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
