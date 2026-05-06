"use client";

import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { listAccounts, type LinkedAccount } from "@/lib/auth";
import { authSessionAtom } from "@/stores/authAtoms";

const CREDENTIAL_PROVIDER_ID = "credential";

// 取得失敗を「credential 無し」と誤認させないため、エラーは "error" sentinel で
// 表現する。fail-closed (= credential あり扱い) で hasPasswordAtom が解決する。
type AccountsState = readonly LinkedAccount[] | "error";

const accountsAtom = atom(async (get): Promise<AccountsState> => {
  const session = await get(authSessionAtom);
  return session.isAuthenticated
    ? await listAccounts().catch((): "error" => "error")
    : [];
});

// 初回ロード中 (prev 未確定) も "error" 扱いにすることで fail-closed を効かせる。
// [] フォールバックにすると credential ありユーザーがロード完了前に setPassword
// 分岐へ流れて誤送信する race を防ぐ。
export const accountsUnwrappedAtom = unwrap(
  accountsAtom,
  (prev): AccountsState => prev ?? "error",
);

export const hasPasswordAtom = atom((get) => {
  const accounts = get(accountsUnwrappedAtom);
  // 取得失敗時は credential 保有として扱い、credential ありユーザーが
  // 誤って setPassword 分岐に入って詰まないようにする。OAuth-only
  // ユーザーは listAccounts が成功するまで「現在のパスワード」入力が
  // 出るが、ロード完了後に正しいモードへ切り替わる。
  return accounts === "error"
    ? true
    : accounts.some((a) => a.providerId === CREDENTIAL_PROVIDER_ID);
});
