"use client";

import { useState } from "react";
import {
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Flame,
  Scale,
  DollarSign,
  Layers,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export default function PosMenuStockPage() {
  const { menuItems, updateMenuItem } = useFranchise();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const toggleStock = (id: string, currentActive: boolean) => {
    updateMenuItem(id, { active: !currentActive });
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const outOfStockCount = menuItems.filter((i) => !i.active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none">
              Counter Item Availability
            </span>
            {outOfStockCount > 0 ? (
              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {outOfStockCount} Items 86'd (Out of Stock)
              </span>
            ) : (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% Menu In Stock
              </span>
            )}
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
            Outlet Menu & 86'd Availability List
          </h1>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Menu Availability Table */}
      <div className="rounded-2xl bg-[#1f1f1f] border border-[#303030] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#303030] bg-[#161618] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Item Name & Category</th>
              <th className="py-3 px-4">Spit Roaster</th>
              <th className="py-3 px-4">Meat Portion</th>
              <th className="py-3 px-4">Selling Price</th>
              <th className="py-3 px-4">Terminal Status</th>
              <th className="py-3 px-4 text-right">Quick Stock Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#303030]">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-[#303030]/40 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="font-bold text-white block">{item.name}</span>
                  <span className="text-[10px] text-zinc-500">{item.category}</span>
                </td>
                <td className="py-3.5 px-4 font-bold text-orange-400">
                  {item.spitType}
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-300">
                  {item.meatWeight || `${item.meatPortionGrams}g`}
                </td>
                <td className="py-3.5 px-4 font-black text-white font-mono text-sm">
                  ₹{item.sellingPrice}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                      item.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    )}
                  >
                    {item.active ? "✓ In Stock" : "✗ 86'd (Sold Out)"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    size="sm"
                    onClick={() => toggleStock(item.id, item.active)}
                    className={cn(
                      "text-xs font-bold h-7 px-3 cursor-pointer",
                      item.active
                        ? "bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    )}
                  >
                    {item.active ? "Mark 86 (Out of Stock)" : "Mark Available"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
