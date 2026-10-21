import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteCertification } from "@/lib/certifications.functions";
import { useCertifications, useCompanies, useProfiles, personLabel } from "@/lib/queries";
import { useIsAdmin } from "@/lib/session";
import { certStatus, formatDate, statusLabel } from "@/lib/cert-status";
import { DataToolbar, Pagination } from "@/components/DataToolbar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, FileDown, Download, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certifications/")({
  head: () => ({
    meta: [
      { title: "Certifications — ENS Certification Tracker" },
      { name: "description", content: "View, filter, update, and export company certification records." },
      { property: "og:title", content: "Certifications — ENS Certification Tracker" },
      { property: "og:description", content: "View, filter, update, and export company certification records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificationsPage,
});

function StatusPill({ expiryDate }: { expiryDate: string }) {
  const status = certStatus(expiryDate);
  const tone =
    status === "expired"
      ? "bg-destructive/15 text-destructive"
      : status === "critical"
        ? "bg-orange/20 text-orange"
        : status === "warning"
          ? "bg-warning/25 text-warning-foreground"
          : "bg-success/15 text-success";
  return <span className={`status-pill ${tone}`}>{statusLabel[status]}</span>;
}

function CertificationsPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { data: certs = [], isLoading } = useCertifications();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();

  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteCertification({ data: { id } }),
    onSuccess: () => {
      toast.success("Certification deleted");
      qc.invalidateQueries({ queryKey: ["certifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return certs
      .filter((c) => (companyFilter ? c.company_id === companyFilter : true))
      .filter((c) => {
        if (!term) return true;
        const haystack = [
          companyById.get(c.company_id)?.name ?? "",
          c.name,
          personLabel(profileById.get(c.assigned_to ?? "")),
          personLabel(profileById.get(c.corroborated_by ?? "")),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
  }, [certs, companyFilter, search, companyById, profileById]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = rows.slice((current - 1) * pageSize, current * pageSize);

  function openDoc(id: string) {
    window.open(`/api/documents/${id}`, "_blank", "noopener");
  }

  function exportCsv() {
    const header = [
      "S.No",
      "Company",
      "Certification",
      "Assigned To",
      "Corroborated By",
      "Issue Date",
      "Expiry Date",
      "Status",
      "Instruction 1",
      "Instruction 2",
      "Instruction 3",
    ];
    const lines = rows.map((c, i) =>
      [
        i + 1,
        companyById.get(c.company_id)?.name ?? "",
        c.name,
        personLabel(profileById.get(c.assigned_to ?? "")),
        personLabel(profileById.get(c.corroborated_by ?? "")),
        c.issue_date,
        c.expiry_date,
        statusLabel[certStatus(c.expiry_date)],
        c.instruction_1,
        c.instruction_2,
        c.instruction_3,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certifications.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rowTone = (expiryDate: string, twiceReminded: boolean) => {
    const status = certStatus(expiryDate);
    if (twiceReminded || status === "expired" || status === "critical") {
      return "bg-destructive/5 text-destructive hover:bg-destructive/10";
    }
    if (status === "warning") return "bg-warning/5 hover:bg-warning/10";
    return "hover:bg-success/5";
  };

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="panel-header">
          Certifications
          <Link
            to="/certifications/new"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide hover:underline"
          >
            <Plus className="size-4" /> Add Certification
          </Link>
        </div>

        <div className="space-y-4 p-6">
          <div className="max-w-md">
            <label className="field-label" htmlFor="company-filter">
              Select Company
            </label>
            <select
              id="company-filter"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">--Select Company--</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="outline" onClick={exportCsv}>
            <FileDown className="size-4" /> Export to Excel
          </Button>

          <DataToolbar
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            search={search}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
          />

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-secondary text-left text-xs font-bold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">S.No</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Certification</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Corroborated By</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Doc</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && slice.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      No certifications found.
                    </td>
                  </tr>
                )}
                {slice.map((c, i) => {
                  const twiceReminded = !!c.reminder_1_sent_at && !!c.reminder_2_sent_at;
                  return (
                    <tr
                      key={c.id}
                       className={`border-t border-border transition-colors ${rowTone(c.expiry_date, twiceReminded)}`}
                    >
                      <td className="px-4 py-3">{(current - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3">{companyById.get(c.company_id)?.name ?? "—"}</td>
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3">
                        • {personLabel(profileById.get(c.assigned_to ?? ""))}
                      </td>
                      <td className="px-4 py-3">
                        • {personLabel(profileById.get(c.corroborated_by ?? ""))}
                      </td>
                      <td className="px-4 py-3">{formatDate(c.issue_date)}</td>
                      <td className="px-4 py-3">{formatDate(c.expiry_date)}</td>
                      <td className="px-4 py-3">
                        <StatusPill expiryDate={c.expiry_date} />
                      </td>
                      <td className="px-4 py-3">
                        {c.doc_file_name ? (
                          <button
                            className="inline-flex items-center gap-1 underline"
                            onClick={() => openDoc(c.id)}
                          >
                            <Download className="size-4" /> View
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link to="/certifications/$id" params={{ id: c.id }}>
                            <Button size="sm" variant="outline">
                              <Pencil className="size-4" />
                            </Button>
                          </Link>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete certification "${c.name}"?`))
                                  remove.mutate(c.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={current}
            pageCount={pageCount}
            total={rows.length}
            from={(current - 1) * pageSize + 1}
            to={Math.min(current * pageSize, rows.length)}
            onPageChange={setPage}
          />

          <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>Note:</strong> Rows highlighted in red have received reminders twice — the
              certification is expiring soon or has already expired.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
