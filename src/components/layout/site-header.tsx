import { getTranslations } from "next-intl/server";
import { SiteHeaderClient } from "@/components/layout/site-header-client";
import type { User } from "@/types";

export async function SiteHeader({ user }: { user: User | null }) {
  const t = await getTranslations("common");

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
