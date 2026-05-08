"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";

const LandingAuthRedirect = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAtomValue(authSessionUnwrappedAtom);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  return undefined;
};

export default LandingAuthRedirect;
