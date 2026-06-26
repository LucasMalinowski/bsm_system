/**
 * Creates QA sandbox accounts for manual testing:
 *   qa.admin@bsmsandbox.test    — role: admin
 *   qa.employee@bsmsandbox.test — role: employee
 *
 * Run: npx tsx scripts/seed-qa-users.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Manual .env parse (no dotenv dep needed)
const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const QA_COMPANY_ID = "00000000-0000-0000-0000-000000000002";
const QA_COMPANY_SLUG = "bsm-sandbox";

const QA_USERS = [
  {
    email: "qa.admin@bsmsandbox.test",
    password: "QaAdmin!2025",
    name: "QA Admin",
    role: "admin",
  },
  {
    email: "qa.employee@bsmsandbox.test",
    password: "QaEmployee!2025",
    name: "QA Employee",
    role: "employee",
  },
];

async function ensureQaCompany() {
  const { error } = await admin.from("companies").upsert(
    {
      id: QA_COMPANY_ID,
      name: "BSM Sandbox",
      slug: QA_COMPANY_SLUG,
      primary_color: "#6366f1",
      secondary_color: "#818cf8",
      accent_color: "#e0e7ff",
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`Company upsert failed: ${error.message}`);
  console.log(`✓ QA company ready (id: ${QA_COMPANY_ID})`);
}

async function upsertUser(u: (typeof QA_USERS)[number]) {
  // Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((usr) => usr.email === u.email);

  let userId: string;

  if (found) {
    userId = found.id;
    // Update password
    await admin.auth.admin.updateUserById(userId, { password: u.password });
    console.log(`↺ User already exists, password reset: ${u.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name },
    });
    if (error) throw new Error(`Create user failed (${u.email}): ${error.message}`);
    userId = data.user.id;
    console.log(`+ Created auth user: ${u.email} (id: ${userId})`);
  }

  // Upsert profile
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      name: u.name,
      role: u.role,
      company_id: QA_COMPANY_ID,
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (profileError) throw new Error(`Profile upsert failed (${u.email}): ${profileError.message}`);

  // Seed default permissions for role
  const { data: defaults } = await admin
    .from("role_default_permissions")
    .select("permission")
    .eq("role", u.role);

  if (defaults && defaults.length > 0) {
    const perms = defaults.map((d) => ({ user_id: userId, permission: d.permission }));
    const { error: permError } = await admin
      .from("user_permissions")
      .upsert(perms, { onConflict: "user_id,permission" });
    if (permError) throw new Error(`Permissions upsert failed (${u.email}): ${permError.message}`);
  }

  console.log(`✓ Profile + permissions set: ${u.email} (role: ${u.role})`);
}

async function main() {
  console.log("Seeding QA users...\n");
  await ensureQaCompany();
  for (const u of QA_USERS) {
    await upsertUser(u);
  }
  console.log("\nDone.");
  console.log("\nCredentials:");
  for (const u of QA_USERS) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}  /  ${u.password}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
