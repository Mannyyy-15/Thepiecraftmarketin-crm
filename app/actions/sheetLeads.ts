"use server";

import { getCurrentUser } from "./auth";
import { getGoogleServiceAccountToken } from "@/lib/google-service-account";

// Reads inbound leads from the "ThePieCraft Inquiry" Google Sheet (multiple tabs)
// using the existing Firebase service account for auth (read-only Sheets scope).
//
// Required: the sheet must be shared (Viewer) with the service-account email,
// and credentials available via FIREBASE_SERVICE_ACCOUNT. Sheet ID is
// overridable via LEADS_SHEET_ID.

const DEFAULT_SHEET_ID = "10fJb0cQFcKyxtPBhMFu-mL-Iz7_vmpxrREwt0J4IJt0";

// Tab name -> stable segment key + display label shown in the UI filter.
const TAB_CONFIG: { tab: string; key: string; label: string }[] = [
  { tab: "Form Leads",            key: "form",         label: "Form Leads" },
  { tab: "Consultation Attempts", key: "consultation", label: "Consultation Attempts" },
  { tab: "Paid Consultations",    key: "paid",         label: "Paid Consultations" },
  { tab: "Playbook Leads",        key: "playbook",     label: "Playbook Leads" },
  { tab: "ChatBot Leads",         key: "chatbot",      label: "ChatBot Leads" },
];

export interface SheetLead {
  id: string;            // synthetic, stable per (segment,row)
  segment: string;       // key, e.g. "form"
  segmentLabel: string;  // e.g. "Form Leads"
  name: string;
  email: string;
  phone: string;
  timestamp: string;     // raw timestamp string from the sheet
  // All remaining columns kept verbatim for the detail view.
  extra: Record<string, string>;
}

export interface SheetLeadsSegment {
  key: string;
  label: string;
  count: number;
  leads: SheetLead[];
}

export interface GetSheetLeadsResult {
  success: boolean;
  segments?: SheetLeadsSegment[];
  total?: number;
  error?: string;
}

// Google Sheets serial date (days since 1899-12-30) -> ISO string. Leaves
// already-human strings (e.g. "6/6/2026, 12:00:00 PM") untouched.
function normalizeTimestamp(raw: string): string {
  if (!raw) return "";
  const num = Number(raw);
  if (!Number.isNaN(num) && raw.trim() !== "" && num > 30000 && num < 80000) {
    const ms = Math.round((num - 25569) * 86400 * 1000); // 25569 = days between 1899-12-30 and 1970-01-01
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return raw;
}

function cleanCell(v: unknown): string {
  const s = v == null ? "" : String(v).trim();
  // Google's #ERROR! / #N/A formula artefacts -> blank
  if (s.startsWith("#ERROR") || s === "#N/A" || s === "#REF!") return "";
  return s;
}

export async function getSheetLeads(): Promise<GetSheetLeadsResult> {
  // Auth — admins only.
  const session = await getCurrentUser();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Admins only." };
  }

  const sheetId = process.env.LEADS_SHEET_ID || DEFAULT_SHEET_ID;

  try {
    const accessToken = await getGoogleServiceAccountToken([
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ]);
    const ranges = TAB_CONFIG.map((t) => `${t.tab}!A1:Z`);
    const query = new URLSearchParams();
    for (const range of ranges) query.append("ranges", range);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${query}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!response.ok) throw new Error(`Sheets API failed (${response.status}).`);
    const payload = (await response.json()) as {
      valueRanges?: Array<{ values?: unknown[][] }>;
    };
    const valueRanges = payload.valueRanges || [];

    const segments: SheetLeadsSegment[] = [];
    let total = 0;

    TAB_CONFIG.forEach((cfg, i) => {
      const rows = valueRanges[i]?.values || [];
      const headers = (rows[0] || []).map((h: unknown) => String(h || "").trim());
      const leads: SheetLead[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r] || [];
        // Skip fully empty rows.
        if (!row.some((c: unknown) => cleanCell(c) !== "")) continue;

        const rec: Record<string, string> = {};
        headers.forEach((h, c) => { if (h) rec[h] = cleanCell(row[c]); });

        const name = rec.name || rec.fullName || "";
        const email = rec.email || "";
        const phone = rec.phone || "";
        const ts = normalizeTimestamp(rec.timestamp || "");

        // Build the "extra" map: everything except the core fields.
        const extra: Record<string, string> = {};
        Object.entries(rec).forEach(([k, v]) => {
          if (!["name", "email", "phone", "timestamp"].includes(k) && v) extra[k] = v;
        });

        leads.push({
          id: `${cfg.key}-${r}`,
          segment: cfg.key,
          segmentLabel: cfg.label,
          name,
          email,
          phone,
          timestamp: ts,
          extra,
        });
      }

      // Newest first by timestamp when parseable.
      leads.sort((a, b) => {
        const ta = Date.parse(a.timestamp) || 0;
        const tb = Date.parse(b.timestamp) || 0;
        return tb - ta;
      });

      total += leads.length;
      segments.push({ key: cfg.key, label: cfg.label, count: leads.length, leads });
    });

    return { success: true, segments, total };
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error("[sheetLeads] error:", msg.slice(0, 300));
    if (msg.includes("PERMISSION_DENIED") || msg.includes("not been used") || msg.includes("disabled")) {
      return { success: false, error: "Sheet access not configured (share the sheet or enable Sheets API)." };
    }
    return { success: false, error: "Could not load leads from the sheet." };
  }
}
