import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { locales, type Locale } from "@/i18n/config";
import { alternateOgLocales, ogLocaleTag } from "@/lib/locale";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(/\/$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const baseUrl = appBaseUrl();
  const localePath = `/${locale}`;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t("title"),
      template: "%s · KimKim",
    },
    description: t("description"),
    keywords: t("keywords"),
    applicationName: "KimKim",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "KimKim",
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
    alternates: {
      canonical: localePath,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("description"),
      url: localePath,
      siteName: "KimKim",
      locale: ogLocaleTag(locale as Locale),
      alternateLocale: alternateOgLocales(locale as Locale),
      type: "website",
    },
    twitter: {
      card: "summary",
      title: t("ogTitle"),
      description: t("description"),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <NextIntlClientProvider messages={messages}>
          <ServiceWorkerRegister />
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-8 sm:px-5 sm:py-8">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
