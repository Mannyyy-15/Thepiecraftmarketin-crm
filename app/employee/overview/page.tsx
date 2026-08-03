import { getOverviewPageData } from "@/app/actions/crm";
import OverviewPage from "./OverviewPage";

export const dynamic = "force-dynamic";

export default async function EmployeeOverviewPage() {
  const res = await getOverviewPageData();
  return <OverviewPage initialData={res.success ? res.data : null} />;
}
