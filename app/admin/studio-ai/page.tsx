"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  Brain,
  CheckCircle,
  Copy,
  Download,
  Gauge,
  HelpCircle,
  RotateCcw,
  Send,
  Wand2,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Progress } from "@/components/ui/Progress";
import { generateStrategy } from "@/app/actions/ai";

// Fallback templates (used only if the AI call fails, so the panel is never empty)
const strategies: Record<string, any> = {
  meta: {
    summary: "A high-efficiency Meta Ads strategy targeting middle-of-funnel retargeting and high-intent lookalike audiences to maximize ROAS.",
    copywriting: [
      { hook: "Stop wasting money on marketing that doesn't sell.", body: "At Acme, we craft e-commerce growth strategies that actually scale. Over 100+ brands have doubled their checkout conversions using our proprietary visual blueprints.", cta: "Claim Your Free E-Commerce Audit" },
      { hook: "🚀 The secret behind Stark's Q3 campaign success...", body: "We ran over 40+ dynamic creatives to find the sweet spot of tech consumers. Get the full case study outline showing exactly how we achieved 5.2x ROAS in 30 days.", cta: "Download Free Brief" }
    ],
    audience: ["E-commerce Owners", "Shopify/WooCommerce interest", "Lookalike 1% of Past Purchasers", "High-disposable income tech fans"],
    roadmap: [
      { step: "Phase 1: Pixel Audit", detail: "Verify Meta CAPI setup, custom event deduplication, and domain tracking compliance." },
      { step: "Phase 2: Creative Batching", detail: "Shoot 3 core UGC formats and 2 dynamic catalog designs focusing on customer paint points." },
      { step: "Phase 3: Launch Sandbox", detail: "Set up 1 CBO campaign with $150/day sandbox budget to test ad angles." }
    ]
  },
  seo: {
    summary: "Organic search visibility play focusing on technical crawl health, core web vitals optimization, and topical authority clustering.",
    copywriting: [
      { hook: "Is your business invisible on Google?", body: "We restructured Globex's headless site indexing to double organic search traffic in under 60 days. Our Technical SEO framework ensures zero crawl errors and perfect lighthouse scores.", cta: "Get a Free SEO Health Check" },
      { hook: "The 3 critical SEO mistakes developer teams make...", body: "From missing metadata tags to bloated JS bundles, we analyze the architectural roadblocks slowing down your Google keyword indexing speed.", cta: "Download Crawl Report" }
    ],
    audience: ["B2B SaaS Directors", "CTOs & Product Owners", "Developers searching headless CMS", "Marketing Managers looking for scale"],
    roadmap: [
      { step: "Phase 1: Lighthouse Core Vitals", detail: "Optimize next/image dimensions, script deferrals, and CSS extraction sizes." },
      { step: "Phase 2: Topical Clustering", detail: "Write 12 authoritative content blocks around 'headless commerce infrastructure' targeting low-difficulty terms." },
      { step: "Phase 3: Backlink Outreach", detail: "Pitch 5 guest posts to top-tier technical publications in the developer ecosystem." }
    ]
  },
  brand: {
    summary: "Visual identity refresh to transition the brand into a premium, minimalist space, attracting high-end Enterprise contracts.",
    copywriting: [
      { hook: "First impressions are permanent.", body: "We redesigned Wayne Enterprises' digital catalog structure to feel extremely premium, incorporating sleek glassmorphism, responsive typography, and curated dark-mode graphics.", cta: "Book Brand Consultation" },
      { hook: "Why modern tech brands are abandoning flat logos...", body: "Discover the philosophy behind tactile branding, custom font kerning, and color theory that drives customer loyalty and increases client trust.", cta: "Read the Design Case Study" }
    ],
    audience: ["Enterprise CMOs", "Creative Directors", "High-growth startup founders", "Real estate developers"],
    roadmap: [
      { step: "Phase 1: Color Archetypes", detail: "Establish HSL-tailored premium dark styles and vivid accents suited for responsive screens." },
      { step: "Phase 2: Asset Restructuring", detail: "Deliver typography stylesheets (Outfit/Inter font-pairings) and high-res vector symbols." },
      { step: "Phase 3: Portal White-Labeling", detail: "Align the customer-facing portals with matching color tones and CSS guidelines." }
    ]
  }
};

export default function StudioAIPage() {
  const { toast, confirmDialog } = useToast();

  const [selectedClient, setSelectedClient] = useState("Acme Corp");
  const [selectedChannel, setSelectedChannel] = useState("meta");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedOutput, setGeneratedOutput] = useState<any | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadingSteps = [
    "Initializing Studio AI Sandbox Engine...",
    "Scanning industry-specific design guidelines...",
    "Analyzing competitor keywords & budget parameters...",
    "Structuring high-converting marketing copywriting variations...",
    "Compiling technical roadmap & milestone schedules..."
  ];

  // Advance the step animation while the AI request is in flight.
  useEffect(() => {
    let timer: any;
    if (isGenerating && currentStep < loadingSteps.length - 1) {
      timer = setTimeout(() => setCurrentStep((prev) => prev + 1), 900);
    }
    return () => clearTimeout(timer);
  }, [isGenerating, currentStep]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setCurrentStep(0);
    setGeneratedOutput(null);
    try {
      const res = await generateStrategy(selectedClient, selectedChannel, focusKeyword);
      if (res.success && res.data) {
        setGeneratedOutput(res.data);
      } else {
        toast(res.error || "AI unavailable — showing a sample.", "error");
        setGeneratedOutput(strategies[selectedChannel]);
      }
    } catch {
      toast("Something went wrong generating the strategy.", "error");
      setGeneratedOutput(strategies[selectedChannel]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const briefText = () => {
    const o = generatedOutput;
    if (!o) return "";
    const lines: string[] = [];
    lines.push(`STRATEGY BRIEF — ${selectedClient} (${selectedChannel.toUpperCase()})`, "");
    lines.push("OVERVIEW", o.summary, "");
    lines.push("AD COPY");
    (o.copywriting || []).forEach((c: any, i: number) =>
      lines.push(`  ${i + 1}. "${c.hook}"`, `     ${c.body}`, `     CTA: ${c.cta}`)
    );
    lines.push("", "TARGET AUDIENCE", ...(o.audience || []).map((a: string) => `  • ${a}`));
    lines.push("", "ROADMAP");
    (o.roadmap || []).forEach((r: any, i: number) => lines.push(`  ${i + 1}. ${r.step}: ${r.detail}`));
    return lines.join("\n");
  };

  const handleCopyBrief = async () => {
    const text = briefText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast("Brief copied to clipboard.", "success");
  };

  const handleDownloadBrief = () => {
    const text = briefText();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedClient.replace(/\s+/g, "-")}-${selectedChannel}-brief.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Brief downloaded.", "success");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio AI Workspace"
        title="AI Campaign Pitch & Strategy Planner"
        actions={
          <Badge variant="brand" className="px-3 py-1 font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-500 animate-spin" /> Unlocked Studio Access
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Input panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Strategic Context
              </CardTitle>
              <CardDescription>Specify the business, channel, and copy focus for the campaign brief.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Target Account
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Stark Industries">Stark Industries</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                  <option value="Globex">Globex</option>
                  <option value="Initech">Initech</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Marketing Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["meta", "seo", "brand"] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => setSelectedChannel(channel)}
                      className={`h-11 rounded-xl border text-xs font-semibold capitalize flex flex-col items-center justify-center transition-all ${
                        selectedChannel === channel
                          ? "border-brand-500 bg-brand-50/40 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {channel === "meta" && "Meta Ads"}
                      {channel === "seo" && "SEO Audit"}
                      {channel === "brand" && "Branding"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Target Keywords & Focus Topics
                </label>
                <textarea
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  rows={4}
                  placeholder="e.g. focus on B2B product features, sustainable materials, minimalist design, conversion optimization..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <Button
                type="submit"
                disabled={isGenerating}
                className="w-full justify-center bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold flex items-center gap-2 py-2.5 shadow-md shadow-brand-500/10"
              >
                <Wand2 className="h-4.5 w-4.5" />
                {isGenerating ? "Analyzing Framework..." : "Generate Strategy Plan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Output panel */}
        <Card className="lg:col-span-2 flex flex-col justify-center min-h-[400px]">
          {isGenerating && (
            <CardContent className="p-8 sm:p-12 space-y-6 flex flex-col justify-center items-center text-center max-w-md mx-auto">
              <div className="relative h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center animate-bounce">
                <Brain className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-brand-500 animate-ping" />
              </div>
              <div className="space-y-2 w-full">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Studio AI Formulating Plan...</h3>
                <Progress value={((currentStep + 1) / loadingSteps.length) * 100} size="md" className="h-2" />
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums mt-1">
                  Step {currentStep + 1} of {loadingSteps.length}
                </p>
              </div>

              <div className="space-y-2.5 text-left w-full border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                {loadingSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-xs font-medium transition-all ${
                      idx < currentStep
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : idx === currentStep
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-300 dark:text-slate-700"
                    }`}
                  >
                    <CheckCircle className={`h-4 w-4 shrink-0 ${idx < currentStep ? "fill-emerald-50 text-emerald-600 dark:fill-emerald-950/20" : idx === currentStep ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : "text-slate-200 dark:text-slate-800"}`} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}

          {!isGenerating && !generatedOutput && (
            <CardContent className="p-8 sm:p-12 text-center max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                <Sparkles className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">AI Strategy Generator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Specify details on the left sidebar context and click "Generate Strategy Plan" to write custom playbook directives.
                </p>
              </div>
            </CardContent>
          )}

          {!isGenerating && generatedOutput && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 animate-fadeIn">
              
              {/* Strategic Brief Summary */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-1">
                    <Brain className="h-3.5 w-3.5" /> Strategy Playbook
                  </span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadBrief}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopyBrief}>
                      <Copy className="h-3.5 w-3.5" /> Copy Brief
                    </Button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Strategy Overview for {selectedClient}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {generatedOutput.summary}
                </p>
              </div>

              {/* Copywriting Variations */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  High-converting Ad Copies
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {generatedOutput.copywriting.map((copy: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 relative flex flex-col justify-between"
                    >
                      <button
                        onClick={() => handleCopy(`"${copy.hook}" - ${copy.body} CTA: ${copy.cta}`, idx)}
                        className="absolute top-2.5 right-2.5 h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {copiedIndex === idx ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <div className="space-y-2 pr-6">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Angle {idx + 1}</span>
                        <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
                          "{copy.hook}"
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {copy.body}
                        </p>
                      </div>
                      <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">CTA Button</span>
                        <Badge variant="brand" className="text-[10px] font-bold py-0.5 px-2">
                          {copy.cta}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roadmaps */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Technical Project Milestones
                </h4>
                <div className="space-y-3">
                  {generatedOutput.roadmap.map((road: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </div>
                        {idx < generatedOutput.roadmap.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 my-1" />
                        )}
                      </div>
                      <div className="min-w-0 pb-2">
                        <h5 className="text-sm font-semibold text-slate-800 dark:text-white">
                          {road.step}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {road.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Interst Tags */}
              <div className="p-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Target Segments:</span>
                {generatedOutput.audience.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="portal" className="font-bold py-1 px-2.5 text-[10px] uppercase">
                    {tag}
                  </Badge>
                ))}
              </div>

            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
