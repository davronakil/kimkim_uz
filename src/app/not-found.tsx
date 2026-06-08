import { Compass, Home } from "lucide-react";
import { ErrorPage } from "@/components/errors/error-page";
import { defaultLocale, locales } from "@/i18n/config";
import "./globals.css";

export default function RootNotFoundPage() {
  return (
    <html lang={defaultLocale}>
      <body className="flex min-h-full flex-col bg-zinc-50 px-4 py-8 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center py-8">
          <ErrorPage
            code="404"
            eyebrow="404"
            title="This page isn't here"
            description="The link may be broken, or the page was removed. Pick your language and head back to KimKim."
            icon={Compass}
          >
            {locales.map((locale) => (
              <a
                key={locale}
                href={`/${locale}`}
                className={locale === defaultLocale ? "kk-btn-primary w-full sm:w-auto" : "kk-btn-secondary w-full sm:w-auto"}
              >
                <Home className="h-4 w-4" />
                {locale === "en" ? "Home (English)" : locale === "uz" ? "Bosh sahifa (Oʻzbek)" : "Главная (Русский)"}
              </a>
            ))}
          </ErrorPage>
        </main>
      </body>
    </html>
  );
}
