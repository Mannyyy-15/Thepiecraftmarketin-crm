import { getFreshUserProfile, getTodayAttendance } from "@/app/actions/crm";
import EmployeeHome from "./EmployeeHome";

export const dynamic = "force-dynamic";

export default async function EmployeeHomePage() {
  const [profile, attendance] = await Promise.all([
    getFreshUserProfile(),
    getTodayAttendance(),
  ]);
  return (
    <EmployeeHome
      initialProfile={profile.success ? profile.data : null}
      initialAttendance={attendance.success ? attendance.data : null}
    />
  );
}
