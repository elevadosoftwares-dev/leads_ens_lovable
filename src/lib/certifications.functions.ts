import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";

export interface Certification {
  id: string;
  company_id: string;
  name: string;
  assigned_to: string | null;
  corroborated_by: string | null;
  issue_date: string;
  expiry_date: string;
  /** Original name of the uploaded certificate/document; null when there is none. */
  doc_file_name: string | null;
  instruction_1: string;
  instruction_2: string;
  instruction_3: string;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
}

/** Largest certificate/document accepted on upload. */
export const MAX_DOC_BYTES = 20 * 1024 * 1024;

type CertificationRow = Omit<
  Certification,
  "issue_date" | "expiry_date" | "reminder_1_sent_at" | "reminder_2_sent_at"
> & {
  issue_date: Date;
  expiry_date: Date;
  reminder_1_sent_at: Date | null;
  reminder_2_sent_at: Date | null;
};

// Every column except the document bytes, which are only read by the download route.
const COLUMNS = `id, company_id, name, assigned_to, corroborated_by, issue_date, expiry_date,
  doc_file_name, instruction_1, instruction_2, instruction_3, reminder_1_sent_at, reminder_2_sent_at`;

const lower = (id: string | null) => (id ? id.toLowerCase() : null);
// DATE columns arrive as UTC midnight, so the ISO date part is the stored calendar date.
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function toCertification(row: CertificationRow): Certification {
  return {
    ...row,
    id: row.id.toLowerCase(),
    company_id: row.company_id.toLowerCase(),
    assigned_to: lower(row.assigned_to),
    corroborated_by: lower(row.corroborated_by),
    issue_date: isoDate(row.issue_date),
    expiry_date: isoDate(row.expiry_date),
    reminder_1_sent_at: row.reminder_1_sent_at?.toISOString() ?? null,
    reminder_2_sent_at: row.reminder_2_sent_at?.toISOString() ?? null,
  };
}

export const listCertifications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Certification[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<CertificationRow>(
      `SELECT ${COLUMNS} FROM dbo.certifications ORDER BY expiry_date`,
    );
    return recordset.map(toCertification);
  });

export const getCertification = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<Certification | null> => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query<CertificationRow>(`SELECT ${COLUMNS} FROM dbo.certifications WHERE id = @id`);
    const row = recordset[0];
    return row ? toCertification(row) : null;
  });

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const optionalUser = z
  .string()
  .transform((v) => v || null)
  .pipe(z.string().uuid().nullable());

const saveSchema = z
  .object({
    id: z
      .string()
      .transform((v) => v || null)
      .pipe(z.string().uuid().nullable()),
    company_id: z.string().uuid("Select a company."),
    name: z.string().trim().min(1, "Enter the certification name.").max(300),
    assigned_to: optionalUser,
    corroborated_by: optionalUser,
    issue_date: dateString,
    expiry_date: dateString,
    instruction_1: z.string().trim(),
    instruction_2: z.string().trim(),
    instruction_3: z.string().trim(),
  })
  .refine((v) => v.expiry_date > v.issue_date, "Expiry date must be after the issue date.");

/**
 * Creates or updates a certification. Takes FormData so the certificate/document can be
 * uploaded in the same request: the fields of `saveSchema`, plus an optional `file`.
 */
export const saveCertification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Expected form data.");
    return d;
  })
  .handler(async ({ data: form, context }) => {
    const text = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value : "";
    };
    const parsed = saveSchema.safeParse({
      id: text("id"),
      company_id: text("company_id"),
      name: text("name"),
      assigned_to: text("assigned_to"),
      corroborated_by: text("corroborated_by"),
      issue_date: text("issue_date"),
      expiry_date: text("expiry_date"),
      instruction_1: text("instruction_1"),
      instruction_2: text("instruction_2"),
      instruction_3: text("instruction_3"),
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
    const v = parsed.data;

    const upload = form.get("file");
    const file = upload instanceof File && upload.size > 0 ? upload : null;
    if (file && file.size > MAX_DOC_BYTES)
      throw new Error(`The document must be ${MAX_DOC_BYTES / 1024 / 1024} MB or smaller.`);

    const { request, sql } = await import("@/server/db.server");

    if (!file) {
      // A document is required: the existing one is kept when no new file is chosen.
      let hasDoc = false;
      if (v.id) {
        const check = await request();
        const { recordset } = await check
          .input("id", sql.UniqueIdentifier, v.id)
          .query<{ has_doc: boolean }>(
            `SELECT CAST(CASE WHEN doc_data IS NULL THEN 0 ELSE 1 END AS BIT) AS has_doc
               FROM dbo.certifications WHERE id = @id`,
          );
        if (!recordset[0]) throw new Error("This certification no longer exists.");
        hasDoc = recordset[0].has_doc;
      }
      if (!hasDoc) throw new Error("Please upload the certification document.");
    }

    const req = await request();
    req
      .input("company_id", sql.UniqueIdentifier, v.company_id)
      .input("name", sql.NVarChar(300), v.name)
      .input("assigned_to", sql.UniqueIdentifier, v.assigned_to)
      .input("corroborated_by", sql.UniqueIdentifier, v.corroborated_by)
      .input("issue_date", sql.Date, new Date(`${v.issue_date}T00:00:00Z`))
      .input("expiry_date", sql.Date, new Date(`${v.expiry_date}T00:00:00Z`))
      .input("instruction_1", sql.NVarChar(sql.MAX), v.instruction_1)
      .input("instruction_2", sql.NVarChar(sql.MAX), v.instruction_2)
      .input("instruction_3", sql.NVarChar(sql.MAX), v.instruction_3)
      .input("has_file", sql.Bit, !!file)
      .input("doc_file_name", sql.NVarChar(260), file ? file.name.slice(-260) : null)
      .input(
        "doc_content_type",
        sql.NVarChar(200),
        file ? file.type || "application/octet-stream" : null,
      )
      .input(
        "doc_data",
        sql.VarBinary(sql.MAX),
        file ? Buffer.from(await file.arrayBuffer()) : null,
      );

    if (v.id) {
      // Changing the expiry date starts the reminder cycle again.
      const { rowsAffected } = await req.input("id", sql.UniqueIdentifier, v.id).query(
        `UPDATE dbo.certifications SET
           company_id = @company_id, name = @name,
           assigned_to = @assigned_to, corroborated_by = @corroborated_by,
           issue_date = @issue_date,
           reminder_1_sent_at = CASE WHEN expiry_date = @expiry_date THEN reminder_1_sent_at END,
           reminder_2_sent_at = CASE WHEN expiry_date = @expiry_date THEN reminder_2_sent_at END,
           expiry_date = @expiry_date,
           instruction_1 = @instruction_1, instruction_2 = @instruction_2, instruction_3 = @instruction_3,
           doc_file_name    = CASE WHEN @has_file = 1 THEN @doc_file_name    ELSE doc_file_name END,
           doc_content_type = CASE WHEN @has_file = 1 THEN @doc_content_type ELSE doc_content_type END,
           doc_data         = CASE WHEN @has_file = 1 THEN @doc_data         ELSE doc_data END,
           updated_at = SYSUTCDATETIME()
         WHERE id = @id`,
      );
      if (!rowsAffected[0]) throw new Error("This certification no longer exists.");
    } else {
      await req.input("created_by", sql.UniqueIdentifier, context.user.userId).query(
        `INSERT INTO dbo.certifications
           (company_id, name, assigned_to, corroborated_by, issue_date, expiry_date,
            instruction_1, instruction_2, instruction_3,
            doc_file_name, doc_content_type, doc_data, created_by)
         VALUES
           (@company_id, @name, @assigned_to, @corroborated_by, @issue_date, @expiry_date,
            @instruction_1, @instruction_2, @instruction_3,
            @doc_file_name, @doc_content_type, @doc_data, @created_by)`,
      );
    }
    return { ok: true };
  });

export const deleteCertification = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query(`DELETE FROM dbo.certifications WHERE id = @id`);
    return { ok: true };
  });
