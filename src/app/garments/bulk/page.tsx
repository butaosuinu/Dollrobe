"use client";

import { Trans } from "@lingui/react/macro";
import BulkCaptureWizard from "@/components/garment/bulk/BulkCaptureWizard";
import PageHeader from "@/components/ui/PageHeader";

const BulkCapturePage = () => (
  <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
    <PageHeader title={<Trans>連続撮影</Trans>} backHref="/garments" />

    <BulkCaptureWizard />
  </div>
);

export default BulkCapturePage;
