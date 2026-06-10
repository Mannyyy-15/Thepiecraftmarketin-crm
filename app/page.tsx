"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onboardingDone = localStorage.getItem("tpc_onboarding_done");
    if (onboardingDone === "true") {
      router.replace("/login");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d1e]">
      <div className="w-8 h-8 border-2 border-[#3a58e8] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
