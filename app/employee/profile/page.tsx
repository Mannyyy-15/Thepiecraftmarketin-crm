"use client";

import { useState, useEffect } from "react";
import { User, Save, Clock, CalendarDays, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, updateUserAvatar } from "@/app/actions/auth";
import { getFreshUserProfile, updateMyProfile } from "@/app/actions/crm";
import { useToast } from "@/providers/ToastProvider";
import { clearCurrentUserCache } from "@/lib/currentUserClient";
import { useActionCache } from "@/hooks/useActionCache";

export default function EmployeeProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: cachedProfile, refresh: refreshProfile } = useActionCache("user_profile", getFreshUserProfile);

  useEffect(() => {
    if (cachedProfile) {
      setUser(cachedProfile);
      setName((cachedProfile as any).name || "");
      setEmail((cachedProfile as any).email || "");
    }
  }, [cachedProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await updateUserAvatar(formData);
    if (res.success && res.avatarUrl) {
      clearCurrentUserCache();
      setUser((prev: any) => ({ ...prev, avatarUrl: res.avatarUrl }));
      void refreshProfile(false);
      toast("Profile photo updated!", "success");
    } else {
      toast(res.error || "Failed to upload avatar", "error");
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateMyProfile({ name, email });
    if (res.success) {
      clearCurrentUserCache();
      void refreshProfile(false);
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
            <div className="relative group">
              <Avatar name={user?.name || "U"} src={user?.avatarUrl || undefined} size="lg" />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} disabled={uploadingAvatar} className="hidden" />
              </label>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || "User"}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
              {uploadingAvatar && <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold mt-0.5">Uploading...</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-[#4a4a4a] bg-white dark:bg-[#1f1f1f] px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-[#4a4a4a] bg-white dark:bg-[#1f1f1f] px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Working Days</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{workDays}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
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
