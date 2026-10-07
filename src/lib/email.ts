import { readableTextColor } from "@/lib/branding-colors";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
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
  /** Plain-text alternative sent alongside the HTML. */
  text?: string;
  /** Display name shown to the recipient; the sending address stays the platform's. */
  fromName?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, fromName, replyTo }: SendEmailOptions) {
  const address = process.env.EMAIL_FROM || process.env.SMTP_USER;
  // Strip anything that could break out of the quoted display name or inject a header.
  const safeName = fromName?.replace(/[\r\n"<>]/g, "").trim();
  await transporter.sendMail({
    from: safeName && address ? `"${safeName}" <${address}>` : address,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
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
          <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">Tap and hold to copy: <span style="user-select: all; -webkit-user-select: all; font-weight: bold; color: #4f46e5; letter-spacing: 2px; padding: 2px 8px; background: white; border-radius: 4px;">${otp}</span></p>
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
        <h1 style="color: #1a1a1a;">New Sale!</h1>
        <p>Hi ${creatorName}, ${studentName} just purchased <strong>${courseName}</strong> for ₹${amount}.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/creator/payments" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Payments</a>
      </div>
    `,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatAmount(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export interface ServiceRegistrationEmailInput {
  name: string;
  serviceName: string;
  /** 0 (or omitted) means the service was free — no receipt is shown. */
  amount?: number;
  currency?: string;
  transactionId?: string;
  /** ISO date; only mentioned when it is in the future. */
  startDate?: string | null;
  /** Creator branding: image shown above the heading, and the button colour (#rrggbb). */
  logoUrl?: string;
  buttonColor?: string;
}

/**
 * The single email a learner gets after registering for a service.
 * Free services get a welcome; paid services get the same welcome with a receipt,
 * so a purchase never produces two separate emails.
 */
export function serviceRegistrationEmail(input: ServiceRegistrationEmailInput) {
  const name = escapeHtml(input.name || "there");
  const service = escapeHtml(input.serviceName);
  const paid = (input.amount ?? 0) > 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appName = escapeHtml(process.env.NEXT_PUBLIC_APP_NAME || "Open Slate");

  const startsLater =
    input.startDate && new Date(input.startDate).getTime() > Date.now()
      ? formatDate(input.startDate)
      : "";

  const receipt = paid
    ? `
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Amount paid</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatAmount(input.amount!, input.currency)}</td>
          </tr>
          ${
            input.transactionId
              ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Transaction ID</td>
            <td style="padding: 8px 0; text-align: right; border-top: 1px solid #e5e7eb; font-family: monospace;">${escapeHtml(input.transactionId)}</td>
          </tr>`
              : ""
          }
        </table>`
    : "";

  return {
    subject: paid ? `Payment confirmed - ${input.serviceName}` : `You're registered for ${input.serviceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${input.logoUrl ? `<img src="${escapeHtml(input.logoUrl)}" alt="" style="max-height: 56px; max-width: 200px; margin-bottom: 16px;" />` : ""}
        <h1 style="color: #1a1a1a;">${paid ? "Payment confirmed!" : "You're in!"}</h1>
        <p>Hi ${name}, you're now registered for <strong>${service}</strong>.</p>
        ${receipt}
        ${startsLater ? `<p>This service starts on <strong>${startsLater}</strong>.</p>` : ""}
        <p>Sign in to ${appName} to access everything included in your registration.</p>
        <a href="${appUrl}/student" style="display: inline-block; padding: 12px 24px; background: ${escapeHtml(input.buttonColor || "#6366f1")}; color: ${escapeHtml(readableTextColor(input.buttonColor || "#6366f1"))}; text-decoration: none; border-radius: 6px;">Go to my dashboard</a>
      </div>
    `,
  };
}

export interface ServiceSaleNotificationInput {
  creatorName: string;
  learnerName: string;
  learnerEmail: string;
  serviceName: string;
  amount?: number;
  currency?: string;
}

/** Sent to the creator on every registration, free or paid. */
export function serviceSaleNotificationEmail(input: ServiceSaleNotificationInput) {
  const paid = (input.amount ?? 0) > 0;
  const learner = escapeHtml(input.learnerName || "A learner");
  const service = escapeHtml(input.serviceName);

  return {
    subject: paid ? `New purchase: ${input.serviceName}` : `New registration: ${input.serviceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">${paid ? "New sale!" : "New registration!"}</h1>
        <p>Hi ${escapeHtml(input.creatorName || "there")}, <strong>${learner}</strong> (${escapeHtml(input.learnerEmail)}) just ${
          paid ? `purchased <strong>${service}</strong> for ${formatAmount(input.amount!, input.currency)}` : `registered for <strong>${service}</strong>`
        }.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/creator/${paid ? "payments" : "customers"}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">${paid ? "View payments" : "View customers"}</a>
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

export interface WorkshopReminderEmailInput {
  name: string;
  workshopTitle: string;
  hostName: string;
  /** "in 24 hours", "in 1 hour", "in 5 minutes". */
  phrase: string;
  /** Start time already formatted in the workshop's timezone, e.g. "Thu, 8 Oct, 7:00 pm IST". */
  when: string;
  /** Direct meeting link. Only the last reminder carries it; earlier ones point at the app. */
  joinUrl?: string;
  logoUrl?: string;
  buttonColor?: string;
}

/** Reminder sent to learners shortly before a workshop session. */
export function workshopReminderEmail(input: WorkshopReminderEmailInput) {
  const name = escapeHtml(input.name || "there");
  const title = escapeHtml(input.workshopTitle);
  const host = escapeHtml(input.hostName);
  const when = escapeHtml(input.when);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const color = input.buttonColor || "#4f46e5";
  const target = input.joinUrl || `${appUrl}/student/workshops`;
  const label = input.joinUrl ? "Join workshop" : "View my workshops";

  return {
    subject: `Reminder: ${input.workshopTitle} starts ${input.phrase}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${input.logoUrl ? `<img src="${escapeHtml(input.logoUrl)}" alt="" style="max-height: 56px; max-width: 200px; margin-bottom: 16px;" />` : ""}
        <h1 style="color: #1a1a1a;">Starting ${escapeHtml(input.phrase)}</h1>
        <p>Hi ${name}, your workshop <strong>${title}</strong> with ${host} starts ${escapeHtml(input.phrase)}.</p>
        <p style="margin: 20px 0; padding: 14px 16px; background: #f5f5f5; border-radius: 8px;"><strong>${when}</strong></p>
        ${input.joinUrl ? "" : `<p style="color: #666;">The join button appears on your workshops page 15 minutes before the start.</p>`}
        <a href="${escapeHtml(target)}" style="display: inline-block; padding: 12px 24px; background: ${escapeHtml(color)}; color: ${escapeHtml(readableTextColor(color))}; text-decoration: none; border-radius: 6px;">${label}</a>
      </div>
    `,
    text: [
      `Hi ${input.name || "there"}, your workshop "${input.workshopTitle}" with ${input.hostName} starts ${input.phrase}.`,
      input.when,
      input.joinUrl ? `Join: ${input.joinUrl}` : `The join button appears on your workshops page 15 minutes before the start: ${appUrl}/student/workshops`,
    ].join("\n\n"),
  };
}
