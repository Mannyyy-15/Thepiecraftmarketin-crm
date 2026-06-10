"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ChevronRight } from "lucide-react";

const slides = [
  {
    badge: "Agency OS",
    title: "Welcome to\nThePieCraft CRM",
    subtitle:
      "One operating system for your entire marketing agency. Manage clients, projects, team, and finances — no more scattered tools.",
    features: [
      "Replace 5+ scattered tools with one platform",
      "Built specifically for marketing agencies",
      "Real-time team & project visibility",
    ],
    graphic: "pie",
    chips: [
      { label: "12 Active Clients", color: "#3A58E8", bg: "#1a2a6e" },
      { label: "₹2.4L Revenue", color: "#14B8A6", bg: "#0d3d38" },
    ],
    accent: "#3A58E8",
  },
  {
    badge: "Clients & Projects",
    title: "Clients &\nProjects",
    subtitle:
      "Onboard client brands, track project pipelines, assign leads, and monitor progress from kickoff to launch — all in one place.",
    features: [
      "Kanban pipeline with custom stages",
      "Bento detail page per client & project",
      "Auto-generated onboarding checklist",
    ],
    graphic: "clients",
    chips: [
      { label: "Onboarded ✓", color: "#14B8A6", bg: "#0d3d38" },
      { label: "3 Projects Active", color: "#3A58E8", bg: "#1a2a6e" },
    ],
    accent: "#5F7EF1",
  },
  {
    badge: "Team",
    title: "Team &\nAttendance",
    subtitle:
      "Log hours, punch in/out, request leave, and assign tasks. Know who's working on what with real-time team visibility.",
    features: [
      "Daily punch in/out with live status",
      "Leave approvals & timesheet management",
      "Task assignment per team member",
    ],
    graphic: "features",
    chips: [
      { label: "7 Members Online", color: "#3A58E8", bg: "#1a2a6e" },
      { label: "Leave Approved", color: "#14B8A6", bg: "#0d3d38" },
    ],
    accent: "#8FA8F7",
  },
  {
    badge: "Finance",
    title: "Finance &\nReporting",
    subtitle:
      "Create invoices, track expenses, approve timesheets, and view profit reports. Your agency's financial pulse at a glance.",
    features: [
      "Invoice creation, tracking & mark-paid",
      "Expense claims approval workflow",
      "Profit, MRR & outstanding dashboard",
    ],
    graphic: "finance",
    chips: [
      { label: "₹45K Collected", color: "#14B8A6", bg: "#0d3d38" },
      { label: "2 Overdue", color: "#EF4444", bg: "#3d1414" },
    ],
    accent: "#14B8A6",
  },
  {
    badge: "Ready",
    title: "Your Agency,\nOne Dashboard",
    subtitle:
      "Sign in and start running your agency smarter. ThePieCraft CRM — built for agencies that mean business.",
    features: [
      "Set up in under 10 minutes",
      "All features unlocked from day one",
      "Built and maintained by ThePieCraft",
    ],
    graphic: "rocket",
    chips: [
      { label: "Ready to launch 🚀", color: "#14B8A6", bg: "#0d3d38" },
      { label: "All features ✓", color: "#3A58E8", bg: "#1a2a6e" },
    ],
    accent: "#14B8A6",
  },
];

// ─── Graphics ────────────────────────────────────────────

function PieLogo({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      <circle cx="100" cy="100" r="88" stroke="#3A58E8" strokeWidth="1" strokeOpacity="0.15" />
      <circle cx="100" cy="100" r="74" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.08" />
      {[
        ["#3A58E8", "M100,100 L100,28 C138.7,28 164,53.3 164,92 L100,100 Z"],
        ["#5F7EF1", "M100,100 L164,92 C172,130.6 148,164 108,170 Z"],
        ["#8FA8F7", "M100,100 L108,170 C70,176 36,150 36,112 Z"],
        ["#BCCDFB", "M100,100 L36,112 C28,73.4 53.3,28 100,28 Z"],
      ].map(([color, path], i) => (
        <motion.path
          key={i}
          d={path}
          fill={color}
          initial={animated ? { opacity: 0, scale: 0.5, transformOrigin: "100px 100px" } : { opacity: 1 }}
          animate={animated ? { opacity: 1, scale: 1, transformOrigin: "100px 100px" } : { opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <circle cx="100" cy="100" r="22" fill="#080D1E" />
      <circle cx="100" cy="100" r="18" stroke="#3A58E8" strokeWidth="1" strokeOpacity="0.4" fill="none" />
      <motion.circle
        cx="100" cy="100" r="10" fill="#3A58E8" opacity="0.7"
        animate={animated ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function ClientsIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      <circle cx="100" cy="100" r="88" stroke="#3A58E8" strokeWidth="1" strokeOpacity="0.15" />
      {/* Main dashboard card */}
      <rect x="30" y="48" width="140" height="104" rx="8" fill="#0d1940" />
      <rect x="30" y="48" width="140" height="104" rx="8" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.4" />
      {/* Header bar */}
      <rect x="30" y="48" width="140" height="24" rx="8" fill="#1a2a6e" />
      <rect x="30" y="60" width="140" height="12" fill="#1a2a6e" />
      <circle cx="44" cy="60" r="4" fill="#3A58E8" />
      <rect x="52" y="57" width="40" height="6" rx="3" fill="#3A58E8" opacity="0.6" />
      {/* Client rows */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <circle cx="44" cy={88 + i * 22} r="8" fill={["#3A58E8", "#14B8A6", "#5F7EF1"][i]} opacity="0.8" />
          <rect x="56" y={84 + i * 22} width="50" height="5" rx="2.5" fill="#f0f4ff" opacity="0.7" />
          <rect x="56" y={92 + i * 22} width="30" height="4" rx="2" fill="#7b8fc4" opacity="0.5" />
          <rect x={130} y={84 + i * 22} width="28" height="14" rx="4" fill={["#1a2a6e", "#0d3d38", "#2a1a6e"][i]} />
          <rect x={134} y={88 + i * 22} width="20" height="6" rx="3" fill={["#3A58E8", "#14B8A6", "#8FA8F7"][i]} opacity="0.8" />
        </g>
      ))}
      {/* Checkmark highlight */}
      <motion.circle cx="160" cy="72" r="12" fill="#14B8A6" opacity={animated ? 0 : 0.2}
        animate={animated ? { opacity: [0, 0.3, 0.15] } : {}}
        transition={{ duration: 1, delay: 0.8 }}
      />
      <motion.path d="M154,72 L158,76 L166,66" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
        animate={animated ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 1 }}
      />
    </svg>
  );
}

function FeaturesIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      <circle cx="100" cy="100" r="88" stroke="#3A58E8" strokeWidth="1" strokeOpacity="0.15" />
      {/* Phone frame */}
      <rect x="64" y="36" width="72" height="128" rx="12" fill="#0d1940" />
      <rect x="64" y="36" width="72" height="128" rx="12" stroke="#3A58E8" strokeWidth="0.8" strokeOpacity="0.4" />
      <rect x="88" y="40" width="24" height="4" rx="2" fill="#1a2a6e" />
      {/* Punch in status */}
      <circle cx="100" cy="72" r="16" fill="#1a2a6e" />
      <motion.circle cx="100" cy="72" r="16" fill="none" stroke="#14B8A6" strokeWidth="2"
        strokeDasharray="100"
        strokeDashoffset={animated ? 100 : 20}
        animate={animated ? { strokeDashoffset: 20 } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        style={{ transformOrigin: "100px 72px", transform: "rotate(-90deg)" }}
      />
      <text x="100" y="70" textAnchor="middle" fill="#14B8A6" fontSize="7" fontWeight="bold">PUNCHED</text>
      <text x="100" y="79" textAnchor="middle" fill="#14B8A6" fontSize="7" fontWeight="bold">IN</text>
      {/* Time rows */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="72" y={100 + i * 18} width="56" height="12" rx="3" fill="#1a2a6e" opacity="0.8" />
          <circle cx="80" cy={106 + i * 18} r="3" fill={["#3A58E8", "#14B8A6", "#5F7EF1"][i]} />
          <rect x="86" y={103 + i * 18} width="24" height="4" rx="2" fill="#f0f4ff" opacity="0.6" />
          <rect x="112" y={103 + i * 18} width="12" height="4" rx="2" fill={["#3A58E8", "#14B8A6", "#8FA8F7"][i]} opacity="0.7" />
        </g>
      ))}
      {/* Side floating card */}
      <rect x="140" y="70" width="40" height="28" rx="5" fill="#1a2a6e" />
      <rect x="140" y="70" width="40" height="28" rx="5" stroke="#5F7EF1" strokeWidth="0.5" strokeOpacity="0.6" />
      <text x="160" y="83" textAnchor="middle" fill="#8FA8F7" fontSize="6">TEAM</text>
      <text x="160" y="93" textAnchor="middle" fill="#f0f4ff" fontSize="9" fontWeight="bold">7/10</text>
      {/* Small side card left */}
      <rect x="20" y="82" width="40" height="28" rx="5" fill="#0d3d38" />
      <rect x="20" y="82" width="40" height="28" rx="5" stroke="#14B8A6" strokeWidth="0.5" strokeOpacity="0.6" />
      <text x="40" y="95" textAnchor="middle" fill="#14B8A6" fontSize="6">HOURS</text>
      <text x="40" y="105" textAnchor="middle" fill="#f0f4ff" fontSize="9" fontWeight="bold">8.5h</text>
    </svg>
  );
}

function FinanceIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      <circle cx="100" cy="100" r="88" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.15" />
      {/* Background grid */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1="28" y1={80 + i * 12} x2="172" y2={80 + i * 12} stroke="#f0f4ff" strokeWidth="0.3" strokeOpacity="0.08" />
      ))}
      {/* Chart bars */}
      {[
        { x: 40, h: 48, c: "#3A58E8", o: 0.7 },
        { x: 60, h: 64, c: "#5F7EF1", o: 0.8 },
        { x: 80, h: 40, c: "#3A58E8", o: 0.65 },
        { x: 100, h: 72, c: "#5F7EF1", o: 0.9 },
        { x: 120, h: 56, c: "#3A58E8", o: 0.75 },
        { x: 140, h: 80, c: "#14B8A6", o: 1 },
        { x: 160, h: 68, c: "#14B8A6", o: 0.85 },
      ].map(({ x, h, c, o }, i) => (
        <motion.rect
          key={i}
          x={x - 8} y={152 - h} width={16} height={h} rx="3" fill={c} opacity={o}
          initial={animated ? { scaleY: 0, transformOrigin: `${x - 8}px 152px` } : { scaleY: 1 }}
          animate={animated ? { scaleY: 1, transformOrigin: `${x - 8}px 152px` } : {}}
          transition={{ duration: 0.5, delay: 0.07 * i, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {/* Trend line */}
      <motion.polyline
        points="40,120 60,112 80,122 100,100 120,110 140,90 160,96"
        stroke="#14B8A6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.6 }}
      />
      {/* Stat cards top */}
      <rect x="28" y="28" width="68" height="36" rx="6" fill="#0d1940" />
      <rect x="28" y="28" width="68" height="36" rx="6" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.5" />
      <text x="38" y="43" fill="#7b8fc4" fontSize="7">Total Revenue</text>
      <text x="38" y="57" fill="#f0f4ff" fontSize="11" fontWeight="bold">₹2.4L</text>

      <rect x="104" y="28" width="68" height="36" rx="6" fill="#0d3d38" />
      <rect x="104" y="28" width="68" height="36" rx="6" stroke="#14B8A6" strokeWidth="0.5" strokeOpacity="0.5" />
      <text x="114" y="43" fill="#7b8fc4" fontSize="7">Outstanding</text>
      <text x="114" y="57" fill="#14B8A6" fontSize="11" fontWeight="bold">₹32K</text>
    </svg>
  );
}

function RocketIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      <circle cx="100" cy="100" r="88" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.15" />
      {/* Stars */}
      {[[40, 36], [160, 44], [30, 100], [170, 88], [50, 152], [155, 148], [100, 28], [80, 168]].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={1.5} fill="#f0f4ff"
          initial={animated ? { opacity: 0 } : { opacity: 0.4 }}
          animate={animated ? { opacity: [0, 0.9, 0] } : {}}
          transition={{ duration: 2, delay: 0.2 * i, repeat: Infinity }}
        />
      ))}
      {/* Rocket flame */}
      <motion.ellipse
        cx="100" cy="156" rx="10" ry="16"
        fill="url(#flame)"
        animate={animated ? { ry: [16, 12, 18, 14] } : {}}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
      <defs>
        <radialGradient id="flame" cx="50%" cy="30%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Rocket body */}
      <motion.g
        animate={animated ? { y: [0, -4, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body */}
        <path d="M100,48 C116,60 122,80 122,108 L78,108 C78,80 84,60 100,48 Z" fill="#3A58E8" />
        {/* Nose */}
        <path d="M100,32 L116,56 L84,56 Z" fill="#5F7EF1" />
        {/* Window */}
        <circle cx="100" cy="82" r="12" fill="#0d1940" />
        <circle cx="100" cy="82" r="9" stroke="#8FA8F7" strokeWidth="1.5" fill="none" />
        <circle cx="100" cy="82" r="5" fill="#5F7EF1" opacity="0.6" />
        {/* Wings */}
        <path d="M78,100 L58,120 L78,116 Z" fill="#14B8A6" opacity="0.8" />
        <path d="M122,100 L142,120 L122,116 Z" fill="#14B8A6" opacity="0.8" />
        {/* Bottom */}
        <rect x="78" y="108" width="44" height="14" rx="4" fill="#14B8A6" opacity="0.6" />
      </motion.g>
      {/* Dashboard mini cards */}
      <rect x="18" y="56" width="44" height="30" rx="5" fill="#0d1940" />
      <rect x="18" y="56" width="44" height="30" rx="5" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.5" />
      <rect x="24" y="63" width="22" height="4" rx="2" fill="#3A58E8" opacity="0.6" />
      <rect x="24" y="70" width="16" height="4" rx="2" fill="#5F7EF1" opacity="0.5" />
      <rect x="24" y="77" width="20" height="4" rx="2" fill="#8FA8F7" opacity="0.4" />

      <rect x="138" y="60" width="44" height="30" rx="5" fill="#0d3d38" />
      <rect x="138" y="60" width="44" height="30" rx="5" stroke="#14B8A6" strokeWidth="0.5" strokeOpacity="0.5" />
      <text x="160" y="75" textAnchor="middle" fill="#14B8A6" fontSize="7">CLIENTS</text>
      <text x="160" y="85" textAnchor="middle" fill="#f0f4ff" fontSize="10" fontWeight="bold">12 ✓</text>
    </svg>
  );
}

const graphics: Record<string, React.ComponentType<{ animated: boolean }>> = {
  pie: PieLogo,
  clients: ClientsIcon,
  features: FeaturesIcon,
  finance: FinanceIcon,
  rocket: RocketIcon,
};

// ─── Main Page ────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const go = useCallback((i: number) => {
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  }, [current]);

  const finish = useCallback(() => {
    localStorage.setItem("tpc_onboarding_done", "true");
    router.replace("/login");
  }, [router]);

  const next = useCallback(() => {
    if (current < slides.length - 1) go(current + 1);
    else finish();
  }, [current, go, finish]);

  const prev = useCallback(() => {
    if (current > 0) go(current - 1);
  }, [current, go]);

  const slide = slides[current];
  const Graphic = graphics[slide.graphic];
  const isLast = current === slides.length - 1;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080d1e]">
        <div className="w-8 h-8 border-2 border-[#3a58e8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080d1e] text-[#f0f4ff] overflow-hidden font-sans">

      {/* ── Background ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute w-[700px] h-[700px] rounded-full bg-[#3a58e8]/[0.06] blur-[120px] -top-48 -left-48" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#14B8A6]/[0.04] blur-[100px] -bottom-32 -right-32" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[#3a58e8]/[0.04] blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#3a58e8" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── Layout ─────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* ── LEFT PANEL (desktop graphic) ───────────────── */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] flex-col items-center justify-center relative border-r border-white/[0.04] px-12 py-16">
          {/* Logo */}
          <div className="absolute top-8 left-8 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3a58e8] to-[#5f7ef1] flex items-center justify-center shadow-lg shadow-[#3a58e8]/40">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">ThePieCraft</div>
              <div className="text-[9px] font-semibold text-[#7b8fc4] uppercase tracking-widest mt-0.5">Agency OS</div>
            </div>
          </div>

          {/* Slide counter top-right */}
          <div className="absolute top-9 right-8 flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7b8fc4]">{current + 1}</span>
            <span className="text-xs text-[#3a3f5c]">/</span>
            <span className="text-xs text-[#3a3f5c]">{slides.length}</span>
          </div>

          {/* Graphic area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`graphic-${current}`}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center w-full max-w-sm"
            >
              {/* Glass card around graphic */}
              <div className="relative w-64 h-64 xl:w-72 xl:h-72 rounded-3xl bg-[#0d1533]/80 border border-white/[0.06] shadow-2xl flex items-center justify-center backdrop-blur-sm mb-8">
                {/* Glow behind graphic */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-20"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${slide.accent}40, transparent 70%)` }}
                />
                <div className="w-44 h-44 xl:w-52 xl:h-52 relative z-10">
                  <Graphic animated={true} />
                </div>
              </div>

              {/* Floating chip badges */}
              <div className="flex flex-wrap gap-2.5 justify-center">
                {slide.chips.map((chip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: chip.bg,
                      color: chip.color,
                      borderColor: `${chip.color}40`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: chip.color }}
                    />
                    {chip.label}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Decorative bottom text */}
          <div className="absolute bottom-8 left-8 right-8 flex items-center gap-3 opacity-25">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#3a58e8] to-transparent" />
            <span className="text-[9px] font-semibold text-[#7b8fc4] uppercase tracking-widest whitespace-nowrap">
              ThePieCraft CRM v2.0
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#3a58e8] to-transparent" />
          </div>
        </div>

        {/* ── RIGHT PANEL (content) ───────────────────────── */}
        <div className="flex-1 flex flex-col min-h-screen px-6 sm:px-10 lg:px-14 xl:px-20 pt-8 pb-10">

          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3a58e8] to-[#5f7ef1] flex items-center justify-center shadow-md shadow-[#3a58e8]/30">
                <span className="text-white font-bold text-base">P</span>
              </div>
              <span className="text-sm font-bold text-white">ThePieCraft</span>
            </div>
            <span className="text-xs font-medium text-[#7b8fc4]">{current + 1} / {slides.length}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-0.5 bg-[#1a2040] rounded-full mb-10 lg:mt-16 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3a58e8] to-[#5f7ef1]"
              initial={false}
              animate={{ width: `${((current + 1) / slides.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Mobile graphic */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`mob-graphic-${current}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-[#0d1533]/80 border border-white/[0.06] flex items-center justify-center mb-4"
              >
                <div
                  className="absolute inset-0 rounded-2xl opacity-20"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${slide.accent}40, transparent 70%)` }}
                />
                <div className="w-32 h-32 sm:w-40 sm:h-40 relative z-10">
                  <Graphic animated={true} />
                </div>
              </motion.div>
              {/* Mobile chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {slide.chips.map((chip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ backgroundColor: chip.bg, color: chip.color, borderColor: `${chip.color}40` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chip.color }} />
                    {chip.label}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>

          {/* Slide content */}
          <div className="flex-1 flex flex-col justify-center lg:justify-start lg:pt-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`content-${current}`}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full bg-[#1a2a6e]/60 border border-[#3a58e8]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3a58e8]" />
                  <span className="text-xs font-semibold text-[#8fa8f7] uppercase tracking-widest">{slide.badge}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] xl:text-5xl font-extrabold leading-[1.12] mb-5 text-white">
                  {slide.title.split("\n").map((line, i) => (
                    <span key={i} className={i === 0 ? "block" : "block text-[#8fa8f7]"}>{line}</span>
                  ))}
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base text-[#7b8fc4] leading-relaxed mb-8 max-w-md">
                  {slide.subtitle}
                </p>

                {/* Feature bullets */}
                <div className="space-y-3 mb-10">
                  {slide.features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1a2a6e] border border-[#3a58e8]/50 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-[#5f7ef1]" />
                      </div>
                      <span className="text-sm text-[#c4d0f0] font-medium">{f}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: dots + buttons */}
          <div className="mt-auto pt-6">
            {/* Dots */}
            <div className="flex items-center gap-2 mb-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className="cursor-pointer transition-all duration-300"
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current
                        ? "w-7 bg-[#3a58e8]"
                        : i < current
                        ? "w-2 bg-[#3a58e8]/40"
                        : "w-2 bg-[#1e2f87]/60 hover:bg-[#263aa7]"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-3">
              {/* Back button (appears after slide 0) */}
              {current > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={prev}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#0d1533] border border-white/[0.06] text-[#7b8fc4] hover:text-white hover:bg-[#1a2040] hover:border-white/[0.1] transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </motion.button>
              )}

              {/* Next / Get Started */}
              <motion.button
                onClick={next}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                style={{
                  background: isLast
                    ? `linear-gradient(135deg, #14B8A6, #0d9488)`
                    : `linear-gradient(135deg, #3a58e8, #5f7ef1)`,
                  boxShadow: isLast
                    ? `0 4px 24px #14B8A640`
                    : `0 4px 24px #3a58e840`,
                }}
              >
                <span className="text-white">{isLast ? "Get Started" : "Next"}</span>
                <ArrowRight className="w-4 h-4 text-white/80" />
              </motion.button>

              {/* Skip (hidden on last slide) */}
              {!isLast && (
                <button
                  onClick={finish}
                  className="px-4 h-12 rounded-xl text-sm font-medium text-[#7b8fc4] hover:text-white hover:bg-[#0d1533] transition-all cursor-pointer whitespace-nowrap"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
