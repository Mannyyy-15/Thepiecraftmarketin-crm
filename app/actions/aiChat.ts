"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { cookies } from "next/headers";
import { decrypt } from "./auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, desc, asc } from "drizzle-orm";

// ───────────────────────────────────────────────────────────────────────────
// Studio AI — conversational agency assistant (Gemini, persisted in DB)
// ───────────────────────────────────────────────────────────────────────────

// The "training" — a system prompt that turns Gemini into ThePieCraft's
// in-house agency assistant. Tuned for marketing/ads, web/SEO, and client ops.
const AGENCY_SYSTEM_PROMPT = [
  'You are "Studio AI", the in-house AI assistant for ThePieCraft Marketing — a digital marketing & web-development agency.',
  "",
  "ABOUT THE AGENCY:",
  "- Core services: Meta Ads (Facebook & Instagram) management, Google Ads, SEO, website design & development, branding, social media management, and hosting/maintenance.",
  "- Clients are mostly small-to-mid businesses (restaurants, e-commerce, local services, professionals).",
  "- Currency is Indian Rupees (Rs). Market context is primarily India.",
  "",
  "WHO YOU HELP:",
  "- Agency team members (admins and employees). Be a knowledgeable, practical colleague — not a generic chatbot.",
  "",
  "WHAT YOU DO WELL:",
  "- Marketing & ads: campaign strategy, audience targeting, ad copy & creative angles, budgets, funnels, content calendars, performance troubleshooting (CTR, ROAS, CPL).",
  "- Web & SEO: site structure & page planning, tech-stack suggestions, on-page/technical SEO, content outlines, web-project proposals.",
  "- Client & ops: draft client emails/replies/WhatsApp messages, proposals, pricing suggestions (in Rs), meeting notes, project plans, scopes of work.",
  "- General: writing, brainstorming, summarising — whatever helps the team move faster.",
  "",
  "HOW YOU RESPOND:",
  "- Be concise and actionable. Prefer short paragraphs and tight bullet lists over long essays.",
  "- When useful, give concrete examples (sample ad copy, email drafts, budget splits in Rs, checklists).",
  "- Use markdown for structure (headings, bold, lists) but keep it scannable.",
  "- Ask a brief clarifying question only when genuinely needed; otherwise make sensible assumptions and proceed.",
  "- Never invent client data, real metrics, or private info you were not given. Label estimates clearly.",
].join("\n");

async function requireUser() {
  const token = cookies().get("token")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.id) return null;
  return session;
}

// List the current user's chats (most recent first).
export async function listAiChats() {
  const session = await requireUser();
  if (!session || !db) return { success: false, data: [] as any[] };
  try {
    const rows = await db
      .select({ id: schema.aiChats.id, title: schema.aiChats.title, updatedAt: schema.aiChats.updatedAt })
      .from(schema.aiChats)
      .where(eq(schema.aiChats.userId, session.id as number))
      .orderBy(desc(schema.aiChats.updatedAt));
    return { success: true, data: rows };
  } catch (e: any) {
    console.error("listAiChats error:", e?.message);
    return { success: false, data: [] as any[] };
  }
}

// Load one chat's messages (only if it belongs to the user).
export async function getAiChat(chatId: number) {
  const session = await requireUser();
  if (!session || !db) return { success: false, data: [] as any[] };
  try {
    const chat = await db.select().from(schema.aiChats).where(eq(schema.aiChats.id, chatId)).limit(1);
    if (!chat.length || chat[0].userId !== (session.id as number)) return { success: false, data: [] as any[] };
    const msgs = await db
      .select({ role: schema.aiChatMessages.role, content: schema.aiChatMessages.content })
      .from(schema.aiChatMessages)
      .where(eq(schema.aiChatMessages.chatId, chatId))
      .orderBy(asc(schema.aiChatMessages.createdAt));
    return { success: true, data: msgs };
  } catch (e: any) {
    console.error("getAiChat error:", e?.message);
    return { success: false, data: [] as any[] };
  }
}

export async function deleteAiChat(chatId: number) {
  const session = await requireUser();
  if (!session || !db) return { success: false };
  try {
    const chat = await db.select().from(schema.aiChats).where(eq(schema.aiChats.id, chatId)).limit(1);
    if (!chat.length || chat[0].userId !== (session.id as number)) return { success: false };
    await db.delete(schema.aiChats).where(eq(schema.aiChats.id, chatId));
    return { success: true };
  } catch (e: any) {
    console.error("deleteAiChat error:", e?.message);
    return { success: false };
  }
}

export interface SendChatResult {
  success: boolean;
  reply?: string;
  chatId?: number;
  title?: string;
  error?: string;
}

// Send a message: persists it, calls Gemini with the agency prompt + history,
// stores the reply, returns it. Creates a new chat if chatId is omitted.
export async function sendChatMessage(message: string, chatId?: number): Promise<SendChatResult> {
  const session = await requireUser();
  if (!session) return { success: false, error: "Not authenticated." };
  if (!db) return { success: false, error: "Database not connected." };

  const text = (message || "").trim();
  if (!text) return { success: false, error: "Empty message." };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, error: "AI is not configured. Add GEMINI_API_KEY." };

  try {
    const uid = session.id as number;

    let cid = chatId || 0;
    let isNew = false;
    const newTitle = text.length > 48 ? text.slice(0, 48) + "…" : text;
    if (cid) {
      const chat = await db.select().from(schema.aiChats).where(eq(schema.aiChats.id, cid)).limit(1);
      if (!chat.length || chat[0].userId !== uid) return { success: false, error: "Chat not found." };
    } else {
      const inserted = await db.insert(schema.aiChats).values({ userId: uid, title: newTitle });
      cid = (inserted as any)[0]?.insertId as number;
      isNew = true;
    }

    // Prior messages for context.
    const prior = await db
      .select({ role: schema.aiChatMessages.role, content: schema.aiChatMessages.content })
      .from(schema.aiChatMessages)
      .where(eq(schema.aiChatMessages.chatId, cid))
      .orderBy(asc(schema.aiChatMessages.createdAt));

    await db.insert(schema.aiChatMessages).values({ chatId: cid, role: "user", content: text });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction: AGENCY_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.7 },
    });
    // Gemini history must start with a "user" turn; our stored history already does.
    const chatSession = model.startChat({
      history: prior.map((m) => ({ role: m.role as "user" | "model", parts: [{ text: m.content }] })),
    });

    let reply = "";
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await chatSession.sendMessage(text);
        reply = result.response.text();
        break;
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || "");
        if (!(msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE")) || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
    if (!reply) throw lastErr;

    await db.insert(schema.aiChatMessages).values({ chatId: cid, role: "model", content: reply });
    await db.update(schema.aiChats).set({ updatedAt: new Date() }).where(eq(schema.aiChats.id, cid));

    return { success: true, reply, chatId: cid, title: isNew ? newTitle : undefined };
  } catch (err: any) {
    const msg = String(err?.message || "");
    console.error("[Studio AI chat] error:", msg.slice(0, 200));
    if (msg.includes("503") || msg.includes("overloaded")) return { success: false, error: "AI is busy. Please try again." };
    return { success: false, error: "Could not get a reply. Please try again." };
  }
}
