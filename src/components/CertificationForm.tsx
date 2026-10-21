import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MAX_DOC_BYTES, saveCertification } from "@/lib/certifications.functions";
import { useCompanies, useProfiles, personLabel, type Certification } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Upload } from "lucide-react";

export function CertificationForm({ existing }: { existing?: Certification }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();

  const [companyId, setCompanyId] = useState(existing?.company_id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [assignedTo, setAssignedTo] = useState(existing?.assigned_to ?? "");
  const [corroboratedBy, setCorroboratedBy] = useState(existing?.corroborated_by ?? "");
  const [issueDate, setIssueDate] = useState(existing?.issue_date ?? "");
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date ?? "");
  const [instruction1, setInstruction1] = useState(existing?.instruction_1 ?? "");
  const [instruction2, setInstruction2] = useState(existing?.instruction_2 ?? "");
  const [instruction3, setInstruction3] = useState(existing?.instruction_3 ?? "");
  const [file, setFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (new Date(expiryDate) <= new Date(issueDate)) {
        throw new Error("Expiry date must be after the issue date.");
      }

      if (!file && !existing?.doc_file_name) {
        throw new Error("Please upload the certification document.");
      }
      if (file && file.size > MAX_DOC_BYTES) {
        throw new Error(`The document must be ${MAX_DOC_BYTES / 1024 / 1024} MB or smaller.`);
      }

      // The server resets the reminders when the expiry date changes.
      const form = new FormData();
      form.set("id", existing?.id ?? "");
      form.set("company_id", companyId);
      form.set("name", name.trim());
      form.set("assigned_to", assignedTo);
      form.set("corroborated_by", corroboratedBy);
      form.set("issue_date", issueDate);
      form.set("expiry_date", expiryDate);
      form.set("instruction_1", instruction1.trim());
      form.set("instruction_2", instruction2.trim());
      form.set("instruction_3", instruction3.trim());
      if (file) form.set("file", file);
      await saveCertification({ data: form });
    },
    onSuccess: () => {
      toast.success(existing ? "Certification updated" : "Certification saved");
      qc.invalidateQueries({ queryKey: ["certifications"] });
      if (existing) qc.invalidateQueries({ queryKey: ["certification", existing.id] });
      navigate({ to: "/certifications" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="panel">
      <div className="panel-header">
        {existing ? "Edit Certification" : "Add Certification"}
        <button
          onClick={() => navigate({ to: "/certifications" })}
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide hover:underline"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
      </div>

      <form
        className="space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <label className="field-label" htmlFor="company">
            Select Company *
          </label>
          <select
            id="company"
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            required
          >
            <option value="">--Select Company--</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="cert-name">
            Certification Name *
          </label>
          <Input
            id="cert-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Certification Name"
            required
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="assigned">
              Assigned To *
            </label>
            <select
              id="assigned"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
            >
              <option value="">--Select User--</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {personLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="corroborated">
              Corroborated By
            </label>
            <select
              id="corroborated"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={corroboratedBy}
              onChange={(e) => setCorroboratedBy(e.target.value)}
            >
              <option value="">--Select User--</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {personLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="issue">
              Issue Date *
            </label>
            <Input
              id="issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="expiry">
              Expiry Date *
            </label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="doc">
            Upload Certificate or Document {existing?.doc_file_name ? "" : "*"}
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="size-4" />
            {file
              ? file.name
              : existing?.doc_file_name
                ? "Replace certificate or document"
                : "Choose a certificate or document"}
            <input
              id="doc"
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div>
          <label className="field-label" htmlFor="i1">
            Instruction 1 *
          </label>
          <Textarea
            id="i1"
            value={instruction1}
            onChange={(e) => setInstruction1(e.target.value)}
            placeholder="Enter Instruction 1"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="i2">
            Instruction 2 *
          </label>
          <Textarea
            id="i2"
            value={instruction2}
            onChange={(e) => setInstruction2(e.target.value)}
            placeholder="Enter Instruction 2"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="i3">
            Instruction 3
          </label>
          <Textarea
            id="i3"
            value={instruction3}
            onChange={(e) => setInstruction3(e.target.value)}
            placeholder="Enter Instruction 3"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/certifications" })}
          >
            Back
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
