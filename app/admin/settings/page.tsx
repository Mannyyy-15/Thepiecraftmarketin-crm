"use client";

import { useState } from "react";
import {
  Building2,
  FileText,
  ShieldCheck,
  Percent,
  Flame,
  Save,
  CheckCircle2,
  AlertTriangle,
  Store,
  WalletCards,
  Settings as SettingsIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SECTIONS = [
  { key: "brand", label: "Brand Network Profile", icon: Building2, desc: "Franchisor identity, HQ contacts & GSTIN" },
  { key: "royalty", label: "Royalty & Financial Rules", icon: WalletCards, desc: "6.5% royalty, 2% marketing, payment cycles" },
  { key: "operations", label: "Meat Yield & Spit Rules", icon: Flame, desc: "Portion standards, temperature limits & alerts" },
  { key: "safety", label: "FSSAI & QA Thresholds", icon: ShieldCheck, desc: "Freezer limits, oil polar TPM & audit rules" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

const INPUT = "w-full h-11 rounded-2xl border border-slate-200 dark:border-[#303038] bg-white dark:bg-[#202025] px-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400";
const LABEL = "block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("brand");
  const [savedToast, setSavedToast] = useState(false);

  // Settings states
  const [brandName, setBrandName] = useState("Irani Koyla Shawarma Franchise Network");
  const [hqAddress, setHqAddress] = useState("Central Commissary Hub, Marol Industrial Area, Andheri (E), Mumbai 400059");
  const [hqPhone, setHqPhone] = useState("+91 98200 12345");
  const [hqEmail, setHqEmail] = useState("operations@iranikoyla.com");
  const [gstin, setGstin] = useState("27AABCI4920F1ZV");

  const [royaltyRate, setRoyaltyRate] = useState("6.5");
  const [marketingRate, setMarketingRate] = useState("2.0");
  const [invoiceDueDays, setInvoiceDueDays] = useState("10");
  const [latePaymentPenalty, setLatePaymentPenalty] = useState("1.5");

  const [targetYieldPercent, setTargetYieldPercent] = useState("92.0");
  const [wrapMeatPortionGrams, setWrapMeatPortionGrams] = useState("85");
  const [jumboMeatPortionGrams, setJumboMeatPortionGrams] = useState("130");
  const [spitMinTemp, setSpitMinTemp] = useState("75.0");

  const [freezerMaxTemp, setFreezerMaxTemp] = useState("-18.0");
  const [maxOilTpm, setMaxOilTpm] = useState("24.0");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest">
            <SettingsIcon className="w-4 h-4" />
            <span>Network Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            System Settings & Franchise Rules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure brand fee percentages, portion control weights, and food safety thresholds.
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {SECTIONS.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActive(sec.key)}
              className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                active === sec.key
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold"
                  : "bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1f1f1f]"
              }`}
            >
              <sec.icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">{sec.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{sec.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Settings Form Content */}
        <Card className="lg:col-span-3 border-slate-200 dark:border-[#303030]">
          <CardHeader className="border-b border-slate-100 dark:border-[#303030]">
            <CardTitle className="text-base font-black">
              {SECTIONS.find((s) => s.key === active)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              {active === "brand" && (
                <>
                  <div>
                    <label className={LABEL}>Franchisor Entity Name</label>
                    <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Central Commissary & HQ Address</label>
                    <input type="text" value={hqAddress} onChange={(e) => setHqAddress(e.target.value)} className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>HQ Operations Phone</label>
                      <input type="text" value={hqPhone} onChange={(e) => setHqPhone(e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Official Email</label>
                      <input type="email" value={hqEmail} onChange={(e) => setHqEmail(e.target.value)} className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Master GSTIN Number</label>
                    <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className={INPUT} />
                  </div>
                </>
              )}

              {active === "royalty" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Franchise Royalty Rate (%)</label>
                      <input type="number" step="0.1" value={royaltyRate} onChange={(e) => setRoyaltyRate(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Default standard: 6.5% of verified gross sales</span>
                    </div>
                    <div>
                      <label className={LABEL}>Central Marketing Fund (%)</label>
                      <input type="number" step="0.1" value={marketingRate} onChange={(e) => setMarketingRate(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Default standard: 2.0% for regional promotions</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Invoice Payment Due (Days)</label>
                      <input type="number" value={invoiceDueDays} onChange={(e) => setInvoiceDueDays(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">e.g. Due by 10th of following month</span>
                    </div>
                    <div>
                      <label className={LABEL}>Overdue Interest / Penalty (%/mo)</label>
                      <input type="number" step="0.1" value={latePaymentPenalty} onChange={(e) => setLatePaymentPenalty(e.target.value)} className={INPUT} />
                    </div>
                  </div>
                </>
              )}

              {active === "operations" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Spit Meat Target Yield (%)</label>
                      <input type="number" step="0.1" value={targetYieldPercent} onChange={(e) => setTargetYieldPercent(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Alert triggered if yield falls below 90%</span>
                    </div>
                    <div>
                      <label className={LABEL}>Spit Core Minimum Temp (°C)</label>
                      <input type="number" step="0.1" value={spitMinTemp} onChange={(e) => setSpitMinTemp(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">FSSAI food safety mandatory: 75°C+</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Regular Wrap Meat Portion (grams)</label>
                      <input type="number" value={wrapMeatPortionGrams} onChange={(e) => setWrapMeatPortionGrams(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Standard BOM: 85g cooked shaved meat</span>
                    </div>
                    <div>
                      <label className={LABEL}>Jumbo Wrap Meat Portion (grams)</label>
                      <input type="number" value={jumboMeatPortionGrams} onChange={(e) => setJumboMeatPortionGrams(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Standard BOM: 130g cooked shaved meat</span>
                    </div>
                  </div>
                </>
              )}

              {active === "safety" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Deep Freezer Maximum Temperature (°C)</label>
                      <input type="number" step="0.1" value={freezerMaxTemp} onChange={(e) => setFreezerMaxTemp(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Safe standard: ≤ -18.0°C</span>
                    </div>
                    <div>
                      <label className={LABEL}>Fryer Oil Polar Limit (% TPM)</label>
                      <input type="number" step="0.1" value={maxOilTpm} onChange={(e) => setMaxOilTpm(e.target.value)} className={INPUT} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Mandatory oil replacement if &gt; 24.0%</span>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-[#303030]">
                <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2">
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
