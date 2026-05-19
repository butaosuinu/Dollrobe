"use client";

import { Suspense, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Eye } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import {
  adminUserCoordinatesAtomFamily,
  adminUserGarmentsAtomFamily,
  adminUserLocationsAtomFamily,
} from "@/stores/adminAtoms";

type TabKey = "garments" | "locations" | "coordinates";

type Props = {
  readonly userId: string;
};

const TAB_DEFS = [
  { key: "garments" as const, label: msg`服` },
  { key: "locations" as const, label: msg`収納` },
  { key: "coordinates" as const, label: msg`コーデ` },
];

const ReadOnlyBadge = () => (
  <Badge variant="default">
    <Eye className="size-3" />
    <Trans>閲覧専用</Trans>
  </Badge>
);

const GarmentsView = ({ userId }: { readonly userId: string }) => {
  const garmentsAtom = useMemo(
    () => adminUserGarmentsAtomFamily(userId, 0),
    [userId],
  );
  const result = useAtomValue(garmentsAtom);

  if (result.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-tertiary">
        <Trans>このユーザーの服はまだ登録されていません</Trans>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-surface-overlay">
      {result.items.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium text-text-primary">{g.name}</span>
            <span className="text-xs text-text-tertiary">{g.category}</span>
          </div>
          <span className="font-mono text-xs text-text-tertiary">{g.id}</span>
        </li>
      ))}
      <li className="px-4 py-2 text-xs text-text-tertiary">
        <Trans>
          {result.items.length} / {result.total}件表示
        </Trans>
      </li>
    </ul>
  );
};

const LocationsView = ({ userId }: { readonly userId: string }) => {
  const locationsAtom = useMemo(
    () => adminUserLocationsAtomFamily(userId),
    [userId],
  );
  const items = useAtomValue(locationsAtom);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-tertiary">
        <Trans>このユーザーの収納場所はまだ登録されていません</Trans>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-surface-overlay">
      {items.map((loc) => (
        <li
          key={loc.id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="font-medium text-text-primary">{loc.label}</span>
          <span className="font-mono text-xs text-text-tertiary">{loc.id}</span>
        </li>
      ))}
    </ul>
  );
};

const CoordinatesView = ({ userId }: { readonly userId: string }) => {
  const coordinatesAtom = useMemo(
    () => adminUserCoordinatesAtomFamily(userId, 0),
    [userId],
  );
  const result = useAtomValue(coordinatesAtom);

  if (result.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-tertiary">
        <Trans>このユーザーのコーデはまだ登録されていません</Trans>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-surface-overlay">
      {result.items.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium text-text-primary">{c.name}</span>
            <span className="text-xs text-text-tertiary">
              <Trans>{c.garmentIds.length}件の服</Trans>
            </span>
          </div>
          <span className="font-mono text-xs text-text-tertiary">{c.id}</span>
        </li>
      ))}
      <li className="px-4 py-2 text-xs text-text-tertiary">
        <Trans>
          {result.items.length} / {result.total}件表示
        </Trans>
      </li>
    </ul>
  );
};

const UserDataTabs = ({ userId }: Props) => {
  const [active, setActive] = useState<TabKey>("garments");
  const { i18n } = useLingui();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <nav
          aria-label={i18n._(msg`ユーザーデータ閲覧`)}
          className="inline-flex rounded-xl bg-primary-50 p-1 text-sm font-medium"
        >
          {TAB_DEFS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              aria-current={active === key ? "page" : undefined}
              className={clsx(
                "rounded-lg px-4 py-1.5 transition-colors",
                active === key
                  ? "bg-surface-overlay text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {i18n._(label)}
            </button>
          ))}
        </nav>
        <ReadOnlyBadge />
      </div>

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-32 rounded-xl" />}>
          {active === "garments" && <GarmentsView userId={userId} />}
          {active === "locations" && <LocationsView userId={userId} />}
          {active === "coordinates" && <CoordinatesView userId={userId} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default UserDataTabs;
