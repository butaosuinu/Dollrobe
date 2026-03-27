"use client";

import { useAtomValue, useSetAtom } from "jotai";
import {
  bulkCaptureStepAtom,
  bulkRegistrationStatusAtom,
  resetBulkCaptureSessionAtom,
} from "@/stores/bulkCaptureAtoms";
import CaptureCamera from "./CaptureCamera";
import BulkMetadataForm from "./BulkMetadataForm";
import BulkRegistrationProgress from "./BulkRegistrationProgress";

const BulkCaptureWizard = () => {
  const step = useAtomValue(bulkCaptureStepAtom);
  const registrationStatus = useAtomValue(bulkRegistrationStatusAtom);
  const resetSession = useSetAtom(resetBulkCaptureSessionAtom);

  return (
    <div className="flex flex-col gap-4">
      {step === "capture" && <CaptureCamera />}
      {step === "metadata" && <BulkMetadataForm />}
      {(step === "registering" || step === "done") && (
        <BulkRegistrationProgress
          status={registrationStatus}
          onReset={resetSession}
        />
      )}
    </div>
  );
};

export default BulkCaptureWizard;
