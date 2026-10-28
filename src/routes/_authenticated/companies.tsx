import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { addCompany, deleteCompany, updateCompany } from "@/lib/companies.functions";
import { useCompanies, useCertifications } from "@/lib/queries";
import { useIsAdmin } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Companies — ENS Certification Tracker" },
      { name: "description", content: "Manage companies and review their certification totals." },
      { property: "og:title", content: "Companies — ENS Certification Tracker" },
      {
        property: "og:description",
        content: "Manage companies and review their certification totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { data: companies = [], isLoading } = useCompanies();
  const { data: certs = [] } = useCertifications();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["companies"] });

  const add = useMutation({
    mutationFn: () => addCompany({ data: { name: name.trim() } }),
    onSuccess: () => {
      setName("");
      toast.success("Company added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Select a company to update.");
      await updateCompany({ data: { id: editingId, name: editName.trim() } });
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Company updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCompany({ data: { id } }),
    onSuccess: () => {
      toast.success("Company deleted");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="panel-header">Company</div>
        <form
          className="flex flex-wrap items-end gap-3 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate();
          }}
        >
          <div className="min-w-60 flex-1">
            <label className="field-label" htmlFor="company">
              Company Name *
            </label>
            <Input
              id="company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>
          <Button type="submit" disabled={add.isPending}>
            <Plus className="size-4" /> Add Company
          </Button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">All companies</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-secondary text-left text-xs font-bold uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Certifications</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No companies yet.
                  </td>
                </tr>
              )}
              {companies.map((c, i) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">
                    {editingId === c.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 max-w-xs"
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-4 py-3">{certs.filter((x) => x.company_id === c.id).length}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === c.id ? (
                        <>
                          <Button size="sm" onClick={() => update.mutate()}>
                            <Check className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete "${c.name}"? Its certifications will also be removed.`,
                              )
                            )
                              remove.mutate(c.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Only administrators can delete records. You can add and edit.
        </p>
      )}
    </div>
  );
}
