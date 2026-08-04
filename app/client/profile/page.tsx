"use client";

import { useState, useEffect } from "react";
import { User, Save, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { updateUserAvatar } from "@/app/actions/auth";
import { getFreshUserProfile, updateMyProfile } from "@/app/actions/crm";
import { useToast } from "@/providers/ToastProvider";
import { clearCurrentUserCache } from "@/lib/currentUserClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ClientProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    getFreshUserProfile().then((res: any) => {
      if (res.success && res.data) {
        setUser(res.data);
        setName(res.data.name || "");
        setEmail(res.data.email || "");
      }
    });
  }, []);

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
      toast("Profile updated successfully", "success");
    } else {
      toast(res.error || "Failed to update profile", "error");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="Account" title="My Profile" description="Update your photo and contact details." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-portal-600" />
            Profile
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
              {uploadingAvatar && <p className="text-[10px] text-portal-600 dark:text-portal-400 font-semibold mt-0.5">Uploading...</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-[#3f3f3f] bg-slate-50 dark:bg-[#303030] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-portal-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-[#3f3f3f] bg-slate-50 dark:bg-[#303030] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-portal-500/40"
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
    </div>
  );
}
