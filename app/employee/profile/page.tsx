"use client";

import { useState, useEffect } from "react";
import { User, Save, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser } from "@/app/actions/auth";
import { getFreshUserProfile, updateMyProfile } from "@/app/actions/crm";
import { useToast } from "@/providers/ToastProvider";

export default function EmployeeProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFreshUserProfile().then((res: any) => {
      if (res.success && res.data) {
        setUser(res.data);
        setName(res.data.name || "");
        setEmail(res.data.email || "");
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateMyProfile({ name, email });
    if (res.success) {
      toast("Profile updated successfully", "success");
    } else {
      toast(res.error || "Failed to update profile", "error");
    }
    setSaving(false);
  };

  const workingDaysMap: Record<string, string> = {
    "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
  };
  const workDays = user?.workingDays
    ? user.workingDays.split(",").map((d: string) => workingDaysMap[d] || d).join(", ")
    : "Mon - Fri";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-600" />
            My Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={user?.name || "U"} size="lg" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || "User"}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-brand-600" />
            My Shift Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Working Days</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{workDays}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-brand-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shift Hours</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {user?.shiftStartTime || "09:00 AM"} - {user?.shiftEndTime || "05:00 PM"}
              </p>
            </div>
          </div>
          {user?.activeShiftProfile && (
            <div className="mt-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200/50 dark:border-brand-800/50">
              <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                Profile: {user.activeShiftProfile}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
