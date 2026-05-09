"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Shirt,
  SmartphoneNfc,
  XCircle,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import TextButton from "@/components/ui/TextButton";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import {
  buildNfcScheme,
  writeNfcTag,
  type NfcWriteResult,
} from "@/lib/nfc/writer";
import { useNfcSupported } from "@/hooks/useNfcSupported";

type NfcWriteStep =
  | "select_type"
  | "select_item"
  | "ready_to_write"
  | "writing"
  | "result";

type TargetType = "garment" | "location";

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

const NfcUnsupported = () => (
  <div className="flex flex-col items-center gap-4 py-12 text-center">
    <SmartphoneNfc className="size-12 text-text-tertiary" />
    <p className="text-sm text-text-tertiary">
      <Trans>
        このデバイスは NFC 書き込みに対応していません。Android Chrome
        をご利用ください。
      </Trans>
    </p>
  </div>
);

type SelectTypeStepProps = {
  readonly onSelect: (type: TargetType) => void;
};

const SelectTypeStep = ({ onSelect }: SelectTypeStepProps) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-text-secondary">
      <Trans>書き込む対象を選択してください</Trans>
    </p>
    <Card
      clickable
      hoverable
      padding="md"
      onClick={() => onSelect("garment")}
      className="flex items-center gap-3"
    >
      <Shirt className="size-6 text-primary-500" />
      <span className="font-medium text-text-primary">
        <Trans>服</Trans>
      </span>
    </Card>
    <Card
      clickable
      hoverable
      padding="md"
      onClick={() => onSelect("location")}
      className="flex items-center gap-3"
    >
      <MapPin className="size-6 text-primary-500" />
      <span className="font-medium text-text-primary">
        <Trans>収納場所</Trans>
      </span>
    </Card>
  </div>
);

type SelectItemStepProps = {
  readonly targetType: TargetType;
  readonly options: readonly SelectOption[];
  readonly selectedId: string | undefined;
  readonly onSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
};

const SelectItemStep = ({
  targetType,
  options,
  selectedId,
  onSelect,
  onNext,
  onBack,
}: SelectItemStepProps) => {
  const { i18n } = useLingui();

  return (
    <div className="flex flex-col gap-4">
      <TextButton variant="muted" onClick={onBack}>
        <span className="inline-flex items-center gap-1">
          <ArrowLeft className="size-4" />
          <Trans>戻る</Trans>
        </span>
      </TextButton>
      <Select
        label={i18n._(
          targetType === "garment"
            ? msg`書き込む服を選択`
            : msg`書き込む収納場所を選択`,
        )}
        options={options}
        placeholder={i18n._(msg`選択してください`)}
        value={selectedId ?? ""}
        onChange={onSelect}
      />
      <Button
        variant="primary"
        disabled={selectedId === undefined}
        onClick={onNext}
      >
        <Trans>次へ</Trans>
      </Button>
    </div>
  );
};

type ReadyToWriteStepProps = {
  readonly selectedName: string | undefined;
  readonly scheme: string;
  readonly onStartWrite: () => void;
  readonly onBack: () => void;
};

const ReadyToWriteStep = ({
  selectedName,
  scheme,
  onStartWrite,
  onBack,
}: ReadyToWriteStepProps) => (
  <div className="flex flex-col gap-4">
    <TextButton variant="muted" onClick={onBack}>
      <span className="inline-flex items-center gap-1">
        <ArrowLeft className="size-4" />
        <Trans>戻る</Trans>
      </span>
    </TextButton>
    <div className="rounded-xl border border-border-default bg-surface-overlay p-4">
      <p className="text-sm text-text-secondary">
        <Trans>書き込み対象</Trans>
      </p>
      <p className="font-medium text-text-primary">{selectedName}</p>
      <p className="mt-1 font-mono text-xs text-text-tertiary">{scheme}</p>
    </div>
    <Button variant="primary" size="lg" fullWidth onClick={onStartWrite}>
      <SmartphoneNfc className="size-5" />
      <Trans>書き込む</Trans>
    </Button>
  </div>
);

type WritingStepProps = {
  readonly onCancel: () => void;
};

const WritingStep = ({ onCancel }: WritingStepProps) => (
  <div className="flex flex-col items-center gap-4 py-8">
    <SmartphoneNfc className="size-16 animate-pulse text-primary-500" />
    <p className="text-sm font-medium text-text-primary">
      <Trans>NFC タグにタッチしてください...</Trans>
    </p>
    <Button variant="ghost" onClick={onCancel}>
      <Trans>キャンセル</Trans>
    </Button>
  </div>
);

type ResultStepProps = {
  readonly writeResult: NfcWriteResult;
  readonly onWriteAnother: () => void;
};

const WriteErrorMessage = ({ errorKind }: { readonly errorKind: string }) =>
  errorKind === "permission_denied" ? (
    <Trans>NFC の権限が拒否されました</Trans>
  ) : errorKind === "aborted" ? (
    <Trans>書き込みがキャンセルされました</Trans>
  ) : (
    <Trans>書き込みに失敗しました</Trans>
  );

const ResultStep = ({ writeResult, onWriteAnother }: ResultStepProps) => (
  <div className="flex flex-col items-center gap-4 py-8">
    {writeResult.ok ? (
      <>
        <CheckCircle2 className="size-16 text-success" />
        <p className="text-sm font-medium text-text-primary">
          <Trans>NFC タグへの書き込みが完了しました</Trans>
        </p>
      </>
    ) : (
      <>
        <XCircle className="size-16 text-danger" />
        <p className="text-sm font-medium text-text-primary">
          <WriteErrorMessage errorKind={writeResult.errorKind} />
        </p>
      </>
    )}
    <div className="flex gap-2">
      <Button variant="secondary" onClick={onWriteAnother}>
        <Trans>もう1枚書き込む</Trans>
      </Button>
    </div>
  </div>
);

type NfcWriteState = {
  readonly step: NfcWriteStep;
  readonly targetType: TargetType | undefined;
  readonly selectedId: string | undefined;
  readonly writeResult: NfcWriteResult | undefined;
  readonly garmentOptions: readonly SelectOption[];
  readonly locationOptions: readonly SelectOption[];
  readonly selectedName: string | undefined;
  readonly scheme: string;
  readonly handleSelectType: (type: TargetType) => void;
  readonly handleSelectItem: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly handleGoToWrite: () => void;
  readonly handleStartWrite: () => Promise<void>;
  readonly handleCancel: () => void;
  readonly handleWriteAnother: () => void;
  readonly handleBackToType: () => void;
  readonly handleBackToItem: () => void;
};

const useNfcWriteState = (): NfcWriteState => {
  const garments = useAtomValue(garmentsAtom);
  const storageCases = useAtomValue(storageCasesAtom);
  const storageLocations = useAtomValue(storageLocationsAtom);

  const [step, setStep] = useState<NfcWriteStep>("select_type");
  const [targetType, setTargetType] = useState<TargetType | undefined>(
    undefined,
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [writeResult, setWriteResult] = useState<NfcWriteResult | undefined>(
    undefined,
  );
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const garmentOptions = garments.map((g) => ({
    value: g.id,
    label: g.name,
  }));

  const locationOptions = storageLocations.map((loc) => {
    const caseName =
      storageCases.find((c) => c.id === loc.caseId)?.name ?? loc.caseId;
    return { value: loc.id, label: `${caseName} - ${loc.label}` };
  });

  const selectedName =
    targetType === "garment"
      ? garments.find((g) => g.id === selectedId)?.name
      : storageLocations.find((l) => l.id === selectedId)?.label;

  const scheme =
    targetType !== undefined && selectedId !== undefined
      ? buildNfcScheme({ type: targetType, id: selectedId })
      : "";

  const handleSelectType = useCallback((type: TargetType) => {
    setTargetType(type);
    setSelectedId(undefined);
    setStep("select_item");
  }, []);

  const handleSelectItem = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedId(value === "" ? undefined : value);
    },
    [],
  );

  const handleGoToWrite = useCallback(() => {
    setStep("ready_to_write");
  }, []);

  const handleStartWrite = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStep("writing");

    const result = await writeNfcTag({ scheme, signal: controller.signal });

    if (controller.signal.aborted) return;

    abortControllerRef.current = undefined;
    setWriteResult(result);
    setStep("result");
  }, [scheme]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
    setStep("ready_to_write");
  }, []);

  const handleWriteAnother = useCallback(() => {
    setWriteResult(undefined);
    setStep("select_type");
    setTargetType(undefined);
    setSelectedId(undefined);
  }, []);

  const handleBackToType = useCallback(() => {
    setStep("select_type");
  }, []);

  const handleBackToItem = useCallback(() => {
    setStep("select_item");
  }, []);

  return {
    step,
    targetType,
    selectedId,
    writeResult,
    garmentOptions,
    locationOptions,
    selectedName,
    scheme,
    handleSelectType,
    handleSelectItem,
    handleGoToWrite,
    handleStartWrite,
    handleCancel,
    handleWriteAnother,
    handleBackToType,
    handleBackToItem,
  };
};

const NfcWriteContent = () => {
  const nfcSupported = useNfcSupported();
  const state = useNfcWriteState();

  if (!nfcSupported) {
    return <NfcUnsupported />;
  }

  return (
    <div className="flex flex-col gap-4">
      {state.step === "select_type" && (
        <SelectTypeStep onSelect={state.handleSelectType} />
      )}

      {state.step === "select_item" && state.targetType !== undefined && (
        <SelectItemStep
          targetType={state.targetType}
          options={
            state.targetType === "garment"
              ? state.garmentOptions
              : state.locationOptions
          }
          selectedId={state.selectedId}
          onSelect={state.handleSelectItem}
          onNext={state.handleGoToWrite}
          onBack={state.handleBackToType}
        />
      )}

      {state.step === "ready_to_write" && (
        <ReadyToWriteStep
          selectedName={state.selectedName}
          scheme={state.scheme}
          onStartWrite={state.handleStartWrite}
          onBack={state.handleBackToItem}
        />
      )}

      {state.step === "writing" && (
        <WritingStep onCancel={state.handleCancel} />
      )}

      {state.step === "result" && state.writeResult !== undefined && (
        <ResultStep
          writeResult={state.writeResult}
          onWriteAnother={state.handleWriteAnother}
        />
      )}
    </div>
  );
};

const NfcWritePage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>NFC タグ書き込み</Trans>
      </h2>
    </div>
    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>ページの読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <NfcWriteContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default NfcWritePage;
