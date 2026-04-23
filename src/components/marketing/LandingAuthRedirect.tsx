"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

const LandingAuthRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const state = { cancelled: false };
    const check = async () => {
      const session = await getSession().catch(() => undefined);
      if (state.cancelled) return;
      if (session?.data !== undefined) {
        router.replace("/dashboard");
      }
    };
    void check();
    return () => {
      state.cancelled = true;
    };
  }, [router]);

  return undefined;
};

export default LandingAuthRedirect;
