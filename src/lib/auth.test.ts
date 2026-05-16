import { describe, expect, it } from "vitest";
import { setupI18n } from "@lingui/core";
import { messages as enMessages } from "@/locales/en/messages.mjs";
import { createSignUpEmailSchema } from "@/lib/auth";

const VALID_INPUT = {
  name: "佐藤",
  email: "u@example.com",
  password: "secret123",
  passwordConfirm: "secret123",
} as const;

type FlatErrors = Readonly<Record<string, string | undefined>>;

const flatten = (
  result: ReturnType<ReturnType<typeof createSignUpEmailSchema>["safeParse"]>,
): FlatErrors => {
  if (result.success) return {};
  const { fieldErrors } = result.error.flatten();
  return {
    name: fieldErrors.name?.[0],
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
    passwordConfirm: fieldErrors.passwordConfirm?.[0],
  };
};

describe("createSignUpEmailSchema", () => {
  it("ja ロケール（カタログ未ロード）では msgid そのまま = 日本語を返す", () => {
    const i18n = setupI18n({ locale: "ja", messages: { ja: {} } });
    const schema = createSignUpEmailSchema(i18n);

    const errs = flatten(
      schema.safeParse({ ...VALID_INPUT, name: "", email: "", password: "" }),
    );

    expect(errs.name).toBe("表示名を入力してください");
    expect(errs.email).toBe("正しいメールアドレスを入力してください");
    expect(errs.password).toBe("パスワードは 8 文字以上で入力してください");
  });

  it("en ロケール（コンパイル済みカタログ）では英訳メッセージを返す", () => {
    const i18n = setupI18n({
      locale: "en",
      messages: { en: enMessages },
    });
    const schema = createSignUpEmailSchema(i18n);

    const errs = flatten(
      schema.safeParse({ ...VALID_INPUT, name: "", email: "", password: "" }),
    );

    expect(errs.name).toBe("Please enter a display name");
    expect(errs.email).toBe("Please enter a valid email address");
    expect(errs.password).toBe("Password must be at least 8 characters");
  });

  it("en ロケールではパスワード不一致も英訳される", () => {
    const i18n = setupI18n({
      locale: "en",
      messages: { en: enMessages },
    });
    const schema = createSignUpEmailSchema(i18n);

    const errs = flatten(
      schema.safeParse({ ...VALID_INPUT, passwordConfirm: "different1" }),
    );

    expect(errs.passwordConfirm).toBe("Passwords do not match");
  });

  it("正常入力なら success を返す", () => {
    const i18n = setupI18n({ locale: "ja", messages: { ja: {} } });
    const schema = createSignUpEmailSchema(i18n);

    const result = schema.safeParse(VALID_INPUT);

    expect(result.success).toBe(true);
  });
});
