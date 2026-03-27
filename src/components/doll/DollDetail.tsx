"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { User, Trash2, Edit3 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { Doll } from "@/types";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import { deleteDollAtom } from "@/stores/dollAtoms";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Props = {
  readonly doll: Doll;
};

const DollDetail = ({ doll }: Props) => {
  const { i18n } = useLingui();
  const router = useRouter();
  const deleteDoll = useSetAtom(deleteDollAtom);

  const handleDelete = async () => {
    await deleteDoll(doll.id);
    router.push("/dolls");
  };

  return (
    <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease-out] lg:grid lg:grid-cols-2 lg:gap-8">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-primary-50 lg:sticky lg:top-20">
        {doll.imageUrl !== undefined ? (
          <img
            src={doll.imageUrl}
            alt={doll.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User className="size-16 text-primary-200" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{doll.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {i18n._(DOLL_SIZE_LABEL[doll.bodySize])}
          </p>
        </div>

        {doll.headModel !== undefined && (
          <Card>
            <p className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>ヘッド型番</Trans>
            </p>
            <Badge variant="primary">{doll.headModel}</Badge>
          </Card>
        )}

        {doll.memo !== undefined && (
          <Card>
            <p className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>メモ</Trans>
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {doll.memo}
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-2 pt-2 lg:flex-row">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.push(`/dolls/${doll.id}/edit`)}
          >
            <Edit3 className="size-4" />
            <Trans>編集</Trans>
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={handleDelete}>
            <Trash2 className="size-4" />
            <Trans>削除</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DollDetail;
