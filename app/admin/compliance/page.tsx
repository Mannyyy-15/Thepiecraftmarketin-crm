"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Plus,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Award,
  Calendar,
  X,
  Droplets,
  Bug,
  Users,
  Search,
  Flame,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export default function CompliancePage() {
  const { filteredCompliance, outlets, updateCompliance, selectedOutletId, role } = useFranchise();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [outletId, setOutletId] = useState(selectedOutletId === "all" ? "bandra-west" : selectedOutletId);
  const [inspectedBy, setInspectedBy] = useState("QA Officer Natasha");
  const [deepFreezerTemp, setDeepFreezerTemp] = useState("-18.6");
  const [chillerTemp, setChillerTemp] = useState("3.4");
  const [spitCoreTemp, setSpitCoreTemp] = useState("78.2");
  const [oilPolarCompound, setOilPolarCompound] = useState("15.2");
  const [fssaiDisplay, setFssaiDisplay] = useState(true);
  const [staffHairnets, setStaffHairnets] = useState(true);
  const [pestControl, setPestControl] = useState(true);
  const [waterQuality, setWaterQuality] = useState(true);
  const [remarks, setRemarks] = useState("All kitchen workstations sanitized, food temperature compliant.");

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === outletId) || outlets[0];
    updateCompliance({
      outletId: targetO.id,
      outletName: targetO.name,
      inspectedBy,
      deepFreezerTemp: parseFloat(deepFreezerTemp) || -18.5,
      chillerTemp: parseFloat(chillerTemp) || 3.5,
      spitCoreTemp: parseFloat(spitCoreTemp) || 78.0,
      oilPolarCompoundPercent: parseFloat(oilPolarCompound) || 16.0,
      fssaiDisplayVerified: fssaiDisplay,
      staffHairnetsGloves: staffHairnets,
      pestControlVerified: pestControl,
      waterQualityTested: waterQuality,
      remarks,
    });

    setShowAddModal(false);
  };

  const displayedCompliance = filteredCompliance.filter((c) => {
    return (
      c.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.inspectedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.date.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-[#b8b8c5]/60 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>FSSAI Quality & Food Safety Standards</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Food Safety, Temperature & Hygiene Audits
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/60 mt-0.5">
            Daily critical control points: -18&deg;C Deep Freezer, 75&deg;C+ Spit Core, and Fryer Oil TPM &le; 24%.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2 shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Daily Safety Audit</span>
        </Button>
      </div>

      {/* Critical Control Point KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Deep Freezer Temp
              </span>
              <Thermometer className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400 font-mono">
              -18.4&deg;C
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              Compliant (Target &le; -18&deg;C)
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Meat Storage Chiller
              </span>
              <Thermometer className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              3.2&deg;C
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              Compliant (Optimal 1&deg;C to 4&deg;C)
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Spit Core Roasting
              </span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">
              78.2&deg;C
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              Safe Searing (Target &ge; 75&deg;C)
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Fryer Oil TPM Quality
              </span>
              <Droplets className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">
              15.2%
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              Fresh Oil (Limit &le; 24.0%)
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Daily Safety Checklist Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "FSSAI License Displayed", desc: "Visible at ordering counter", status: "Verified" },
          { label: "Hairnets & Gloves", desc: "Mandatory crew apparel", status: "Verified" },
          { label: "Pest Control Audit", desc: "Monthly certified stamp", status: "Verified" },
          { label: "RO Potable Water Tested", desc: "TDS compliant < 120 ppm", status: "Verified" },
        ].map((chk) => (
          <div key={chk.label} className="p-3.5 rounded-xl bg-[#1f1f1f] border border-[#303030] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white block truncate">{chk.label}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <span className="text-[10px] text-[#b8b8c5]/60 block">{chk.desc}</span>
            <span className="text-[10px] text-emerald-400 font-bold block pt-1">✓ {chk.status}</span>
          </div>
        ))}
      </div>

      {/* Row 3: Historical Safety Audit Logs Table */}
      <Card className="border-[#303030] bg-[#1f1f1f] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-4">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-500" />
              <span>Inspection Logs & Temperature History</span>
            </CardTitle>
            <p className="text-xs text-[#b8b8c5]/60 mt-0.5">
              Daily recorded audits by QA inspectors and store managers
            </p>
          </div>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#b8b8c5]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white placeholder-[#b8b8c5]/40 focus:outline-none focus:border-amber-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#303030] bg-[#161618] text-[#b8b8c5]/60 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Inspector</th>
                  <th className="py-3 px-4">Outlet</th>
                  <th className="py-3 px-4">Freezer / Chiller</th>
                  <th className="py-3 px-4">Spit Core Temp</th>
                  <th className="py-3 px-4">Fryer Oil TPM</th>
                  <th className="py-3 px-4">Overall Score</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {displayedCompliance.map((log) => (
                  <tr key={log.id} className="hover:bg-[#303030]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{log.date}</span>
                      <span className="text-[10px] text-[#b8b8c5]/50">{log.inspectedBy}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">{log.outletName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-400">
                      <span>{log.deepFreezerTemp}&deg;C</span>
                      <span className="text-[#b8b8c5]/50 text-[10px] block">/ {log.chillerTemp}&deg;C chiller</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">
                      {log.spitCoreTemp}&deg;C
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {log.oilPolarCompoundPercent}%
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono text-sm">
                      {log.overallScore}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        Compliant
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Audit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg bg-[#1f1f1f] border border-[#303030] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Record Daily Food Safety Audit</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAuditSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#b8b8c5] mb-1">Franchise Hub</label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="w-full h-9 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#b8b8c5] mb-1">QA Inspector / Manager</label>
                <input
                  type="text"
                  required
                  value={inspectedBy}
                  onChange={(e) => setInspectedBy(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Freezer (&deg;C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={deepFreezerTemp}
                  onChange={(e) => setDeepFreezerTemp(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Chiller (&deg;C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={chillerTemp}
                  onChange={(e) => setChillerTemp(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Spit Core (&deg;C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={spitCoreTemp}
                  onChange={(e) => setSpitCoreTemp(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Oil TPM (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={oilPolarCompound}
                  onChange={(e) => setOilPolarCompound(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Verification Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={fssaiDisplay}
                  onChange={(e) => setFssaiDisplay(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>FSSAI License Displayed</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={staffHairnets}
                  onChange={(e) => setStaffHairnets(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>Hairnets & Gloves Worn</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={pestControl}
                  onChange={(e) => setPestControl(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>Pest Control Verified</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={waterQuality}
                  onChange={(e) => setWaterQuality(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>RO Water Tested</span>
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Audit Remarks / Observations</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#303030]">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="border-[#303030] text-[#b8b8c5]">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                Save Audit Log
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
