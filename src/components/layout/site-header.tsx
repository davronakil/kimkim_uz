import { getTranslations } from "next-intl/server";
import { SiteHeaderClient } from "@/components/layout/site-header-client";
import { getCurrentUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const t = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    <SiteHeaderClient
      appName={t("appName")}
      initialUser={
        user
          ? {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username,
              photo_url: user.photo_url,
            }
          : null
      }
    />
  );
}
