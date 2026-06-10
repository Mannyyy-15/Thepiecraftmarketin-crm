"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    title: "Welcome to\nThePieCraft CRM",
    subtitle: "One operating system for your entire marketing agency. Manage clients, projects, team, and finances — no more scattered tools.",
    graphic: "pie",
  },
  {
    title: "Clients &\nProjects",
    subtitle: "Onboard client brands, track project pipelines, assign leads, and monitor progress from kickoff to launch — all in one place.",
    graphic: "clients",
  },
  {
    title: "Team &\nAttendance",
    subtitle: "Log hours, punch in/out, request leave, and assign tasks. Know who's working on what with real-time team visibility.",
    graphic: "features",
  },
  {
    title: "Finance &\nReporting",
    subtitle: "Create invoices, track expenses, approve timesheets, and view profit reports. Your agency's financial pulse at a glance.",
    graphic: "finance",
  },
  {
    title: "Your Agency,\nOne Dashboard",
    subtitle: "Sign in and start running your agency smarter. ThePieCraft CRM — built for agencies that mean business.",
    graphic: "rocket",
  },
];

function PieLogo({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx="70" cy="70" r="60" stroke="#3A58E8" strokeWidth="2" strokeOpacity="0.3" fill="none" />
      {[["#3A58E8", "M70,70 L70,20 C97.6,20 120,42.4 120,70 Z"],
        ["#5F7EF1", "M70,70 L120,70 C120,97.6 97.6,120 70,120 Z"],
        ["#8FA8F7", "M70,70 L70,120 C42.4,120 20,97.6 20,70 Z"],
        ["#BCCDFB", "M70,70 L20,70 C20,42.4 42.4,20 70,20 Z"],
      ].map(([color, path], i) => (
        <motion.path
          key={i}
          d={path}
          fill={color}
          initial={animated ? { opacity: 0, rotate: -90, scale: 0.6, transformOrigin: "70px 70px" } : false}
          animate={animated ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <circle cx="70" cy="70" r="14" fill="#080D1E" />
    </svg>
  );
}

function ClientsIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="60" r="54" stroke="#3A58E8" strokeWidth="1.5" strokeOpacity="0.2" />
      <motion.circle cx="60" cy="60" r="48" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.12" fill="none"
        animate={animated ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      {/* Building */}
      <rect x="28" y="44" width="20" height="28" rx="2" fill="#3A58E8" opacity="0.85" />
      <rect x="31" y="48" width="4" height="4" rx="0.5" fill="#080D1E" opacity="0.5" />
      <rect x="38" y="48" width="4" height="4" rx="0.5" fill="#080D1E" opacity="0.5" />
      <rect x="31" y="55" width="4" height="4" rx="0.5" fill="#080D1E" opacity="0.5" />
      <rect x="38" y="55" width="4" height="4" rx="0.5" fill="#080D1E" opacity="0.5" />
      <rect x="31" y="62" width="14" height="10" rx="1" fill="#5F7EF1" opacity="0.4" />
      {/* Project board */}
      <rect x="56" y="40" width="38" height="26" rx="3" fill="#1e2f87" opacity="0.6" />
      <rect x="60" y="46" width="14" height="3" rx="1.5" fill="#3A58E8" />
      <rect x="60" y="52" width="10" height="3" rx="1.5" fill="#5F7EF1" />
      <rect x="60" y="58" width="12" height="3" rx="1.5" fill="#8FA8F7" />
      {/* Checkmark */}
      <circle cx="84" cy="58" r="8" fill="#14B8A6" opacity="0.2" />
      <motion.path d="M80,58 L83,61 L88,55" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : false}
        animate={animated ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      />
    </svg>
  );
}

function FeaturesIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="60" r="54" stroke="#3A58E8" strokeWidth="1.5" strokeOpacity="0.2" />
      <motion.circle cx="60" cy="60" r="48" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.12" fill="none"
        animate={animated ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      {/* Attendance card */}
      <rect x="24" y="36" width="28" height="18" rx="3" fill="#3A58E8" opacity="0.85" />
      <rect x="28" y="42" width="6" height="2" rx="1" fill="#080D1E" opacity="0.5" />
      <rect x="28" y="47" width="6" height="2" rx="1" fill="#080D1E" opacity="0.5" />
      <circle cx="44" cy="43" r="5" fill="#14B8A6" opacity="0.5" />
      <path d="M42,43 L44,45 L47,41" stroke="#080D1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      {/* Users */}
      <circle cx="80" cy="46" r="9" fill="#5F7EF1" opacity="0.85" />
      <circle cx="80" cy="46" r="3.5" fill="#080D1E" opacity="0.5" />
      <path d="M68,66 C68,58.27 73.36,54 80,54 C86.64,54 92,58.27 92,66" fill="#5F7EF1" opacity="0.85" />
      {/* Timesheet lines */}
      <rect x="28" y="64" width="62" height="2" rx="1" fill="#8FA8F7" opacity="0.5" />
      <rect x="28" y="70" width="48" height="2" rx="1" fill="#8FA8F7" opacity="0.4" />
      <rect x="28" y="76" width="56" height="2" rx="1" fill="#8FA8F7" opacity="0.3" />
    </svg>
  );
}

function FinanceIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="60" r="54" stroke="#3A58E8" strokeWidth="1.5" strokeOpacity="0.2" />
      <motion.circle cx="60" cy="60" r="48" stroke="#3A58E8" strokeWidth="0.5" strokeOpacity="0.12" fill="none"
        animate={animated ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      {/* Invoice document */}
      <rect x="30" y="32" width="24" height="32" rx="3" fill="#3A58E8" opacity="0.85" />
      <rect x="34" y="38" width="16" height="2" rx="1" fill="#080D1E" opacity="0.5" />
      <rect x="34" y="44" width="12" height="2" rx="1" fill="#080D1E" opacity="0.5" />
      <rect x="34" y="50" width="14" height="2" rx="1" fill="#080D1E" opacity="0.5" />
      <rect x="34" y="56" width="8" height="2" rx="1" fill="#14B8A6" opacity="0.5" />
      {/* Chart bars */}
      <rect x="62" y="44" width="6" height="20" rx="1.5" fill="#3A58E8" opacity="0.7" />
      <rect x="72" y="38" width="6" height="26" rx="1.5" fill="#5F7EF1" opacity="0.8" />
      <rect x="82" y="48" width="6" height="16" rx="1.5" fill="#8FA8F7" opacity="0.9" />
      {/* Dollar sign */}
      <motion.text x="74" y="84" textAnchor="middle" fill="#14B8A6" fontSize="14" fontWeight="bold"
        animate={animated ? { opacity: [0.4, 1, 0.4] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >$</motion.text>
      {/* Trend line */}
      <motion.polyline points="62,68 72,62 82,66" stroke="#14B8A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : false}
        animate={animated ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
    </svg>
  );
}

function RocketIcon({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="60" r="54" stroke="#14B8A6" strokeWidth="1.5" strokeOpacity="0.2" />
      <motion.path d="M52,80 Q56,92 60,96 Q64,92 68,80 Z" fill="#8FA8F7"
        animate={animated ? { y: [0, 4, 0] } : {}}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path d="M55,80 Q58,88 60,92 Q62,88 65,80 Z" fill="#BCCDFB"
        animate={animated ? { y: [0, 4, 0] } : {}}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
      />
      <path d="M60,24 L72,44 L70,46 L60,36 L50,46 L48,44 Z" fill="#14B8A6" opacity="0.9" />
      <path d="M58,22 L62,22 L62,32 L58,32 Z" fill="#5F7EF1" />
      <path d="M55,32 L65,32 L68,66 L52,66 Z" fill="#3A58E8" />
      <path d="M54,66 L66,66 L68,80 L52,80 Z" fill="#14B8A6" opacity="0.7" />
      <circle cx="60" cy="46" r="6" fill="#080D1E" />
      <circle cx="60" cy="46" r="3" fill="#5F7EF1" opacity="0.6" />
      {/* Dashboard screens around rocket */}
      <rect x="14" y="50" width="10" height="14" rx="2" fill="#1e2f87" opacity="0.4" />
      <rect x="96" y="44" width="10" height="14" rx="2" fill="#1e2f87" opacity="0.4" />
      {[[82, 34], [92, 26], [34, 40], [42, 28], [16, 46], [100, 36], [100, 60]].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="1.5" fill="#f0f4ff"
          initial={animated ? { opacity: 0, scale: 0 } : false}
          animate={animated ? { opacity: [0, 0.8, 0], scale: [0, 1, 0] } : { opacity: 0.4 }}
          transition={{ duration: 1.5, delay: 0.25 * i, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

const graphics = [PieLogo, ClientsIcon, FeaturesIcon, FinanceIcon, RocketIcon];

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
    if (current < slides.length - 1) {
      go(current + 1);
    } else {
      finish();
    }
  }, [current, go, finish]);

  const Graphic = graphics[current];

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080d1e]">
        <div className="w-8 h-8 border-2 border-[#3a58e8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen min-h-dvh w-full bg-[#080d1e] text-[#f0f4ff] overflow-hidden flex flex-col font-sans selection:bg-[#3a58e8]/30 selection:text-[#8fa8f7]">
      {/* Decorations */}
      <div className="fixed pointer-events-none inset-0 overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#3a58e8]/[0.07] blur-[100px] -top-32 -right-32" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#14B8A6]/[0.04] blur-[100px] -bottom-24 -left-24" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-[#3a58e8]/[0.05] blur-[80px] bottom-32 -right-16" />
      </div>

      {/* Slides */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6 py-20">
        <div className="w-full max-w-[400px] mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60, rotate: direction * 3 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: direction * -60, rotate: direction * -3 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] mb-8 sm:mb-10 shrink-0">
                <Graphic animated={true} />
              </div>

              <h2 className="text-[1.55rem] sm:text-[1.8rem] font-extrabold leading-tight mb-4 bg-gradient-to-b from-[#f0f4ff] to-[#8fa8f7] bg-clip-text text-transparent">
                {slides[current].title}
              </h2>

              <p className="text-[0.88rem] sm:text-[0.93rem] text-[#7b8fc4] leading-relaxed max-w-[340px]">
                {slides[current].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex justify-center gap-2 mb-8">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              i === current ? "w-6 bg-[#3a58e8]" : "w-2 bg-[#1e2f87] hover:bg-[#263aa7]"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 pb-10 max-w-[400px] mx-auto w-full">
        <button
          onClick={finish}
          className="text-sm font-semibold text-[#5f7ef1] py-3 px-4 transition-opacity duration-200 hover:opacity-80 cursor-pointer"
        >
          Skip
        </button>

        <motion.button
          onClick={next}
          whileTap={{ scale: 0.96 }}
          className="bg-gradient-to-r from-[#3a58e8] to-[#5f7ef1] text-white text-[0.9rem] font-semibold px-8 py-[14px] rounded-xl shadow-lg shadow-[#3a58e8]/30 transition-shadow duration-200 hover:shadow-xl hover:shadow-[#3a58e8]/40 cursor-pointer"
        >
          {current < slides.length - 1 ? "Next" : "Get Started"}
        </motion.button>
      </div>
    </div>
  );
}
