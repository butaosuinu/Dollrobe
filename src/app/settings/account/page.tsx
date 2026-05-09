"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { hasPasswordAtom } from "@/stores/accountsAtoms";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import DeleteAccountSection from "@/components/settings/account/DeleteAccountSection";
import EmailChangeForm from "@/components/settings/account/EmailChangeForm";
import PasswordChangeForm from "@/components/settings/account/PasswordChangeForm";
import ProfileForm from "@/components/settings/account/ProfileForm";
import SectionCard from "@/components/ui/SectionCard";

const AccountSettingsPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAtomValue(
    authSessionUnwrappedAtom,
  );
  const hasPassword = useAtomValue(hasPasswordAtom);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return undefined;
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={<Trans>プロフィール</Trans>}
        description={<Trans>他のユーザーや UI に表示されます。</Trans>}
      >
        <ProfileForm currentUser={user} />
      </SectionCard>

      <SectionCard
        title={<Trans>メールアドレス</Trans>}
        description={<Trans>ログインに使うメールアドレスです。</Trans>}
      >
        <EmailChangeForm currentEmail={user.email} />
      </SectionCard>

      <SectionCard
        title={<Trans>パスワード</Trans>}
        description={<Trans>定期的な更新を推奨します。</Trans>}
      >
        <PasswordChangeForm hasPassword={hasPassword} />
      </SectionCard>

      <DeleteAccountSection
        currentEmail={user.email}
        hasPassword={hasPassword}
      />
    </div>
  );
};

export default AccountSettingsPage;
