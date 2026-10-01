import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@creatorplatform.com",
    to,
    subject,
    html,
  });
}

export function otpEmail(name: string, otp: string) {
  return {
    subject: `${otp} is your verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Verify your email</h1>
        <p>Hi ${name}, use the code below to verify your email address:</p>
        <div style="margin: 24px 0; padding: 24px; background: #f5f3ff; border-radius: 12px; text-align: center;">
          <div style="margin-bottom: 8px;">
            ${otp.split("").map((d) => `<span style="display: inline-block; width: 40px; height: 48px; line-height: 48px; margin: 0 3px; background: white; border-radius: 8px; font-size: 28px; font-weight: bold; color: #4f46e5; border: 2px solid #e0e7ff;">${d}</span>`).join("")}
          </div>
          <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">Tap and hold to copy → <span style="user-select: all; -webkit-user-select: all; font-weight: bold; color: #4f46e5; letter-spacing: 2px; padding: 2px 8px; background: white; border-radius: 4px;">${otp}</span></p>
        </div>
        <p style="color: #666;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };
}

export function welcomeEmail(name: string) {
  return {
    subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome, ${name}!</h1>
        <p>Thanks for joining ${process.env.NEXT_PUBLIC_APP_NAME}. We're excited to have you on board.</p>
        <p>Get started by exploring courses or creating your own!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset Your Password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Reset Your Password</h1>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p style="color: #666; margin-top: 16px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };
}

export function paymentConfirmationEmail(name: string, courseName: string, amount: number) {
  return {
    subject: `Payment Confirmed - ${courseName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Payment Confirmed!</h1>
        <p>Hi ${name}, your payment of ₹${amount} for <strong>${courseName}</strong> has been confirmed.</p>
        <p>You now have full access to the course.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/courses" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Start Learning</a>
      </div>
    `,
  };
}

export function enrollmentEmail(name: string, courseName: string) {
  return {
    subject: `You're enrolled in ${courseName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">You're In!</h1>
        <p>Hi ${name}, you've been enrolled in <strong>${courseName}</strong>.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/courses" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Access Course</a>
      </div>
    `,
  };
}

export function creatorPurchaseNotificationEmail(creatorName: string, studentName: string, courseName: string, amount: number) {
  return {
    subject: `New Purchase: ${courseName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">New Sale! 🎉</h1>
        <p>Hi ${creatorName}, ${studentName} just purchased <strong>${courseName}</strong> for ₹${amount}.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/creator/payments" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Payments</a>
      </div>
    `,
  };
}

export function communityReplyEmail(name: string, postTitle: string, communityUrl: string) {
  return {
    subject: `New reply on your post: ${postTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">New Reply</h1>
        <p>Hi ${name}, someone replied to your post "<strong>${postTitle || "your post"}</strong>".</p>
        <a href="${communityUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Reply</a>
      </div>
    `,
  };
}
