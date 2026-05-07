"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Camera, Upload } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import GarmentForm from "@/components/garment/GarmentForm";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const NewGarmentPage = () => (
  <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
    <PageHeader title={<Trans>服を登録</Trans>} backHref="/garments" />

    <div className="flex gap-2 rounded-lg bg-surface-overlay p-3 text-sm">
      <Link
        href="/garments/bulk"
        className="flex items-center gap-1.5 text-primary-500 hover:text-primary-600"
      >
        <Camera className="size-4" />
        <Trans>連続撮影</Trans>
      </Link>
      <span className="text-text-tertiary">|</span>
      <Link
        href="/garments/import"
        className="flex items-center gap-1.5 text-primary-500 hover:text-primary-600"
      >
        <Upload className="size-4" />
        <Trans>CSVインポート</Trans>
      </Link>
    </div>

    <Suspense fallback={<Skeleton className="h-96" />}>
      <GarmentForm />
    </Suspense>
  </div>
);

export default NewGarmentPage;
