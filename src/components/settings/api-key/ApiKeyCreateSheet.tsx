"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { createApiKeyAtom } from "@/stores/apiKeyAtoms";
import { addToastAtom } from "@/stores/toastAtoms";
import {
  API_KEY_SCOPE,
  type ApiKeyScope,
  type CreatedApiKey,
} from "@/lib/auth";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCreated: (created: CreatedApiKey) => void;
};

const SCOPE_OPTIONS = [
  { value: API_KEY_SCOPE.READ_ONLY, label: msg`read-only（読み取り専用）` },
  {
    value: API_KEY_SCOPE.READ_WRITE,
    label: msg`read-write（読み取り＋書き込み）`,
  },
] as const;

const toApiKeyScope = (value: string): ApiKeyScope =>
  value === API_KEY_SCOPE.READ_WRITE
    ? API_KEY_SCOPE.READ_WRITE
    : API_KEY_SCOPE.READ_ONLY;

const ApiKeyCreateSheet = ({ isOpen, onClose, onCreated }: Props) => {
  const create = useSetAtom(createApiKeyAtom);
  const addToast = useSetAtom(addToastAtom);
  const { i18n } = useLingui();

  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>(API_KEY_SCOPE.READ_ONLY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const isDisabled = trimmedName === "" || isSubmitting;

  const resetForm = () => {
    setName("");
    setScope(API_KEY_SCOPE.READ_ONLY);
  };

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    const created = await create({ name: trimmedName, scope }).catch(
      () => undefined,
    );
    setIsSubmitting(false);
    if (created === undefined) {
      addToast({ message: t`API キーの発行に失敗しました` });
      return;
    }
    resetForm();
    onCreated(created);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={t`新しい API キーを発行`}
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t`名前`}
          placeholder={t`例: agent-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
        />
        <Select
          label={t`スコープ`}
          value={scope}
          onChange={(e) => setScope(toApiKeyScope(e.target.value))}
          options={SCOPE_OPTIONS.map((option) => ({
            value: option.value,
            label: i18n._(option.label),
          }))}
        />
        <p className="text-xs text-text-tertiary">
          <Trans>
            生キーは発行直後の一度しか表示されません。安全な場所に保管してください。
          </Trans>
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={handleClose}>
            <Trans>キャンセル</Trans>
          </Button>
          <Button
            variant="primary"
            fullWidth
            disabled={isDisabled}
            onClick={handleSubmit}
          >
            <Trans>発行</Trans>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default ApiKeyCreateSheet;
