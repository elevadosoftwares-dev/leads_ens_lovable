import { createFileRoute, Link } from "@tanstack/react-router";
import { useCertifications, useCompanies, useProfiles, personLabel } from "@/lib/queries";
import { certStatus, daysUntil, formatDate } from "@/lib/cert-status";
import { AlertTriangle, Building2, BookMarked, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ENS Certification Tracker" },
      { name: "description", content: "Review certification totals, upcoming expiries, and overdue records." },
      { property: "og:title", content: "Dashboard — ENS Certification Tracker" },
      { property: "og:description", content: "Review certification totals, upcoming expiries, and overdue records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const gradient =
    tone === "destructive"
      ? "bg-[image:var(--gradient-danger)]"
      : tone === "warning"
        ? "bg-[image:var(--gradient-warning)]"
        : tone === "success"
          ? "bg-[image:var(--gradient-success)]"
          : "bg-[image:var(--gradient-info)]";
  return (
    <div className={`rounded-xl p-5 text-primary-foreground shadow-panel ${gradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-85">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>
        <span className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
          <Icon className="size-6" />
        </span>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: certs = [] } = useCertifications();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();

  const companyById = new Map(companies.map((c) => [c.id, c]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const expired = certs.filter((c) => certStatus(c.expiry_date) === "expired");
  const soon = certs.filter((c) => ["critical", "warning"].includes(certStatus(c.expiry_date)));
  const upcoming = [...expired, ...soon].sort(
    (a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-wide text-primary">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Companies" value={companies.length} icon={Building2} tone="success" />
        <Stat label="Certifications" value={certs.length} icon={BookMarked} tone="primary" />
        <Stat label="Expiring in 2 months" value={soon.length} icon={CalendarClock} tone="warning" />
        <Stat label="Expired" value={expired.length} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="panel">
        <div className="panel-header">
          Attention needed
          <Link to="/certifications" className="text-xs underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary text-left text-xs font-bold uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Certification</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nothing is expiring in the next two months.
                  </td>
                </tr>
              )}
              {upcoming.map((c) => {
                const days = daysUntil(c.expiry_date);
                const danger = days <= 30;
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-border ${danger ? "text-destructive" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {companyById.get(c.company_id)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-4 py-3">
                      {personLabel(profileById.get(c.assigned_to ?? ""))}
                    </td>
                    <td className="px-4 py-3">{formatDate(c.expiry_date)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
