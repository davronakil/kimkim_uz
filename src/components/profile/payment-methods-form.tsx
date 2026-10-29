"use client";

import { WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  displayPaymentValue,
  type PaymentMethod,
  type PaymentMethodError,
  type PaymentMethodKind,
} from "@/lib/payments/methods";

const fields: Array<{
  kind: PaymentMethodKind;
  label: string;
  placeholder: string;
  inputMode: "text" | "email";
}> = [
  { kind: "venmo", label: "venmoLabel", placeholder: "venmoPlaceholder", inputMode: "text" },
  { kind: "cashapp", label: "cashappLabel", placeholder: "cashappPlaceholder", inputMode: "text" },
  { kind: "zelle", label: "zelleLabel", placeholder: "zellePlaceholder", inputMode: "email" },
  {
    kind: "apple_cash",
    label: "appleCashLabel",
    placeholder: "appleCashPlaceholder",
    inputMode: "email",
  },
];

function toValues(methods: PaymentMethod[]): Record<PaymentMethodKind, string> {
  const values = { venmo: "", cashapp: "", zelle: "", apple_cash: "" };
  for (const method of methods) values[method.kind] = displayPaymentValue(method);
  return values;
}

export function PaymentMethodsForm({ initialMethods }: { initialMethods: PaymentMethod[] }) {
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const [values, setValues] = useState(() => toValues(initialMethods));
  const [errors, setErrors] = useState<Partial<Record<PaymentMethodKind, PaymentMethodError>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function save() {
    setStatus("saving");
    const response = await fetch("/api/auth/payment-methods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    }).catch(() => null);

    if (response?.ok) {
      const data = (await response.json()) as { methods: PaymentMethod[] };
      setValues(toValues(data.methods));
      setErrors({});
      setStatus("saved");
      return;
    }

    const data = (await response?.json().catch(() => null)) as {
      errors?: Partial<Record<PaymentMethodKind, PaymentMethodError>>;
    } | null;
    setErrors(data?.errors ?? {});
    setStatus("failed");
  }

  return (
    <section className="kk-card space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          <WalletCards className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="kk-section-title">{t("paymentTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("paymentSubtitle")}
          </p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const error = errors[field.kind];
            return (
              <label key={field.kind} className="kk-label">
                {t(field.label)}
                <input
                  value={values[field.kind]}
                  onChange={(event) => {
                    const value = event.target.value;
                    setValues((current) => ({ ...current, [field.kind]: value }));
                    setStatus("idle");
                  }}
                  placeholder={t(field.placeholder)}
                  inputMode={field.inputMode}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={254}
                  aria-invalid={Boolean(error)}
                  className={`kk-input mt-2 ${error ? "border-red-400 dark:border-red-500" : ""}`}
                />
                {error ? (
                  <span className="mt-1 block text-xs font-normal text-red-600 dark:text-red-400">
                    {t(`errors.${error}`)}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-xs ${
              status === "failed" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"
            }`}
            role="status"
          >
            {status === "saved" ? t("saved") : status === "failed" ? t("saveFailed") : null}
          </p>
          <button
            type="submit"
            disabled={status === "saving"}
            className="kk-btn-primary w-full sm:w-auto"
          >
            {status === "saving" ? common("loading") : common("save")}
          </button>
        </div>
      </form>
    </section>
  );
}
