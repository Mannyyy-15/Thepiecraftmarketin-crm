"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createUser } from "@/app/actions/auth";
import { getTeamUsers, getAttendance, bulkUpdateAttendance, deleteUser, updateUserRole, updateUserShiftSchedule, getUserTasks, createTask, toggleTaskStatus, deleteTask, getProjects, assignProjectLead, getPendingLeaves, approveLeave, rejectLeave } from "@/app/actions/crm";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMemberStatusVariant, getMemberStatusLabel } from "@/lib/statusHelpers";
import { MemberGridSkeleton, CalendarSkeleton, Skeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import {
  Mail,
  MoreHorizontal,
  Search,
  UserPlus,
  Users,
  Calendar as CalendarIcon,
  Umbrella,
  Activity,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  Clock,
  Settings,
  ArrowLeft,
  Briefcase,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  TrendingUp,
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";

export default function TeamPage() {
  const { toast, confirmDialog } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("directory");
  const [selectedEmployeeDetailId, setSelectedEmployeeDetailId] = useState<string | null>(
    searchParams.get("member")
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Stateful members list loaded from the database
  const [members, setMembers] = useState<any[]>([]);

  // Invite member form toggle & input fields
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSystemRole, setNewSystemRole] = useState("Web Developer"); // "Web Developer" | "Graphic Designer" | "Video Editor" | "Digital Marketing" | "Admin"

  // Inline role editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState("");

  // Customizable Work Schedule States!
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default: Mon to Fri (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
  const [shiftStartTime, setShiftStartTime] = useState("09:00 AM");
  const [shiftEndTime, setShiftEndTime] = useState("05:00 PM");
  const [activeShiftProfile, setActiveShiftProfile] = useState("Standard Core Hours");

  // Attendance Overrides state from database
  const [attendanceOverrides, setAttendanceOverrides] = useState<Map<string, "present" | "half-day" | "vacation" | "sick" | "off">>(new Map());
  // Raw attendance records including real punchInTime / punchOutTime
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  const todayNumber = new Date().getDate();

  // Leave planner inputs
  const [selectedEmp, setSelectedEmp] = useState("");
  const [startDay, setStartDay] = useState(todayNumber);
  const [endDay, setEndDay] = useState(todayNumber);
  const [startDayInput, setStartDayInput] = useState(String(todayNumber));
  const [endDayInput, setEndDayInput] = useState(String(todayNumber));
  const [leaveType, setLeaveType] = useState<"vacation" | "sick" | "present" | "off">("vacation");
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

  // Calendar click-outside deselect
  const calendarRef = useRef<HTMLDivElement>(null);
  const leaveLoggerRef = useRef<HTMLDivElement>(null);

  // Drag selection states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging]);

  // Deselect calendar date when clicking outside the calendar + leave area
  useEffect(() => {
    if (!selectedEmployeeDetailId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const insideCalendar = calendarRef.current?.contains(e.target as Node);
      const insideLogger = leaveLoggerRef.current?.contains(e.target as Node);
      if (!insideCalendar && !insideLogger) {
        setNewTaskDueDate("");
        setTimeout(() => {
          setStartDay(todayNumber);
          setEndDay(todayNumber);
          setStartDayInput(String(todayNumber));
          setEndDayInput(String(todayNumber));
        }, 0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedEmployeeDetailId]);

  const handleMouseDown = (day: number) => {
    setIsDragging(true);
    setDragStart(day);
    setDragEnd(day);
    setStartDay(day);
    setEndDay(day);
    setStartDayInput(String(day));
    setEndDayInput(String(day));
    setNewTaskDueDate("");
  };

  const handleMouseEnter = (day: number) => {
    if (isDragging && dragStart !== null) {
      setDragEnd(day);
      setStartDay(Math.min(dragStart, day));
      setEndDay(Math.max(dragStart, day));
    }
  };

  const handleMouseUp = (day: number) => {
    if (isDragging && dragStart !== null) {
      const finalStart = Math.min(dragStart, day);
      const finalEnd = Math.max(dragStart, day);
      setStartDay(finalStart);
      setEndDay(finalEnd);
      setStartDayInput(String(finalStart));
      setEndDayInput(String(finalEnd));
      if (finalStart === finalEnd) {
        setNewTaskDueDate(getDateStr(finalStart));
        const cellDateStr = getDateStr(finalStart);
        const selectedEmpData = members.find((m) => m.id === selectedEmployeeDetailId);
        if (selectedEmpData) {
          const isWeekendDay = !selectedEmpData.workingDays.includes(getDayOfWeekIndex(finalStart));
          const status = getEffectiveStatus(selectedEmpData.id, cellDateStr, isWeekendDay);
          const adminStatus: "vacation" | "sick" | "present" | "off" =
            status === "vacation" ? "vacation" : status === "sick" ? "sick" : status === "off" ? "off" : "present";
          setSelectedSingleDateStatus(adminStatus);
        }
      } else {
        setNewTaskDueDate("");
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Live working hours timer for selected employee
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);

  // Assigned workload & tasks states
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [isWorkloadLoading, setIsWorkloadLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("");
  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedSingleDateStatus, setSelectedSingleDateStatus] = useState<"vacation" | "sick" | "present" | "off">("present");

  const loadEmployeeWorkload = async (userId: number) => {
    setIsWorkloadLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        getUserTasks(userId),
        getProjects()
      ]);
      if (tasksRes.success && tasksRes.data) {
        setEmployeeTasks(tasksRes.data);
      }
      if (projectsRes.success && projectsRes.data) {
        setAllProjects(projectsRes.data);
      }
    } catch (err) {
      console.error("Error loading employee workload:", err);
    } finally {
      setIsWorkloadLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeDetailId) {
      loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
    }
  }, [selectedEmployeeDetailId]);

  // Live stopwatch for the selected employee's today attendance
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    const todayStr = new Date().toLocaleDateString("en-CA");
    const rec = selectedEmployeeDetailId
      ? allAttendanceRecords.find(a => String(a.userId) === selectedEmployeeDetailId && a.date === todayStr)
      : null;

    if (rec?.punchInTime && !rec?.punchOutTime) {
      const punchInDate = new Date(rec.punchInTime);
      const tick = () => {
        const diffSecs = Math.max(0, Math.floor((Date.now() - punchInDate.getTime()) / 1000));
        setLiveTimerSeconds(diffSecs);
      };
      tick();
      intervalId = setInterval(tick, 1000);
    } else if (rec?.punchInTime && rec?.punchOutTime) {
      const diffSecs = Math.max(0, Math.floor(
        (new Date(rec.punchOutTime).getTime() - new Date(rec.punchInTime).getTime()) / 1000
      ));
      setLiveTimerSeconds(diffSecs);
    } else {
      setLiveTimerSeconds(0);
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [selectedEmployeeDetailId, allAttendanceRecords]);

  const handleAssignProject = async (projectId: number) => {
    if (!selectedEmployeeDetailId) return;
    try {
      const res = await assignProjectLead(projectId, parseInt(selectedEmployeeDetailId));
      if (res.success) {
        await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
      } else {
        toast(`Error assigning project: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    }
  };

  const handleUnassignProject = async (projectId: number) => {
    if (!selectedEmployeeDetailId) return;
    try {
      const res = await assignProjectLead(projectId, null);
      if (res.success) {
        await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
      } else {
        toast(`Error unassigning project: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    }
  };

  const handleCreateEmployeeTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeDetailId || !newTaskTitle.trim()) return;
    setIsCreatingTask(true);
    try {
      const pId = newTaskProjectId ? parseInt(newTaskProjectId) : null;
      const res = await createTask(parseInt(selectedEmployeeDetailId), newTaskTitle, newTaskPriority, pId, newTaskDueDate || null);
      if (res.success) {
        setNewTaskTitle("");
        setNewTaskProjectId("");
        setNewTaskPriority("medium");
        setNewTaskDueDate("");
        await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
      } else {
        toast(`Error creating task: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleToggleEmployeeTask = async (taskId: number, currentDone: number) => {
    if (!selectedEmployeeDetailId) return;
    // Optimistic UI update
    setEmployeeTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, done: currentDone === 1 ? 0 : 1 } : t)
    );
    try {
      const res = await toggleTaskStatus(taskId, currentDone === 0);
      if (!res.success) {
        await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
        toast(`Error updating task: ${res.error}`, "error");
      }
    } catch (err: any) {
      await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
      toast(`Error: ${err.message}`, "error");
    }
  };

  const handleDeleteEmployeeTask = async (taskId: number) => {
    if (!selectedEmployeeDetailId) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) {
        await loadEmployeeWorkload(parseInt(selectedEmployeeDetailId));
      } else {
        toast(`Error deleting task: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    }
  };

  // Dynamic calendar computed values
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calMonthName = calendarMonth.toLocaleString("default", { month: "long" });
  const calTrailingDays = (7 - (calFirstDayOfWeek + calDaysInMonth) % 7) % 7;

  const getDateStr = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getDayOfWeek = (day: number) => new Date(calYear, calMonth, day).getDay();
  const getDayOfWeekIndex = (day: number) => getDayOfWeek(day);
  const getDayOfWeekName = (day: number) => {
    switch (getDayOfWeek(day)) {
      case 0: return "Sun";
      case 1: return "Mon";
      case 2: return "Tue";
      case 3: return "Wed";
      case 4: return "Thu";
      case 5: return "Fri";
      default: return "Sat";
    }
  };
  const isDayWorking = (day: number) => workingDays.includes(getDayOfWeekIndex(day));

  const prevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const todayDateStr = new Date().toLocaleDateString("en-CA");

  // Derives the real attendance status for a cell — same logic as the employee calendar
  const getEffectiveStatus = (
    userId: string,
    dateStr: string,
    isWeekendDay: boolean
  ): "present" | "half-day" | "vacation" | "sick" | "off" | "absent" | "scheduled" => {
    const key = `${userId}-${dateStr}`;
    const override = attendanceOverrides.get(key);
    if (override) return override;
    if (isWeekendDay) return "off";
    if (dateStr > todayDateStr) return "scheduled";
    return "absent";
  };

  // Returns visual classes for a given effective status (used in both calendars)
  const getStatusStyle = (status: string, compact = false) => {
    switch (status) {
      case "present":
        return compact
          ? { bg: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20", symbol: "✓" }
          : { bg: "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30 hover:border-emerald-500/50", label: "Present", symbol: "✓" };
      case "half-day":
        return compact
          ? { bg: "bg-orange-400 text-white shadow-sm shadow-orange-400/20", symbol: "½" }
          : { bg: "bg-orange-400/10 hover:bg-orange-400/15 text-orange-600 dark:text-orange-400", border: "border-orange-400/30 hover:border-orange-400/50", label: "Half Day", symbol: "½" };
      case "vacation":
        return compact
          ? { bg: "bg-amber-500 text-white shadow-sm shadow-amber-500/20", symbol: "⛱" }
          : { bg: "bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400", border: "border-amber-500/30 hover:border-amber-500/50", label: "Holiday", symbol: "⛱" };
      case "sick":
        return compact
          ? { bg: "bg-rose-500 text-white shadow-sm shadow-rose-500/20", symbol: "✚" }
          : { bg: "bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400", border: "border-rose-500/30 hover:border-rose-500/50", label: "Leave", symbol: "✚" };
      case "absent":
        return compact
          ? { bg: "bg-rose-300 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300", symbol: "✗" }
          : { bg: "bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400", border: "border-rose-300/40 hover:border-rose-400/50 border-dashed", label: "Absent", symbol: "✗" };
      case "scheduled":
        return compact
          ? { bg: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500", symbol: "·" }
          : { bg: "bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-800 hover:border-indigo-400/40", label: "Scheduled", symbol: "·" };
      default: // off
        return compact
          ? { bg: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500", symbol: "-" }
          : { bg: "bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-500", border: "border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700", label: "Week Off", symbol: "✖" };
    }
  };

  // Derives real online/offline status from today's punch-in record
  const getMemberLiveStatus = (memberId: string): "online" | "offline" => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const rec = allAttendanceRecords.find(
      a => String(a.userId) === memberId && a.date === todayStr
    );
    return rec?.punchInTime && !rec?.punchOutTime ? "online" : "offline";
  };

  const loadTeamData = async (showLoader = false) => {
    if (showLoader) setIsTeamLoading(true);
    try {
      const [usersRes, attendanceRes, leavesRes] = await Promise.all([
        getTeamUsers(),
        getAttendance(),
        getPendingLeaves(),
      ]);

      if (usersRes.success && usersRes.data) {
        const mapped = usersRes.data.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          role: u.systemRole || (u.role === "admin" ? "Admin" : "Web Developer"),
          email: u.email,
          roleRaw: u.role,
          status: "online" as const,
          workingDays: u.workingDays ? u.workingDays.split(",").map(Number) : [1, 2, 3, 4, 5],
          shiftStartTime: u.shiftStartTime || "09:00 AM",
          shiftEndTime: u.shiftEndTime || "05:00 PM",
          activeShiftProfile: u.activeShiftProfile || "Standard Core Hours",
        }));
        setMembers(mapped);
        const nonAdmins = mapped.filter((m: any) => m.roleRaw !== "admin");
        if (nonAdmins.length > 0 && !selectedEmp) {
          setSelectedEmp(nonAdmins[0].id);
        }
      }

      if (attendanceRes.success && attendanceRes.data) {
        setAllAttendanceRecords(attendanceRes.data);
        const overrides = new Map<string, "present" | "half-day" | "vacation" | "sick" | "off">();
        attendanceRes.data.forEach((att: any) => {
          if (att.date) {
            let dateStr = att.date;
            if (att.date instanceof Date) {
              dateStr = `${att.date.getFullYear()}-${String(att.date.getMonth() + 1).padStart(2, "0")}-${String(att.date.getDate()).padStart(2, "0")}`;
            } else if (typeof att.date === "string") {
              dateStr = att.date.split("T")[0].split(" ")[0];
            }
            const key = `${att.userId}-${dateStr}`;
            let uiStatus: "present" | "half-day" | "vacation" | "sick" | "off" = "present";
            if (att.status === "checked_in" || att.status === "present") uiStatus = "present";
            else if (att.status === "half-day") uiStatus = "half-day";
            else if (att.status === "vacation" || att.status === "on-leave") uiStatus = "vacation";
            else if (att.status === "sick") uiStatus = "sick";
            else if (att.status === "off_duty") uiStatus = "off";
            overrides.set(key, uiStatus);
          }
        });
        setAttendanceOverrides(overrides);
      }

      if (leavesRes.success && leavesRes.data) {
        setPendingLeaves(leavesRes.data);
      }
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setIsTeamLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData(true);

    // Poll every 10 seconds to keep attendance and leave requests synced
    const intervalId = setInterval(() => {
      loadTeamData(false);
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Load selected employee's custom shift schedule whenever selectedEmp or members changes
  useEffect(() => {
    if (selectedEmp && members.length > 0) {
      const emp = members.find((m) => m.id === selectedEmp);
      if (emp) {
        setWorkingDays(emp.workingDays || [1, 2, 3, 4, 5]);
        setShiftStartTime(emp.shiftStartTime || "09:00 AM");
        setShiftEndTime(emp.shiftEndTime || "05:00 PM");
        setActiveShiftProfile(emp.activeShiftProfile || "Standard Core Hours");
      }
    }
  }, [selectedEmp, members]);

  // Invite handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast("Please fill in all fields (including the password).", "error");
      return;
    }

    const derivedName = newEmail.trim().split("@")[0];

    try {
      const formData = new FormData();
      formData.append("email", newEmail.trim());
      formData.append("password", newPassword);
      const authRole = newSystemRole === "Admin" ? "admin" : "employee";
      formData.append("role", authRole);
      formData.append("systemRole", newSystemRole);

      const result = await createUser(formData);

      if (result.success) {
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setShowInviteForm(false);
        toast(`Successfully invited ${derivedName} to the team! Their account is now active in the database.`, "success");
        loadTeamData();
      } else {
        toast(`Failed to create account: ${result.error}`, "error");
      }
    } catch (err: any) {
      toast(`System error: ${err.message || "Failed to connect to database."}`, "error");
    }
  };

  // Remove member handler
  const handleRemoveMember = async (id: string, name: string) => {
    if (await confirmDialog(`Are you sure you want to remove ${name} from the active roster?`)) {
      try {
        const result = await deleteUser(parseInt(id));
        if (result.success) {
          toast(`Successfully removed ${name} from the active roster.`, "success");
          loadTeamData();
        } else {
          toast(`Failed to remove member: ${result.error}`, "error");
        }
      } catch (err: any) {
        toast(`Error: ${err.message}`, "error");
      }
    }
  };

  // Role update handler
  const handleSaveRole = async (id: string) => {
    try {
      const targetRole = editRoleValue === "Admin" ? "admin" : "employee";
      const result = await updateUserRole(parseInt(id), targetRole, editRoleValue);
      if (result.success) {
        toast("System role updated successfully.", "success");
        setEditingMemberId(null);
        loadTeamData();
      } else {
        toast(`Failed to update role: ${result.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    }
  };

  // Leave planner handler
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    let dbStatus = "checked_in";
    if (leaveType === "vacation") dbStatus = "vacation";
    else if (leaveType === "sick") dbStatus = "sick";
    else if (leaveType === "off") dbStatus = "off_duty";

    try {
      let errors = false;
      for (let d = startDay; d <= endDay; d++) {
        if (d >= 1 && d <= calDaysInMonth) {
          const formattedDate = getDateStr(d);
          const result = await bulkUpdateAttendance(parseInt(selectedEmp), formattedDate, dbStatus);
          if (!result.success) {
            errors = true;
          }
        }
      }

      if (errors) {
        toast("Some leave days could not be saved to database.", "info");
      } else {
        toast(`Successfully logged status updates for the team member in the database!`, "success");
      }
      loadTeamData();
    } catch (err: any) {
      toast(`Error applying leave: ${err.message}`, "error");
    }
  };

  // Single date individual category toggle/save handler
  const handleSingleDateStatusSave = async (day: number, selectedStatus: "vacation" | "sick" | "present" | "off") => {
    if (!selectedEmployeeDetailId) return;

    const formattedDate = getDateStr(day);
    const key = `${selectedEmployeeDetailId}-${formattedDate}`;
    const current = attendanceOverrides.get(key) ?? "present";

    setAttendanceOverrides(prev => new Map(prev).set(key, selectedStatus));

    let dbStatus = "checked_in";
    if (selectedStatus === "vacation") dbStatus = "vacation";
    else if (selectedStatus === "sick") dbStatus = "sick";
    else if (selectedStatus === "off") dbStatus = "off_duty";

    try {
      const result = await bulkUpdateAttendance(parseInt(selectedEmployeeDetailId), formattedDate, dbStatus);
      if (!result.success) {
        toast(`Failed to save attendance: ${result.error}`, "error");
        setAttendanceOverrides(prev => new Map(prev).set(key, current));
      } else {
        toast(`Successfully saved status update for ${calMonthName} ${day}, ${calYear}!`, "success");
        await loadTeamData();
      }
    } catch (err: any) {
      toast(`Error updating attendance: ${err.message}`, "error");
      setAttendanceOverrides(prev => new Map(prev).set(key, current));
    }
  };


  // Save custom schedule to the database for the selected employee
  const handleSaveShiftSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) {
      toast("Please select a team member first.", "error");
      return;
    }
    
    const emp = members.find((m) => m.id === selectedEmp);
    const empName = emp ? emp.name : "the team member";

    try {
      const result = await updateUserShiftSchedule(
        parseInt(selectedEmp),
        workingDays.join(","),
        shiftStartTime.trim(),
        shiftEndTime.trim(),
        activeShiftProfile
      );

      if (result.success) {
        toast(`Successfully saved shift hours & operational days for ${empName} in the database!`, "success");
        await loadTeamData();
      } else {
        toast(`Failed to save shift schedule: ${result.error}`, "error");
      }
    } catch (err: any) {
      toast(`System error: ${err.message || "Failed to save schedule to database."}`, "error");
    }
  };

  // Direct toggle on calendar cell
  const handleCellClick = async (employeeId: string, day: number) => {
    const emp = members.find((u) => u.id === employeeId);
    if (!emp) return;
    const dayOfWeekIdx = getDayOfWeekIndex(day);
    const isWeekendDay = !emp.workingDays.includes(dayOfWeekIdx);
    const formattedDate = getDateStr(day);
    const key = `${employeeId}-${formattedDate}`;
    const current = getEffectiveStatus(employeeId, formattedDate, isWeekendDay);

    let next: "present" | "vacation" | "sick" | "off";
    if (current === "present") next = "vacation";
    else if (current === "vacation") next = "sick";
    else if (current === "sick") next = "off";
    else next = "present";

    setAttendanceOverrides(prev => new Map(prev).set(key, next));

    let dbStatus = "checked_in";
    if (next === "vacation") dbStatus = "vacation";
    else if (next === "sick") dbStatus = "sick";
    else if (next === "off") dbStatus = "off_duty";

    const result = await bulkUpdateAttendance(parseInt(employeeId), formattedDate, dbStatus);
    if (!result.success) {
      toast(`Failed to save attendance: ${result.error}`, "error");
      setAttendanceOverrides(prev => {
        const reverted = new Map(prev);
        if (current === "absent" || current === "scheduled") {
          reverted.delete(key);
        } else {
          reverted.set(key, current as "present" | "half-day" | "vacation" | "sick" | "off");
        }
        return reverted;
      });
    }
  };

  const handleApproveLeave = async (leaveId: number) => {
    try {
      const res = await approveLeave(leaveId);
      if (res.success) {
        toast("Leave request approved successfully! ⛱", "success");
        await loadTeamData();
      } else {
        toast(`Failed to approve leave: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error approving leave: ${err.message}`, "error");
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    try {
      const res = await rejectLeave(leaveId);
      if (res.success) {
        toast("Leave request rejected successfully.", "success");
        await loadTeamData();
      } else {
        toast(`Failed to reject leave: ${res.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error rejecting leave: ${err.message}`, "error");
    }
  };

  const filteredTeam = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {!selectedEmployeeDetailId && (
        <>
          {/* Tab bar + invite button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("directory")}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "directory"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Directory
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "attendance"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Attendance
              </button>
            </div>
            <Button size="md" onClick={() => setShowInviteForm(!showInviteForm)} className="w-full sm:w-auto justify-center bg-brand-600 hover:bg-brand-700 text-white font-bold">
              <UserPlus className="h-4 w-4 mr-1" />
              Invite Member
            </Button>
          </div>

          {/* Invite Member Drawer Form */}
          {showInviteForm && (
            <Card className="border border-brand-500/30 bg-brand-50/10 dark:bg-brand-500/5 animate-fadeIn">
              <CardHeader className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <UserPlus className="h-4.5 w-4.5 text-indigo-500" /> Add New Employee to Roster
                    </CardTitle>
                  </div>
                  <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="john@piecraft.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Password for login"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      System Role
                    </label>
                    <select
                      value={newSystemRole}
                      onChange={(e) => setNewSystemRole(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                    >
                      <option value="Web Developer">Web Developer</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Button type="submit" className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm">
                      Add Member
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* KPI stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Active Team Size" value={`${members.filter(m => m.roleRaw !== "admin").length}`} change="+1" changeType="positive" accent="brand" icon={<Users className="h-5 w-5" />} />
            <KpiCard title="System Role Types" value={`${new Set(members.filter(m => m.roleRaw !== "admin").map(m => m.role)).size}`} change="Designated" changeType="positive" accent="emerald" icon={<Settings className="h-5 w-5" />} />
            <KpiCard title="Online Now" value={`${members.filter((t) => t.roleRaw !== "admin" && getMemberLiveStatus(t.id) === "online").length}`} accent="amber" icon={<Activity className="h-5 w-5" />} />
            <KpiCard title="Leave Today" value={`${members.filter(t => { const s = t.roleRaw !== "admin" && attendanceOverrides.get(`${t.id}-22`); return s === "vacation" || s === "sick"; }).length}`} accent="rose" />
          </div>
        </>
      )}

      {activeTab === "directory" ? (
        selectedEmployeeDetailId ? (
          (() => {
            const selectedEmpData = members.find((m) => m.id === selectedEmployeeDetailId);
            if (!selectedEmpData) {
              return (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-500 font-semibold">Employee profile not loaded.</p>
                  <Button onClick={() => setSelectedEmployeeDetailId(null)} className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700">
                    Back to Directory
                  </Button>
                </div>
              );
            }
            return (
              <div className="space-y-6">
                {/* Back button */}
                <div>
                  <button
                    onClick={() => setSelectedEmployeeDetailId(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Directory</span>
                  </button>
                </div>

                {/* Meta Header Card */}
                <Card className="border border-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-500/5 backdrop-blur-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar name={selectedEmpData.name} size="lg" status={getMemberLiveStatus(selectedEmpData.id)} />
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedEmpData.name}</h2>
                            <Badge variant={getMemberStatusVariant(getMemberLiveStatus(selectedEmpData.id))} dot>
                              {getMemberStatusLabel(getMemberLiveStatus(selectedEmpData.id))}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-brand-600 dark:text-indigo-400 mt-1">{selectedEmpData.role}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                            <a href={`mailto:${selectedEmpData.email}`} className="hover:underline">{selectedEmpData.email}</a>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-right">
                        <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl text-left min-w-[140px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Shift Hours</p>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-white mt-1.5 leading-none">
                            {selectedEmpData.shiftStartTime} - {selectedEmpData.shiftEndTime}
                          </p>
                        </div>
                        <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl text-left min-w-[140px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active Profile</p>
                          <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 leading-none truncate max-w-[150px]" title={selectedEmpData.activeShiftProfile}>
                            {selectedEmpData.activeShiftProfile}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Working Hours */}
                {(() => {
                  const todayStr = new Date().toLocaleDateString("en-CA");
                  const todayRec = allAttendanceRecords.find(
                    a => String(a.userId) === selectedEmpData.id && a.date === todayStr
                  );
                  const isPunchedIn = !!(todayRec?.punchInTime && !todayRec?.punchOutTime);
                  const isPunchedOut = !!(todayRec?.punchInTime && todayRec?.punchOutTime);

                  const hrs = Math.floor(liveTimerSeconds / 3600);
                  const mins = Math.floor((liveTimerSeconds % 3600) / 60);
                  const secs = liveTimerSeconds % 60;
                  const pad = (n: number) => n.toString().padStart(2, "0");

                  const punchInDisplay = todayRec?.punchInTime
                    ? new Date(todayRec.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : null;
                  const punchOutDisplay = todayRec?.punchOutTime
                    ? new Date(todayRec.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : null;
                  const totalHours = isPunchedOut
                    ? ((new Date(todayRec!.punchOutTime).getTime() - new Date(todayRec!.punchInTime).getTime()) / 3600000).toFixed(1)
                    : null;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      {/* Dark timer card */}
                      <Card className="lg:col-span-3 border-none bg-gradient-to-b from-[#0c1221] to-[#090d16] text-white shadow-xl rounded-[24px] overflow-hidden relative">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(38,58,167,0.12)_0%,_transparent_70%)] pointer-events-none" />
                        {isPunchedIn && (
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
                        )}
                        <CardContent className="p-5 sm:p-7 flex flex-col items-center justify-center gap-4 min-h-[180px]">
                          <div className="text-center">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 block">
                              {isPunchedIn ? "Time Elapsed — Live" : isPunchedOut ? "Total Shift Hours" : "Today's Working Hours"}
                            </span>
                            {isPunchedIn && (
                              <span className="text-[10px] text-emerald-400 font-semibold mt-1 block animate-pulse">● Currently Active</span>
                            )}
                            {!todayRec?.punchInTime && (
                              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Not started today</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            {([{ val: hrs, label: "Hrs" }, { val: mins, label: "Min" }, { val: secs, label: "Sec" }]).map((item, i) => (
                              <div key={item.label} className="flex items-center gap-2 sm:gap-3">
                                {i > 0 && (
                                  <span className={`text-xl sm:text-2xl font-black text-slate-600 select-none pb-4 ${isPunchedIn ? "animate-pulse" : ""}`}>:</span>
                                )}
                                <div className="flex flex-col items-center">
                                  <div className="bg-[#141b2d] border border-slate-700/50 rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 min-w-[50px] sm:min-w-[68px] text-center font-mono text-2xl sm:text-3xl font-black text-white shadow-inner tabular-nums">
                                    {pad(item.val)}
                                  </div>
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mt-1.5">{item.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-center">
                            <div className="bg-slate-800/60 text-[10px] text-slate-400 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-700/40">
                              <Clock className="h-3 w-3" />
                              {selectedEmpData.shiftStartTime} — {selectedEmpData.shiftEndTime}
                            </div>
                            {isPunchedOut && totalHours && (
                              <div className="bg-emerald-900/30 text-[10px] text-emerald-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-800/40">
                                <TrendingUp className="h-3 w-3" />
                                {totalHours}h logged
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Activity Log */}
                      <Card className="lg:col-span-2 border border-slate-200/80 dark:border-[#1e2b5e] bg-slate-50/50 dark:bg-[#0d1230] rounded-[24px] overflow-hidden">
                        <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
                            Today's Activity Log
                          </h3>
                          <div className="flex-1 space-y-0 relative pl-5 border-l-2 border-slate-200 dark:border-[#1e2b5e]">
                            {/* Punch In */}
                            <div className="relative pb-7">
                              <span className={`absolute -left-[17px] top-0.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-[#0d1230] transition-colors ${
                                todayRec?.punchInTime ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-slate-700"
                              }`} />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <LogIn className={`h-4 w-4 ${todayRec?.punchInTime ? "text-emerald-500" : "text-slate-400"}`} />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Punch In</span>
                                </div>
                                <span className="text-sm font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400">
                                  {punchInDisplay ?? "— —"}
                                </span>
                              </div>
                              {todayRec?.punchInTime && (
                                <p className="text-xs text-slate-400 font-medium mt-1 ml-6">Shift started</p>
                              )}
                            </div>
                            {/* Punch Out */}
                            <div className="relative">
                              <span className={`absolute -left-[17px] top-0.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-[#0d1230] transition-colors ${
                                todayRec?.punchOutTime ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-slate-300 dark:bg-slate-700"
                              }`} />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <LogOut className={`h-4 w-4 ${todayRec?.punchOutTime ? "text-rose-500" : "text-slate-400"}`} />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Punch Out</span>
                                </div>
                                <span className="text-sm font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400">
                                  {punchOutDisplay ?? "— —"}
                                </span>
                              </div>
                              {isPunchedOut && (
                                <p className="text-xs text-slate-400 font-medium mt-1 ml-6">Shift ended · {totalHours}h total</p>
                              )}
                              {isPunchedIn && (
                                <p className="text-xs text-brand-500 dark:text-brand-400 font-medium mt-1 ml-6 animate-pulse">Active — awaiting check-out</p>
                              )}
                              {!todayRec?.punchInTime && (
                                <p className="text-xs text-slate-400 font-medium mt-1 ml-6">Not started today</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Sub layout grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
                  {/* Left Column: Monthly Calendar layout */}
                  <Card ref={calendarRef} className="lg:col-span-2 overflow-hidden border border-slate-200 dark:border-slate-800/80">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={prevMonth}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={nextMonth}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <CalendarIcon className="h-5 w-5 text-indigo-500" /> {calMonthName} {calYear} Monthly Attendance
                            </CardTitle>
                          </div>
                        </div>
                        {/* Color Legend */}
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500 block shrink-0" /> Present</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-orange-400 block shrink-0" /> Half Day</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-400 block shrink-0 border border-dashed border-rose-400" /> Absent</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-amber-500 block shrink-0" /> Holiday</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-500 block shrink-0" /> Leave</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 block shrink-0" /> Off</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 select-none">
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-2 text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 dark:text-slate-400 mb-2 sm:mb-3">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                          <div key={dayName} className="py-1">{dayName}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
                        {/* Leading empty cells */}
                        {Array.from({ length: calFirstDayOfWeek }).map((_, idx) => (
                          <div key={`empty-start-${idx}`} className="aspect-square bg-slate-50/10 dark:bg-slate-900/5 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800/20 opacity-20" />
                        ))}
                        {/* Days of the month */}
                        {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map((day) => {
                          const dayOfWeekIdx = getDayOfWeekIndex(day);
                          const isWeekendDay = !selectedEmpData.workingDays.includes(dayOfWeekIdx);
                          const cellDateStr = getDateStr(day);
                          const status = getEffectiveStatus(selectedEmpData.id, cellDateStr, isWeekendDay);
                          const style = getStatusStyle(status, false) as any;
                          const isSelectedForTask = newTaskDueDate === cellDateStr;
                          const tasksForDay = employeeTasks.filter((t) => t.dueDate === cellDateStr);
                          const taskCount = tasksForDay.length;
                          const isInRange = (!newTaskDueDate && day >= startDay && day <= endDay) || (isDragging && dragStart !== null && dragEnd !== null && day >= Math.min(dragStart, dragEnd) && day <= Math.max(dragStart, dragEnd));

                          return (
                            <button
                              key={day}
                              type="button"
                              onMouseDown={(e) => { if (e.button === 0) handleMouseDown(day); }}
                              onMouseEnter={() => handleMouseEnter(day)}
                              onMouseUp={() => handleMouseUp(day)}
                              className={cn(
                                "aspect-square sm:aspect-auto sm:min-h-[95px] h-auto w-full rounded-2xl border p-1 sm:p-2 flex flex-col items-center sm:items-start justify-between transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-98 relative group/cell",
                                style.bg,
                                style.border,
                                isSelectedForTask && "ring-2 ring-indigo-500 border-indigo-500 scale-[1.02] shadow-[0_0_12px_rgba(99,102,241,0.3)] z-10",
                                isInRange && !isSelectedForTask && "ring-2 ring-indigo-500/70 dark:ring-indigo-500/60 bg-indigo-500/20 dark:bg-indigo-500/30 scale-[1.02] z-10 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                              )}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className="text-[10px] sm:text-[11px] font-bold leading-none">{day}</span>
                                {taskCount > 0 && (
                                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-500/25 dark:bg-indigo-500/35 text-indigo-700 dark:text-indigo-300 text-[8.5px] font-extrabold shadow-sm shrink-0">
                                    {taskCount}T
                                  </span>
                                )}
                              </div>

                              {tasksForDay.length > 0 && (
                                <div className="hidden sm:block w-full mt-1.5 space-y-1 text-left">
                                  {tasksForDay.slice(0, 2).map((t: any) => {
                                    const linkedProj = allProjects.find((p: any) => p.id === t.projectId);
                                    return (
                                      <div
                                        key={t.id}
                                        className="text-[8px] font-bold truncate w-full px-1 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-250 border border-indigo-200/25"
                                        title={t.title}
                                      >
                                        {linkedProj ? `[${linkedProj.name.slice(0, 5)}] ` : ""}{t.title}
                                      </div>
                                    );
                                  })}
                                  {tasksForDay.length > 2 && (
                                    <div className="text-[7.5px] font-extrabold text-indigo-600 dark:text-indigo-400 pl-1 leading-none">
                                      +{tasksForDay.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Mobile: status dot */}
                              <span className={cn(
                                "h-1.5 w-1.5 rounded-full sm:hidden shrink-0",
                                status === "present" ? "bg-emerald-500" :
                                status === "half-day" ? "bg-orange-400" :
                                status === "vacation" ? "bg-amber-500" :
                                status === "sick" ? "bg-rose-500" :
                                status === "absent" ? "bg-rose-400" :
                                status === "scheduled" ? "bg-slate-300 dark:bg-slate-600" :
                                "bg-slate-200 dark:bg-slate-700"
                              )} />

                              {/* Desktop: symbol + label */}
                              <div className="hidden sm:flex items-center gap-1 mt-auto pt-1 w-full border-t border-slate-200/10 dark:border-slate-800/10">
                                <span className="text-xs font-bold">{style.symbol}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{style.label?.split(" ")[0]}</span>
                              </div>
                            </button>
                          );
                        })}
                        {/* Trailing empty cells */}
                        {Array.from({ length: calTrailingDays }).map((_, idx) => (
                          <div key={`empty-end-${idx}`} className="aspect-square bg-slate-50/10 dark:bg-slate-900/5 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800/20 opacity-20" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Column: Scoped Sidebar Editors */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Scoped Leave Logger Card */}
                    <Card ref={leaveLoggerRef} className="h-fit border border-slate-200 dark:border-slate-800/80">
                      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 py-4">
                        <div className="flex justify-between items-center gap-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <Umbrella className="h-4.5 w-4.5 text-amber-500" /> Log Employee Leave
                          </CardTitle>
                          {newTaskDueDate && (
                            <button
                              type="button"
                              onClick={() => setNewTaskDueDate("")}
                              className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-all cursor-pointer flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/50 px-2.5 py-0.5 rounded-full shrink-0"
                            >
                              <X className="h-3 w-3" /> Clear Selection
                            </button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-5">
                        {(() => {
                          const calMonthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-`;
                          const isSingleDateSelected = newTaskDueDate && newTaskDueDate.startsWith(calMonthPrefix);
                          if (isSingleDateSelected) {
                            const selectedSingleDay = parseInt(newTaskDueDate.split("-")[2]);

                            return (
                              <div className="space-y-4">
                                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center shadow-sm">
                                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    📅 Selected Date: {calMonthName} {selectedSingleDay}, {calYear}
                                  </p>
                                </div>

                                <div className="space-y-2.5">
                                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                                    Select Attendance Status
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSingleDateStatus("vacation")}
                                      className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                        selectedSingleDateStatus === "vacation"
                                          ? "border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                      }`}
                                    >
                                      <span>⛱ Holiday</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSingleDateStatus("sick")}
                                      className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                        selectedSingleDateStatus === "sick"
                                          ? "border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-450 shadow-sm ring-1 ring-rose-500/30"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                      }`}
                                    >
                                      <span>✚ Leave</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSingleDateStatus("present")}
                                      className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                        selectedSingleDateStatus === "present"
                                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 shadow-sm ring-1 ring-emerald-500/30"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                      }`}
                                    >
                                      <span>✓ Present</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSingleDateStatus("off")}
                                      className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                        selectedSingleDateStatus === "off"
                                          ? "border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 shadow-sm ring-1 ring-slate-500/30"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                      }`}
                                    >
                                      <span>✖ Week Off</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                  <Button
                                    type="button"
                                    onClick={() => handleSingleDateStatusSave(selectedSingleDay, selectedSingleDateStatus)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 py-2.5 shadow-md text-xs rounded-xl transition-all hover:shadow-lg"
                                  >
                                    Save Leave Status
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          // Range Leave Logger Form (Fallback)
                          return (
                            <form onSubmit={handleApplyLeave} className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-750 dark:text-slate-350 uppercase tracking-widest mb-1.5">
                                  Status Category
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setLeaveType("vacation")}
                                    className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                      leaveType === "vacation"
                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30"
                                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                    }`}
                                  >
                                    <span>⛱ Holiday</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLeaveType("sick")}
                                    className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                      leaveType === "sick"
                                        ? "border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-450 shadow-sm ring-1 ring-rose-500/30"
                                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                    }`}
                                  >
                                    <span>✚ Leave</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLeaveType("present")}
                                    className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                      leaveType === "present"
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 shadow-sm ring-1 ring-emerald-500/30"
                                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                    }`}
                                  >
                                    <span>✓ Present</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLeaveType("off")}
                                    className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 ${
                                      leaveType === "off"
                                        ? "border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 shadow-sm ring-1 ring-slate-500/30"
                                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-250"
                                    }`}
                                  >
                                    <span>✖ Week Off</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest mb-1.5 font-bold">
                                    Start Day ({calMonthName})
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={startDayInput}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/\D/g, "");
                                      setStartDayInput(v);
                                      if (v !== "") {
                                        const n = Math.max(1, Math.min(calDaysInMonth, parseInt(v, 10)));
                                        setStartDay(n);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value.replace(/\D/g, "");
                                      if (v === "") {
                                        setStartDayInput(String(todayNumber));
                                        setStartDay(todayNumber);
                                      } else {
                                        const n = Math.max(1, Math.min(calDaysInMonth, parseInt(v, 10)));
                                        setStartDayInput(String(n));
                                        setStartDay(n);
                                      }
                                    }}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest mb-1.5 font-bold">
                                    End Day ({calMonthName})
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={endDayInput}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/\D/g, "");
                                      setEndDayInput(v);
                                      if (v !== "") {
                                        const n = Math.max(1, Math.min(calDaysInMonth, parseInt(v, 10)));
                                        setEndDay(n);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value.replace(/\D/g, "");
                                      if (v === "") {
                                        setEndDayInput(String(todayNumber));
                                        setEndDay(todayNumber);
                                      } else {
                                        const n = Math.max(1, Math.min(calDaysInMonth, parseInt(v, 10)));
                                        setEndDayInput(String(n));
                                        setEndDay(n);
                                      }
                                    }}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                                  />
                                </div>
                              </div>

                              <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 py-2.5 shadow-md shadow-brand-500/10 text-xs rounded-xl"
                              >
                                <Plus className="h-4 w-4" /> Apply Leave Log
                              </Button>
                            </form>
                          );
                        })()}
                      </CardContent>
                    </Card>


                  </div>
                </div>

                {/* Assigned Workload Card */}
                <div className="space-y-6">
                  {/* Tasks & To-Dos */}
                  <Card className="border border-slate-200 dark:border-slate-800/80 shadow-md">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-brand-500" /> Employee Tasks
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 flex items-center gap-2">
                           Manage assigned tasks and workload.
                        </CardDescription>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <select
                          value={selectedFilterProjectId}
                          onChange={(e) => {
                            setSelectedFilterProjectId(e.target.value);
                            setNewTaskProjectId(e.target.value);
                          }}
                          className="h-10 w-full sm:w-56 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm font-bold focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                        >
                          <option value="">All Projects</option>
                          {allProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        
                        {!isWorkloadLoading && (
                          <div className="flex gap-2 shrink-0">
                            <Badge variant="brand" className="font-bold">
                              {employeeTasks.filter((t: any) => (!selectedFilterProjectId || String(t.projectId) === selectedFilterProjectId) && t.done === 1).length} Done
                            </Badge>
                            <Badge variant="neutral" className="font-bold">
                              {employeeTasks.filter((t: any) => (!selectedFilterProjectId || String(t.projectId) === selectedFilterProjectId)).length} Total
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {isWorkloadLoading ? (
                        <div className="p-6 space-y-4">
                          <Skeleton className="h-12 w-full rounded-xl" />
                          <TaskListSkeleton count={4} />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          
                          {/* Add Task Input Row (Inline Style) */}
                          <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/80">
                            <form onSubmit={handleCreateEmployeeTask} className="flex flex-col xl:flex-row items-start xl:items-center gap-3">
                              <div className="flex-1 w-full">
                                <input
                                  type="text"
                                  required
                                  placeholder={selectedFilterProjectId ? "Add a task to the selected project..." : "Select a project above to add a task, or add standalone task..."}
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  className="h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 shadow-sm text-slate-800 dark:text-white"
                                />
                              </div>
                              
                              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
                                <input
                                  type="date"
                                  value={newTaskDueDate}
                                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                                  className="h-11 w-full sm:w-40 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white dark:[color-scheme:dark]"
                                />
                                
                                <select
                                  value={newTaskPriority}
                                  onChange={(e) => setNewTaskPriority(e.target.value)}
                                  className={`h-11 w-full sm:w-36 rounded-xl border px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                                    newTaskPriority === "high" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800" :
                                    newTaskPriority === "medium" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                                    "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  <option value="low">Low Priority</option>
                                  <option value="medium">Medium Priority</option>
                                  <option value="high">High Priority</option>
                                </select>
                                
                                <Button type="submit" disabled={isCreatingTask} className="h-11 w-full sm:w-32 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md">
                                  {isCreatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Task"}
                                </Button>
                              </div>
                            </form>
                          </div>

                          {/* Task List */}
                          <div className="p-4 sm:p-6 space-y-3 max-h-[500px] overflow-y-auto">
                            {(() => {
                              const filteredTasks = employeeTasks.filter((t: any) => {
                                if (selectedFilterProjectId && String(t.projectId) !== selectedFilterProjectId) return false;
                                return true;
                              });
                                
                              if (filteredTasks.length === 0) {
                                return (
                                  <div className="py-12 flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                      <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">All caught up!</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center max-w-[200px]">
                                      {selectedFilterProjectId ? "No tasks for this project." : "This employee has an empty workload."}
                                    </p>
                                  </div>
                                );
                              }

                              return filteredTasks.map((t: any) => {
                                const linkedProj = allProjects.find((p: any) => p.id === t.projectId);
                                return (
                                  <div
                                    key={t.id}
                                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                                      t.done === 1
                                        ? "border-slate-200/60 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-900/20 opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
                                        : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-start gap-4">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEmployeeTask(t.id, t.done)}
                                        className={`mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                          t.done === 1
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-slate-300 dark:border-slate-600 bg-transparent text-transparent hover:border-emerald-400"
                                        }`}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      
                                      <div className="space-y-1">
                                        <p className={`text-sm font-bold leading-tight ${t.done === 1 ? "line-through text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                                          {t.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                          {linkedProj && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">
                                              <Briefcase className="h-3 w-3" /> {linkedProj.name}
                                            </span>
                                          )}
                                          {t.dueDate && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                              <CalendarIcon className="h-3 w-3" /> {new Date(t.dueDate + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pl-10 sm:pl-0">
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                                          t.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" :
                                          t.priority === "medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                                          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                      >
                                        {t.priority} Priority
                                      </span>
                                      
                                      <button
                                        onClick={() => handleDeleteEmployeeTask(t.id)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 lg:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Member-specific Leave Requests */}
                <Card className="border border-slate-200 dark:border-slate-800/80">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Umbrella className="h-5 w-5 text-amber-500" /> Leave Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    {(() => {
                      const memberLeaves = pendingLeaves.filter(
                        (l: any) => String(l.userId) === selectedEmployeeDetailId
                      );
                      if (memberLeaves.length === 0) {
                        return (
                          <EmptyState icon={<Umbrella className="h-5 w-5" />} title="No leave requests" description="This team member has no pending leave requests." />
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {memberLeaves.map((leave: any) => (
                            <div
                              key={leave.id}
                              className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                                    leave.leaveType === "sick" ? "text-rose-500" : "text-amber-500"
                                  }`}>
                                    {leave.leaveType === "sick" ? "✚ Sick Leave" : "⛱ Vacation Leave"}
                                  </span>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    {leave.startDate} — {leave.endDate}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    leave.status === "pending"
                                      ? "warning"
                                      : leave.status === "approved"
                                      ? "success"
                                      : "neutral"
                                  }
                                  className="text-[9px] uppercase"
                                >
                                  {leave.status}
                                </Badge>
                              </div>
                              {leave.reason && (
                                <p className="text-[10px] text-slate-500 italic bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900 leading-relaxed">
                                  {leave.reason}
                                </p>
                              )}
                              {leave.status === "pending" && (
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => handleRejectLeave(leave.id)}
                                    className="flex-1 py-1.5 border border-rose-200 dark:border-rose-900/40 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-450 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-all"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleApproveLeave(leave.id)}
                                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[9px] font-extrabold uppercase tracking-wider text-white rounded-lg cursor-pointer transition-all shadow-sm shadow-emerald-500/10"
                                  >
                                    Approve
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            );
          })()
        ) : isTeamLoading ? (
          <MemberGridSkeleton count={6} />
      ) : (
          <div className="space-y-6">
            {/* Search bar */}
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, role, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-slate-800 dark:text-white"
              />
            </div>

            {/* Roster Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTeam.map((m) => {
                const isNonAdmin = m.roleRaw !== "admin";
                return (
                  <Card
                    key={m.id}
                    onClick={() => {
                      if (isNonAdmin) {
                        setSelectedEmployeeDetailId(m.id);
                        setSelectedEmp(m.id);
                      }
                    }}
                    className={`overflow-hidden hover:shadow-glow transition-all relative group ${
                      isNonAdmin ? "cursor-pointer hover:border-indigo-500/50" : ""
                    }`}
                  >
                    
                    {/* Delete / Remove Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMember(m.id, m.name);
                      }}
                      className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all"
                      title="Remove Employee"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="relative h-16 bg-brand-hero">
                      <div className="absolute -bottom-6 left-4">
                        <Avatar name={m.name} size="lg" status={getMemberLiveStatus(m.id)} />
                      </div>
                    </div>

                    <CardContent className="pt-9">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                          
                          {/* Interactive Role Assignment */}
                          {editingMemberId === m.id ? (
                            <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={editRoleValue}
                                onChange={(e) => setEditRoleValue(e.target.value)}
                                className="h-7 w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-2 text-[10px] focus:outline-none"
                              >
                                <option value="Web Developer">Web Developer</option>
                                <option value="Graphic Designer">Graphic Designer</option>
                                <option value="Video Editor">Video Editor</option>
                                <option value="Digital Marketing">Digital Marketing</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveRole(m.id);
                                }}
                                className="h-7 w-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5 group/role cursor-pointer" onClick={(e) => {
                              e.stopPropagation();
                              setEditingMemberId(m.id);
                              setEditRoleValue(m.role);
                            }}>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight group-hover/role:text-brand-600">
                                {m.role}
                              </span>
                              <Edit2 className="h-2.5 w-2.5 text-slate-350 opacity-0 group-hover/role:opacity-100" />
                            </div>
                          )}
                        </div>
                        <Badge variant={getMemberStatusVariant(getMemberLiveStatus(m.id))} dot>{getMemberStatusLabel(getMemberLiveStatus(m.id))}</Badge>
                      </div>

                      {/* Today's live punch status */}
                      {(() => {
                        const todayStr = new Date().toLocaleDateString("en-CA");
                        const rec = allAttendanceRecords.find(a => String(a.userId) === m.id && a.date === todayStr);
                        const pIn = rec?.punchInTime ? new Date(rec.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) : null;
                        const pOut = rec?.punchOutTime ? new Date(rec.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) : null;
                        if (!pIn) return null;
                        return (
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <span className={`w-1.5 h-1.5 rounded-full ${!pOut ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"}`} />
                              In {pIn}
                            </span>
                            {pOut && <span className="text-rose-500">· Out {pOut}</span>}
                          </div>
                        );
                      })()}

                      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <a
                          href={`mailto:${m.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{m.email}</span>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      ) : isTeamLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="w-full space-y-6">
          {/* Top Panel: Pending Leaves & Today's Punch List */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Pending Leave Requests Queue */}
            <Card className="xl:col-span-1 overflow-hidden flex flex-col h-[280px]">
              <CardHeader className="py-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <CardTitle className="text-xs font-extrabold flex items-center gap-2 uppercase tracking-wider text-slate-800 dark:text-white">
                  <Umbrella className="h-4.5 w-4.5 text-amber-500" /> Pending Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto flex-1">
                {pendingLeaves.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState icon={<Umbrella className="h-5 w-5" />} title="No pending requests" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div key={leave.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">{leave.employeeName}</p>
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 capitalize block mt-0.5">{leave.leaveType} Leave</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-200/50 dark:bg-slate-805 px-2 py-0.5 rounded-full shrink-0">
                            {leave.startDate} to {leave.endDate}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 italic bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-900 leading-normal">{leave.reason}</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            className="flex-1 py-1.5 border border-rose-200 dark:border-rose-900/40 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-450 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[9px] font-extrabold uppercase tracking-wider text-white rounded-lg cursor-pointer transition-all shadow-sm shadow-emerald-500/10"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Attendance Overview */}
            <Card className="xl:col-span-2 overflow-hidden flex flex-col h-[280px]">
              <CardHeader className="py-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <CardTitle className="text-xs font-extrabold flex items-center gap-2 uppercase tracking-wider text-slate-800 dark:text-white">
                  <Activity className="h-4.5 w-4.5 text-indigo-500 animate-pulse" /> Today's Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                <div className="overflow-x-auto w-full h-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/80">
                        <th className="py-2.5 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                        <th className="py-2.5 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Roster Status</th>
                        <th className="py-2.5 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Punch In</th>
                        <th className="py-2.5 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Punch Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {members.filter(m => m.roleRaw !== "admin").map((m) => {
                        const todayStr = new Date().toLocaleDateString("en-CA");
                        const todayRecord = allAttendanceRecords.find(
                          (a) => String(a.userId) === m.id && a.date === todayStr
                        );
                        const punchedIn = !!todayRecord?.punchInTime;
                        const punchedOut = !!todayRecord?.punchOutTime;
                        const overrideStatus = attendanceOverrides.get(`${m.id}-${todayStr}`);
                        const onLeave = overrideStatus === "sick" || overrideStatus === "vacation";

                        const punchInDisplay = todayRecord?.punchInTime
                          ? new Date(todayRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                          : null;
                        const punchOutDisplay = todayRecord?.punchOutTime
                          ? new Date(todayRecord.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                          : null;

                        let statusLabel = "Not In";
                        let statusCls = "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:border-slate-800";
                        if (onLeave) {
                          statusLabel = overrideStatus === "sick" ? "Sick Leave" : "On Leave";
                          statusCls = "bg-rose-500/10 text-rose-500 border border-rose-500/20";
                        } else if (punchedIn && !punchedOut) {
                          statusLabel = "Active";
                          statusCls = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
                        } else if (punchedIn && punchedOut) {
                          statusLabel = "Done";
                          statusCls = "bg-brand-50 text-brand-600 border border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800/40";
                        }

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={m.name} size="sm" status={punchedIn && !punchedOut ? "online" : "offline"} />
                                <div className="min-w-0 text-left">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{m.name}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold truncate">{m.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${statusCls}`}>
                                {punchedIn && !punchedOut && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {punchInDisplay ?? <span className="text-slate-400">—</span>}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {punchOutDisplay ?? <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Attendance Calendar Card (Full Width) */}
          <Card className="w-full overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-indigo-500" /> {calMonthName} {calYear} Shift Schedule Grid
                    </CardTitle>
                  </div>
                </div>
                {/* Color Legend */}
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block shrink-0" /> Present</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 block shrink-0" /> Half Day</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-rose-300 block shrink-0" /> Absent</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" /> Holiday</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 block shrink-0" /> Leave</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700 block shrink-0" /> Off</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <div className="min-w-[900px] divide-y divide-slate-100 dark:divide-slate-800/80">
                  
                  {/* Days Header */}
                  <div className="flex bg-slate-50/50 dark:bg-slate-900/20 py-2.5">
                    <div className="w-44 pl-6 shrink-0 flex items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Member</span>
                    </div>
                    <div className="flex-1 flex justify-between pr-4">
                      {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map((day) => {
                        const dowName = getDayOfWeekName(day);
                        const isWeekendDay = dowName === "Sun" || dowName === "Sat";
                        return (
                          <div
                            key={day}
                            className={`w-6 flex flex-col items-center justify-center shrink-0 ${
                              isWeekendDay ? "opacity-40" : ""
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-slate-400">{dowName[0]}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Employee Rows */}
                  {members.filter((m) => m.roleRaw !== "admin").map((m) => (
                    <div key={m.id} className="flex py-3 items-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      
                      {/* Employee metadata column */}
                      <div className="w-44 pl-6 shrink-0 flex items-center gap-2.5">
                        <Avatar name={m.name} size="sm" status={getMemberLiveStatus(m.id)} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{m.role}</p>
                        </div>
                      </div>

                      {/* Day cells columns */}
                      <div className="flex-1 flex justify-between pr-4">
                        {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map((day) => {
                          const dayOfWeekIdx = getDayOfWeekIndex(day);
                          const isWeekendDay = !m.workingDays.includes(dayOfWeekIdx);
                          const cellDate = getDateStr(day);
                          const key = `${m.id}-${cellDate}`;
                          const status = getEffectiveStatus(m.id, cellDate, isWeekendDay);
                          const compactStyle = getStatusStyle(status, true) as any;

                          return (
                            <div
                              key={day}
                              className={`w-6 h-6 rounded-lg text-[9px] font-extrabold flex items-center justify-center shrink-0 transition-all ${compactStyle.bg}`}
                              title={`${m.name} — ${calMonthName} ${day}: ${status}`}
                            >
                              {compactStyle.symbol}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))}

                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
