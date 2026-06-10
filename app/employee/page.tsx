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
  TrendingUp
} from "lucide-react";
import { motion, useMotionValue } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCurrentUser } from "@/app/actions/auth";
import { 
  getFreshUserProfile,
  getTodayAttendance,
  punchIn,
  punchOut
} from "@/app/actions/crm";

export default function EmployeeDashboardPage() {
  const { toast, confirmDialog } = useToast();

  const [user, setUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attMessage, setAttMessage] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPunching, setIsPunching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Separate refs + motion values for desktop and mobile swipe bars
  const desktopTrackRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [desktopSliderWidth, setDesktopSliderWidth] = useState(320);
  const [mobileSliderWidth, setMobileSliderWidth] = useState(320);
  const desktopHandleX = useMotionValue(0);
  const mobileHandleX = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      if (desktopTrackRef.current) setDesktopSliderWidth(desktopTrackRef.current.offsetWidth);
      if (mobileTrackRef.current) setMobileSliderWidth(mobileTrackRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load user data and attendance status — fetches run in parallel
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update dynamic stopwatch timer every second
  useEffect(() => {
    let intervalId: any;
    if (todayAttendance && todayAttendance.punchInTime && !todayAttendance.punchOutTime) {
      const punchInDate = new Date(todayAttendance.punchInTime);
      
      const updateTimer = () => {
        const now = new Date();
        const diffMs = now.getTime() - punchInDate.getTime();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        setTimerSeconds(diffSecs);
      };
      
      updateTimer();
      intervalId = setInterval(updateTimer, 1000);
    } else if (todayAttendance && todayAttendance.punchInTime && todayAttendance.punchOutTime) {
      const punchInDate = new Date(todayAttendance.punchInTime);
      const punchOutDate = new Date(todayAttendance.punchOutTime);
      const diffMs = punchOutDate.getTime() - punchInDate.getTime();
      setTimerSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    } else {
      setTimerSeconds(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [todayAttendance]);

  const handlePunchInAction = async () => {
    setIsPunching(true);
    try {
      const res = await punchIn();
      if (res.success) {
        setAttMessage("Punched in successfully! Have a great shift! 🚀");
        loadDashboardData();
      } else {
        toast(res.error || "Failed to punch in", "error");
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error");
    } finally {
      setIsPunching(false);
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  const handlePunchOutAction = async () => {
    setIsPunching(true);
    try {
      const res = await punchOut();
      if (res.success) {
        setAttMessage("Punched out successfully! Shift logged. 👋");
        loadDashboardData();
      } else {
        toast(res.error || "Failed to punch out", "error");
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error");
    } finally {
      setIsPunching(false);
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  // Drag handler — works for both desktop and mobile bars
  const makeDragEnd = (sliderWidth: number, motionX: any) =>
    async (_event: any, info: any) => {
      const threshold = (sliderWidth - 54) * 0.85;
      if (info.offset.x >= threshold || motionX.get() >= threshold) {
        if (!todayAttendance) {
          await handlePunchInAction();
        } else if (!todayAttendance.punchOutTime) {
          await handlePunchOutAction();
        }
      }
      motionX.set(0);
    };

  // Format Stopwatch Numbers
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;
  const padZero = (num: number) => num.toString().padStart(2, "0");

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  // Determine shift status
  const isPunchedIn = todayAttendance && todayAttendance.punchInTime && !todayAttendance.punchOutTime;
  const isPunchedOut = todayAttendance && todayAttendance.punchInTime && todayAttendance.punchOutTime;
  const isNotPunchedYet = !todayAttendance;

  // Calculate total hours worked if punched out
  const totalHoursWorked = isPunchedOut
    ? ((new Date(todayAttendance.punchOutTime).getTime() - new Date(todayAttendance.punchInTime).getTime()) / 3600000).toFixed(1)
    : null;

  return (
    <div className="space-y-5 relative pb-52 lg:pb-0">
      {/* Toast Notification */}
      {attMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs font-semibold text-white animate-fadeIn flex items-center gap-3 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>{attMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Home</p>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
          Welcome, {user?.name || "Team Member"} 👋
        </h1>
      </div>

      {/* Desktop: 2-col layout. Mobile: single col */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:min-h-[520px]">

        {/* Left col: clock card (+ swipe bar inline on desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Main Timer Card — grows to fill column height on desktop */}
          <Card className="flex-1 border-none bg-gradient-to-b from-[#0c1221] to-[#090d16] text-white shadow-2xl rounded-[28px] overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(38,58,167,0.12)_0%,_transparent_70%)] pointer-events-none" />
            {isPunchedIn && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
            )}
            <CardContent className="h-full p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center gap-5 sm:gap-8">
              <div className="text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 block">
                  {isLoading ? "Loading…" : isPunchedIn ? "Time Elapsed" : isPunchedOut ? "Total Shift Hours" : "Working Hours"}
                </span>
                {!isLoading && isPunchedIn && (
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">● Live</span>
                )}
              </div>

              {/* Clock digits */}
              <div className="flex items-center gap-2 sm:gap-4 lg:gap-5">
                {([{ val: hours, label: "Hrs" }, { val: minutes, label: "Min" }, { val: seconds, label: "Sec" }] as const).map((item, i) => (
                  <div key={item.label} className="flex items-center gap-1 sm:gap-3 lg:gap-5">
                    {i > 0 && <span className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-600 select-none pb-5 sm:pb-6 animate-pulse">:</span>}
                    <div className="flex flex-col items-center">
                      <div className={`bg-[#141b2d] border border-slate-700/50 rounded-xl sm:rounded-2xl px-2 py-2 sm:px-4 sm:py-4 lg:px-5 lg:py-5 min-w-[52px] sm:min-w-[76px] lg:min-w-[100px] text-center font-mono text-2xl sm:text-4xl lg:text-6xl font-black shadow-inner tabular-nums transition-all duration-300 ${isLoading ? "text-slate-700 animate-pulse" : "text-white"}`}>
                        {padZero(item.val)}
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mt-1.5 sm:mt-2.5">{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shift info pills */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="bg-slate-800/60 text-[10px] text-slate-400 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-700/40">
                  <Clock className="h-3 w-3" />
                  {user?.shiftStartTime || "10:00 AM"} — {user?.shiftEndTime || "07:30 PM"}
                </div>
                {isPunchedOut && totalHoursWorked && (
                  <div className="bg-emerald-900/30 text-[10px] text-emerald-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-800/40">
                    <TrendingUp className="h-3 w-3" />
                    {totalHoursWorked}h logged
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Swipe bar — desktop only */}
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-3">
              {isPunchedOut ? "Shift completed for today" : isNotPunchedYet ? "Swipe right to punch in" : "Swipe right to punch out"}
            </p>
            <div ref={desktopTrackRef} className={`relative h-14 rounded-full flex items-center justify-center p-1 border shadow-inner select-none transition-all duration-300 overflow-hidden ${isPunchedOut ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60" : isNotPunchedYet ? "bg-gradient-to-r from-[#1e2f87] to-[#263aa7] border-brand-800/30" : "bg-gradient-to-r from-[#be123c] to-[#e11d48] border-rose-600/30"}`}>
              {!isPunchedOut && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-[shimmer_2s_linear_infinite]" />}
              <span className="text-white text-xs font-black uppercase tracking-widest pointer-events-none drop-shadow select-none z-10">
                {isPunchedOut ? "✓ Shift Logged" : isNotPunchedYet ? "Swipe To Punch In →" : "Swipe To Punch Out →"}
              </span>
              {!isPunchedOut && (
                <motion.div drag="x" dragConstraints={{ left: 0, right: desktopSliderWidth - 56 }} dragElastic={{ left: 0, right: 0.1 }} dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }} onDragEnd={makeDragEnd(desktopSliderWidth, desktopHandleX)} style={{ x: desktopHandleX }} className="absolute left-1 top-1 h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing z-20 active:scale-[0.95]">
                  {isPunching ? <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <ChevronsRight className={`h-5 w-5 ${isNotPunchedYet ? "text-[#263aa7]" : "text-[#e11d48]"}`} />}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right col: activity log */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200/80 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] shadow-soft rounded-[24px] overflow-hidden h-full">
            <CardContent className="p-5 lg:p-6 h-full flex flex-col gap-4">

              {isLoading ? (
                /* Activity log skeleton while auth/attendance data loads */
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

              {/* Header: label + date + status badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Today's Activity</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">{todayStr}</p>
                </div>
                {isPunchedIn && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
                {isPunchedOut && (
                  <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/40 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </span>
                )}
                {isNotPunchedYet && (
                  <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/40 shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>

              {/* Shift schedule row */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl px-4 py-3 flex items-center justify-between border border-slate-100 dark:border-slate-700/30">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Shift Hours</span>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">
                  {user?.shiftStartTime || "10:00 AM"} — {user?.shiftEndTime || "07:30 PM"}
                </span>
              </div>

              {/* Event cards */}
              <div className="flex-1 flex flex-col gap-2.5">

                {/* Punch In card */}
                <div className={`rounded-2xl p-4 border transition-all duration-300 ${
                  todayAttendance?.punchInTime
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/30"
                    : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/20"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        todayAttendance?.punchInTime
                          ? "bg-emerald-100 dark:bg-emerald-900/50"
                          : "bg-slate-100 dark:bg-slate-700/50"
                      }`}>
                        <LogIn className={`h-4 w-4 ${todayAttendance?.punchInTime ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Punch In</p>
                        <p className={`text-[11px] font-medium mt-0.5 ${todayAttendance?.punchInTime ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {todayAttendance?.punchInTime ? "Shift started" : "Not checked in yet"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-black tabular-nums shrink-0 ${
                      todayAttendance?.punchInTime ? "text-emerald-700 dark:text-emerald-300" : "text-slate-300 dark:text-slate-600"
                    }`}>
                      {todayAttendance?.punchInTime
                        ? new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                        : "—  :  —"}
                    </span>
                  </div>
                </div>

                {/* Connector */}
                <div className="flex items-center gap-3 px-2">
                  <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    isPunchedIn ? "text-brand-400 dark:text-brand-400" : "text-slate-300 dark:text-slate-600"
                  }`}>
                    {isPunchedIn ? "In Progress" : "→"}
                  </span>
                  <div className={`flex-1 h-px ${todayAttendance?.punchInTime ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`} />
                </div>

                {/* Punch Out card */}
                <div className={`rounded-2xl p-4 border transition-all duration-300 ${
                  todayAttendance?.punchOutTime
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/30"
                    : isPunchedIn
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-800/20"
                      : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/20"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        todayAttendance?.punchOutTime
                          ? "bg-rose-100 dark:bg-rose-900/50"
                          : isPunchedIn
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-slate-100 dark:bg-slate-700/50"
                      }`}>
                        <LogOut className={`h-4 w-4 ${
                          todayAttendance?.punchOutTime ? "text-rose-500 dark:text-rose-400" :
                          isPunchedIn ? "text-amber-500 dark:text-amber-400" :
                          "text-slate-400 dark:text-slate-500"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Punch Out</p>
                        <p className={`text-[11px] font-medium mt-0.5 ${
                          todayAttendance?.punchOutTime ? "text-rose-500 dark:text-rose-400" :
                          isPunchedIn ? "text-amber-500 dark:text-amber-400 animate-pulse" :
                          "text-slate-400 dark:text-slate-500"
                        }`}>
                          {todayAttendance?.punchOutTime ? "Shift ended" : isPunchedIn ? "Pending check-out" : "Not checked out"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-black tabular-nums shrink-0 ${
                      todayAttendance?.punchOutTime ? "text-rose-600 dark:text-rose-300" : "text-slate-300 dark:text-slate-600"
                    }`}>
                      {todayAttendance?.punchOutTime
                        ? new Date(todayAttendance.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                        : "—  :  —"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary strip */}
              {isPunchedOut && totalHoursWorked && (
                <div className="bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-900/20 dark:to-brand-900/20 rounded-2xl px-4 py-3.5 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Total Hours Logged</span>
                  </div>
                  <span className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">{totalHoursWorked}h</span>
                </div>
              )}
              {isNotPunchedYet && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl px-4 py-3.5 border border-slate-100 dark:border-slate-700/30 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-400">Swipe right to begin your shift</span>
                </div>
              )}

              </>
              )}

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Mobile swipe bar — fixed above navbar, hidden once shift fully logged */}
      {!isPunchedOut && (
        <div className="lg:hidden fixed bottom-[7rem] left-4 right-4 z-50">
          <div ref={mobileTrackRef} className={`relative h-14 rounded-full flex items-center justify-center p-1 border shadow-xl select-none overflow-hidden ${isNotPunchedYet ? "bg-gradient-to-r from-[#1e2f87] to-[#263aa7] border-brand-800/30" : "bg-gradient-to-r from-[#be123c] to-[#e11d48] border-rose-600/30"}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-[shimmer_2s_linear_infinite]" />
            <span className="text-white text-xs font-black uppercase tracking-widest pointer-events-none drop-shadow select-none z-10">
              {isNotPunchedYet ? "Swipe To Punch In →" : "Swipe To Punch Out →"}
            </span>
            <motion.div drag="x" dragConstraints={{ left: 0, right: mobileSliderWidth - 56 }} dragElastic={{ left: 0, right: 0.1 }} dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }} onDragEnd={makeDragEnd(mobileSliderWidth, mobileHandleX)} style={{ x: mobileHandleX }} className="absolute left-1 top-1 h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing z-20 active:scale-[0.95]">
              {isPunching ? <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <ChevronsRight className={`h-5 w-5 ${isNotPunchedYet ? "text-[#263aa7]" : "text-[#e11d48]"}`} />}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
