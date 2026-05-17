"use client";

import { Suspense, useMemo, use } from "react";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import UserDataTabs from "@/components/admin/UserDataTabs";
import UserFreezeButton from "@/components/admin/UserFreezeButton";
import { adminUserDetailAtomFamily, type AdminUser } from "@/stores/adminAtoms";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";

const ISO_DATE_LENGTH = 10;

const formatDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, ISO_DATE_LENGTH);

type DetailProps = {
  readonly userId: string;
};

const UserHeader = ({ user }: { readonly user: AdminUser }) => (
  <Card padding="lg">
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>ユーザー</Trans>
          </p>
          <h3 className="font-display text-xl font-bold text-text-primary">
            {user.name}
          </h3>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "admin" ? (
            <Badge variant="primary">
              <Trans>管理者</Trans>
            </Badge>
          ) : (
            <Badge>
              <Trans>一般</Trans>
            </Badge>
          )}
          {user.frozen ? (
            <Badge variant="unknown">
              <Trans>凍結中</Trans>
            </Badge>
          ) : (
            <Badge variant="confirmed">
              <Trans>有効</Trans>
            </Badge>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-tertiary">
            <Trans>登録日</Trans>
          </dt>
          <dd className="font-mono tabular-nums">
            {formatDate(user.createdAt)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-tertiary">
            <Trans>最終更新</Trans>
          </dt>
          <dd className="font-mono tabular-nums">
            {formatDate(user.updatedAt)}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-xs text-text-tertiary">
            <Trans>ユーザーID</Trans>
          </dt>
          <dd className="font-mono text-xs text-text-secondary break-all">
            {user.id}
          </dd>
        </div>
      </dl>
    </div>
  </Card>
);

const UserDetail = ({ userId }: DetailProps) => {
  const detailAtom = useMemo(() => adminUserDetailAtomFamily(userId), [userId]);
  const user = useAtomValue(detailAtom);
  const { user: actor } = useAtomValue(authSessionUnwrappedAtom);
  const { i18n } = useLingui();

  if (user === undefined) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>このユーザーは見つかりません</Trans>
      </p>
    );
  }

  const isSelf = actor?.id === user.id;
  const isTargetAdmin = user.role === "admin";
  const disabledReason = isSelf
    ? i18n._(msg`自分自身は凍結できません`)
    : isTargetAdmin
      ? i18n._(msg`管理者の凍結は MVP では未対応です`)
      : undefined;
  const freezeDisabled = isSelf || isTargetAdmin;

  return (
    <div className="flex flex-col gap-4">
      <UserHeader user={user} />
      <div className="flex justify-end">
        <UserFreezeButton
          targetUserId={user.id}
          frozen={user.frozen}
          disabled={freezeDisabled}
          disabledReason={disabledReason}
        />
      </div>
      <h3 className="font-display text-base font-bold">
        <Trans>ユーザーデータ閲覧</Trans>
      </h3>
      <UserDataTabs userId={user.id} />
    </div>
  );
};

const Page = ({ params }: { readonly params: Promise<{ id: string }> }) => {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={<Trans>ユーザー詳細</Trans>} backHref="/admin/users" />
      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>ユーザー詳細の読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <UserDetail userId={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default Page;
