"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminCatalogPanel } from "@/components/admin/admin-catalog-panel";
import { AdminEventsPanel } from "@/components/admin/admin-events-panel";
import { AdminManagementPanel } from "@/components/admin/admin-management-panel";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import {
  CalendarRange,
  LayoutDashboard,
  Shield,
  Store,
  Users,
} from "lucide-react";

const tabs = ["overview", "catalog", "events", "users", "admins"] as const;
type AdminTab = (typeof tabs)[number];

type AdminWorkspaceProps = {
  locale: string;
  superadmin: boolean;
};

export function AdminWorkspace({ locale, superadmin }: AdminWorkspaceProps) {
  const t = useTranslations("admin");
  const [tab, setTab] = useState<AdminTab>("overview");

  const visibleTabs = superadmin ? tabs : tabs.filter((value) => value !== "admins");

  const tabIcons: Record<AdminTab, typeof LayoutDashboard> = {
    overview: LayoutDashboard,
    catalog: Store,
    events: CalendarRange,
    users: Users,
    admins: Shield,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((value) => {
          const Icon = tabIcons[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`inline-flex items-center gap-2 ${tab === value ? "kk-chip-active" : "kk-chip-inactive"}`}
            >
              <Icon className="h-4 w-4" />
              {t(`tabs.${value}`)}
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t(`sections.${tab}`)}</h2>

        {tab === "overview" ? (
          <AdminOverviewPanel
            onNavigate={(next) => setTab(next === "catalog" ? "catalog" : next)}
          />
        ) : null}
        {tab === "catalog" ? <AdminCatalogPanel locale={locale} /> : null}
        {tab === "events" ? <AdminEventsPanel /> : null}
        {tab === "users" ? <AdminUsersPanel /> : null}
        {tab === "admins" && superadmin ? <AdminManagementPanel /> : null}
      </section>
    </div>
  );
}
