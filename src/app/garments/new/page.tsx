"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import GarmentForm from "@/components/garment/GarmentForm";
import Skeleton from "@/components/ui/Skeleton";

const NewGarmentPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center gap-3 animate-[fade-in_0.4s_ease-out]">
      <Link
        href="/garments"
        className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <h2 className="font-display text-xl font-bold">
        <Trans>服を登録</Trans>
      </h2>
    </div>

    <Suspense fallback={<Skeleton className="h-96" />}>
      <GarmentForm />
    </Suspense>
  </div>
);

export default NewGarmentPage;
