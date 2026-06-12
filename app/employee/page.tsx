"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect, useRef } from "react";
import {
  Clock,
  ChevronsRight,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  User,
  TrendingUp,
  Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCurrentUser } from "@/app/actions/auth";
import {
  getFreshUserProfile,
  getTodayAttendance,
  punchIn,
  punchOut,
} from "@/app/actions/crm";
import { getValidatedLocation } from "@/lib/getLocation";
import { Capacitor } from "@capacitor/core";

export default function EmployeeDashboardPage() {
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attMessage, setAttMessage] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPunching, setIsPunching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hold-to-Punch state
  const [holdProgress, setHoldProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [isNativeApp, setIsNativeApp] = useState(true);

  useEffect(() => {
    // Reliably check if running inside a native Capacitor app
    setIsNativeApp(Capacitor.isNativePlatform());
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, attRes] = await Promise.all([
        getFreshUserProfile(),
        getTodayAttendance(),
      ]);
      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
      } else {
        const currentUser = await getCurrentUser() as any;
        if (currentUser) setUser(currentUser);
      }
      if (attRes.success && attRes.data) {
        setTodayAttendance(attRes.data);
      } else {
        setTodayAttendance(null);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  useEffect(() => {
    let intervalId: any;
    if (todayAttendance?.punchInTime && !todayAttendance?.punchOutTime) {
      const punchInDate = new Date(todayAttendance.punchInTime);
      const update = () => setTimerSeconds(Math.max(0, Math.floor((Date.now() - punchInDate.getTime()) / 1000)));
      update();
      intervalId = setInterval(update, 1000);
    } else if (todayAttendance?.punchInTime && todayAttendance?.punchOutTime) {
      setTimerSeconds(Math.max(0, Math.floor(
        (new Date(todayAttendance.punchOutTime).getTime() - new Date(todayAttendance.punchInTime).getTime()) / 1000
      )));
    } else {
      setTimerSeconds(0);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [todayAttendance]);

  const handlePunchInAction = async () => {
    setIsPunching(true);
    try {
      const loc = await getValidatedLocation();
      if (!loc.ok) {
        toast(loc.message, "error", 2500);
        return;
      }
      const res = await punchIn(loc.lat, loc.lng, loc.bssid || undefined);
      if (res.success) {
        setAttMessage("Punched in successfully! Have a great shift!");
        loadDashboardData();
      } else {
        toast(res.error || "Failed to punch in", "error", 2500);
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error", 2500);
    } finally {
      setIsPunching(false);
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  const handlePunchOutAction = async () => {
    setIsPunching(true);
    try {
      const loc = await getValidatedLocation();
      if (!loc.ok) {
        toast(loc.message, "error", 2500);
        return;
      }
      const res = await punchOut(loc.lat, loc.lng, loc.bssid || undefined);
      if (res.success) {
        setAttMessage("Punched out successfully! Shift logged.");
        loadDashboardData();
      } else {
        toast(res.error || "Failed to punch out", "error", 2500);
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error", 2500);
    } finally {
      setIsPunching(false);
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isPunchedOut || isPunching || isLoading) return;
    if (window.navigator?.vibrate) window.navigator.vibrate(15);
    startTimeRef.current = Date.now();
    const duration = 1000; // 1 second to fill

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(p);

      if (p >= 100) {
        if (window.navigator?.vibrate) window.navigator.vibrate(50);
        if (!todayAttendance) handlePunchInAction();
        else handlePunchOutAction();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePointerUpOrLeave = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (holdProgress < 100) {
      setHoldProgress(0);
    } else {
      setTimeout(() => setHoldProgress(0), 1000);
    }
  };

  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const isPunchedIn = !!(todayAttendance?.punchInTime && !todayAttendance?.punchOutTime);
  const isPunchedOut = !!(todayAttendance?.punchInTime && todayAttendance?.punchOutTime);
  const isNotPunchedYet = !todayAttendance;

  const totalHoursWorked = isPunchedOut
    ? ((new Date(todayAttendance.punchOutTime).getTime() - new Date(todayAttendance.punchInTime).getTime()) / 3600000).toFixed(1)
    : null;

  // ─── Status colour helpers ────────────────────────────────
  const statusRing = isPunchedIn
    ? "ring-1 ring-emerald-500/30 dark:ring-emerald-400/20"
    : isPunchedOut
    ? "ring-1 ring-slate-200/60 dark:ring-slate-700/30"
    : "ring-1 ring-brand-500/20 dark:ring-brand-400/10";

  return (
    <div className="space-y-5 relative pb-52 lg:pb-0">

      {/* Toast banner */}
      {attMessage && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-slate-900 dark:bg-slate-950 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs font-semibold text-white flex items-center gap-3 whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {attMessage}
        </motion.div>
      )}

      {/* Page header */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Home</p>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
          Welcome, {user?.name || "Team Member"}
        </h1>
      </div>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:min-h-[520px]">

        {/* ── LEFT: Clock card + swipe bar ──────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Clock Card */}
          <Card className={`flex-1 overflow-hidden relative rounded-[28px] border-0 shadow-2xl ${statusRing}
            bg-gradient-to-b
            from-slate-800 to-slate-950
            dark:from-[#0c1235] dark:to-[#06090f]
            shadow-slate-400/20 dark:shadow-black/60`}
          >
            {/* Live status glow bar at top */}
            {isPunchedIn && (
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
            )}
            {isPunchedOut && (
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
            )}

            {/* Ambient radial glow */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
              isPunchedIn
                ? "bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(16,185,129,0.08),transparent)]"
                : "bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.07),transparent)]"
            }`} />

            <CardContent className="h-full p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center gap-6 sm:gap-8">

              {/* Status row */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  {isLoading ? "Loading…" : isPunchedIn ? "Time Elapsed" : isPunchedOut ? "Total Shift Hours" : "Working Hours"}
                </span>
                {!isLoading && isPunchedIn && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>

              {/* ── Digit display ─────────────────────────── */}
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                {([
                  { val: hours, label: "HRS" },
                  { val: minutes, label: "MIN" },
                  { val: seconds, label: "SEC" },
                ] as const).map((item, i) => (
                  <div key={item.label} className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                    {i > 0 && (
                      <span className={`text-2xl sm:text-3xl lg:text-4xl font-black select-none mb-4 transition-opacity ${
                        isLoading ? "text-slate-700" : isPunchedIn ? "text-emerald-500/60 animate-pulse" : "text-slate-600/50"
                      }`}>:</span>
                    )}
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Digit box */}
                      <div className={`
                        relative rounded-2xl text-center font-mono font-black tabular-nums select-none
                        px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5
                        min-w-[52px] sm:min-w-[80px] lg:min-w-[104px]
                        text-3xl sm:text-5xl lg:text-6xl
                        border shadow-inner transition-all duration-300
                        bg-slate-900/80 dark:bg-[#0b1020]
                        border-slate-700/50 dark:border-slate-800/60
                        ${isLoading ? "text-slate-700 animate-pulse" : "text-white"}
                        ${!isLoading && isPunchedIn && item.label === "SEC" ? "text-emerald-300" : ""}
                      `}>
                        {pad(item.val)}
                        {/* Inner top highlight */}
                        <span className="absolute inset-x-0 top-0 h-px bg-white/[0.04] rounded-t-2xl" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shift schedule pill — inside clock card */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-slate-800/70 dark:bg-slate-800/50 border border-slate-700/40 rounded-xl px-3.5 py-1.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-300">
                    {user?.shiftStartTime || "10:00 AM"} — {user?.shiftEndTime || "07:30 PM"}
                  </span>
                </div>
                {isPunchedOut && totalHoursWorked && (
                  <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/30 rounded-xl px-3.5 py-1.5">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-400">{totalHoursWorked}h logged</span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Desktop Press & Hold Button */}
          {isNativeApp ? (
            <div className="hidden lg:block space-y-3">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                {isPunchedOut
                  ? "Shift completed for today"
                  : isNotPunchedYet
                  ? "Press and hold to begin shift"
                  : "Press and hold to end shift"}
              </p>
              
              <div
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUpOrLeave}
                onPointerLeave={handlePointerUpOrLeave}
                onContextMenu={(e) => e.preventDefault()}
                className={`relative h-14 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 touch-none select-none border ${
                  isPunchedOut
                    ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50"
                    : isNotPunchedYet
                    ? "bg-white dark:bg-slate-900 border-brand-200 dark:border-brand-900/40 cursor-pointer shadow-sm hover:shadow-md"
                    : "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/40 cursor-pointer shadow-sm hover:shadow-md"
                } ${isPunching ? "opacity-70 pointer-events-none" : ""}`}
              >
                {/* Progress Fill Background */}
                {!isPunchedOut && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 ${
                      isNotPunchedYet ? "bg-brand-500 dark:bg-brand-600" : "bg-rose-500 dark:bg-rose-600"
                    }`}
                    style={{ width: `${holdProgress}%`, transition: holdProgress === 0 ? "width 0.3s ease-out" : "none" }}
                  />
                )}
                
                {/* Text Content */}
                <span className={`relative z-10 text-xs font-black uppercase tracking-widest pointer-events-none flex items-center gap-2 transition-colors ${
                  holdProgress > 50 || isPunchedOut ? "text-white" : isNotPunchedYet ? "text-brand-600 dark:text-brand-400" : "text-rose-600 dark:text-rose-400"
                }`}>
                  {isPunching ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : isPunchedOut ? (
                    "✓ Shift Logged"
                  ) : holdProgress > 0 ? (
                    "Keep Holding..."
                  ) : isNotPunchedYet ? (
                    "Hold to Punch In"
                  ) : (
                    "Hold to Punch Out"
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl p-5 text-center shadow-inner hidden lg:block">
               <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                 Mobile App Required
               </p>
               <p className="text-xs font-medium text-amber-700/80 dark:text-amber-500/80 mt-1">
                 For security and accurate GPS tracking, please use the official PieCraft mobile app to punch in and punch out.
               </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Activity log ────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="h-full rounded-[24px] border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-none overflow-hidden">
            <CardContent className="p-5 lg:p-6 h-full flex flex-col gap-4">

              {isLoading ? (
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-full shrink-0" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <div className="flex-1 flex flex-col gap-2.5">
                    <Skeleton className="h-[72px] w-full rounded-2xl" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-[72px] w-full rounded-2xl" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  {/* Header: date + status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Today's Activity
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
                        {todayStr}
                      </p>
                    </div>

                    {isPunchedIn && (
                      <span className="shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    )}
                    {isPunchedOut && (
                      <span className="shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/40 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </span>
                    )}
                    {isNotPunchedYet && (
                      <span className="shrink-0 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/40 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Event cards */}
                  <div className="flex-1 flex flex-col gap-2">

                    {/* Punch In card */}
                    <div className={`rounded-2xl p-4 border transition-all ${
                      todayAttendance?.punchInTime
                        ? "bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-800/30"
                        : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/20"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            todayAttendance?.punchInTime
                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                              : "bg-slate-100 dark:bg-slate-700/40"
                          }`}>
                            <LogIn className={`h-4 w-4 ${
                              todayAttendance?.punchInTime
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Punch In</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${
                              todayAttendance?.punchInTime
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`}>
                              {todayAttendance?.punchInTime ? "Shift started" : "Not checked in yet"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-mono font-black tabular-nums shrink-0 ${
                          todayAttendance?.punchInTime
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-300 dark:text-slate-700"
                        }`}>
                          {todayAttendance?.punchInTime
                            ? new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                            : "— : —"}
                        </span>
                      </div>
                    </div>

                    {/* Timeline connector */}
                    <div className="flex items-center gap-3 px-2">
                      <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`} />
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                        isPunchedIn ? "text-emerald-500 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"
                      }`}>
                        {isPunchedIn && <Timer className="h-3 w-3" />}
                        <span>{isPunchedIn ? "In Progress" : "→"}</span>
                      </div>
                      <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`} />
                    </div>

                    {/* Punch Out card */}
                    <div className={`rounded-2xl p-4 border transition-all ${
                      todayAttendance?.punchOutTime
                        ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-800/30"
                        : isPunchedIn
                        ? "bg-amber-50/50 dark:bg-amber-950/15 border-amber-200/40 dark:border-amber-800/20"
                        : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/20"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            todayAttendance?.punchOutTime
                              ? "bg-rose-100 dark:bg-rose-900/40"
                              : isPunchedIn
                              ? "bg-amber-100 dark:bg-amber-900/25"
                              : "bg-slate-100 dark:bg-slate-700/40"
                          }`}>
                            <LogOut className={`h-4 w-4 ${
                              todayAttendance?.punchOutTime
                                ? "text-rose-500 dark:text-rose-400"
                                : isPunchedIn
                                ? "text-amber-500 dark:text-amber-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Punch Out</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${
                              todayAttendance?.punchOutTime
                                ? "text-rose-500 dark:text-rose-400"
                                : isPunchedIn
                                ? "text-amber-500 dark:text-amber-400 animate-pulse"
                                : "text-slate-400 dark:text-slate-500"
                            }`}>
                              {todayAttendance?.punchOutTime
                                ? "Shift ended"
                                : isPunchedIn
                                ? "Pending check-out"
                                : "Not checked out"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-mono font-black tabular-nums shrink-0 ${
                          todayAttendance?.punchOutTime
                            ? "text-rose-600 dark:text-rose-300"
                            : "text-slate-300 dark:text-slate-700"
                        }`}>
                          {todayAttendance?.punchOutTime
                            ? new Date(todayAttendance.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                            : "— : —"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary strip */}
                  {isPunchedOut && totalHoursWorked && (
                    <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 rounded-2xl px-4 py-3.5 border border-brand-100 dark:border-brand-800/30">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Total Hours Logged</span>
                      </div>
                      <span className="text-base font-black text-brand-700 dark:text-brand-300 font-mono">{totalHoursWorked}h</span>
                    </div>
                  )}
                  {isNotPunchedYet && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl px-4 py-3.5 border border-slate-100 dark:border-slate-700/30">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-400">Slide right to begin your shift</span>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Mobile Hold-to-Punch (fixed, above nav) ─────────── */}
      {isNativeApp && !isPunchedOut && (
        <div className="lg:hidden fixed bottom-[7rem] left-4 right-4 z-50">
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative h-14 rounded-full overflow-hidden flex items-center justify-center shadow-2xl touch-none select-none border transition-all ${
              isNotPunchedYet
                ? "bg-white dark:bg-slate-900 border-brand-200 dark:border-brand-900/40"
                : "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/40"
            } ${isPunching ? "opacity-70 pointer-events-none" : "active:scale-[0.98]"}`}
          >
            {/* Progress Fill Background */}
            <div
              className={`absolute left-0 top-0 bottom-0 ${
                isNotPunchedYet ? "bg-brand-500" : "bg-rose-500"
              }`}
              style={{ width: `${holdProgress}%`, transition: holdProgress === 0 ? "width 0.3s ease-out" : "none" }}
            />
            
            <span className={`relative z-10 text-xs font-black uppercase tracking-widest pointer-events-none flex items-center gap-2 transition-colors ${
              holdProgress > 50 ? "text-white" : isNotPunchedYet ? "text-brand-600 dark:text-brand-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {isPunching ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : holdProgress > 0 ? (
                "Keep Holding..."
              ) : isNotPunchedYet ? (
                "Hold to Punch In"
              ) : (
                "Hold to Punch Out"
              )}
            </span>
          </div>
        </div>
      )}

      {!isNativeApp && !isPunchedOut && (
        <div className="lg:hidden fixed bottom-[7rem] left-4 right-4 z-50">
          <div className="bg-amber-50 dark:bg-amber-900/90 border border-amber-200 dark:border-amber-700 shadow-2xl rounded-2xl p-4 text-center">
             <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
               Mobile App Required
             </p>
             <p className="text-[11px] font-medium text-amber-700 dark:text-amber-200 mt-1">
               Please use the PieCraft mobile app to punch in.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
