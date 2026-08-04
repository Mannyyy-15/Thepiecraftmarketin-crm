"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CalendarSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getAttendancePageData,
  requestLeave,
} from "@/app/actions/crm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActionCache } from "@/hooks/useActionCache";

function parseShiftTime(t: string) {
  const [time, period] = t.trim().split(/\s+/);
  const [h, m] = time.split(":").map(Number);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return ((hour * 60 + (m || 0)) % 1440 + 1440) % 1440;
}

function shiftDurationMins(start: string, end: string) {
  const diff = parseShiftTime(end) - parseShiftTime(start);
  return diff > 0 ? diff : diff + 1440;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function EmployeeAttendancePage() {
  const { toast, confirmDialog } = useToast();

  // Seeds instantly from the persistent cache on repeat visits (no skeleton
  // flash); the bespoke 30s visibility-aware poll below keeps it fresh —
  // this only fixes the "always blank on first mount" gap, not the polling.
  const cached = useActionCache("employee:getAttendancePageData", getAttendancePageData, { ttlMs: 30_000 });

  const [user, setUser] = useState<any>(cached.data?.user ?? null);

  // --- Attendance & Leave States ---
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(!cached.data);
  const [myAttendanceList, setMyAttendanceList] = useState<any[]>(cached.data?.attendance ?? []);
  const [myLeaves, setMyLeaves] = useState<any[]>(cached.data?.leaves ?? []);
  const [reqLeaveType, setReqLeaveType] = useState("sick");
  const [reqStartDate, setReqStartDate] = useState("");
  const [reqEndDate, setReqEndDate] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [attMessage, setAttMessage] = useState<string | null>(null);

  // Dynamic calendar switcher states
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth());
  });

  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Automatically update start and end dates of leave requests on date select
  const handleSelectDate = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setReqStartDate(dateStr);
    setReqEndDate(dateStr);
  };

  const loadDashboardData = async (showLoader = false) => {
    if (showLoader) setIsAttendanceLoading(true);
    try {
      await cached.refresh(showLoader);
    } catch (err) {
      console.error("Error loading attendance data:", err);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Mirror the cache's data into local state whenever it changes (initial
  // seed, background revalidation, or an explicit refresh() call below).
  useEffect(() => {
    if (!cached.data) return;
    if (cached.data.user) setUser(cached.data.user);
    setMyLeaves(cached.data.leaves);
    setMyAttendanceList(cached.data.attendance);
  }, [cached.data]);

  // Once the hook's own initial fetch settles, drop the skeleton.
  useEffect(() => {
    if (!cached.isLoading) setIsAttendanceLoading(false);
  }, [cached.isLoading]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let running = false;

    const poll = async (showLoader = false) => {
      if (stopped || running || document.visibilityState !== "visible") return;
      running = true;
      try { await loadDashboardData(showLoader); } finally { running = false; }
      if (!stopped && document.visibilityState === "visible") timeout = setTimeout(poll, 30_000);
    };
    const handleVisibilityChange = () => {
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
      if (document.visibilityState === "visible") void poll(false);
    };

    // useActionCache already performs the initial fetch (instant from cache,
    // or a fresh request if none exists) — just schedule the recurring poll.
    timeout = setTimeout(poll, 30_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqStartDate || !reqEndDate || !reqReason.trim()) {
      toast("Please fill in all leave request fields.", "error");
      return;
    }
    try {
      const res = await requestLeave(reqLeaveType, reqStartDate, reqEndDate, reqReason.trim());
      if (res.success) {
        setAttMessage("Leave request submitted successfully!");
        setReqStartDate("");
        setReqEndDate("");
        setReqReason("");
        loadDashboardData();
      } else {
        toast(res.error || "Failed to request leave", "error");
      }
    } catch (err: any) {
      toast("Error: " + err.message, "error");
    }
    setTimeout(() => setAttMessage(null), 4000);
  };

  // Generate calendar cells dynamically based on currentMonth state
  const calendarCells = (() => {
    if (!currentMonth) return [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-indexed (0=Jan, 1=Feb, etc.)
    
    // First day of the active month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, etc.
    
    // Total days in the active month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Total days in the previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const cells = [];
    
    // Padding days from the previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeek: (startDayOfWeek - 1 - i + 7) % 7
      });
    }
    
    // Days in the active month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        dayOfWeek: (startDayOfWeek + d - 1) % 7
      });
    }
    
    // Padding days from the next month to complete the standard 42-cell grid
    const totalGridCells = 42;
    const nextMonthPaddingCount = totalGridCells - cells.length;
    for (let d = 1; d <= nextMonthPaddingCount; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeek: (startDayOfWeek + totalDays + d - 1) % 7
      });
    }
    
    return cells;
  })();

  const userWorkingDays = user?.workingDays
    ? user.workingDays.split(",").map((d: string) => parseInt(d, 10))
    : [1, 2, 3, 4, 5]; // Default Mon-Fri

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
    });
  };

  const holidays: Record<string, string> = {
    "2026-01-01": "New Year's Day",
    "2026-05-01": "Labor / May Day",
    "2026-05-25": "Memorial Day",
    "2026-06-19": "Juneteenth",
    "2026-07-04": "Independence Day",
    "2026-10-02": "Gandhi Jayanti",
    "2026-12-25": "Christmas Day",
  };

  const getCellMeta = (cell: any) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const isToday = cell.dateStr === todayStr;
    const isSelected = selectedCalendarDate === cell.dateStr;
    const isFuture = cell.dateStr > todayStr;
    const isWorkDay = cell.isCurrentMonth && userWorkingDays.includes(cell.dayOfWeek);
    const attRecord = myAttendanceList.find(a => a.date === cell.dateStr);
    const leaveRecord = myLeaves.find(l => cell.dateStr >= l.startDate && cell.dateStr <= l.endDate);
    const holidayName = holidays[cell.dateStr];

    let statusType = "normal";
    let bgBorderClass = "bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#303030]/60";
    let statusLabel = "Normal Work Day";
    let indicatorColor = "";

    if (holidayName) {
      statusType = "holiday";
      bgBorderClass = "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/30 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10";
      statusLabel = `Holiday: ${holidayName}`;
      indicatorColor = "bg-indigo-500";
    } else if (attRecord?.status === "vacation" || attRecord?.status === "on-leave") {
      statusType = "leave-approved";
      bgBorderClass = "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10";
      statusLabel = "Vacation / Holiday";
      indicatorColor = "bg-amber-500";
    } else if (attRecord?.status === "sick") {
      statusType = "sick-leave";
      bgBorderClass = "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10";
      statusLabel = "Sick Leave";
      indicatorColor = "bg-rose-500";
    } else if (attRecord?.status === "off_duty") {
      statusType = "week-off";
      bgBorderClass = "bg-slate-50/50 dark:bg-[#303030]/40 border-slate-100 dark:border-[#303030]/80 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303030]/50";
      statusLabel = "Off Duty";
      indicatorColor = "bg-slate-300 dark:bg-[#3f3f3f]";
    } else if (attRecord?.status === "half-day") {
      statusType = "half-day";
      bgBorderClass = "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/30 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/10";
      statusLabel = "Half Day Shift";
      indicatorColor = "bg-orange-500";
    } else if (attRecord && (attRecord.punchInTime || attRecord.status === "checked_in" || attRecord.status === "present")) {
      statusType = "present";
      bgBorderClass = "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10";
      statusLabel = attRecord.punchInTime
        ? "Punched Present"
        : `Present · Full Day (${formatDuration(shiftDurationMins(user?.shiftStartTime || "09:00 AM", user?.shiftEndTime || "05:00 PM"))})`;
      indicatorColor = "bg-emerald-500";
    } else if (leaveRecord) {
      if (leaveRecord.status === "approved") {
        statusType = "leave-approved";
        bgBorderClass = "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10";
        statusLabel = "Approved Leave";
        indicatorColor = "bg-amber-500";
      } else {
        statusType = "leave-pending";
        bgBorderClass = "bg-amber-500/5 dark:bg-amber-500/10 border-dashed border-amber-500/30 dark:border-amber-500/20 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10";
        statusLabel = "Leave Pending Approval";
        indicatorColor = "bg-amber-400 animate-pulse";
      }
    } else if (isToday) {
      statusType = "today-unpunched";
      bgBorderClass = "bg-slate-50 dark:bg-[#303030] border-dashed border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5";
      statusLabel = "Not Checked In Yet";
      indicatorColor = "bg-slate-400";
    } else if (isFuture) {
      if (isWorkDay) {
        statusType = "scheduled";
        bgBorderClass = "bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#303030]/60";
        statusLabel = "Scheduled Shift";
        indicatorColor = "bg-indigo-500/40";
      } else {
        statusType = "week-off";
        bgBorderClass = "bg-slate-50/50 dark:bg-[#303030]/40 border-slate-100 dark:border-[#303030]/80 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303030]/50";
        statusLabel = "Off Duty (Week Off)";
        indicatorColor = "bg-slate-300 dark:bg-[#3f3f3f]";
      }
    } else { // Past date
      if (isWorkDay) {
        statusType = "absent";
        bgBorderClass = "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10";
        statusLabel = "Absent (No Punch)";
        indicatorColor = "bg-rose-500";
      } else {
        statusType = "week-off";
        bgBorderClass = "bg-slate-50/50 dark:bg-[#303030]/40 border-slate-100 dark:border-[#303030]/80 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303030]/50";
        statusLabel = "Off Duty (Week Off)";
        indicatorColor = "bg-slate-300 dark:bg-[#3f3f3f]";
      }
    }

    if (!cell.isCurrentMonth) {
      bgBorderClass = "opacity-40 bg-slate-50/20 dark:bg-[#1f1f1f]/20 border-transparent text-slate-400 dark:text-slate-600 hover:bg-transparent";
    }

    return {
      statusType,
      bgBorderClass,
      statusLabel,
      indicatorColor,
      isToday,
      isSelected,
      attRecord,
      leaveRecord,
      holidayName
    };
  };

  const todayStr = new Date().toLocaleDateString("en-CA");
  const formattedMonthYear = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const activeSelectedCell = calendarCells.find(c => c.dateStr === selectedCalendarDate);
  const activeSelectedMeta = activeSelectedCell ? getCellMeta(activeSelectedCell) : null;

  const selectedAtt = activeSelectedCell ? myAttendanceList.find(a => a.date === activeSelectedCell.dateStr) : null;

  const selectedDaySummary = (() => {
    if (!selectedAtt) return null;
    const shiftStart = user?.shiftStartTime || "09:00 AM";
    const shiftEnd = user?.shiftEndTime || "05:00 PM";
    if (selectedAtt.status === "vacation" || selectedAtt.status === "on-leave") {
      return { label: "Vacation / Holiday", line: "Approved time off", badge: "bg-amber-500" };
    }
    if (selectedAtt.status === "sick") {
      return { label: "Sick Leave", line: "Reported sick", badge: "bg-rose-500" };
    }
    if (selectedAtt.status === "off_duty") {
      return { label: "Off Duty", line: "Scheduled week off", badge: "bg-slate-300 dark:bg-[#3f3f3f]" };
    }
    if (selectedAtt.status === "half-day") {
      return { label: "Half Day Shift", line: "Half-day work", badge: "bg-orange-500" };
    }
    if (selectedAtt.punchInTime) {
      const pin = new Date(selectedAtt.punchInTime);
      const pout = selectedAtt.punchOutTime ? new Date(selectedAtt.punchOutTime) : null;
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const hours = pout ? Math.max(0, (pout.getTime() - pin.getTime()) / 3600000) : null;
      return {
        label: "Punched Present",
        line: pout
          ? `In ${fmt(pin)} · Out ${fmt(pout)} · ${hours!.toFixed(1)}h worked`
          : `In ${fmt(pin)} · currently on shift`,
        badge: "bg-emerald-500",
      };
    }
    if (selectedAtt.status === "present" || selectedAtt.status === "checked_in") {
      return {
        label: "Present · Full Day",
        line: `${shiftStart} – ${shiftEnd} · ${formatDuration(shiftDurationMins(shiftStart, shiftEnd))} completed`,
        badge: "bg-emerald-500",
      };
    }
    return { label: "Present", line: "Marked present", badge: "bg-emerald-500" };
  })();

  return (
    <div className="space-y-6 relative">
      <PageHeader eyebrow="Time Tracking" title="Attendance & Leave" description="Punch in/out history, calendar, and leave requests." />
      {/* Toast Notification */}
      {attMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-slate-900/90 dark:bg-[#1f1f1f]/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-glow text-xs font-semibold text-white animate-fadeIn flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>{attMessage}</span>
        </div>
      )}

      {/* Grid Layout */}
      {isAttendanceLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <Card className="border-slate-200/80 dark:border-[#303030] shadow-soft rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
                <CalendarSkeleton />
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="rounded-2xl border border-slate-200/80 dark:border-[#303030] p-5 space-y-4">
              <Skeleton className="h-5 w-28" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            </Card>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Calendar History */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200/80 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] shadow-soft rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-[#303030]/60 pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Attendance Timetable
                  </CardTitle>
                </div>

                {/* Calendar Month Switcher */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#303030] border border-slate-200/50 dark:border-[#303030] p-1 rounded-xl w-fit">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[100px] text-center tabular-nums">
                    {formattedMonthYear}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-6">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <span 
                    key={day} 
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                  const {
                    statusType,
                    bgBorderClass,
                    statusLabel,
                    indicatorColor,
                    isToday,
                    isSelected
                  } = getCellMeta(cell);

                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => handleSelectDate(cell.dateStr)}
                      className={`relative aspect-square sm:h-14 w-full rounded-2xl flex flex-col items-center justify-between p-1.5 text-xs font-bold transition-all border duration-200 cursor-pointer ${bgBorderClass} ${
                        isSelected 
                          ? "ring-2 ring-indigo-600 dark:ring-indigo-500 scale-[1.02] shadow-sm z-10" 
                          : ""
                      } ${isToday ? "ring-1 ring-slate-400/50 dark:ring-slate-500/50" : ""}`}
                      title={`${cell.dateStr}: ${statusLabel}`}
                    >
                      <span className={`text-xs ${isToday ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}`}>
                        {cell.dayNumber}
                      </span>
                      {indicatorColor && (
                        <span className={`h-1.5 w-1.5 rounded-full ${indicatorColor} ${isSelected ? "ring-2 ring-white" : ""}`} />
                      )}
                      {isToday && (
                        <span className="absolute top-1 right-1 flex h-1 w-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1 w-1 bg-indigo-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Color Legend */}
          <Card className="border-slate-200/80 dark:border-[#303030]/60 bg-slate-50/50 dark:bg-[#303030]/40 shadow-soft rounded-2xl">
            <CardContent className="p-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Half Day</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Leave Pending</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Approved Leave</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Holiday</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-[#3f3f3f]" /> Week Off</span>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leave Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200/80 dark:border-[#303030]/80 bg-white dark:bg-[#1f1f1f] shadow-soft rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-brand-500" />
            
            <CardHeader className="pb-3">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Daily Log</span>
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>
                  {new Date(selectedCalendarDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {selectedCalendarDate === todayStr && (
                  <Badge variant="brand" className="text-[9px] font-bold uppercase tracking-wider">Today</Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Day Summary */}
              {selectedDaySummary && (
                <div className="rounded-2xl border border-slate-200/70 dark:border-[#303030] bg-slate-50/60 dark:bg-[#303030]/40 p-3.5 space-y-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Day Summary</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {selectedDaySummary.label}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${selectedDaySummary.badge}`} />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {selectedDaySummary.line}
                  </p>
                </div>
              )}

              {/* Leave Form */}
              <form onSubmit={handleRequestLeave} className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                  Apply for Leave
                </span>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Leave Category
                  </label>
                  <select
                    value={reqLeaveType}
                    onChange={(e) => setReqLeaveType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-700 dark:text-slate-300"
                  >
                    <option value="sick">Sick Leave ✚</option>
                    <option value="vacation">Vacation / Holiday ⛱</option>
                    <option value="casual">Casual Leave ☕</option>
                    <option value="other">Other / Special 🌟</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={reqEndDate}
                      onChange={(e) => setReqEndDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Reason
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full justify-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-glow cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
                >
                  Submit Leave Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Leaves Card */}
          <Card className="border-slate-200/80 dark:border-[#303030]/80 bg-slate-50/50 dark:bg-[#303030]/60 shadow-soft rounded-2xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-[#303030]/60">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">History</span>
              <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Recent Leave Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {myLeaves.length === 0 ? (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-3 text-center">No leaves requested yet.</p>
                ) : (
                  myLeaves.slice(-4).reverse().map((leave) => (
                    <div key={leave.id} className="flex justify-between items-center p-3 rounded-xl bg-white/70 dark:bg-[#1f1f1f]/50 border border-slate-200/60 dark:border-[#303030] text-[11px]">
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{leave.leaveType} Leave</span>
                        <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-medium mt-0.5">{leave.startDate} → {leave.endDate}</span>
                      </div>
                      <Badge 
                        variant={leave.status === "approved" ? "success" : leave.status === "rejected" ? "danger" : "warning"} 
                        className="text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 shrink-0"
                      >
                        {leave.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
      )}
    </div>
  );
}
