"use client";

import { useState } from "react";
import {
  Truck,
  Flame,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Thermometer,
  ShieldCheck,
  PackageCheck,
  MapPin,
  Building,
  Store,
  ArrowUpRight,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export default function SupplyChainPage() {
  const { shipments, outlets, dispatchShipment } = useFranchise();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_transit" | "delivered" | "preparing">("all");
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Form states
  const [targetOutletId, setTargetOutletId] = useState(outlets[0]?.id || "bandra-west");
  const [chickenCones, setChickenCones] = useState("3");
  const [muttonCones, setMuttonCones] = useState("2");
  const [spiceBags, setSpiceBags] = useState("5");
  const [toumJars, setToumJars] = useState("10");
  const [driverName, setDriverName] = useState("Sultan Sheikh");
  const [driverPhone, setDriverPhone] = useState("+91 98205 11984");
  const [vehicleNo, setVehicleNo] = useState("MH 02 EE 4092 (Reefer)");
  const [vanTemp, setVanTemp] = useState("2.8");

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.securitySealNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalConesInTransit = shipments
    .filter((s) => s.status === "in_transit" || s.status === "preparing")
    .reduce((sum, s) => sum + s.chickenConesCount + s.muttonConesCount, 0);

  const totalDeliveredMeatToday = shipments
    .filter((s) => s.status === "delivered")
    .reduce((sum, s) => sum + s.totalMeatWeightKg, 0);

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const outlet = outlets.find((o) => o.id === targetOutletId) || outlets[0];
    const cCount = parseInt(chickenCones) || 0;
    const mCount = parseInt(muttonCones) || 0;
    const totalWeight = cCount * 30.0 + mCount * 18.0;

    dispatchShipment({
      shipmentNumber: `IK-DISP-${new Date().toISOString().replace(/\D/g, "").slice(2, 10)}`,
      outletId: outlet.id,
      outletName: outlet.name,
      dispatchedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) + ", Today",
      status: "in_transit",
      chickenConesCount: cCount,
      muttonConesCount: mCount,
      totalMeatWeightKg: totalWeight,
      spiceMixBagsCount: parseInt(spiceBags) || 0,
      toumJarsCount: parseInt(toumJars) || 0,
      vanVehicleNumber: vehicleNo,
      driverName,
      driverPhone,
      temperatureCelsius: parseFloat(vanTemp) || 2.8,
      securitySealNumber: `SEAL-K-${Math.floor(10000 + Math.random() * 90000)}`,
    });

    setShowDispatchModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>Central Commissary & Logistics</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cold-Chain Meat & Spice Supply Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/70 mt-0.5">
            Central marination kitchen production, refrigerated van tracking, and tamper-proof seal audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowDispatchModal(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-orange-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch New Cold Shipment</span>
          </Button>
        </div>
      </div>

      {/* High Level Supply Chain Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Central Cold Storage</span>
            <p className="text-xl font-black text-white font-mono mt-0.5">450 kg Ready</p>
            <span className="text-[10px] text-emerald-400 font-semibold block">15x Chicken + 8x Mutton Cones</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Active In-Transit</span>
            <p className="text-xl font-black text-blue-400 font-mono mt-0.5">{totalConesInTransit} Cones Moving</p>
            <span className="text-[10px] text-zinc-400 block">Target Temp: 2.0°C – 4.0°C</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Delivered Today</span>
            <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{totalDeliveredMeatToday} kg Meat</p>
            <span className="text-[10px] text-zinc-400 block">100% Tamper Seals Intact</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">Signature Spice Reserve</span>
            <p className="text-xl font-black text-orange-400 font-mono mt-0.5">85 Bags</p>
            <span className="text-[10px] text-zinc-400 block">Koyla Secret Spice Blend</span>
          </CardContent>
        </Card>
      </div>

      {/* Shipments List & Table */}
      <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shipment #, outlet, seal #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {["all", "in_transit", "delivered", "preparing"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                  statusFilter === s
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-[#161618] text-zinc-400 border border-[#303030] hover:text-white"
                )}
              >
                {s === "all" ? "All Shipments" : s === "in_transit" ? "In Transit" : s === "delivered" ? "Delivered" : "Preparing"}
              </button>
            ))}
          </div>
        </div>

        {/* Shipments Table */}
        <div className="space-y-3">
          {filteredShipments.map((shp) => (
            <div
              key={shp.id}
              className="p-4 rounded-2xl bg-[#161618] border border-[#303030] flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 hover:border-orange-500/40 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 text-orange-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-white">{shp.shipmentNumber}</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                      shp.status === "delivered"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : shp.status === "in_transit"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {shp.status.replace("_", " ")}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-white block truncate mt-0.5">
                    Destination: {shp.outletName}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Dispatched: {shp.dispatchedAt} &middot; Driver: {shp.driverName} ({shp.driverPhone})
                  </span>
                </div>
              </div>

              {/* Payload Breakdown */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] text-center">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Chicken Cones</span>
                  <span className="font-black text-white">{shp.chickenConesCount}x (30kg)</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] text-center">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Mutton Cones</span>
                  <span className="font-black text-white">{shp.muttonConesCount}x (18kg)</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] text-center">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Total Meat</span>
                  <span className="font-black text-orange-400">{shp.totalMeatWeightKg} kg</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] text-center">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Van Temp</span>
                  <span className="font-black text-blue-400">{shp.temperatureCelsius}°C</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] text-center">
                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Security Seal</span>
                  <span className="font-bold text-emerald-400">{shp.securitySealNumber}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <Dialog open={true} onOpenChange={setShowDispatchModal}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-500" />
                <span>Dispatch Cold-Chain Shipment</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateDispatch} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Destination Franchise Outlet</label>
                <select
                  value={targetOutletId}
                  onChange={(e) => setTargetOutletId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">30kg Chicken Cones</label>
                  <input
                    type="number"
                    value={chickenCones}
                    onChange={(e) => setChickenCones(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">18kg Mutton Cones</label>
                  <input
                    type="number"
                    value={muttonCones}
                    onChange={(e) => setMuttonCones(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Van Temperature (°C)</label>
                  <input
                    type="text"
                    value={vanTemp}
                    onChange={(e) => setVanTemp(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDispatchModal(false)} className="border-[#303030] bg-[#161618] text-zinc-300">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-500 text-white font-bold">
                  Confirm Cold-Chain Dispatch
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
