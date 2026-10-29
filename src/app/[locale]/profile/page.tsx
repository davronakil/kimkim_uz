import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentMethodsForm } from "@/components/profile/payment-methods-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserPaymentMethods } from "@/lib/db/queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [profile, meta] = await Promise.all([
    getTranslations({ locale, namespace: "profile" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/profile`,
    title: profile("title"),
    description: meta("description"),
    ogTitle: meta("ogTitle"),
    robots: {
      index: false,
      follow: false,
    },
  });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("profile");
  const methods = await listUserPaymentMethods(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="kk-page-title">{t("title")}</h1>
      <PaymentMethodsForm initialMethods={methods} />
    </div>
  );
}
