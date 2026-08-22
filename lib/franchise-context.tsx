"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Outlet,
  MeatBatch,
  ShiftRegister,
  RoyaltyStatement,
  ComplianceChecklist,
  MenuItemRecipe,
  AuditLog,
  LiveOrder,
  StaffMember,
  PettyCashExpense,
  SafeDrop,
  CentralShipment,
  INITIAL_OUTLETS,
  INITIAL_MEAT_BATCHES,
  INITIAL_SHIFTS,
  INITIAL_ROYALTIES,
  INITIAL_COMPLIANCE,
  INITIAL_MENU_ITEMS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ORDERS,
  INITIAL_STAFF,
  INITIAL_SHIPMENTS,
} from "./mock-data";

const INITIAL_PETTY_CASH: PettyCashExpense[] = [
  {
    id: "petty-01",
    timestamp: "12:15 PM",
    amount: 150,
    category: "Ice & Perishables",
    reason: "2 bags of crystal crushed ice for beverage cooler",
    paidBy: "Imran S. (Cashier)",
    outletId: "bandra-west",
  },
  {
    id: "petty-02",
    timestamp: "10:30 AM",
    amount: 120,
    category: "Fresh Herbs & Veg",
    reason: "Fresh mint and green chillies for garlic dip prep",
    paidBy: "Imran S. (Cashier)",
    outletId: "bandra-west",
  },
];

const INITIAL_SAFE_DROPS: SafeDrop[] = [
  {
    id: "drop-01",
    timestamp: "01:00 PM",
    amount: 5000,
    authorizedBy: "Farhan Q. (Outlet Mgr)",
    safeNumber: "Front Vault #01",
    outletId: "bandra-west",
    notes: "Mid-day rush excess cash skim",
  },
];

export type UserRole = "SUPER_ADMIN" | "FRANCHISE_OWNER";

interface FranchiseContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  selectedOutletId: string; // "all" or specific outlet id
  setSelectedOutletId: (id: string) => void;
  outlets: Outlet[];
  meatBatches: MeatBatch[];
  shifts: ShiftRegister[];
  royalties: RoyaltyStatement[];
  complianceList: ComplianceChecklist[];
  menuItems: MenuItemRecipe[];
  auditLogs: AuditLog[];
  liveOrders: LiveOrder[];
  staffMembers: StaffMember[];
  pettyCashList: PettyCashExpense[];
  safeDropsList: SafeDrop[];
  shipments: CentralShipment[];
  
  // Actions
  addMeatBatch: (batch: Omit<MeatBatch, "id" | "date" | "actualYieldPercent" | "status">) => void;
  closeShift: (shift: Omit<ShiftRegister, "id" | "status" | "reconciledAt">) => void;
  updateRoyaltyStatus: (id: string, status: RoyaltyStatement["status"], disputeReason?: string) => void;
  updateCompliance: (data: Omit<ComplianceChecklist, "id" | "date" | "overallScore" | "status">) => void;
  addOutlet: (outlet: Omit<Outlet, "id" | "code" | "currentDaySales" | "currentDayWraps" | "spitEfficiency">) => void;
  addLiveOrder: (order: Omit<LiveOrder, "id" | "time" | "orderNumber">) => void;
  addPettyCashExpense: (expense: Omit<PettyCashExpense, "id" | "timestamp">) => void;
  performSafeDrop: (drop: Omit<SafeDrop, "id" | "timestamp">) => void;
  dispatchShipment: (data: Omit<CentralShipment, "id">) => void;
  addMenuItem: (item: Omit<MenuItemRecipe, "id">) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItemRecipe>) => void;
  deleteMenuItem: (id: string) => void;
  
  // Helpers
  activeOutlet: Outlet | null;
  filteredMeatBatches: MeatBatch[];
  filteredShifts: ShiftRegister[];
  filteredRoyalties: RoyaltyStatement[];
  filteredCompliance: ComplianceChecklist[];
  filteredOrders: LiveOrder[];
  filteredPettyCash: PettyCashExpense[];
  filteredSafeDrops: SafeDrop[];
  outletTenderTotals: {
    openingCash: number;
    cashSales: number;
    gpaySales: number;
    cardSales: number;
    pettyCashExpenses: number;
    safeDropsTotal: number;
    expectedCashInDrawer: number;
    walkInSales: number;
    walkInOrdersCount: number;
    zomatoSales: number;
    zomatoOrdersCount: number;
    swiggySales: number;
    swiggyOrdersCount: number;
    totalOrdersToday: number;
    totalGrossRevenue: number;
  };
  networkTotals: {
    totalSalesToday: number;
    totalWrapsToday: number;
    avgSpitEfficiency: number;
    activeSpitsCount: number;
    totalOutletsCount: number;
    monthlyGrossSales: number;
    totalRoyaltyCollected: number;
    totalRoyaltyPending: number;
  };
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

const STORAGE_KEY = "irani_koyla_os_state_v1";

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("SUPER_ADMIN");
  const [selectedOutletId, setSelectedOutletId] = useState<string>("all");
  
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [meatBatches, setMeatBatches] = useState<MeatBatch[]>(INITIAL_MEAT_BATCHES);
  const [shifts, setShifts] = useState<ShiftRegister[]>(INITIAL_SHIFTS);
  const [royalties, setRoyalties] = useState<RoyaltyStatement[]>(INITIAL_ROYALTIES);
  const [complianceList, setComplianceList] = useState<ComplianceChecklist[]>(INITIAL_COMPLIANCE);
  const [menuItems, setMenuItems] = useState<MenuItemRecipe[]>(INITIAL_MENU_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>(INITIAL_ORDERS);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [pettyCashList, setPettyCashList] = useState<PettyCashExpense[]>(INITIAL_PETTY_CASH);
  const [safeDropsList, setSafeDropsList] = useState<SafeDrop[]>(INITIAL_SAFE_DROPS);
  const [shipments, setShipments] = useState<CentralShipment[]>(INITIAL_SHIPMENTS);

  // Load from local storage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) setRoleState(parsed.role);
        if (parsed.selectedOutletId) setSelectedOutletId(parsed.selectedOutletId);
        if (parsed.outlets) setOutlets(parsed.outlets);
        if (parsed.meatBatches) setMeatBatches(parsed.meatBatches);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.royalties) setRoyalties(parsed.royalties);
        if (parsed.complianceList) setComplianceList(parsed.complianceList);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.liveOrders) setLiveOrders(parsed.liveOrders);
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  // Sync to local storage
  const saveState = (updatedState: Partial<any>) => {
    try {
      const current = {
        role,
        selectedOutletId,
        outlets,
        meatBatches,
        shifts,
        royalties,
        complianceList,
        auditLogs,
        liveOrders,
        ...updatedState,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore
    }
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === "FRANCHISE_OWNER" && selectedOutletId === "all") {
      setSelectedOutletId("bandra-west");
    }
    saveState({ role: newRole });
  };

  const toggleRole = () => {
    const nextRole = role === "SUPER_ADMIN" ? "FRANCHISE_OWNER" : "SUPER_ADMIN";
    setRole(nextRole);
  };

  const handleSetSelectedOutletId = (id: string) => {
    setSelectedOutletId(id);
    saveState({ selectedOutletId: id });
  };

  // Add meat batch action
  const addMeatBatch = (batchData: Omit<MeatBatch, "id" | "date" | "actualYieldPercent" | "status">) => {
    const yieldPct = Number(
      ((batchData.cookedWeightKg / (batchData.skewerWeightKg || 1)) * 100).toFixed(1)
    );
    const newBatch: MeatBatch = {
      ...batchData,
      id: `batch-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      actualYieldPercent: Math.min(100, Math.max(70, yieldPct)),
      status: "roasting",
    };

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      outletName: batchData.outletName,
      user: batchData.loggedBy || "Staff Carver",
      role: "Kitchen Master",
      action: `Loaded New Spit Batch #${batchData.batchNumber}`,
      module: "Yield",
      severity: "info",
      details: `${batchData.skewerWeightKg} kg ${batchData.meatType} loaded on ${batchData.spitId}. Target Yield: ${batchData.targetYieldKg} kg.`,
    };

    const updatedBatches = [newBatch, ...meatBatches];
    const updatedLogs = [newLog, ...auditLogs];
    setMeatBatches(updatedBatches);
    setAuditLogs(updatedLogs);
    saveState({ meatBatches: updatedBatches, auditLogs: updatedLogs });
  };

  // Close shift action
  const closeShift = (shiftData: Omit<ShiftRegister, "id" | "status" | "reconciledAt">) => {
    const hasVariance = Math.abs(shiftData.cashDifference) > 100;
    const newShift: ShiftRegister = {
      ...shiftData,
      id: `shift-${Date.now()}`,
      status: hasVariance ? "variance_flagged" : "reconciled",
      reconciledAt: new Date().toISOString(),
    };

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      outletName: shiftData.outletName,
      user: shiftData.cashierName,
      role: "Cashier",
      action: `Reconciled ${shiftData.shiftType}`,
      module: "Sales",
      severity: hasVariance ? "warning" : "info",
      details: `Gross Sales: ₹${shiftData.totalGrossSales.toLocaleString()} (${shiftData.totalOrders} orders). Cash variance: ₹${shiftData.cashDifference}.`,
    };

    const updatedShifts = [newShift, ...shifts];
    const updatedLogs = [newLog, ...auditLogs];
    setShifts(updatedShifts);
    setAuditLogs(updatedLogs);
    saveState({ shifts: updatedShifts, auditLogs: updatedLogs });
  };

  // Update royalty invoice
  const updateRoyaltyStatus = (id: string, status: RoyaltyStatement["status"], disputeReason?: string) => {
    const updatedRoyalties = royalties.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          status,
          paidAt: status === "paid" ? new Date().toISOString() : r.paidAt,
          disputeReason: disputeReason || r.disputeReason,
          disputeStatus: status === "disputed" ? ("under_review" as const) : r.disputeStatus,
        };
      }
      return r;
    });

    const targetRoyalty = royalties.find((r) => r.id === id);
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      outletName: targetRoyalty?.outletName || "Network",
      user: role === "SUPER_ADMIN" ? "HQ Central" : targetRoyalty?.outletName || "Franchise Owner",
      role: role === "SUPER_ADMIN" ? "Super Admin" : "Franchise Owner",
      action: status === "paid" ? "Acknowledged & Paid Royalty" : status === "disputed" ? "Raised Royalty Dispute" : "Updated Royalty Status",
      module: "Royalty",
      severity: status === "disputed" ? "warning" : "info",
      details: `Invoice #${targetRoyalty?.invoiceNumber} status set to ${status.toUpperCase()}. ${disputeReason ? `Reason: ${disputeReason}` : ""}`,
    };

    const updatedLogs = [newLog, ...auditLogs];
    setRoyalties(updatedRoyalties);
    setAuditLogs(updatedLogs);
    saveState({ royalties: updatedRoyalties, auditLogs: updatedLogs });
  };

  // Update compliance check
  const updateCompliance = (data: Omit<ComplianceChecklist, "id" | "date" | "overallScore" | "status">) => {
    const checks = [
      data.deepFreezerTemp <= -18,
      data.chillerTemp >= 1 && data.chillerTemp <= 4.5,
      data.spitCoreTemp >= 75,
      data.oilPolarCompoundPercent <= 24,
      data.fssaiDisplayVerified,
      data.staffHairnetsGloves,
      data.pestControlVerified,
      data.waterQualityTested,
    ];
    const passedCount = checks.filter(Boolean).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const status: ComplianceChecklist["status"] = score >= 90 ? "pass" : score >= 75 ? "requires_action" : "critical_fail";

    const newRecord: ComplianceChecklist = {
      ...data,
      id: `comp-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      overallScore: score,
      status,
    };

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      outletName: data.outletName,
      user: data.inspectedBy,
      role: "QA Inspector",
      action: `Recorded Food Safety Audit (${score}%)`,
      module: "Compliance",
      severity: status === "pass" ? "info" : status === "requires_action" ? "warning" : "critical",
      details: `Freezer: ${data.deepFreezerTemp}°C, Spit Core: ${data.spitCoreTemp}°C, Oil TPM: ${data.oilPolarCompoundPercent}%. Status: ${status.toUpperCase()}.`,
    };

    const updatedList = [newRecord, ...complianceList];
    const updatedLogs = [newLog, ...auditLogs];
    setComplianceList(updatedList);
    setAuditLogs(updatedLogs);
    saveState({ complianceList: updatedList, auditLogs: updatedLogs });
  };

  // Add new franchise outlet
  const addOutlet = (data: Omit<Outlet, "id" | "code" | "currentDaySales" | "currentDayWraps" | "spitEfficiency">) => {
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const count = outlets.length + 1;
    const cityCode = data.city.toLowerCase().includes("pune")
      ? "PUN"
      : data.city.toLowerCase().includes("thane")
      ? "THA"
      : data.city.toLowerCase().includes("bangalore")
      ? "BLR"
      : "MUM";
    const code = `IK-${cityCode}-0${count}`;
    const magicLoginToken = `tok_${id}_${Math.floor(100000 + Math.random() * 900000)}`;

    const newOutlet: Outlet = {
      ...data,
      id,
      code,
      currentDaySales: 0,
      currentDayWraps: 0,
      spitEfficiency: 92.0,
      magicLoginToken,
      loginEmail: data.loginEmail || `partner.${id}@iranikoyla.com`,
      loginPassword: data.loginPassword || "password123",
      franchiseFeeAmount: data.franchiseFeeAmount || 1500000,
      franchiseFeeStatus: data.franchiseFeeStatus || "paid",
      securityDepositAmount: data.securityDepositAmount || 500000,
      royaltyRatePercent: data.royaltyRatePercent || 6.5,
      marketingFeePercent: data.marketingFeePercent || 2.0,
      territoryRadiusKm: data.territoryRadiusKm || 3.0,
      agreementTermYears: data.agreementTermYears || 5,
    };

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: data.name,
      user: "HQ Central",
      role: "Super Admin",
      action: `Onboarded New Franchise Outlet [${code}]`,
      module: "Sales",
      severity: "info",
      details: `${data.name} (${code}) in ${data.area}, ${data.city}. Owner: ${data.ownerName} (${data.ownerPhone}). Login: ${newOutlet.loginEmail}.`,
    };

    const updatedOutlets = [...outlets, newOutlet];
    const updatedLogs = [newLog, ...auditLogs];
    setOutlets(updatedOutlets);
    setAuditLogs(updatedLogs);
    saveState({ outlets: updatedOutlets, auditLogs: updatedLogs });

    // Store in global custom accounts register for instant authentication
    try {
      const existing = JSON.parse(localStorage.getItem("koyla_registered_franchise_accounts") || "[]");
      localStorage.setItem("koyla_registered_franchise_accounts", JSON.stringify([...existing, {
        id,
        code,
        name: data.name,
        email: newOutlet.loginEmail,
        password: newOutlet.loginPassword,
        magicToken: magicLoginToken,
      }]));
    } catch {}
  };

  const addLiveOrder = (orderData: Omit<LiveOrder, "id" | "time" | "orderNumber">) => {
    const orderId = `ord-${Date.now()}`;
    const orderNum = `IK-${Math.floor(1000 + Math.random() * 9000)}`;
    const timeNow = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    const newOrder: LiveOrder = {
      ...orderData,
      id: orderId,
      orderNumber: orderNum,
      time: timeNow,
    };

    const updatedOrders = [newOrder, ...liveOrders];
    setLiveOrders(updatedOrders);

    // Update target outlet currentDaySales and wrap counts
    const wrapsInOrder = newOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const updatedOutlets = outlets.map((o) => {
      if (o.id === (newOrder.outletId || "bandra-west")) {
        return {
          ...o,
          currentDaySales: o.currentDaySales + newOrder.totalAmount,
          currentDayWraps: o.currentDayWraps + wrapsInOrder,
        };
      }
      return o;
    });
    setOutlets(updatedOutlets);

    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: activeOutlet?.name || "Bandra West (Flagship)",
      user: "Counter POS",
      role: "Cashier",
      action: `New Order ${orderNum} Recorded`,
      module: "Sales",
      severity: "info",
      details: newOrder.paymentMethod === "Split Payment" && newOrder.splitDetail
        ? `Received ₹${newOrder.totalAmount} (Split: ₹${newOrder.splitDetail.cashAmount} Cash + ₹${newOrder.splitDetail.digitalAmount} ${newOrder.splitDetail.digitalMethod}).`
        : `Received ₹${newOrder.totalAmount} via ${newOrder.paymentMethod} (${newOrder.channel}).`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);

    saveState({ liveOrders: updatedOrders, outlets: updatedOutlets, auditLogs: updatedLogs });
  };

  // Add Petty Cash expense
  const addPettyCashExpense = (expenseData: Omit<PettyCashExpense, "id" | "timestamp">) => {
    const newExpense: PettyCashExpense = {
      ...expenseData,
      id: `petty-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };

    const updatedPetty = [newExpense, ...pettyCashList];
    setPettyCashList(updatedPetty);

    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: activeOutlet?.name || "Bandra West (Flagship)",
      user: expenseData.paidBy || "Cashier",
      role: "Cashier",
      action: `Petty Cash Outflow: ₹${expenseData.amount}`,
      module: "Sales",
      severity: "info",
      details: `[${expenseData.category}] ${expenseData.reason} paid from register float.`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState({ pettyCashList: updatedPetty, auditLogs: updatedLogs });
  };

  // Perform Safe Drop
  const performSafeDrop = (dropData: Omit<SafeDrop, "id" | "timestamp">) => {
    const newDrop: SafeDrop = {
      ...dropData,
      id: `drop-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };

    const updatedDrops = [newDrop, ...safeDropsList];
    setSafeDropsList(updatedDrops);

    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: activeOutlet?.name || "Bandra West (Flagship)",
      user: dropData.authorizedBy || "Outlet Manager",
      role: "Outlet Manager",
      action: `Safe Drop Skim: ₹${dropData.amount}`,
      module: "Sales",
      severity: "info",
      details: `Transferred ₹${dropData.amount} from Counter Drawer to ${dropData.safeNumber}. ${dropData.notes || ""}`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState({ safeDropsList: updatedDrops, auditLogs: updatedLogs });
  };

  // Dispatch Central Meat Supply Chain Shipment
  const dispatchShipment = (data: Omit<CentralShipment, "id">) => {
    const newShipment: CentralShipment = {
      ...data,
      id: `shp-${Date.now()}`,
    };

    const updatedShipments = [newShipment, ...shipments];
    setShipments(updatedShipments);

    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: data.outletName,
      user: "Commissary Master",
      role: "Super Admin",
      action: `Dispatched Cold-Chain Supply #${data.shipmentNumber}`,
      module: "SupplyChain",
      severity: "info",
      details: `Dispatched ${data.chickenConesCount}x Chicken Cones + ${data.muttonConesCount}x Mutton Cones (${data.totalMeatWeightKg} kg) via ${data.vanVehicleNumber}. Seal: ${data.securitySealNumber}.`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState({ shipments: updatedShipments, auditLogs: updatedLogs });
  };

  // Add Menu Item (Super Admin Master Menu Control)
  const addMenuItem = (itemData: Omit<MenuItemRecipe, "id">) => {
    const newItem: MenuItemRecipe = {
      ...itemData,
      id: `menu-${Date.now()}`,
    };
    const updatedMenu = [newItem, ...menuItems];
    setMenuItems(updatedMenu);

    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: "HQ Master Kitchen",
      user: "Brand Executive Chef",
      role: "Super Admin",
      action: `Created Master Menu Recipe: ${newItem.name}`,
      module: "Pricing",
      severity: "info",
      details: `Priced at ₹${newItem.sellingPrice} (${newItem.grossMarginPercent}% gross margin). Pushed to all Franchise POS registers.`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState({ menuItems: updatedMenu, auditLogs: updatedLogs });
  };

  // Update Menu Item (Super Admin Recipe / Price Control)
  const updateMenuItem = (id: string, updates: Partial<MenuItemRecipe>) => {
    const updatedMenu = menuItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setMenuItems(updatedMenu);

    const updatedItem = updatedMenu.find((m) => m.id === id);
    const logEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      outletName: "HQ Master Kitchen",
      user: "Brand HQ",
      role: "Super Admin",
      action: `Updated Menu Item: ${updatedItem?.name || id}`,
      module: "Pricing",
      severity: "info",
      details: `Updated Master specifications. Live synced to all active Franchise POS registers.`,
    };
    const updatedLogs = [logEntry, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState({ menuItems: updatedMenu, auditLogs: updatedLogs });
  };

  // Delete / Archive Menu Item
  const deleteMenuItem = (id: string) => {
    const updatedMenu = menuItems.filter((item) => item.id !== id);
    setMenuItems(updatedMenu);
    saveState({ menuItems: updatedMenu });
  };

  // Filtered views based on selectedOutletId
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || null;

  const filteredMeatBatches =
    selectedOutletId === "all"
      ? meatBatches
      : meatBatches.filter((b) => b.outletId === selectedOutletId);

  const filteredShifts =
    selectedOutletId === "all"
      ? shifts
      : shifts.filter((s) => s.outletId === selectedOutletId);

  const filteredRoyalties =
    selectedOutletId === "all"
      ? royalties
      : royalties.filter((r) => r.outletId === selectedOutletId);

  const filteredCompliance =
    selectedOutletId === "all"
      ? complianceList
      : complianceList.filter((c) => c.outletId === selectedOutletId);

  const filteredOrders =
    selectedOutletId === "all"
      ? liveOrders
      : liveOrders.filter((o) => o.outletId === selectedOutletId);

  const filteredPettyCash =
    selectedOutletId === "all"
      ? pettyCashList
      : pettyCashList.filter((p) => p.outletId === selectedOutletId);

  const filteredSafeDrops =
    selectedOutletId === "all"
      ? safeDropsList
      : safeDropsList.filter((d) => d.outletId === selectedOutletId);

  // Outlet Tender & Cash Drawer Totals
  const targetShift = filteredShifts[0];
  const openingCash = targetShift?.openingCash || 5000;
  const baseShiftPettyCash = targetShift?.pettyCashExpenses || 800;

  // Order tender sums including Split Payment breakdown
  let orderCashSum = 0;
  let orderGpaySum = 0;
  let orderCardSum = 0;

  filteredOrders.forEach((o) => {
    if (o.paymentMethod === "Cash") {
      orderCashSum += o.totalAmount;
    } else if (o.paymentMethod === "GPay / UPI") {
      orderGpaySum += o.totalAmount;
    } else if (o.paymentMethod === "Card / POS") {
      orderCardSum += o.totalAmount;
    } else if (o.paymentMethod === "Split Payment" && o.splitDetail) {
      orderCashSum += o.splitDetail.cashAmount;
      if (o.splitDetail.digitalMethod === "GPay / UPI") {
        orderGpaySum += o.splitDetail.digitalAmount;
      } else {
        orderCardSum += o.splitDetail.digitalAmount;
      }
    }
  });

  const livePettyCashSum = filteredPettyCash.reduce((sum, p) => sum + p.amount, 0);
  const liveSafeDropsSum = filteredSafeDrops.reduce((sum, d) => sum + d.amount, 0);

  const baseShiftCash = targetShift?.cashSalesExpected || 14250;
  const baseShiftGpay = targetShift?.upiSales || 22800;
  const baseShiftCard = targetShift?.posCardSales || 7700;

  const cashSales = baseShiftCash + orderCashSum;
  const gpaySales = baseShiftGpay + orderGpaySum;
  const cardSales = baseShiftCard + orderCardSum;

  const totalPettyCash = baseShiftPettyCash + livePettyCashSum;
  const expectedCashInDrawer = openingCash + cashSales - totalPettyCash - liveSafeDropsSum;

  // Channel Splits
  const walkInOrders = filteredOrders.filter((o) => o.channel === "Walk-in Counter");
  const zomatoOrders = filteredOrders.filter((o) => o.channel === "Zomato");
  const swiggyOrders = filteredOrders.filter((o) => o.channel === "Swiggy");

  const walkInSales = 30400 + walkInOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const zomatoSales = 11350 + zomatoOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const swiggySales = 7000 + swiggyOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const totalGrossRevenue = walkInSales + zomatoSales + swiggySales;
  const totalOrdersToday = (targetShift?.totalOrders || 240) + filteredOrders.length;

  const outletTenderTotals = {
    openingCash,
    cashSales,
    gpaySales,
    cardSales,
    pettyCashExpenses: totalPettyCash,
    safeDropsTotal: liveSafeDropsSum,
    expectedCashInDrawer,
    walkInSales,
    walkInOrdersCount: 152 + walkInOrders.length,
    zomatoSales,
    zomatoOrdersCount: 58 + zomatoOrders.length,
    swiggySales,
    swiggyOrdersCount: 30 + swiggyOrders.length,
    totalOrdersToday,
    totalGrossRevenue,
  };

  // Network Totals
  const targetOutlets = selectedOutletId === "all" ? outlets : outlets.filter((o) => o.id === selectedOutletId);
  const totalSalesToday = targetOutlets.reduce((acc, o) => acc + o.currentDaySales, 0);
  const totalWrapsToday = targetOutlets.reduce((acc, o) => acc + o.currentDayWraps, 0);
  const avgSpitEfficiency =
    targetOutlets.length > 0
      ? Number((targetOutlets.reduce((acc, o) => acc + o.spitEfficiency, 0) / targetOutlets.length).toFixed(1))
      : 92.5;
  const activeSpitsCount = targetOutlets.reduce((acc, o) => acc + o.activeSpits, 0);
  const totalOutletsCount = targetOutlets.length;

  const monthlyGrossSales = filteredRoyalties.reduce((acc, r) => acc + r.grossSales, 0);
  const totalRoyaltyCollected = filteredRoyalties
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + r.totalPayable, 0);
  const totalRoyaltyPending = filteredRoyalties
    .filter((r) => r.status === "pending" || r.status === "disputed" || r.status === "overdue")
    .reduce((acc, r) => acc + r.totalPayable, 0);

  return (
    <FranchiseContext.Provider
      value={{
        role,
        setRole,
        toggleRole,
        selectedOutletId,
        setSelectedOutletId: handleSetSelectedOutletId,
        outlets,
        meatBatches,
        shifts,
        royalties,
        complianceList,
        menuItems,
        auditLogs,
        liveOrders,
        staffMembers,
        pettyCashList,
        safeDropsList,
        shipments,
        addMeatBatch,
        closeShift,
        updateRoyaltyStatus,
        updateCompliance,
        addOutlet,
        addLiveOrder,
        addPettyCashExpense,
        performSafeDrop,
        dispatchShipment,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        activeOutlet,
        filteredMeatBatches,
        filteredShifts,
        filteredRoyalties,
        filteredCompliance,
        filteredOrders,
        filteredPettyCash,
        filteredSafeDrops,
        outletTenderTotals,
        networkTotals: {
          totalSalesToday,
          totalWrapsToday,
          avgSpitEfficiency,
          activeSpitsCount,
          totalOutletsCount,
          monthlyGrossSales,
          totalRoyaltyCollected,
          totalRoyaltyPending,
        },
      }}
    >
      {children}
    </FranchiseContext.Provider>
  );
}

export function useFranchise() {
  const context = useContext(FranchiseContext);
  if (!context) {
    throw new Error("useFranchise must be used within a FranchiseProvider");
  }
  return context;
}
