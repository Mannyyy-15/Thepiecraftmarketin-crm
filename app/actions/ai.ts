"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { cookies } from "next/headers";
import { decrypt } from "./auth";

// Studio AI — marketing strategy generator backed by Google Gemini (free tier).
// Requires GEMINI_API_KEY (get one free at https://aistudio.google.com/app/apikey).

export interface StrategyCopy {
  hook: string;
  body: string;
  cta: string;
}
export interface StrategyRoadmapStep {
  step: string;
  detail: string;
}
export interface StrategyOutput {
  summary: string;
  copywriting: StrategyCopy[];
  audience: string[];
  roadmap: StrategyRoadmapStep[];
}

export interface GenerateStrategyResult {
  success: boolean;
  data?: StrategyOutput;
  error?: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  meta: "Meta Ads (Facebook & Instagram paid advertising)",
  seo: "SEO / organic search audit",
  brand: "Branding & visual identity",
};

function buildPrompt(client: string, channel: string, keywords: string): string {
  const channelLabel = CHANNEL_LABEL[channel] || channel;
  return `You are a senior marketing strategist at a digital agency. Produce a concise, practical campaign strategy.

Client / account: ${client}
Marketing channel: ${channelLabel}
Focus / keywords from the strategist: ${keywords || "(none provided — infer sensible defaults for this client and channel)"}

Return ONLY valid minified JSON (no markdown, no code fences, no commentary) matching exactly this TypeScript shape:
{
  "summary": string,                       // 1-2 sentence strategic overview
  "copywriting": [                          // exactly 2 ad-copy angles
    { "hook": string, "body": string, "cta": string }
  ],
  "audience": string[],                     // 4 specific target audience segments
  "roadmap": [                              // exactly 3 phased milestones
    { "step": string, "detail": string }
  ]
}
Keep copy punchy and channel-appropriate. Do not include any text outside the JSON object.`;
}

/** Strip ```json fences / stray text and parse the first JSON object found. */
function parseStrategyJson(raw: string): StrategyOutput {
  let text = raw.trim();
  // Remove code fences if the model added them despite instructions.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Fall back to slicing the outermost braces.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) text = text.slice(first, last + 1);
  const obj = JSON.parse(text);

  // Defensive normalization so the UI never crashes on a malformed field.
  return {
    summary: String(obj.summary || ""),
    copywriting: Array.isArray(obj.copywriting)
      ? obj.copywriting.slice(0, 4).map((c: any) => ({
          hook: String(c?.hook || ""),
          body: String(c?.body || ""),
          cta: String(c?.cta || ""),
        }))
      : [],
    audience: Array.isArray(obj.audience) ? obj.audience.map((a: any) => String(a)).slice(0, 8) : [],
    roadmap: Array.isArray(obj.roadmap)
      ? obj.roadmap.slice(0, 6).map((r: any) => ({
          step: String(r?.step || ""),
          detail: String(r?.detail || ""),
        }))
      : [],
  };
}

export async function generateStrategy(
  client: string,
  channel: string,
  keywords: string
): Promise<GenerateStrategyResult> {
  // Auth — only logged-in staff may use the generator.
  const token = cookies().get("token")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.id) return { success: false, error: "Not authenticated." };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "AI is not configured yet. Add GEMINI_API_KEY to enable Studio AI." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
    });
    const prompt = buildPrompt(client, channel, keywords);

    // Gemini occasionally returns 503 (model overloaded). Retry a few times
    // with backoff before giving up.
    let text = "";
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        text = result.response.text();
        break;
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || "");
        const retriable = msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE");
        if (!retriable || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
    if (!text) throw lastErr;

    const data = parseStrategyJson(text);
    if (!data.summary && data.copywriting.length === 0) {
      return { success: false, error: "AI returned an unexpected response. Please try again." };
    }
    return { success: true, data };
  } catch (err: any) {
    const msg = String(err?.message || "");
    console.error("[Studio AI] generateStrategy error:", msg || err);
    if (msg.includes("503") || msg.includes("overloaded")) {
      return { success: false, error: "AI is busy right now. Please try again in a moment." };
    }
    return { success: false, error: "Could not generate strategy. Please try again." };
  }
}
