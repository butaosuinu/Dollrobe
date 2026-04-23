"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import { Trans } from "@lingui/react/macro";
import { addCoordinateAtom } from "@/stores/coordinateAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import CoordinateBuilder, {
  type CoordinateBuilderSubmitData,
} from "@/components/coordinate/CoordinateBuilder";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const NewCoordinateForm = () => {
  const router = useRouter();
  const addCoordinate = useSetAtom(addCoordinateAtom);
  const authState = useAtomValue(authSessionAtom);

  const handleSubmit = async (data: CoordinateBuilderSubmitData) => {
    const now = Date.now();
    await addCoordinate({
      id: createId(),
      userId: authState.user?.id ?? "local",
      name: data.name,
      garmentIds: data.garmentIds,
      isAiGenerated: false,
      memo: data.memo,
      createdAt: now,
      updatedAt: now,
    });
    router.push("/coordinates");
  };

  return (
    <CoordinateBuilder
      submitLabel={<Trans>保存する</Trans>}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/coordinates")}
    />
  );
};

const NewCoordinatePage = () => (
  <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
    <PageHeader title={<Trans>コーデを作る</Trans>} backHref="/coordinates" />
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NewCoordinateForm />
    </Suspense>
  </div>
);

export default NewCoordinatePage;
