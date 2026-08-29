import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  url: z.string().url().max(1000),
  reason: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, url, reason } = parsed.data;

  // Save to Supabase (best-effort)
  const db = getSupabase();
  if (db) {
    await db.from("removal_requests").insert({ name, email, url, reason }).then(
      ({ error }) => { if (error) console.warn("Supabase removal insert", error.message); }
    );
  }

  // Send email (best-effort — never fail the request)
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "VibView Removals <onboarding@resend.dev>",
      to: "ha0797685@gmail.com",
      replyTo: email,
      subject: `[VibView DMCA/Removal] ${name}`,
      text: `From: ${name} <${email}>\nContent URL: ${url}\n\nReason:\n${reason}`,
    });
    if (error) console.error("Resend removal error", error);
  }

  return NextResponse.json({ ok: true });
}
