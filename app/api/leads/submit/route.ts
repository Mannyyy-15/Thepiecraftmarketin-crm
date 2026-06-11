import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

// Allow any origin so external forms (website, Typeform, Meta Lead Ads) can POST here
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-leads-token",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Token check — must match LEADS_SUBMIT_TOKEN env var
    const token =
      req.headers.get("x-leads-token") ||
      (await req.clone().json().catch(() => ({}))).token;

    const expected = process.env.LEADS_SUBMIT_TOKEN;
    if (expected && token !== expected) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));

    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!db) throw new Error("Database not connected.");

    await db.insert(schema.leads).values({
      name,
      contactName: body.contactName || body.contact_name || null,
      contactPhone: body.contactPhone || body.contact_phone || body.phone || null,
      contactEmail: body.contactEmail || body.contact_email || body.email || null,
      source: body.source || "website",
      service: body.service || null,
      notes: body.notes || body.message || null,
      stage: "new",
      estimatedValue: Number(body.estimatedValue || body.estimated_value || 0),
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    console.error("Lead submit error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
