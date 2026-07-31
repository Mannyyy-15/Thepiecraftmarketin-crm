import { z } from "zod";
import { Money } from "./types";

export const LeadStage = z.enum(["new", "contacted", "qualified", "proposal", "won", "lost", "invalid"]);
const leadQuality: Record<z.infer<typeof LeadStage>, { score: number; eventName: string; upload: boolean }> = {
  new: { score: 10, eventName: "Lead", upload: false },
  contacted: { score: 25, eventName: "ContactedLead", upload: false },
  qualified: { score: 60, eventName: "QualifiedLead", upload: true },
  proposal: { score: 80, eventName: "ProposalSent", upload: true },
  won: { score: 100, eventName: "Purchase", upload: true },
  lost: { score: 0, eventName: "LostLead", upload: false },
  invalid: { score: 0, eventName: "InvalidLead", upload: false },
};

export function mapLeadQuality(stage: unknown) {
  const value = LeadStage.parse(stage);
  return { stage: value, ...leadQuality[value] };
}

const BudgetInput = z
  .object({
    budget: Money,
    spend: Money,
    elapsedDays: z.number().int().nonnegative(),
    totalDays: z.number().int().positive().max(366),
  })
  .strict()
  .refine((value) => value.elapsedDays <= value.totalDays, "elapsedDays exceeds totalDays");

export function calculateBudgetPacing(input: unknown) {
  const value = BudgetInput.parse(input);
  const expectedSpend = value.budget * (value.elapsedDays / value.totalDays);
  const forecastSpend = value.elapsedDays === 0 ? 0 : (value.spend / value.elapsedDays) * value.totalDays;
  return {
    budget: value.budget,
    spend: value.spend,
    expectedSpend,
    forecastSpend,
    pacingPercent: expectedSpend === 0 ? 0 : (value.spend / expectedSpend) * 100,
    forecastVariance: forecastSpend - value.budget,
    status: forecastSpend > value.budget * 1.05 ? "over" : forecastSpend < value.budget * 0.95 ? "under" : "on-track",
  } as const;
}

const AnomalyInput = z
  .object({
    current: z.number().finite(),
    history: z.array(z.number().finite()).min(7).max(365),
    threshold: z.number().positive().max(10).default(3),
  })
  .strict();

export function detectAnomaly(input: unknown) {
  const value = AnomalyInput.parse(input);
  const mean = value.history.reduce((sum, item) => sum + item, 0) / value.history.length;
  const variance = value.history.reduce((sum, item) => sum + (item - mean) ** 2, 0) / value.history.length;
  const standardDeviation = Math.sqrt(variance);
  const zScore = standardDeviation === 0 ? (value.current === mean ? 0 : Number.POSITIVE_INFINITY) : (value.current - mean) / standardDeviation;
  return { isAnomaly: Math.abs(zScore) >= value.threshold, zScore, mean, standardDeviation };
}

const FatigueInput = z
  .object({
    baselineCtr: z.number().nonnegative(),
    currentCtr: z.number().nonnegative(),
    baselineFrequency: z.number().nonnegative(),
    currentFrequency: z.number().nonnegative(),
    minimumCtrDropPercent: z.number().min(0).max(100).default(20),
    maximumFrequency: z.number().positive().default(3),
  })
  .strict();

export function assessCreativeFatigue(input: unknown) {
  const value = FatigueInput.parse(input);
  const ctrDropPercent =
    value.baselineCtr === 0 ? 0 : ((value.baselineCtr - value.currentCtr) / value.baselineCtr) * 100;
  const frequencyGrowth = value.currentFrequency - value.baselineFrequency;
  const fatigued = ctrDropPercent >= value.minimumCtrDropPercent && value.currentFrequency >= value.maximumFrequency;
  return { fatigued, ctrDropPercent, frequencyGrowth, severity: fatigued ? (ctrDropPercent >= 40 ? "high" : "medium") : "none" } as const;
}

const ProfitabilityInput = z
  .object({
    revenue: Money,
    adSpend: Money,
    laborCost: Money,
    toolCost: Money,
    otherCost: Money.default(0),
  })
  .strict();

export function calculateProfitability(input: unknown) {
  const value = ProfitabilityInput.parse(input);
  const totalCost = value.adSpend + value.laborCost + value.toolCost + value.otherCost;
  const grossProfit = value.revenue - totalCost;
  return {
    totalCost,
    grossProfit,
    marginPercent: value.revenue === 0 ? 0 : (grossProfit / value.revenue) * 100,
    roas: value.adSpend === 0 ? null : value.revenue / value.adSpend,
  };
}
