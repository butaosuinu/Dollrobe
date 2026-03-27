import { useEffect, useState } from "react";
import { isNfcSupported } from "@/lib/nfc/capability";

export const useNfcSupported = (): boolean => {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isNfcSupported());
  }, []);

  return supported;
};
