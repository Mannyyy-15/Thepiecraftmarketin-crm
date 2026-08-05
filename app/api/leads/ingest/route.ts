import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, source = "website", service = "web_dev", budget = "0", notes = "" } = body;

    if (!name && !email && !phone) {
      return NextResponse.json({ success: false, error: "Name, email, or phone is required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected." }, { status: 500 });
    }

    // Default to organization 1 (Master Org) if not specified
    const organizationId = body.organizationId || 1;

    const [inserted] = await db.insert(schema.leads).values({
      organizationId,
      name: name || email?.split("@")[0] || "Website Lead",
      contactName: name || "",
      contactEmail: email || "",
      contactPhone: phone || "",
      source: source || "website",
      service: service || "web_dev",
      stage: "new",
      estimatedValue: Number(budget) || 0,
      notes: notes || "Inbound lead submitted via Webhook / Form",
    });

    revalidatePath("/admin/leads");
    return NextResponse.json({ success: true, leadId: inserted.insertId });
  } catch (error: any) {
    console.error("Inbound Lead Webhook Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
