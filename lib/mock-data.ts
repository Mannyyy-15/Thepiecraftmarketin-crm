export interface Outlet {
  id: string;
  name: string;
  code: string;
  city: string;
  area: string;
  address: string;
  status: "active" | "onboarding" | "suspended";
  dailyTargetSales: number;
  dailyTargetWraps: number;
  currentDaySales: number;
  currentDayWraps: number;
  spitEfficiency: number; // percentage, e.g. 94.2
  activeSpits: number;
  totalSpits: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  managerName: string;
  managerPhone: string;
  fssaiNumber: string;
  fssaiExpiry: string;
  lastAuditScore: number; // percentage, e.g. 96
  gstin: string;
  openedAt: string;
  loginEmail?: string;
  loginPassword?: string;
  magicLoginToken?: string;
  franchiseFeeAmount?: number;
  franchiseFeeStatus?: "paid" | "partial" | "pending";
  securityDepositAmount?: number;
  royaltyRatePercent?: number;
  marketingFeePercent?: number;
  territoryRadiusKm?: number;
  agreementTermYears?: number;
  whatsappNumber?: string;
  panOrAadhaar?: string;
}

export interface MeatBatch {
  id: string;
  batchNumber: string;
  outletId: string;
  outletName: string;
  meatType: "Koyla Marinated Chicken" | "Smoked Charcoal Mutton" | "Special Spiced Chicken";
  spitId: string;
  date: string;
  timeLoaded: string;
  rawMeatReceivedKg: number;
  marinationLossKg: number;
  skewerWeightKg: number; // Net meat loaded on spit
  cookedWeightKg: number; // Meat carved
  wrapsProduced: number;
  jumboWrapsProduced: number;
  plattersProduced: number;
  wasteScrapsKg: number;
  targetYieldKg: number;
  actualYieldPercent: number; // e.g. 93.4%
  coreTempCelsius: number; // target >= 75°C
  status: "roasting" | "carving" | "completed" | "flagged";
  loggedBy: string;
  notes?: string;
}

export interface ShiftRegister {
  id: string;
  outletId: string;
  outletName: string;
  date: string;
  shiftType: "Morning Shift (11:00 AM - 05:00 PM)" | "Evening Shift (05:00 PM - 01:00 AM)";
  cashierName: string;
  openingCash: number;
  cashSalesExpected: number;
  cashInDrawerActual: number;
  cashDifference: number; // Actual - Expected
  upiSales: number; // PhonePe, GPay, Paytm
  swiggySales: number;
  zomatoSales: number;
  posCardSales: number;
  pettyCashExpenses: number;
  totalOrders: number;
  totalGrossSales: number;
  discountsGiven: number;
  netRevenue: number;
  status: "open" | "reconciled" | "variance_flagged";
  varianceReason?: string;
  reconciledAt?: string;
}

export interface RoyaltyStatement {
  id: string;
  invoiceNumber: string;
  outletId: string;
  outletName: string;
  month: string; // e.g. "August 2026"
  grossSales: number;
  royaltyRatePercent: number; // 6.5%
  royaltyAmount: number;
  marketingFeePercent: number; // 2.0%
  marketingFeeAmount: number;
  centralKitchenSupplyCost: number;
  deductionsAndAdjustments: number;
  gstAmount: number; // 18% on royalty
  totalPayable: number;
  dueDate: string;
  status: "paid" | "pending" | "disputed" | "overdue";
  paidAt?: string;
  disputeReason?: string;
  disputeStatus?: "open" | "resolved" | "under_review";
}

export interface SplitPaymentDetail {
  cashAmount: number;
  digitalAmount: number;
  digitalMethod: "GPay / UPI" | "Card / POS";
}

export interface LiveOrder {
  id: string;
  orderNumber: string;
  time: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  channel: "Walk-in Counter" | "Zomato" | "Swiggy";
  paymentMethod: "Cash" | "GPay / UPI" | "Card / POS" | "Split Payment";
  splitDetail?: SplitPaymentDetail;
  status: "Completed";
  customerName?: string;
  outletId: string;
}

export interface PettyCashExpense {
  id: string;
  timestamp: string;
  amount: number;
  category: "Ice & Perishables" | "Fresh Herbs & Veg" | "Cleaning Supplies" | "Staff Refreshment" | "Emergency Packaging" | "Other";
  reason: string;
  paidBy: string;
  outletId: string;
}

export interface SafeDrop {
  id: string;
  timestamp: string;
  amount: number;
  authorizedBy: string;
  safeNumber: string;
  outletId: string;
  notes?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "Present" | "On Leave" | "Late";
  checkInTime?: string;
  phone: string;
  avatar: string;
}

export interface ComplianceChecklist {
  id: string;
  outletId: string;
  outletName: string;
  date: string;
  inspectedBy: string;
  deepFreezerTemp: number; // target <= -18°C
  chillerTemp: number; // target 2°C - 4°C
  spitCoreTemp: number; // target >= 75°C
  oilPolarCompoundPercent: number; // target < 24% TPM
  fssaiDisplayVerified: boolean;
  staffHairnetsGloves: boolean;
  pestControlVerified: boolean;
  waterQualityTested: boolean;
  overallScore: number; // percentage
  status: "pass" | "requires_action" | "critical_fail";
  remarks: string;
}

export interface MenuItemRecipe {
  id: string;
  name: string;
  category: "Shawarma Wraps" | "Combos & Meals" | "Platters & Dips" | "Irani Chai & Drinks" | "Sides & Toum";
  meatPortionGrams: number;
  sauceGrams: number;
  breadType: "Khubz (Lebanese)" | "Rumali Roti" | "Samoli Bread" | "N/A";
  sellingPrice: number;
  cogsCost: number;
  grossMarginPercent: number;
  spitType: "Chicken" | "Mutton" | "Both" | "Beverage" | "Dip" | "Side";
  popularRank: number;
  active: boolean;
  image: string;
  meatWeight?: string;
  tag?: string;
  modifiers: string[];
}

export interface CentralShipment {
  id: string;
  shipmentNumber: string;
  outletId: string;
  outletName: string;
  dispatchedAt: string;
  deliveredAt?: string;
  status: "in_transit" | "delivered" | "preparing";
  chickenConesCount: number; // 30kg cones
  muttonConesCount: number; // 18kg cones
  totalMeatWeightKg: number;
  spiceMixBagsCount: number;
  toumJarsCount: number;
  vanVehicleNumber: string;
  driverName: string;
  driverPhone: string;
  temperatureCelsius: number; // target 2°C - 4°C
  securitySealNumber: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  outletName: string;
  user: string;
  role: string;
  action: string;
  module: "Yield" | "Sales" | "Royalty" | "Compliance" | "Pricing" | "SupplyChain";
  severity: "info" | "warning" | "critical";
  details: string;
}

// ── INITIAL DATASETS ────────────────────────────────────────────────────────

export const INITIAL_OUTLETS: Outlet[] = [
  {
    id: "bandra-west",
    name: "Bandra West (Flagship)",
    code: "IK-MUM-01",
    city: "Mumbai",
    area: "Linking Road, Bandra West",
    address: "Shop 4, Silver Beach Arcade, Linking Road, Bandra (W), Mumbai 400050",
    status: "active",
    dailyTargetSales: 75000,
    dailyTargetWraps: 450,
    currentDaySales: 68500,
    currentDayWraps: 428,
    spitEfficiency: 94.2,
    activeSpits: 2,
    totalSpits: 2,
    ownerName: "Tariq Mansoori",
    ownerEmail: "tariq.bandra@iranikoyla.com",
    ownerPhone: "+91 98201 44521",
    managerName: "Farhan Qureshi",
    managerPhone: "+91 97690 12845",
    fssaiNumber: "11524008000492",
    fssaiExpiry: "2027-11-30",
    lastAuditScore: 97,
    gstin: "27AABCI4920F1ZV",
    openedAt: "2024-03-15",
    loginEmail: "partner.bandra@iranikoyla.com",
    loginPassword: "password123",
    magicLoginToken: "tok_bandra_990182",
    franchiseFeeAmount: 1500000,
    franchiseFeeStatus: "paid",
    securityDepositAmount: 500000,
    royaltyRatePercent: 6.5,
    marketingFeePercent: 2.0,
    territoryRadiusKm: 3.0,
    agreementTermYears: 5,
    whatsappNumber: "+919820144521",
    panOrAadhaar: "AAAPM1209K / 9081 2291 0019",
  },
  {
    id: "lokhandwala",
    name: "Lokhandwala Andheri",
    code: "IK-LOK-02",
    city: "Mumbai",
    area: "Lokhandwala Complex, Andheri West",
    address: "Shop 12, Greenfield Plaza, Lokhandwala, Andheri (W), Mumbai 400053",
    status: "active",
    dailyTargetSales: 60000,
    dailyTargetWraps: 380,
    currentDaySales: 54200,
    currentDayWraps: 340,
    spitEfficiency: 93.8,
    activeSpits: 2,
    totalSpits: 2,
    ownerName: "Ayaan Merchant",
    ownerEmail: "ayaan.lokhandwala@iranikoyla.com",
    ownerPhone: "+91 98204 99120",
    managerName: "Rehan Khan",
    managerPhone: "+91 98190 33412",
    fssaiNumber: "11524008000581",
    fssaiExpiry: "2027-08-15",
    lastAuditScore: 94,
    gstin: "27AABCI5812G1ZU",
    openedAt: "2024-09-01",
    loginEmail: "partner.lokhandwala@iranikoyla.com",
    loginPassword: "password123",
    magicLoginToken: "tok_lokhandwala_771829",
    franchiseFeeAmount: 1500000,
    franchiseFeeStatus: "paid",
    securityDepositAmount: 500000,
    royaltyRatePercent: 6.5,
    marketingFeePercent: 2.0,
    territoryRadiusKm: 3.0,
    agreementTermYears: 5,
    whatsappNumber: "+919820499120",
    panOrAadhaar: "AAAPM8821L / 8812 4419 2201",
  },
  {
    id: "powai",
    name: "Powai Central",
    code: "IK-POW-03",
    city: "Mumbai",
    area: "Hiranandani Gardens, Powai",
    address: "Galleria Shopping Mall, Phase 1, Hiranandani, Powai, Mumbai 400076",
    status: "active",
    dailyTargetSales: 50000,
    dailyTargetWraps: 320,
    currentDaySales: 47900,
    currentDayWraps: 295,
    spitEfficiency: 94.6,
    activeSpits: 1,
    totalSpits: 2,
    ownerName: "Sameer Shaikh",
    ownerEmail: "sameer.powai@iranikoyla.com",
    ownerPhone: "+91 98331 77482",
    managerName: "Kashif Sayyed",
    managerPhone: "+91 98211 44519",
    fssaiNumber: "11524008000624",
    fssaiExpiry: "2028-01-20",
    lastAuditScore: 95,
    gstin: "27AABCI6241H1ZT",
    openedAt: "2025-01-10",
    loginEmail: "partner.powai@iranikoyla.com",
    loginPassword: "password123",
    magicLoginToken: "tok_powai_661902",
    franchiseFeeAmount: 1500000,
    franchiseFeeStatus: "paid",
    securityDepositAmount: 500000,
    royaltyRatePercent: 6.5,
    marketingFeePercent: 2.0,
    territoryRadiusKm: 3.0,
    agreementTermYears: 5,
    whatsappNumber: "+919833177482",
    panOrAadhaar: "AAAPM6629Q / 7712 9901 3341",
  },
  {
    id: "thane",
    name: "Thane Grand",
    code: "IK-THA-04",
    city: "Thane",
    area: "Ghodbunder Road, Thane West",
    address: "Shop G-08, Viviana Boulevard, Ghodbunder Rd, Thane 400607",
    status: "active",
    dailyTargetSales: 45000,
    dailyTargetWraps: 280,
    currentDaySales: 38400,
    currentDayWraps: 240,
    spitEfficiency: 89.5,
    activeSpits: 1,
    totalSpits: 2,
    ownerName: "Bilal Sayyed",
    ownerEmail: "bilal.thane@iranikoyla.com",
    ownerPhone: "+91 99201 88410",
    managerName: "Wasim Ansari",
    managerPhone: "+91 98920 11456",
    fssaiNumber: "11524008000719",
    fssaiExpiry: "2027-05-18",
    lastAuditScore: 88,
    gstin: "27AABCI7190J1ZS",
    openedAt: "2025-05-20",
    loginEmail: "partner.thane@iranikoyla.com",
    loginPassword: "password123",
    magicLoginToken: "tok_thane_551029",
    franchiseFeeAmount: 1500000,
    franchiseFeeStatus: "paid",
    securityDepositAmount: 500000,
    royaltyRatePercent: 6.5,
    marketingFeePercent: 2.0,
    territoryRadiusKm: 3.0,
    agreementTermYears: 5,
    whatsappNumber: "+919920188410",
    panOrAadhaar: "AAAPM7710R / 6610 8821 5590",
  },
  {
    id: "pune-kp",
    name: "Pune Koregaon Park",
    code: "IK-PUN-05",
    city: "Pune",
    area: "North Main Road, Koregaon Park",
    address: "Lane 6, Vascon Almonte, Koregaon Park, Pune 411001",
    status: "onboarding",
    dailyTargetSales: 65000,
    dailyTargetWraps: 400,
    currentDaySales: 0,
    currentDayWraps: 0,
    spitEfficiency: 92.0,
    activeSpits: 0,
    totalSpits: 2,
    ownerName: "Dr. Rohan Kulkarni",
    ownerEmail: "rohan.pune@iranikoyla.com",
    ownerPhone: "+91 98220 55198",
    managerName: "Onboarding Lead Tariq",
    managerPhone: "+91 98201 44521",
    fssaiNumber: "Applied [ACK-2026-9081]",
    fssaiExpiry: "Pending Inspection",
    lastAuditScore: 0,
    gstin: "27AABCI8820K1ZR",
    openedAt: "Target: Oct 2026",
    loginEmail: "partner.pune@iranikoyla.com",
    loginPassword: "password123",
    magicLoginToken: "tok_pune_992018",
    franchiseFeeAmount: 1500000,
    franchiseFeeStatus: "paid",
    securityDepositAmount: 500000,
    royaltyRatePercent: 6.5,
    marketingFeePercent: 2.0,
    territoryRadiusKm: 3.0,
    agreementTermYears: 5,
    whatsappNumber: "+919822055198",
    panOrAadhaar: "AAAPM9912T / 5521 9901 4410",
  },
];

export const INITIAL_MEAT_BATCHES: MeatBatch[] = [
  {
    id: "batch-101",
    batchNumber: "IK-BND-260821-A",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    meatType: "Koyla Marinated Chicken",
    spitId: "Spit-01 (Main Front)",
    date: "2026-08-21",
    timeLoaded: "11:30 AM",
    rawMeatReceivedKg: 35.0,
    marinationLossKg: 1.2,
    skewerWeightKg: 33.8,
    cookedWeightKg: 28.6,
    wrapsProduced: 245,
    jumboWrapsProduced: 65,
    plattersProduced: 22,
    wasteScrapsKg: 0.9,
    targetYieldKg: 30.5,
    actualYieldPercent: 94.2,
    coreTempCelsius: 78.5,
    status: "roasting",
    loggedBy: "Master Carver Farhan",
    notes: "Perfect charcoal smokiness and seasoning balance.",
  },
  {
    id: "batch-102",
    batchNumber: "IK-BND-260821-B",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    meatType: "Smoked Charcoal Mutton",
    spitId: "Spit-02 (Specialty)",
    date: "2026-08-21",
    timeLoaded: "01:00 PM",
    rawMeatReceivedKg: 22.0,
    marinationLossKg: 0.8,
    skewerWeightKg: 21.2,
    cookedWeightKg: 17.6,
    wrapsProduced: 120,
    jumboWrapsProduced: 42,
    plattersProduced: 15,
    wasteScrapsKg: 0.6,
    targetYieldKg: 18.5,
    actualYieldPercent: 93.8,
    coreTempCelsius: 79.2,
    status: "roasting",
    loggedBy: "Master Carver Farhan",
    notes: "Prime mutton cuts supplied from Central Commissary.",
  },
  {
    id: "batch-103",
    batchNumber: "IK-LOK-260821-A",
    outletId: "lokhandwala",
    outletName: "Lokhandwala",
    meatType: "Koyla Marinated Chicken",
    spitId: "Spit-01 (Main)",
    date: "2026-08-21",
    timeLoaded: "11:45 AM",
    rawMeatReceivedKg: 28.0,
    marinationLossKg: 1.1,
    skewerWeightKg: 26.9,
    cookedWeightKg: 22.1,
    wrapsProduced: 195,
    jumboWrapsProduced: 48,
    plattersProduced: 18,
    wasteScrapsKg: 1.4,
    targetYieldKg: 24.2,
    actualYieldPercent: 91.8,
    coreTempCelsius: 77.0,
    status: "carving",
    loggedBy: "Zaid Shaikh",
    notes: "Slight trimming loss on lower cone section.",
  },
  {
    id: "batch-104",
    batchNumber: "IK-POW-260821-A",
    outletId: "powai",
    outletName: "Powai",
    meatType: "Koyla Marinated Chicken",
    spitId: "Spit-01 (Express)",
    date: "2026-08-21",
    timeLoaded: "12:15 PM",
    rawMeatReceivedKg: 25.0,
    marinationLossKg: 0.9,
    skewerWeightKg: 24.1,
    cookedWeightKg: 20.4,
    wrapsProduced: 180,
    jumboWrapsProduced: 38,
    plattersProduced: 14,
    wasteScrapsKg: 0.8,
    targetYieldKg: 21.8,
    actualYieldPercent: 93.0,
    coreTempCelsius: 78.0,
    status: "roasting",
    loggedBy: "Arbaaz Khan",
    notes: "High demand from corporate lunch orders.",
  },
  {
    id: "batch-105",
    batchNumber: "IK-THA-260821-A",
    outletId: "thane",
    outletName: "Thane Grand",
    meatType: "Koyla Marinated Chicken",
    spitId: "Spit-01 (Standard)",
    date: "2026-08-21",
    timeLoaded: "12:30 PM",
    rawMeatReceivedKg: 22.0,
    marinationLossKg: 1.3,
    skewerWeightKg: 20.7,
    cookedWeightKg: 16.8,
    wrapsProduced: 152,
    jumboWrapsProduced: 30,
    plattersProduced: 10,
    wasteScrapsKg: 1.5,
    targetYieldKg: 18.8,
    actualYieldPercent: 89.5,
    coreTempCelsius: 76.2,
    status: "carving",
    loggedBy: "Bilal Sayyed",
    notes: "Carver recalibration requested for evening shift.",
  },
];

export const INITIAL_SHIFTS: ShiftRegister[] = [
  {
    id: "shift-201",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    date: "2026-08-21",
    shiftType: "Morning Shift (11:00 AM - 05:00 PM)",
    cashierName: "Aman Siddiqui",
    openingCash: 5000,
    cashSalesExpected: 18500,
    cashInDrawerActual: 18500,
    cashDifference: 0,
    upiSales: 28400,
    swiggySales: 11200,
    zomatoSales: 7900,
    posCardSales: 2500,
    pettyCashExpenses: 850,
    totalOrders: 168,
    totalGrossSales: 68500,
    discountsGiven: 1450,
    netRevenue: 67050,
    status: "reconciled",
    reconciledAt: "2026-08-21T17:15:00Z",
  },
  {
    id: "shift-202",
    outletId: "lokhandwala",
    outletName: "Lokhandwala",
    date: "2026-08-21",
    shiftType: "Morning Shift (11:00 AM - 05:00 PM)",
    cashierName: "Rehan Khan",
    openingCash: 4000,
    cashSalesExpected: 14200,
    cashInDrawerActual: 14120,
    cashDifference: -80,
    upiSales: 22600,
    swiggySales: 9400,
    zomatoSales: 6200,
    posCardSales: 1800,
    pettyCashExpenses: 600,
    totalOrders: 134,
    totalGrossSales: 54200,
    discountsGiven: 920,
    netRevenue: 53280,
    status: "reconciled",
    varianceReason: "Minor ₹80 coin rounding discrepancy on customer change.",
    reconciledAt: "2026-08-21T17:10:00Z",
  },
  {
    id: "shift-203",
    outletId: "powai",
    outletName: "Powai",
    date: "2026-08-21",
    shiftType: "Morning Shift (11:00 AM - 05:00 PM)",
    cashierName: "Sameer Shaikh",
    openingCash: 4000,
    cashSalesExpected: 11800,
    cashInDrawerActual: 11800,
    cashDifference: 0,
    upiSales: 21500,
    swiggySales: 8900,
    zomatoSales: 4200,
    posCardSales: 1500,
    pettyCashExpenses: 450,
    totalOrders: 118,
    totalGrossSales: 47900,
    discountsGiven: 680,
    netRevenue: 47220,
    status: "reconciled",
    reconciledAt: "2026-08-21T17:05:00Z",
  },
  {
    id: "shift-204",
    outletId: "thane",
    outletName: "Thane Grand",
    date: "2026-08-21",
    shiftType: "Morning Shift (11:00 AM - 05:00 PM)",
    cashierName: "Wasim Ansari",
    openingCash: 3000,
    cashSalesExpected: 9500,
    cashInDrawerActual: 9450,
    cashDifference: -50,
    upiSales: 16800,
    swiggySales: 7100,
    zomatoSales: 3800,
    posCardSales: 1200,
    pettyCashExpenses: 500,
    totalOrders: 96,
    totalGrossSales: 38400,
    discountsGiven: 450,
    netRevenue: 37950,
    status: "reconciled",
    varianceReason: "Tender roundoff.",
    reconciledAt: "2026-08-21T17:20:00Z",
  },
];

export const INITIAL_ROYALTIES: RoyaltyStatement[] = [
  {
    id: "roy-001",
    invoiceNumber: "IK-ROY-2026-08-01",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    month: "July 2026",
    grossSales: 2145000,
    royaltyRatePercent: 6.5,
    royaltyAmount: 139425,
    marketingFeePercent: 2.0,
    marketingFeeAmount: 42900,
    centralKitchenSupplyCost: 310000,
    deductionsAndAdjustments: 0,
    gstAmount: 32818,
    totalPayable: 215143,
    dueDate: "2026-08-10",
    status: "paid",
    paidAt: "2026-08-07T14:30:00Z",
  },
  {
    id: "roy-002",
    invoiceNumber: "IK-ROY-2026-08-02",
    outletId: "lokhandwala",
    outletName: "Lokhandwala",
    month: "July 2026",
    grossSales: 1680000,
    royaltyRatePercent: 6.5,
    royaltyAmount: 109200,
    marketingFeePercent: 2.0,
    marketingFeeAmount: 33600,
    centralKitchenSupplyCost: 245000,
    deductionsAndAdjustments: 0,
    gstAmount: 25704,
    totalPayable: 168504,
    dueDate: "2026-08-10",
    status: "paid",
    paidAt: "2026-08-09T11:20:00Z",
  },
  {
    id: "roy-003",
    invoiceNumber: "IK-ROY-2026-08-03",
    outletId: "powai",
    outletName: "Powai",
    month: "July 2026",
    grossSales: 1450000,
    royaltyRatePercent: 6.5,
    royaltyAmount: 94250,
    marketingFeePercent: 2.0,
    marketingFeeAmount: 29000,
    centralKitchenSupplyCost: 198000,
    deductionsAndAdjustments: -5000,
    gstAmount: 22185,
    totalPayable: 140435,
    dueDate: "2026-08-10",
    status: "pending",
  },
  {
    id: "roy-004",
    invoiceNumber: "IK-ROY-2026-08-04",
    outletId: "thane",
    outletName: "Thane Grand",
    month: "July 2026",
    grossSales: 1180000,
    royaltyRatePercent: 6.5,
    royaltyAmount: 76700,
    marketingFeePercent: 2.0,
    marketingFeeAmount: 23600,
    centralKitchenSupplyCost: 162000,
    deductionsAndAdjustments: 0,
    gstAmount: 18054,
    totalPayable: 118354,
    dueDate: "2026-08-10",
    status: "disputed",
    disputeReason: "Central kitchen spice mix batch #IK-SP-44 credit pending review (₹8,500).",
    disputeStatus: "under_review",
  },
];

export const INITIAL_COMPLIANCE: ComplianceChecklist[] = [
  {
    id: "comp-01",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    date: "2026-08-21",
    inspectedBy: "Audit Lead Imran Sayed",
    deepFreezerTemp: -19.4,
    chillerTemp: 3.1,
    spitCoreTemp: 78.5,
    oilPolarCompoundPercent: 14.5,
    fssaiDisplayVerified: true,
    staffHairnetsGloves: true,
    pestControlVerified: true,
    waterQualityTested: true,
    overallScore: 98,
    status: "pass",
    remarks: "Exemplary food safety & hygiene standards maintained.",
  },
  {
    id: "comp-02",
    outletId: "lokhandwala",
    outletName: "Lokhandwala",
    date: "2026-08-21",
    inspectedBy: "Audit Lead Imran Sayed",
    deepFreezerTemp: -18.2,
    chillerTemp: 3.8,
    spitCoreTemp: 77.0,
    oilPolarCompoundPercent: 18.2,
    fssaiDisplayVerified: true,
    staffHairnetsGloves: true,
    pestControlVerified: true,
    waterQualityTested: true,
    overallScore: 94,
    status: "pass",
    remarks: "Fryer oil TPM at 18.2%, schedule oil change for tomorrow.",
  },
  {
    id: "comp-03",
    outletId: "powai",
    outletName: "Powai",
    date: "2026-08-21",
    inspectedBy: "QA Officer Natasha Fernandes",
    deepFreezerTemp: -18.0,
    chillerTemp: 4.2,
    spitCoreTemp: 78.0,
    oilPolarCompoundPercent: 16.0,
    fssaiDisplayVerified: true,
    staffHairnetsGloves: true,
    pestControlVerified: true,
    waterQualityTested: true,
    overallScore: 95,
    status: "pass",
    remarks: "Chiller gasket cleaned. Temperatures compliant.",
  },
  {
    id: "comp-04",
    outletId: "thane",
    outletName: "Thane Grand",
    date: "2026-08-21",
    inspectedBy: "QA Officer Natasha Fernandes",
    deepFreezerTemp: -17.1,
    chillerTemp: 4.8,
    spitCoreTemp: 76.2,
    oilPolarCompoundPercent: 21.4,
    fssaiDisplayVerified: true,
    staffHairnetsGloves: false,
    pestControlVerified: true,
    waterQualityTested: true,
    overallScore: 84,
    status: "requires_action",
    remarks: "Defrost deep freezer to bring temperature below -18°C. Ensure all kitchen crew wear hairnets during peak rush.",
  },
];

export const INITIAL_MENU_ITEMS: MenuItemRecipe[] = [
  {
    id: "pos-01",
    name: "Classic Koyla Chicken Wrap",
    category: "Shawarma Wraps",
    meatPortionGrams: 110,
    sauceGrams: 30,
    breadType: "Khubz (Lebanese)",
    sellingPrice: 189,
    cogsCost: 56,
    grossMarginPercent: 70.4,
    spitType: "Chicken",
    popularRank: 1,
    active: true,
    meatWeight: "110g",
    tag: "Best Seller",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Toum (+₹20)", "Spicy Peri-Peri (+₹15)", "No Pickles", "Extra Searing Meat (+₹40)"],
  },
  {
    id: "pos-02",
    name: "Smoked Charcoal Mutton Roll",
    category: "Shawarma Wraps",
    meatPortionGrams: 140,
    sauceGrams: 35,
    breadType: "Rumali Roti",
    sellingPrice: 289,
    cogsCost: 96,
    grossMarginPercent: 66.8,
    spitType: "Mutton",
    popularRank: 2,
    active: true,
    meatWeight: "140g",
    tag: "Signature",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Toum (+₹20)", "Extra Searing Meat (+₹50)", "Rumali Toast"],
  },
  {
    id: "pos-03",
    name: "Jumbo Loaded Koyla Meal Combo",
    category: "Combos & Meals",
    meatPortionGrams: 160,
    sauceGrams: 45,
    breadType: "Khubz (Lebanese)",
    sellingPrice: 349,
    cogsCost: 102,
    grossMarginPercent: 70.8,
    spitType: "Chicken",
    popularRank: 3,
    active: true,
    meatWeight: "160g",
    tag: "Meal Box",
    image: "https://images.unsplash.com/photo-1561719450-48226060c50d?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Add Peri-Peri Fries (+₹30)", "Add Toum Dip (+₹20)", "Upgrade to Mutton (+₹80)"],
  },
  {
    id: "pos-04",
    name: "Irani Royal Open Platter & Khubz",
    category: "Platters & Dips",
    meatPortionGrams: 220,
    sauceGrams: 60,
    breadType: "Khubz (Lebanese)",
    sellingPrice: 449,
    cogsCost: 130,
    grossMarginPercent: 71.0,
    spitType: "Both",
    popularRank: 4,
    active: true,
    meatWeight: "220g",
    tag: "Platter",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Khubz Bread (+₹15)", "Extra Garlic Toum (+₹20)", "Extra Pickles (+₹15)"],
  },
  {
    id: "pos-05",
    name: "Authentic Irani Dum Chai Special",
    category: "Irani Chai & Drinks",
    meatPortionGrams: 0,
    sauceGrams: 0,
    breadType: "N/A",
    sellingPrice: 49,
    cogsCost: 12,
    grossMarginPercent: 75.5,
    spitType: "Beverage",
    popularRank: 5,
    active: true,
    meatWeight: "N/A",
    tag: "Hot Brew",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Less Sugar", "Strong Kadak", "Extra Malai (+₹10)"],
  },
  {
    id: "pos-06",
    name: "Signature Garlic Toum Dip (100g Jar)",
    category: "Platters & Dips",
    meatPortionGrams: 0,
    sauceGrams: 100,
    breadType: "N/A",
    sellingPrice: 79,
    cogsCost: 18,
    grossMarginPercent: 77.2,
    spitType: "Dip",
    popularRank: 6,
    active: true,
    meatWeight: "N/A",
    tag: "Side",
    image: "https://images.unsplash.com/photo-1618449840665-9ed506d73a34?auto=format&fit=crop&w=400&q=80",
    modifiers: [],
  },
  {
    id: "pos-07",
    name: "Spicy Peri-Peri Charcoal Fries Box",
    category: "Platters & Dips",
    meatPortionGrams: 0,
    sauceGrams: 20,
    breadType: "N/A",
    sellingPrice: 119,
    cogsCost: 28,
    grossMarginPercent: 76.5,
    spitType: "Side",
    popularRank: 7,
    active: true,
    meatWeight: "N/A",
    tag: "Side",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Cheese Dip (+₹25)", "Extra Peri-Peri Spice"],
  },
  {
    id: "pos-08",
    name: "Koyla Spiced Chicken Wings (6 pcs)",
    category: "Combos & Meals",
    meatPortionGrams: 200,
    sauceGrams: 30,
    breadType: "N/A",
    sellingPrice: 249,
    cogsCost: 72,
    grossMarginPercent: 71.1,
    spitType: "Chicken",
    popularRank: 8,
    active: true,
    meatWeight: "200g",
    tag: "Starters",
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80",
    modifiers: ["Extra Garlic Dip (+₹20)"],
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-01",
    timestamp: "2026-08-21 17:15:22",
    outletName: "Bandra West (Flagship)",
    user: "Aman Siddiqui",
    role: "Cashier",
    action: "Closed Morning Shift #201",
    module: "Sales",
    severity: "info",
    details: "Reconciled ₹68,500 total gross sales. Zero cash discrepancy.",
  },
  {
    id: "audit-02",
    timestamp: "2026-08-21 16:40:10",
    outletName: "Thane Grand",
    user: "Bilal Sayyed",
    role: "Outlet Manager",
    action: "Meat Yield Variance Flagged",
    module: "Yield",
    severity: "warning",
    details: "Batch #IK-THA-260821-A yield at 89.5% (Threshold: 92%). Lower cone trimming loss logged.",
  },
  {
    id: "audit-03",
    timestamp: "2026-08-21 15:10:04",
    outletName: "HQ Central",
    user: "Tariq Mansoori",
    role: "Brand Director",
    action: "Royalty Statement Issued",
    module: "Royalty",
    severity: "info",
    details: "Issued July 2026 royalty invoice #IK-ROY-2026-08-04 to Thane Grand (₹1,18,354).",
  },
  {
    id: "audit-04",
    timestamp: "2026-08-21 14:02:18",
    outletName: "Lokhandwala",
    user: "Imran Sayed",
    role: "QA Inspector",
    action: "Daily Hygiene Audit Completed",
    module: "Compliance",
    severity: "info",
    details: "Score 94%. Fryer oil TPM compliant at 18.2%. Spit core temperature verified at 77°C.",
  },
  {
    id: "audit-05",
    timestamp: "2026-08-21 11:30:50",
    outletName: "Bandra West (Flagship)",
    user: "Farhan Qureshi",
    role: "Master Carver",
    action: "Loaded Spit Batch #IK-BND-260821-A",
    module: "Yield",
    severity: "info",
    details: "33.8 kg Koyla Marinated Chicken loaded on Front Spit #1.",
  },
];

export const INITIAL_ORDERS: LiveOrder[] = [
  {
    id: "ord-101",
    orderNumber: "IK-9081",
    time: "02:54 PM",
    items: [
      { name: "Classic Koyla Chicken Wrap", quantity: 2, price: 189 },
      { name: "Signature Garlic Toum Dip", quantity: 1, price: 79 },
    ],
    totalAmount: 457,
    channel: "Walk-in Counter",
    paymentMethod: "Cash",
    status: "Completed",
    customerName: "Ayaan Merchant",
    outletId: "bandra-west",
  },
  {
    id: "ord-102",
    orderNumber: "IK-9082",
    time: "02:48 PM",
    items: [
      { name: "Smoked Charcoal Mutton Roll", quantity: 1, price: 289 },
      { name: "Spicy Peri-Peri Fries Box", quantity: 1, price: 119 },
    ],
    totalAmount: 408,
    channel: "Zomato",
    paymentMethod: "Card / POS",
    status: "Completed",
    customerName: "Rohan V.",
    outletId: "bandra-west",
  },
  {
    id: "ord-103",
    orderNumber: "IK-9083",
    time: "02:41 PM",
    items: [
      { name: "Jumbo Loaded Meat Platter", quantity: 1, price: 349 },
      { name: "Classic Koyla Chicken Wrap", quantity: 1, price: 189 },
    ],
    totalAmount: 538,
    channel: "Walk-in Counter",
    paymentMethod: "GPay / UPI",
    status: "Completed",
    customerName: "Dr. Kulkarni",
    outletId: "bandra-west",
  },
  {
    id: "ord-104",
    orderNumber: "IK-9084",
    time: "02:35 PM",
    items: [
      { name: "Classic Koyla Chicken Wrap", quantity: 3, price: 189 },
    ],
    totalAmount: 567,
    channel: "Swiggy",
    paymentMethod: "GPay / UPI",
    status: "Completed",
    customerName: "Pooja Hegde",
    outletId: "bandra-west",
  },
  {
    id: "ord-105",
    orderNumber: "IK-9085",
    time: "02:22 PM",
    items: [
      { name: "Smoked Charcoal Mutton Roll", quantity: 2, price: 289 },
      { name: "Signature Garlic Toum Dip", quantity: 2, price: 79 },
    ],
    totalAmount: 736,
    channel: "Walk-in Counter",
    paymentMethod: "Cash",
    status: "Completed",
    customerName: "Vikram Malhotra",
    outletId: "bandra-west",
  },
  {
    id: "ord-106",
    orderNumber: "IK-9086",
    time: "02:10 PM",
    items: [
      { name: "Classic Koyla Chicken Wrap", quantity: 1, price: 189 },
      { name: "Spicy Peri-Peri Fries Box", quantity: 1, price: 119 },
    ],
    totalAmount: 308,
    channel: "Zomato",
    paymentMethod: "GPay / UPI",
    status: "Completed",
    customerName: "Aditya S.",
    outletId: "bandra-west",
  },
  {
    id: "ord-107",
    orderNumber: "IK-9087",
    time: "01:58 PM",
    items: [
      { name: "Jumbo Loaded Meat Platter", quantity: 2, price: 349 },
    ],
    totalAmount: 698,
    channel: "Walk-in Counter",
    paymentMethod: "Cash",
    status: "Completed",
    customerName: "Zahid Qureshi",
    outletId: "bandra-west",
  },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: "st-01",
    name: "Farhan Qureshi",
    role: "Master Carver",
    status: "Present",
    checkInTime: "10:45 AM",
    phone: "+91 98201 11201",
    avatar: "FQ",
  },
  {
    id: "st-02",
    name: "Sameer Khan",
    role: "Shawarma Assembler",
    status: "Present",
    checkInTime: "10:50 AM",
    phone: "+91 98201 11202",
    avatar: "SK",
  },
  {
    id: "st-03",
    name: "Imran Shaikh",
    role: "Cashier & Counter",
    status: "Present",
    checkInTime: "10:55 AM",
    phone: "+91 98201 11203",
    avatar: "IS",
  },
  {
    id: "st-04",
    name: "Rashid Ali",
    role: "Grill & Coal Master",
    status: "Present",
    checkInTime: "11:00 AM",
    phone: "+91 98201 11204",
    avatar: "RA",
  },
  {
    id: "st-05",
    name: "Zeeshan Ahmed",
    role: "Prep Cook & Toum",
    status: "Present",
    checkInTime: "10:30 AM",
    phone: "+91 98201 11205",
    avatar: "ZA",
  },
  {
    id: "st-06",
    name: "Arbaaz Sayed",
    role: "Dispatch Runner",
    status: "Present",
    checkInTime: "11:15 AM",
    phone: "+91 98201 11206",
    avatar: "AS",
  },
  {
    id: "st-07",
    name: "Danish Ansari",
    role: "Kitchen Steward",
    status: "On Leave",
    phone: "+91 98201 11207",
    avatar: "DA",
  },
];

export const INITIAL_SHIPMENTS: CentralShipment[] = [
  {
    id: "shp-101",
    shipmentNumber: "IK-DISP-260822-01",
    outletId: "bandra-west",
    outletName: "Bandra West (Flagship)",
    dispatchedAt: "08:30 AM, Today",
    deliveredAt: "09:45 AM, Today",
    status: "delivered",
    chickenConesCount: 3,
    muttonConesCount: 2,
    totalMeatWeightKg: 126.0,
    spiceMixBagsCount: 5,
    toumJarsCount: 10,
    vanVehicleNumber: "MH 02 EE 4092 (Reefer)",
    driverName: "Sultan Sheikh",
    driverPhone: "+91 98205 11984",
    temperatureCelsius: 2.8,
    securitySealNumber: "SEAL-K-90218",
  },
  {
    id: "shp-102",
    shipmentNumber: "IK-DISP-260822-02",
    outletId: "lokhandwala",
    outletName: "Lokhandwala Andheri",
    dispatchedAt: "09:15 AM, Today",
    deliveredAt: "10:30 AM, Today",
    status: "delivered",
    chickenConesCount: 2,
    muttonConesCount: 1,
    totalMeatWeightKg: 78.0,
    spiceMixBagsCount: 3,
    toumJarsCount: 6,
    vanVehicleNumber: "MH 02 EE 4092 (Reefer)",
    driverName: "Sultan Sheikh",
    driverPhone: "+91 98205 11984",
    temperatureCelsius: 3.1,
    securitySealNumber: "SEAL-K-90219",
  },
  {
    id: "shp-103",
    shipmentNumber: "IK-DISP-260822-03",
    outletId: "powai",
    outletName: "Powai Central",
    dispatchedAt: "11:00 AM, Today",
    status: "in_transit",
    chickenConesCount: 2,
    muttonConesCount: 1,
    totalMeatWeightKg: 78.0,
    spiceMixBagsCount: 2,
    toumJarsCount: 4,
    vanVehicleNumber: "MH 04 BD 8812 (Reefer)",
    driverName: "Javed Akhtar",
    driverPhone: "+91 98330 99124",
    temperatureCelsius: 3.4,
    securitySealNumber: "SEAL-K-90220",
  },
  {
    id: "shp-104",
    shipmentNumber: "IK-DISP-260822-04",
    outletId: "thane",
    outletName: "Thane Grand",
    dispatchedAt: "01:30 PM, Today",
    status: "preparing",
    chickenConesCount: 2,
    muttonConesCount: 1,
    totalMeatWeightKg: 78.0,
    spiceMixBagsCount: 3,
    toumJarsCount: 6,
    vanVehicleNumber: "MH 04 BD 8812 (Reefer)",
    driverName: "Javed Akhtar",
    driverPhone: "+91 98330 99124",
    temperatureCelsius: 2.5,
    securitySealNumber: "Pending Load",
  },
];

