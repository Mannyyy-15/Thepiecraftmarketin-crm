"use client";

import { useState } from "react";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Thermometer,
  ShieldCheck,
  Send,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export default function PosSpitLivePage() {
  const { activeOutlet } = useFranchise();
  const [requestedSpit, setRequestedSpit] = useState<string | null>(null);

  const handleRequestCone = (spitName: string) => {
    setRequestedSpit(spitName);
    setTimeout(() => setRequestedSpit(null), 4000);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none">
              Front Counter Spit Monitor
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Charcoal Heat Active
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
            Live Shawarma Spit Roasters & Searing Cones
          </h1>
        </div>
      </div>

      {/* Notification Banner when cone requested */}
      {requestedSpit && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              Request dispatched to Cold Room: <strong>Preparing next marinated cone for {requestedSpit}</strong>.
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold">Cold Room Alerted</span>
        </div>
      )}

      {/* Live Spit Cones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spit 1: Chicken */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-amber-500/40 space-y-4 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Roaster Spit #01</span>
              <h2 className="text-lg font-black text-white">Koyla Marinated Chicken</h2>
              <span className="text-xs text-[#b8b8c5]/60">Master Carver: Farhan Qureshi</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg block">
                74.5&deg;C (Searing)
              </span>
            </div>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl bg-[#161618] border border-[#303030]">
            <div className="flex justify-between text-xs">
              <span className="text-[#b8b8c5]/70">Remaining Meat on Cone:</span>
              <span className="font-mono font-black text-white text-sm">28.4 kg <span className="text-[10px] text-[#b8b8c5]/50">/ 35.0 kg</span></span>
            </div>
            <Progress value={81} className="h-2 bg-[#1f1f1f]" />
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-bold">~142 Wraps Left</span>
              <span className="text-[#b8b8c5]/50 font-mono">81% Skewer Left</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-[#b8b8c5]/60">Time Loaded: 11:30 AM</span>
            <Button
              size="sm"
              onClick={() => handleRequestCone("Spit #01 Chicken")}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Next Chicken Cone</span>
            </Button>
          </div>
        </div>

        {/* Spit 2: Mutton */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-4 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Roaster Spit #02</span>
              <h2 className="text-lg font-black text-white">Smoked Charcoal Mutton</h2>
              <span className="text-xs text-[#b8b8c5]/60">Master Carver: Farhan Qureshi</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg block">
                72.0&deg;C (Pre-roast)
              </span>
            </div>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl bg-[#161618] border border-[#303030]">
            <div className="flex justify-between text-xs">
              <span className="text-[#b8b8c5]/70">Remaining Meat on Cone:</span>
              <span className="font-mono font-black text-white text-sm">18.0 kg <span className="text-[10px] text-[#b8b8c5]/50">/ 25.0 kg</span></span>
            </div>
            <Progress value={100} className="h-2 bg-[#1f1f1f]" />
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-bold">~120 Rolls Ready</span>
              <span className="text-[#b8b8c5]/50 font-mono">100% Full Cone</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-[#b8b8c5]/60">Loaded for 06:00 PM Rush</span>
            <Button
              size="sm"
              onClick={() => handleRequestCone("Spit #02 Mutton")}
              className="bg-[#303030] hover:bg-[#303030] text-[#b8b8c5] hover:text-white border border-[#303030] font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Next Mutton Cone</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
