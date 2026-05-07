"use client";

import { Suspense } from "react";
import { Trans } from "@lingui/react/macro";
import DollForm from "@/components/doll/DollForm";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const NewDollPage = () => (
  <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
    <PageHeader title={<Trans>ドールを登録</Trans>} backHref="/dolls" />

    <Suspense fallback={<Skeleton className="h-96" />}>
      <DollForm />
    </Suspense>
  </div>
);

export default NewDollPage;
