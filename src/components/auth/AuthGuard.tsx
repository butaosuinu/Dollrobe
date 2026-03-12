"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { fetchAuthSessionAtom } from "@/stores/authAtoms";

type Props = {
  readonly children: React.ReactNode;
};

const AuthGuard = ({ children }: Props) => {
  const fetchSession = useSetAtom(fetchAuthSessionAtom);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return <>{children}</>;
};

export default AuthGuard;
