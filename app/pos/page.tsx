"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Banknote,
  Clock,
  CheckCircle2,
  X,
  Search,
  SlidersHorizontal,
  PauseCircle,
  PlayCircle,
  QrCode,
  Sparkles,
  Split,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
  selectedModifiers: string[];
}

interface ParkedBill {
  id: string;
  customerName: string;
  cart: CartItem[];
  time: string;
}

const POS_MENU_ITEMS = [
  {
    id: "pos-01",
    name: "Classic Koyla Chicken Wrap",
    category: "Shawarma Wraps",
    price: 189,
    meatWeight: "110g",
    spit: "Chicken",
    tag: "Best Seller",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Toum (+₹20)", "Spicy Peri-Peri (+₹15)", "No Pickles", "Extra Searing Meat (+₹40)"],
  },
  {
    id: "pos-02",
    name: "Smoked Charcoal Mutton Roll",
    category: "Shawarma Wraps",
    price: 289,
    meatWeight: "140g",
    spit: "Mutton",
    tag: "Signature",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Toum (+₹20)", "Extra Searing Meat (+₹50)", "Rumali Toast"],
  },
  {
    id: "pos-03",
    name: "Jumbo Loaded Koyla Meal Combo",
    category: "Combos & Meals",
    price: 349,
    meatWeight: "160g",
    spit: "Chicken",
    tag: "Meal Box",
    image: "https://images.unsplash.com/photo-1561719450-48226060c50d?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Add Peri-Peri Fries (+₹30)", "Add Toum Dip (+₹20)", "Upgrade to Mutton (+₹80)"],
  },
  {
    id: "pos-04",
    name: "Irani Royal Open Platter & Khubz",
    category: "Platters & Dips",
    price: 449,
    meatWeight: "220g",
    spit: "Both",
    tag: "Platter",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Khubz Bread (+₹15)", "Extra Garlic Toum (+₹20)", "Extra Pickles (+₹15)"],
  },
  {
    id: "pos-05",
    name: "Authentic Irani Dum Chai Special",
    category: "Irani Chai & Drinks",
    price: 49,
    meatWeight: "N/A",
    spit: "Beverage",
    tag: "Hot Brew",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Less Sugar", "Strong Kadak", "Extra Malai (+₹10)"],
  },
  {
    id: "pos-06",
    name: "Signature Garlic Toum Dip (100g Jar)",
    category: "Platters & Dips",
    price: 79,
    meatWeight: "N/A",
    spit: "Dip",
    tag: "Side",
    image: "https://images.unsplash.com/photo-1618449840665-9ed506d73a34?auto=format&fit=crop&w=400&q=80",
    modifiers: [],
  },
  {
    id: "pos-07",
    name: "Spicy Peri-Peri Charcoal Fries Box",
    category: "Platters & Dips",
    price: 119,
    meatWeight: "N/A",
    spit: "Side",
    tag: "Side",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Cheese Dip (+₹25)", "Extra Peri-Peri Spice"],
  },
  {
    id: "pos-08",
    name: "Koyla Spiced Chicken Wings (6 pcs)",
    category: "Combos & Meals",
    price: 249,
    meatWeight: "200g",
    spit: "Chicken",
    tag: "Starters",
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Dip (+₹20)"],
  },
];

export default function PosBillingTerminal() {
  const { activeOutlet, outlets, addLiveOrder, menuItems } = useFranchise();
  const currentOutlet = activeOutlet || outlets[0];

  const activePosItems = menuItems.filter((m) => m.active).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    price: m.sellingPrice,
    meatWeight: m.meatWeight || (m.meatPortionGrams > 0 ? `${m.meatPortionGrams}g` : "N/A"),
    spit: m.spitType,
    tag: m.tag || "",
    image: m.image || "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80",
    modifiers: m.modifiers || [],
  }));

  const [activeCategory, setActiveCategory] = useState<string>("All Items");
  const [searchTerm, setSearchTerm] = useState("");

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentMode, setPaymentMode] = useState<"Cash" | "GPay / UPI" | "Card / POS" | "Split Payment">("Cash");
  const [customerToken, setCustomerToken] = useState("Counter Order #14");
  const [cashTendered, setCashTendered] = useState("500");

  // Split-Tender States
  const [splitCash, setSplitCash] = useState("200");
  const [splitDigital, setSplitDigital] = useState("");
  const [splitDigitalType, setSplitDigitalType] = useState<"GPay / UPI" | "Card / POS">("GPay / UPI");

  // Parked Bills
  const [parkedBills, setParkedBills] = useState<ParkedBill[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Dialogs
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [showKotModal, setShowKotModal] = useState(false);
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [offlineQueuedToast, setOfflineQueuedToast] = useState(false);

  const categories = ["All Items", "Shawarma Wraps", "Combos & Meals", "Platters & Dips", "Irani Chai & Drinks", "Sides & Toum"];

  const filteredMenuItems = activePosItems.filter((item) => {
    const matchesCat = activeCategory === "All Items" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (item: typeof activePosItems[0]) => {
    const existingIndex = cart.findIndex((c) => c.id === item.id && c.selectedModifiers.length === 0);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          category: item.category,
          image: item.image,
          selectedModifiers: [],
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const toggleModifier = (index: number, modifier: string) => {
    const updated = [...cart];
    const exists = updated[index].selectedModifiers.includes(modifier);
    if (exists) {
      updated[index].selectedModifiers = updated[index].selectedModifiers.filter((m) => m !== modifier);
    } else {
      updated[index].selectedModifiers.push(modifier);
    }
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleParkBill = () => {
    if (cart.length === 0) return;
    const bill: ParkedBill = {
      id: `park-${Date.now()}`,
      customerName: customerToken || "Order",
      cart: [...cart],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setParkedBills([...parkedBills, bill]);
    setCart([]);
    setCustomerToken(`Counter Order #${Math.floor(10 + Math.random() * 80)}`);
  };

  const handleRecallBill = (bill: ParkedBill) => {
    setCart(bill.cart);
    setCustomerToken(bill.customerName);
    setParkedBills(parkedBills.filter((b) => b.id !== bill.id));
    setShowParkedModal(false);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    let itemPrice = item.price;
    item.selectedModifiers.forEach((m) => {
      const match = m.match(/\+₹(\d+)/);
      if (match) itemPrice += parseInt(match[1]);
    });
    return sum + itemPrice * item.quantity;
  }, 0);

  const gstAmount = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + gstAmount;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  // Split calculations
  useEffect(() => {
    if (paymentMode === "Split Payment") {
      const cashNum = parseFloat(splitCash) || 0;
      const remainder = Math.max(0, grandTotal - cashNum);
      setSplitDigital(remainder.toString());
    }
  }, [grandTotal, paymentMode, splitCash]);

  const splitCashVal = parseFloat(splitCash) || 0;
  const splitDigitalVal = parseFloat(splitDigital) || 0;
  const splitRemaining = grandTotal - splitCashVal - splitDigitalVal;

  const handlePunchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMode === "Split Payment" && Math.abs(splitRemaining) > 1) {
      alert(`Split balance remaining: ₹${splitRemaining.toFixed(2)}. Please ensure full settlement.`);
      return;
    }

    const orderNum = `IK-${Math.floor(1000 + Math.random() * 9000)}`;
    const timeNow = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const orderPayload = {
      orderNumber: orderNum,
      time: timeNow,
      items: cart.map((c) => ({
        name: `${c.name}${c.selectedModifiers.length > 0 ? ` (${c.selectedModifiers.join(", ")})` : ""}`,
        quantity: c.quantity,
        price: c.price,
      })),
      totalAmount: grandTotal,
      channel: "Walk-in Counter" as const,
      paymentMethod: paymentMode,
      splitDetail: paymentMode === "Split Payment" ? {
        cashAmount: splitCashVal,
        digitalAmount: splitDigitalVal,
        digitalMethod: splitDigitalType,
      } : undefined,
      status: "Completed" as const,
      customerName: customerToken.trim() || "Counter Customer",
      outletId: currentOutlet.id,
    };

    // Check online status for resilience
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const existingOffline = JSON.parse(localStorage.getItem("koyla_offline_orders") || "[]");
      localStorage.setItem("koyla_offline_orders", JSON.stringify([...existingOffline, orderPayload]));
      setOfflineQueuedToast(true);
      setTimeout(() => setOfflineQueuedToast(false), 4000);
    }

    addLiveOrder(orderPayload);
    setCompletedOrder({
      ...orderPayload,
      subtotal,
      gstAmount,
      cashTendered: paymentMode === "Split Payment" ? splitCash : cashTendered,
      changeDue: paymentMode === "Split Payment" ? 0 : changeDue,
    });
    setShowKotModal(true);
    setCart([]);
    setCustomerToken(`Counter Order #${Math.floor(10 + Math.random() * 80)}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative">
      {/* Offline Toast Notification */}
      {offlineQueuedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-2xl flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <span>Offline Resilience Active</span>
            <span className="text-[10px] text-amber-300/70 block">Bill queued in local device memory. Auto-syncs when online.</span>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Image Touch Menu Grid (7 Columns) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Category Filters Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shawarma, combo, chai…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-2xl bg-[#1f1f1f] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:flex-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                  activeCategory === cat
                    ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(249,115,22,0.35)]"
                    : "bg-[#1f1f1f] text-zinc-400 border border-[#303030] hover:border-orange-500/40 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Photo Menu Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="group relative rounded-2xl bg-[#1f1f1f] border border-[#303030] hover:border-orange-500 overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-orange-500/10 flex flex-col justify-between"
            >
              {/* Product Photo with Badges Overlay */}
              <div className="relative h-28 w-full overflow-hidden bg-[#161618]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f1f] via-transparent to-black/40" />

                {/* Portion Weight Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="text-[9px] font-mono font-black text-amber-300 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-amber-500/30 shadow-sm">
                    {item.meatWeight}
                  </span>
                </div>

                {/* Spit Type Badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-bold uppercase text-zinc-300 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#303030]">
                    {item.spit}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <h3 className="text-xs font-black text-white group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                  {item.name}
                </h3>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#303030]">
                  <span className="font-mono text-sm font-black text-orange-400">
                    ₹{item.price}
                  </span>

                  <button
                    type="button"
                    className="w-7 h-7 rounded-xl bg-orange-600/20 text-orange-400 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center font-black text-sm transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Redesigned Clean Counter Register (5 Columns) */}
      <div className="lg:col-span-5">
        <form onSubmit={handlePunchOrder} className="rounded-2xl bg-[#1f1f1f] border border-[#303030] p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-[#303030] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block leading-none">Counter Register</span>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{customerToken}</span>
              </div>
            </div>

            {/* Quick Actions: Clear & Hold / Recall */}
            <div className="flex items-center gap-1.5">
              {parkedBills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowParkedModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-orange-500/20"
                >
                  <PlayCircle className="w-3 h-3" />
                  <span>Recall ({parkedBills.length})</span>
                </button>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleParkBill}
                    className="px-2 py-1 rounded-xl bg-[#161618] border border-[#303030] text-zinc-400 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Park bill to serve next customer"
                  >
                    <PauseCircle className="w-3 h-3" />
                    <span>Park</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="p-1 rounded-xl bg-[#161618] border border-[#303030] text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 font-semibold space-y-1">
                <ShoppingBag className="w-8 h-8 text-zinc-700 mx-auto" />
                <span>Register basket is empty.</span>
                <span className="text-[10px] text-zinc-600 block">Tap items from the left menu to add.</span>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-2xl bg-[#161618] border border-[#303030] space-y-2">
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Item Thumbnail & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#303030] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-orange-400 font-mono">
                          ₹{item.price} each
                        </span>
                      </div>
                    </div>

                    {/* Quantity + / - and Line Total */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#1f1f1f] p-0.5 rounded-xl border border-[#303030]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-[#161618] text-white text-xs font-bold flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-black text-white w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-orange-600 text-white text-xs font-bold flex items-center justify-center hover:bg-orange-500 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono text-xs font-black text-white w-14 text-right">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Modifiers Chips if Wrap */}
                  {item.category.includes("Wraps") && (
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[#303030]/60">
                      {["Extra Garlic Toum (+₹20)", "Spicy Peri-Peri (+₹15)", "No Pickles"].map((mod) => {
                        const active = item.selectedModifiers.includes(mod);
                        return (
                          <button
                            key={mod}
                            type="button"
                            onClick={() => toggleModifier(idx, mod)}
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold",
                              active
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                : "bg-[#1f1f1f] text-zinc-400 border border-[#303030] hover:text-zinc-200"
                            )}
                          >
                            {mod}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Clean Bill Breakdown */}
          <div className="p-3 rounded-2xl bg-[#161618] border border-[#303030] space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Items Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Restaurant GST (5%):</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#303030] font-black text-base text-orange-400">
              <span>Total Payable:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Fast Tender Buttons */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">
              Payment Tender
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mode: "Cash", label: "Cash", icon: Banknote },
                { mode: "GPay / UPI", label: "UPI QR", icon: Smartphone },
                { mode: "Card / POS", label: "Card", icon: CreditCard },
                { mode: "Split Payment", label: "Split", icon: Split },
              ].map((pm) => (
                <button
                  key={pm.mode}
                  type="button"
                  onClick={() => setPaymentMode(pm.mode as any)}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[11px] font-extrabold border flex items-center justify-center gap-1 transition-all cursor-pointer",
                    paymentMode === pm.mode
                      ? "bg-orange-500/20 border-orange-500 text-orange-300 font-black shadow-sm"
                      : "bg-[#161618] border-[#303030] text-zinc-400 hover:border-orange-500/40"
                  )}
                >
                  <pm.icon className="w-3 h-3 shrink-0" />
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Single Cash Tender Calculator */}
          {paymentMode === "Cash" && (
            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold">Quick Cash Received:</span>
                <div className="flex gap-1">
                  {[200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt.toString())}
                      className="px-2 py-0.5 rounded-lg bg-[#161618] border border-emerald-500/40 text-[10px] font-mono text-white font-bold cursor-pointer hover:bg-emerald-500/20"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-24 h-8 px-2.5 rounded-xl bg-[#161618] border border-emerald-500/40 text-xs text-white font-mono font-bold"
                />
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-bold">Change Return:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    ₹{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Split-Tender Multi-Pay Interface */}
          {paymentMode === "Split Payment" && (
            <div className="p-3 rounded-2xl bg-[#161618] border border-orange-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#303030] pb-2">
                <span className="font-bold text-orange-400 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5" />
                  <span>Split Tender Multi-Payment</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  Total: ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Cash Portion */}
                <div>
                  <label className="block text-[10px] font-bold text-emerald-400 mb-1">1. Cash Tender (₹)</label>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#1f1f1f] border border-emerald-500/40 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 200"
                  />
                </div>

                {/* Digital Portion */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-blue-400">2. Digital (₹)</label>
                    <select
                      value={splitDigitalType}
                      onChange={(e) => setSplitDigitalType(e.target.value as any)}
                      className="text-[9px] bg-[#1f1f1f] border border-blue-500/30 text-blue-300 rounded px-1"
                    >
                      <option value="GPay / UPI">UPI</option>
                      <option value="Card / POS">Card</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    value={splitDigital}
                    onChange={(e) => setSplitDigital(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#1f1f1f] border border-blue-500/40 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                    placeholder="Remainder"
                  />
                </div>
              </div>

              {/* Split Balance Validator */}
              <div className="flex items-center justify-between text-[11px] pt-1 font-mono">
                <span className="text-zinc-400">Tendered: ₹{(splitCashVal + splitDigitalVal).toFixed(2)}</span>
                {Math.abs(splitRemaining) <= 0.01 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fully Tendered
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Remaining: ₹{splitRemaining.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dynamic UPI Trigger */}
          {paymentMode === "GPay / UPI" && (
            <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between text-xs">
              <div>
                <span className="text-blue-400 font-bold block">Dynamic Settlement QR</span>
                <span className="text-[10px] text-zinc-400 font-mono">irani.koyla.bandra@hdfcbank</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpiQrModal(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/40 cursor-pointer hover:bg-blue-500/30"
              >
                Open QR Modal
              </button>
            </div>
          )}

          {/* Main Punch & Print Button */}
          <Button
            type="submit"
            disabled={cart.length === 0}
            className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/30 gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Punch Order & Print KOT (₹{grandTotal.toFixed(0)})</span>
          </Button>
        </form>
      </div>

      {/* KOT Print Modal */}
      {showKotModal && completedOrder && (
        <Dialog open={true} onOpenChange={setShowKotModal}>
          <DialogContent className="max-w-sm bg-[#1f1f1f] border border-[#303030] text-white p-5 rounded-3xl text-center">
            <div className="space-y-3.5">
              <div className="border-b border-[#303030] pb-2">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Irani Koyla Shawarma</span>
                <h3 className="text-base font-black text-white">Kitchen Order Ticket (KOT)</h3>
                <span className="font-mono text-xs font-bold text-orange-400 block mt-0.5">Order #{completedOrder.orderNumber}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-400 border-b border-[#303030] pb-2 text-left">
                <span>{completedOrder.customerName}</span>
                <span className="font-mono">{completedOrder.time}</span>
              </div>

              <div className="space-y-1 text-xs text-left">
                {completedOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-[#303030]/50">
                    <span><strong className="text-orange-400 font-mono">{it.quantity}x</strong> {it.name}</span>
                    <span className="font-mono text-white">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-[#161618] border border-[#303030] space-y-1 text-xs font-mono text-left">
                <div className="flex justify-between font-black text-orange-400">
                  <span>Grand Total:</span>
                  <span>₹{completedOrder.totalAmount.toFixed(2)}</span>
                </div>
                {completedOrder.paymentMethod === "Split Payment" && completedOrder.splitDetail ? (
                  <div className="text-zinc-400 text-[10px] space-y-0.5 pt-1 border-t border-[#303030]">
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Cash Paid:</span>
                      <span>₹{completedOrder.splitDetail.cashAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-400 font-bold">
                      <span>{completedOrder.splitDetail.digitalMethod}:</span>
                      <span>₹{completedOrder.splitDetail.digitalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-zinc-400 text-[10px]">
                    <span>Paid: {completedOrder.paymentMethod}</span>
                    <span>Change: ₹{completedOrder.changeDue?.toFixed(2) || "0.00"}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setShowKotModal(false)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-10 rounded-xl"
                >
                  Start Next Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Parked Bills Modal */}
      {showParkedModal && (
        <Dialog open={true} onOpenChange={setShowParkedModal}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-5 rounded-3xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#303030] pb-2">
                <h3 className="text-sm font-black text-white">Parked Bills ({parkedBills.length})</h3>
                <button onClick={() => setShowParkedModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {parkedBills.map((b) => (
                  <div key={b.id} className="p-3 rounded-2xl bg-[#161618] border border-[#303030] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{b.customerName}</span>
                      <span className="text-[10px] text-zinc-400">{b.cart.length} items &middot; {b.time}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRecallBill(b)}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl"
                    >
                      Recall
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dynamic UPI QR Modal */}
      {showUpiQrModal && (
        <Dialog open={true} onOpenChange={setShowUpiQrModal}>
          <DialogContent className="max-w-xs bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-3xl text-center">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Scan with Any UPI App</span>
                <h3 className="text-base font-black text-white">UPI QR Settlement</h3>
                <span className="font-mono text-sm font-black text-emerald-400 block mt-0.5">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center shadow-inner">
                <QrCode className="w-36 h-36 text-black" />
              </div>

              <span className="text-[10px] text-zinc-400 block font-mono">
                UPI ID: irani.koyla.bandra@hdfcbank
              </span>

              <Button
                size="sm"
                onClick={() => setShowUpiQrModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-xl"
              >
                Payment Received
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
