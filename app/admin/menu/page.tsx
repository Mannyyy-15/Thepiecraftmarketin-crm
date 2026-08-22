"use client";

import { useState } from "react";
import {
  UtensilsCrossed,
  Plus,
  Scale,
  Flame,
  Search,
  CheckCircle2,
  DollarSign,
  Layers,
  Calculator,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Check,
  Tag,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { MenuItemRecipe } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export default function MenuBOMPage() {
  const { menuItems, role, addMenuItem, updateMenuItem, deleteMenuItem } = useFranchise();
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSimulator, setShowSimulator] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemRecipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Add / Edit
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MenuItemRecipe["category"]>("Shawarma Wraps");
  const [sellingPrice, setSellingPrice] = useState("189");
  const [meatGrams, setMeatGrams] = useState("110");
  const [sauceGrams, setSauceGrams] = useState("30");
  const [breadType, setBreadType] = useState<MenuItemRecipe["breadType"]>("Khubz (Lebanese)");
  const [spitType, setSpitType] = useState<MenuItemRecipe["spitType"]>("Chicken");
  const [image, setImage] = useState("https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80");
  const [tag, setTag] = useState("Popular");
  const [modifiersInput, setModifiersInput] = useState("Extra Garlic Toum (+₹20), Spicy Peri-Peri (+₹15)");

  // Margin simulator state
  const [simRawChickenCostKg, setSimRawChickenCostKg] = useState("240");
  const [simWrapSellingPrice, setSimWrapSellingPrice] = useState("189");
  const [simMeatWeightGrams, setSimMeatWeightGrams] = useState("110");
  const [simBreadCost, setSimBreadCost] = useState("12");
  const [simSauceCost, setSimSauceCost] = useState("8");
  const [simPackagingCost, setSimPackagingCost] = useState("6");

  const categories = ["all", "Shawarma Wraps", "Combos & Meals", "Platters & Dips", "Irani Chai & Drinks", "Sides & Toum"];

  const filteredItems = menuItems.filter((m) => {
    const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate simulated margins
  const rawCostPerGram = (parseFloat(simRawChickenCostKg) || 240) / 1000;
  const meatCost = (parseFloat(simMeatWeightGrams) || 110) * rawCostPerGram;
  const otherCost = (parseFloat(simBreadCost) || 12) + (parseFloat(simSauceCost) || 8) + (parseFloat(simPackagingCost) || 6);
  const totalCogs = meatCost + otherCost;
  const selling = parseFloat(simWrapSellingPrice) || 189;
  const marginPct = selling > 0 ? (((selling - totalCogs) / selling) * 100).toFixed(1) : "0";

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setCategory("Shawarma Wraps");
    setSellingPrice("199");
    setMeatGrams("110");
    setSauceGrams("30");
    setBreadType("Khubz (Lebanese)");
    setSpitType("Chicken");
    setImage("https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80");
    setTag("Chef Special");
    setModifiersInput("Extra Garlic Toum (+₹20), Extra Searing Meat (+₹40)");
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: MenuItemRecipe) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setSellingPrice(item.sellingPrice.toString());
    setMeatGrams(item.meatPortionGrams.toString());
    setSauceGrams(item.sauceGrams.toString());
    setBreadType(item.breadType);
    setSpitType(item.spitType);
    setImage(item.image || "");
    setTag(item.tag || "");
    setModifiersInput((item.modifiers || []).join(", "));
    setShowAddModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(sellingPrice) || 199;
    const mg = parseInt(meatGrams) || 0;
    const sg = parseInt(sauceGrams) || 0;
    const mods = modifiersInput.split(",").map((s) => s.trim()).filter(Boolean);
    const estCogs = mg * 0.45 + (category === "Shawarma Wraps" ? 22 : 15);
    const grossMargin = price > 0 ? Math.round(((price - estCogs) / price) * 1000) / 10 : 70;

    const payload = {
      name,
      category,
      sellingPrice: price,
      meatPortionGrams: mg,
      sauceGrams: sg,
      breadType,
      spitType,
      image,
      tag,
      meatWeight: mg > 0 ? `${mg}g` : "N/A",
      modifiers: mods,
      cogsCost: estCogs,
      grossMarginPercent: grossMargin,
      popularRank: editingItem ? editingItem.popularRank : menuItems.length + 1,
      active: true,
    };

    if (editingItem) {
      updateMenuItem(editingItem.id, payload);
    } else {
      addMenuItem(payload);
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>{isSuperAdmin ? "Brand HQ Master Menu & Recipe BOM" : "Store Menu & Portion Standards"}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isSuperAdmin ? "Master Recipe & Live POS Menu Control" : "Authorized Menu & Standard Portions"}
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/70 mt-0.5">
            {isSuperAdmin
              ? "Add, price, or modify recipes here. Changes sync automatically to every franchise Counter POS terminal."
              : "Standardized portion weights, approved brand pricing, and kitchen assembly guidelines."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <>
              <Button
                onClick={() => setShowSimulator(true)}
                variant="outline"
                className="border-[#303030] bg-[#161618] text-zinc-300 hover:text-white text-xs font-bold gap-1.5 h-10 rounded-xl"
              >
                <Calculator className="w-4 h-4 text-orange-500" />
                <span>Margin Simulator</span>
              </Button>

              <Button
                onClick={handleOpenAdd}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-orange-600/25 h-10 px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Master Recipe</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                selectedCategory === cat
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-[#161618] text-zinc-400 border border-[#303030] hover:text-white hover:border-orange-500/40"
              )}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipes, tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group rounded-2xl bg-[#1f1f1f] border p-4 space-y-3.5 transition-all relative flex flex-col justify-between shadow-lg",
              item.active ? "border-[#303030] hover:border-orange-500" : "border-rose-500/30 opacity-60"
            )}
          >
            <div>
              {/* Item Photo & Badges */}
              <div className="relative h-40 w-full rounded-xl overflow-hidden bg-[#161618] border border-[#303030]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <UtensilsCrossed className="w-8 h-8" />
                  </div>
                )}

                {/* Price Pill */}
                <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm font-black text-orange-400">
                  ₹{item.sellingPrice}
                </div>

                {/* Tag */}
                {item.tag && (
                  <div className="absolute top-2.5 left-2.5 bg-orange-600/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white">
                    {item.tag}
                  </div>
                )}
              </div>

              {/* Title & Category */}
              <div className="mt-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {item.category} &middot; {item.spitType}
                </span>
                <h3 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors mt-0.5">
                  {item.name}
                </h3>
              </div>

              {/* Portion Specs */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3">
                <div className="p-2 rounded-xl bg-[#161618] border border-[#303030]">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Meat Portion</span>
                  <span className="font-mono font-black text-white">{item.meatWeight || `${item.meatPortionGrams}g`}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#161618] border border-[#303030]">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Sauce</span>
                  <span className="font-mono font-black text-white">{item.sauceGrams}g</span>
                </div>
                <div className="p-2 rounded-xl bg-[#161618] border border-[#303030]">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Bread</span>
                  <span className="font-bold text-zinc-300 truncate block text-[11px]">{item.breadType.split(" ")[0]}</span>
                </div>
              </div>

              {/* Financial Margins (Super Admin View) */}
              {isSuperAdmin && (
                <div className="mt-3 p-2.5 rounded-xl bg-[#161618] border border-[#303030] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Unit COGS:</span>
                    <span className="font-bold text-zinc-300">₹{item.cogsCost.toFixed(0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Gross Margin:</span>
                    <span className="font-black text-emerald-400">{item.grossMarginPercent}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions (Super Admin Edit / Toggle / Delete) */}
            <div className="pt-3 border-t border-[#303030] flex items-center justify-between">
              <span className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border",
                item.active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              )}>
                {item.active ? "● Live on POS" : "86'd / Inactive"}
              </span>

              {isSuperAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateMenuItem(item.id, { active: !item.active })}
                    className="p-1.5 rounded-lg bg-[#161618] border border-[#303030] text-zinc-400 hover:text-white"
                    title={item.active ? "Temporarily 86 / Deactivate on POS" : "Activate on POS"}
                  >
                    {item.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg bg-[#161618] border border-[#303030] text-zinc-400 hover:text-orange-400"
                    title="Edit Recipe & Price"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${item.name} from Brand Master Menu?`)) {
                        deleteMenuItem(item.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-[#161618] border border-[#303030] text-zinc-400 hover:text-rose-400"
                    title="Delete Recipe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── ADD / EDIT MASTER RECIPE MODAL ─────────────────────────────────── */}
      {showAddModal && (
        <Dialog open={true} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-3xl">
            <DialogHeader className="border-b border-[#303030] pb-3">
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                <span>{editingItem ? "Edit Brand Master Recipe" : "Add New Brand Master Recipe"}</span>
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Updates configured here push live immediately to every franchise Counter POS terminal.
              </p>
            </DialogHeader>

            <form onSubmit={handleSaveItem} className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Charcoal Garlic Shawarma Roll"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-semibold focus:outline-none focus:border-orange-500"
                  >
                    <option value="Shawarma Wraps">Shawarma Wraps</option>
                    <option value="Combos & Meals">Combos & Meals</option>
                    <option value="Platters & Dips">Platters & Dips</option>
                    <option value="Irani Chai & Drinks">Irani Chai & Drinks</option>
                    <option value="Sides & Toum">Sides & Toum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-orange-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Meat Portion (g)</label>
                  <input
                    type="number"
                    value={meatGrams}
                    onChange={(e) => setMeatGrams(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Sauce & Toum (g)</label>
                  <input
                    type="number"
                    value={sauceGrams}
                    onChange={(e) => setSauceGrams(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Spit Roaster Type</label>
                  <select
                    value={spitType}
                    onChange={(e) => setSpitType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white"
                  >
                    <option value="Chicken">Chicken Spit</option>
                    <option value="Mutton">Mutton Spit</option>
                    <option value="Both">Both / Mixed</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Dip">Dip</option>
                    <option value="Side">Side</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Bread Base</label>
                  <select
                    value={breadType}
                    onChange={(e) => setBreadType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white"
                  >
                    <option value="Khubz (Lebanese)">Khubz (Lebanese)</option>
                    <option value="Rumali Roti">Rumali Roti</option>
                    <option value="Samoli Bread">Samoli Bread</option>
                    <option value="N/A">N/A (Platter / Drink)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Appetizing Food Photo URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">POS Modifiers (Comma Separated)</label>
                <input
                  type="text"
                  value={modifiersInput}
                  onChange={(e) => setModifiersInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white"
                  placeholder="Extra Garlic Toum (+₹20), Spicy Peri-Peri (+₹15)"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#303030]">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="border-[#303030] bg-[#161618] text-zinc-300">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-500 text-white font-black h-11 px-5 rounded-xl">
                  {editingItem ? "Save & Push to POS" : "Publish to Franchise Network POS"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* COGS Margin Simulator Modal */}
      {showSimulator && (
        <Dialog open={true} onOpenChange={setShowSimulator}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-3xl">
            <div className="space-y-4">
              <div className="border-b border-[#303030] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-black text-white">Live COGS & Margin Simulator</h3>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Raw Chicken Marinated Cost (₹ / kg)</label>
                  <input
                    type="number"
                    value={simRawChickenCostKg}
                    onChange={(e) => setSimRawChickenCostKg(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[#161618] border border-[#303030] text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Meat Weight (grams)</label>
                    <input
                      type="number"
                      value={simMeatWeightGrams}
                      onChange={(e) => setSimMeatWeightGrams(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-[#161618] border border-[#303030] text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={simWrapSellingPrice}
                      onChange={(e) => setSimWrapSellingPrice(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-[#161618] border border-[#303030] text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161618] border border-[#303030] space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Meat Portion Cost:</span>
                    <span>₹{meatCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Khubz + Toum + Packaging:</span>
                    <span>₹{otherCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-[#303030]">
                    <span>Total Unit COGS:</span>
                    <span>₹{totalCogs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-400 text-sm pt-1">
                    <span>Calculated Gross Margin:</span>
                    <span>{marginPct}%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setShowSimulator(false)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl">
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
