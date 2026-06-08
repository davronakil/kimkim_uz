"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { displayName } from "@/lib/utils";
import { Shield, UserPlus } from "lucide-react";

type AdminRow = {
  user_id: string;
  role: "admin" | "superadmin";
  username: string | null;
  first_name: string;
  last_name: string | null;
};

export function AdminManagementPanel() {
  const t = useTranslations("admin.admins");
  const common = useTranslations("common");
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAdmins() {
    const response = await fetch("/api/admin/admins", { credentials: "include" });
    if (!response.ok) return;
    const data = (await response.json()) as { admins: AdminRow[] };
    setAdmins(data.admins);
  }

  useEffect(() => {
    void (async () => {
      await loadAdmins();
      setLoading(false);
    })();
  }, []);

  async function addAdmin(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.replace(/^@/, "") }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("addError"));
        return;
      }
      setUsername("");
      await loadAdmins();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAdmin(userId: string) {
    const response = await fetch(`/api/admin/admins/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setAdmins((items) => items.filter((item) => item.user_id !== userId));
    }
  }

  if (loading) {
    return <p className="text-zinc-500">{common("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void addAdmin(e)} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("usernamePlaceholder")}
          className="kk-input flex-1"
          required
        />
        <button type="submit" disabled={submitting} className="kk-btn-primary shrink-0">
          <UserPlus className="h-4 w-4" />
          {submitting ? common("loading") : t("addAdmin")}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {admins.length === 0 ? (
        <EmptyState icon={Shield} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {admins.map((admin) => (
            <li
              key={admin.user_id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{displayName(admin)}</p>
                <p className="text-sm text-zinc-500">
                  {admin.username ? `@${admin.username}` : admin.user_id} ·{" "}
                  {admin.role === "superadmin" ? t("roleSuperadmin") : t("roleAdmin")}
                </p>
              </div>
              {admin.role !== "superadmin" ? (
                <button
                  type="button"
                  onClick={() => void removeAdmin(admin.user_id)}
                  className="kk-btn-secondary text-red-600"
                >
                  {t("remove")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
