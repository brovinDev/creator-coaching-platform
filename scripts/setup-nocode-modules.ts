/**
 * Run this script to create all required modules (tables) in the nocode backend.
 *
 * Prerequisites:
 * 1. nocode-backend is running
 * 2. App is created and approved (NOCODE_APP_ID in .env)
 * 3. Organization exists (NOCODE_ORG_ID in .env)
 * 4. Admin JWT token (NOCODE_ADMIN_TOKEN in .env)
 *
 * Usage:  npx tsx scripts/setup-nocode-modules.ts
 */

import "dotenv/config";

const API = process.env.NOCODE_API_URL || "http://localhost:4000";
const APP_ID = process.env.NOCODE_APP_ID || "1";
const ORG_ID = process.env.NOCODE_ORG_ID || "";
const TOKEN = process.env.NOCODE_ADMIN_TOKEN || "";

if (!ORG_ID || !TOKEN) {
  console.error("Set NOCODE_ORG_ID and NOCODE_ADMIN_TOKEN in .env before running this script.");
  process.exit(1);
}

const modules = [
  {
    table_name: "user_profiles",
    module_label: "User Profiles",
    fields: [
      { name: "user_id", label: "User ID", type: "text", required: true },
      { name: "role", label: "Role", type: "text", required: true },
      { name: "bio", label: "Bio", type: "longText" },
      { name: "avatar", label: "Avatar", type: "text" },
      { name: "razorpay_customer_id", label: "Razorpay Customer ID", type: "text" },
    ],
  },
  {
    table_name: "courses",
    module_label: "Courses",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "longText" },
      { name: "price", label: "Price", type: "number" },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "published", label: "Published", type: "boolean" },
      { name: "thumbnail", label: "Thumbnail", type: "text" },
      { name: "creator_id", label: "Creator ID", type: "text", required: true },
    ],
  },
  {
    table_name: "course_modules",
    module_label: "Course Modules",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "position", label: "Position", type: "number" },
      { name: "course_id", label: "Course ID", type: "text", required: true },
    ],
  },
  {
    table_name: "lessons",
    module_label: "Lessons",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "content", label: "Content", type: "longText" },
      { name: "video_url", label: "Video URL", type: "text" },
      { name: "thumbnail", label: "Thumbnail", type: "text" },
      { name: "position", label: "Position", type: "number" },
      { name: "module_id", label: "Module ID", type: "text", required: true },
    ],
  },
  {
    table_name: "lesson_progress",
    module_label: "Lesson Progress",
    fields: [
      { name: "lesson_id", label: "Lesson ID", type: "text", required: true },
      { name: "user_id", label: "User ID", type: "text", required: true },
      { name: "completed", label: "Completed", type: "boolean" },
    ],
  },
  {
    table_name: "enrollments",
    module_label: "Enrollments",
    fields: [
      { name: "course_id", label: "Course ID", type: "text", required: true },
      { name: "user_id", label: "User ID", type: "text", required: true },
    ],
  },
  {
    table_name: "orders",
    module_label: "Orders",
    fields: [
      { name: "user_id", label: "User ID", type: "text", required: true },
      { name: "course_id", label: "Course ID", type: "text", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text" },
      { name: "status", label: "Status", type: "text" },
      { name: "razorpay_order_id", label: "Razorpay Order ID", type: "text" },
      { name: "razorpay_payment_id", label: "Razorpay Payment ID", type: "text" },
    ],
  },
  {
    table_name: "landing_pages",
    module_label: "Landing Pages",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "published", label: "Published", type: "boolean" },
      { name: "course_id", label: "Course ID", type: "text", required: true },
      { name: "meta_pixel_id", label: "Meta Pixel ID", type: "text" },
    ],
  },
  {
    table_name: "landing_page_sections",
    module_label: "Landing Page Sections",
    fields: [
      { name: "type", label: "Type", type: "text", required: true },
      { name: "position", label: "Position", type: "number" },
      { name: "content", label: "Content", type: "longText" },
      { name: "visible", label: "Visible", type: "boolean" },
      { name: "landing_page_id", label: "Landing Page ID", type: "text", required: true },
    ],
  },
  {
    table_name: "communities",
    module_label: "Communities",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "course_id", label: "Course ID", type: "text", required: true },
    ],
  },
  {
    table_name: "community_channels",
    module_label: "Community Channels",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "community_id", label: "Community ID", type: "text", required: true },
    ],
  },
  {
    table_name: "community_posts",
    module_label: "Community Posts",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "content", label: "Content", type: "longText" },
      { name: "channel_id", label: "Channel ID", type: "text", required: true },
      { name: "user_id", label: "User ID", type: "text", required: true },
    ],
  },
  {
    table_name: "community_comments",
    module_label: "Community Comments",
    fields: [
      { name: "content", label: "Content", type: "longText", required: true },
      { name: "post_id", label: "Post ID", type: "text", required: true },
      { name: "user_id", label: "User ID", type: "text", required: true },
    ],
  },
  {
    table_name: "coupons",
    module_label: "Coupons",
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "service_id", label: "Service ID", type: "text" },
      { name: "discount_type", label: "Discount Type", type: "text", required: true },
      { name: "discount_value", label: "Discount Value", type: "number", required: true },
      { name: "max_usages", label: "Max Usages", type: "number" },
      { name: "usage_count", label: "Usage Count", type: "number" },
      { name: "start_date", label: "Start Date", type: "text", required: true },
      { name: "end_date", label: "End Date", type: "text", required: true },
      { name: "status", label: "Status", type: "text", required: true },
      { name: "creator_id", label: "Creator ID", type: "text", required: true },
    ],
  },
  {
    table_name: "email_otps",
    module_label: "Email OTPs",
    fields: [
      { name: "email", label: "Email", type: "text", required: true },
      { name: "otp", label: "OTP", type: "text", required: true },
      { name: "name", label: "Name", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "verified", label: "Verified", type: "boolean" },
      { name: "expires_at", label: "Expires At", type: "text" },
    ],
  },
];

async function setup() {
  console.log(`Setting up modules on ${API} (app: ${APP_ID}, org: ${ORG_ID})\n`);

  for (const mod of modules) {
    try {
      const res = await fetch(`${API}/api/${APP_ID}/${ORG_ID}/module`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(TOKEN.startsWith("AAGA_") ? { "x-api-key": TOKEN } : { Authorization: `Bearer ${TOKEN}` }),
          "app-id": APP_ID,
          "org-id": ORG_ID,
        },
        body: JSON.stringify(mod),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`  [OK] ${mod.table_name} (id: ${json.data?.id || "?"})`);
      } else {
        console.log(`  [SKIP] ${mod.table_name}: ${json.message || json.error || res.statusText}`);
      }
    } catch (err) {
      console.log(`  [ERR] ${mod.table_name}: ${(err as Error).message}`);
    }
  }

  console.log("\nDone! Module IDs are assigned by the nocode backend (use title-based access).");
}

setup();
