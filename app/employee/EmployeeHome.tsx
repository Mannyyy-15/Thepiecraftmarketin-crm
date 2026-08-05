"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  User,
  TrendingUp,
  Timer,
  MapPin,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getFreshUserProfile,
  getTodayAttendance,
  punchIn,
  punchOut,
} from "@/app/actions/crm";
import { useActionCache } from "@/hooks/useActionCache";
import { getValidatedLocation } from "@/lib/getLocation";
import SlideToPunch from "@/components/SlideToPunch";

function ShiftTimerDigits({ attendance, isLoading }: { attendance: any; isLoading: boolean }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const punchInTime = attendance?.punchInTime;
    const punchOutTime = attendance?.punchOutTime;
    if (!punchInTime) {
      setElapsedSeconds(0);
      return;
    }
    const startMs = new Date(punchInTime).getTime();
    const endMs = punchOutTime ? new Date(punchOutTime).getTime() : Date.now();
    const diff = Math.max(0, Math.floor((endMs - startMs) / 1000));
    setElapsedSeconds(diff);

    if (punchOutTime) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attendance?.punchInTime, attendance?.punchOutTime]);

  const isLive = Boolean(attendance?.punchInTime && !attendance?.punchOutTime);
  const values = [
    { val: Math.floor(elapsedSeconds / 3600), label: "HRS" },
    { val: Math.floor((elapsedSeconds % 3600) / 60), label: "MIN" },
    { val: elapsedSeconds % 60, label: "SEC" },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
      {values.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {i > 0 && (
            <span className={`text-2xl sm:text-3xl lg:text-4xl font-black select-none mb-4 transition-opacity ${
              isLoading ? "text-slate-300 dark:text-slate-700" : isLive ? "text-emerald-500 animate-pulse" : "text-slate-400 dark:text-slate-600"
            }`}>:</span>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`
              relative rounded-2xl text-center font-mono font-black tabular-nums select-none
              px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5
              min-w-[56px] sm:min-w-[84px] lg:min-w-[104px]
              text-3xl sm:text-5xl lg:text-6xl
              border transition-all duration-200
              bg-slate-50 dark:bg-[#26262a]
              border-slate-200 dark:border-[#38383e]
              ${isLoading ? "text-slate-300 dark:text-slate-700 animate-pulse" : "text-slate-900 dark:text-white"}
              ${!isLoading && isLive && item.label === "SEC" ? "text-emerald-600 dark:text-emerald-400" : ""}
            `}>
              {item.val.toString().padStart(2, "0")}
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {item.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmployeeHomeProps {
  initialProfile?: any;
  initialAttendance?: any;
}

export default function EmployeeHome({ initialProfile, initialAttendance }: EmployeeHomeProps) {
  const { toast } = useToast();

  const [user, setUser] = useState<any>(initialProfile ?? null);
  const [todayAttendance, setTodayAttendance] = useState<any>(initialAttendance ?? null);
  const [attMessage, setAttMessage] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [noLocationConfigured, setNoLocationConfigured] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  const { data: cachedProfile, refresh: refreshProfile } = useActionCache("user_profile", getFreshUserProfile);
  const { data: cachedAttendance, isLoading: attendanceLoading, refresh: refreshAttendance } = useActionCache("today_attendance", getTodayAttendance);

  useEffect(() => {
    if (cachedProfile) setUser(cachedProfile);
  }, [cachedProfile]);

  useEffect(() => {
    if (cachedAttendance) {
      const todayStr = new Date().toLocaleDateString("en-CA");
      if (cachedAttendance.date && cachedAttendance.date !== todayStr) {
        setTodayAttendance(null);
      } else {
        setTodayAttendance(cachedAttendance);
      }
    }
  }, [cachedAttendance]);

  const isLoading = attendanceLoading && !initialAttendance;

  useEffect(() => {
    let active = true;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (active) setIsNativeApp(Capacitor.isNativePlatform());
    });
    return () => { active = false; };
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([refreshProfile(false), refreshAttendance(false)]);
  };

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
        setNoLocationConfigured(false);
        loadDashboardData();
      } else {
        if (res.code === "NO_LOCATION") {
          setNoLocationConfigured(true);
        } else {
          toast(res.error || "Failed to punch in", "error", 2500);
        }
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
        setNoLocationConfigured(false);
        loadDashboardData();
      } else {
        if (res.code === "NO_LOCATION") {
          setNoLocationConfigured(true);
        } else {
          toast(res.error || "Failed to punch out", "error", 2500);
        }
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error", 2500);
    } finally {
      setIsPunching(false);
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  // Single entry point for the slide-to-punch control: punch in if not yet in,
  // otherwise punch out. Awaited so the slider shows its processing state.
  const handleSlideComplete = async () => {
    if (isPunching || isLoading) return;

    if (isNativeApp) {
      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Securely authenticate to log your attendance.",
            title: "Employee Verification",
            subtitle: "Please verify it's you",
          });
        }
      } catch (err: any) {
        toast("Authentication failed or was canceled.", "error", 2500);
        // Throwing here will stop the slider's 'onComplete' from succeeding
        // so it resets automatically.
        throw new Error("Biometric auth failed");
      }
    }

    if (!todayAttendance) await handlePunchInAction();
    else if (!todayAttendance.punchOutTime) await handlePunchOutAction();
  };

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
    <div className="space-y-5 relative pb-24 lg:pb-0">

      {/* Toast banner */}
      {attMessage && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-slate-900 dark:bg-[#1f1f1f] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs font-semibold text-white flex items-center gap-3 whitespace-nowrap"
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
          <Card className="flex-1 overflow-hidden relative rounded-[24px] border border-slate-200/80 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] shadow-sm">
            {/* Live status bar at top */}
            {isPunchedIn && (
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
            )}
            {isPunchedOut && (
              <div className="absolute top-0 inset-x-0 h-1 bg-slate-300 dark:bg-slate-700" />
            )}

            <CardContent className="h-full p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center gap-6">

              {/* Status row */}
              <div className="flex flex-col items-center gap-1">
                {isLoading ? (
                  <Skeleton className="h-2.5 w-28" />
                ) : (
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {isPunchedIn ? "Time Elapsed" : isPunchedOut ? "Total Shift Hours" : "Working Hours"}
                  </span>
                )}
                {!isLoading && isPunchedIn && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Punched In — Live
                  </span>
                )}
                {!isLoading && isNotPunchedYet && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#2a2a2e] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#38383e] mt-1">
                    Not Punched In Yet
                  </span>
                )}
                {!isLoading && isPunchedOut && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#2a2a2e] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#38383e] mt-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Shift Completed
                  </span>
                )}
              </div>

              {/* ── Digit display ─────────────────────────── */}
              <ShiftTimerDigits attendance={todayAttendance} isLoading={isLoading} />

              {/* Shift schedule pill — inside clock card */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#26262a] border border-slate-200 dark:border-[#38383e] rounded-xl px-3.5 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {user?.shiftStartTime || "10:00 AM"} — {user?.shiftEndTime || "07:30 PM"}
                  </span>
                </div>
                {isPunchedOut && totalHoursWorked && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3.5 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{totalHoursWorked}h logged</span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {noLocationConfigured && (
            <EmptyState
              icon={<MapPin className="h-6 w-6 text-amber-500" />}
              title="Office location not set up"
              description="Your admin needs to configure the office location in Settings → Office & Punch before you can punch in."
              className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 py-6"
            />
          )}

          {/* Desktop Slide-to-Punch */}
          <div className="hidden lg:block space-y-3">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
              {isPunchedOut
                ? "Shift completed for today"
                : isNotPunchedYet
                ? "Slide to begin your shift"
                : "Slide to end your shift"}
            </p>

            {isPunchedOut ? (
              <div className="relative h-[60px] rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#303030] border border-slate-200 dark:border-[#303030] opacity-60">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Shift Logged
                </span>
              </div>
            ) : (
              <SlideToPunch
                variant={isNotPunchedYet ? "in" : "out"}
                loading={isPunching}
                onComplete={handleSlideComplete}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: Activity log ────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="h-full rounded-[24px] border border-slate-200 dark:border-[#303030]/60 bg-white dark:bg-[#303030]/80 shadow-sm dark:shadow-none overflow-hidden">
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
                        Today&apos;s Activity
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
                      <span className="shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-[#303030]/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#3f3f3f]/40 mt-0.5">
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
                        : "bg-slate-50 dark:bg-[#303030]/30 border-slate-100 dark:border-[#3f3f3f]/20"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            todayAttendance?.punchInTime
                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                              : "bg-slate-100 dark:bg-[#3f3f3f]/40"
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
                      <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-[#3f3f3f]" : "bg-slate-100 dark:bg-[#303030]"}`} />
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                        isPunchedIn ? "text-emerald-500 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"
                      }`}>
                        {isPunchedIn && <Timer className="h-3 w-3" />}
                        <span>{isPunchedIn ? "In Progress" : "→"}</span>
                      </div>
                      <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-[#3f3f3f]" : "bg-slate-100 dark:bg-[#303030]"}`} />
                    </div>

                    {/* Punch Out card */}
                    <div className={`rounded-2xl p-4 border transition-all ${
                      todayAttendance?.punchOutTime
                        ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-800/30"
                        : "bg-slate-50 dark:bg-[#303030]/30 border-slate-100 dark:border-[#3f3f3f]/20"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            todayAttendance?.punchOutTime
                              ? "bg-rose-100 dark:bg-rose-900/40"
                              : "bg-slate-100 dark:bg-[#3f3f3f]/40"
                          }`}>
                            <LogOut className={`h-4 w-4 ${
                              todayAttendance?.punchOutTime
                                ? "text-rose-500 dark:text-rose-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Punch Out</p>
                            <p className="text-[11px] font-medium mt-0.5 text-slate-400 dark:text-slate-500">
                              {todayAttendance?.punchOutTime
                                ? "Shift ended"
                                : "Not checked out yet"}
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
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#303030]/40 rounded-2xl px-4 py-3.5 border border-slate-100 dark:border-[#3f3f3f]/30">
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

      {/* ── Mobile Slide-to-Punch (fixed, above nav) ─────────── */}
      {!isPunchedOut && (
        <div className="lg:hidden fixed bottom-[7rem] left-4 right-4 z-50">
          <div className="rounded-full shadow-2xl">
            <SlideToPunch
              variant={isNotPunchedYet ? "in" : "out"}
              loading={isPunching}
              onComplete={handleSlideComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
