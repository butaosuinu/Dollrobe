"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { CreatedApiKey } from "@/lib/auth";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import ApiKeyList from "@/components/settings/api-key/ApiKeyList";
import ApiKeyCreateSheet from "@/components/settings/api-key/ApiKeyCreateSheet";
import ApiKeyRevealSheet from "@/components/settings/api-key/ApiKeyRevealSheet";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

const ApiKeysPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAtomValue(authSessionUnwrappedAtom);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return undefined;
  }

  return (
    <>
      <p className="text-sm text-text-secondary">
        <Trans>
          外部 AI エージェントから接続するための Personal Access Token
          を発行・管理します。
        </Trans>
      </p>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          aria-label={t`新しい API キーを発行`}
        >
          <Plus className="size-4" />
          <Trans>新しい API キー</Trans>
        </Button>
      </div>

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>API キーの読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense
          fallback={
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          }
        >
          <ApiKeyList />
        </Suspense>
      </ErrorBoundary>

      <ApiKeyCreateSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(key) => {
          setIsCreateOpen(false);
          setCreatedKey(key);
        }}
      />

      <ApiKeyRevealSheet
        createdKey={createdKey}
        onClose={() => setCreatedKey(undefined)}
      />
    </>
  );
};

export default ApiKeysPage;
