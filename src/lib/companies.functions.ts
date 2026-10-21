import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Company[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<{ id: string; name: string; created_at: Date }>(
      `SELECT id, name, created_at FROM dbo.companies ORDER BY name`,
    );
    return recordset.map((c) => ({
      id: c.id.toLowerCase(),
      name: c.name,
      created_at: c.created_at.toISOString(),
    }));
  });

const nameSchema = z.string().trim().min(1, "Enter a company name.").max(200);

export const addCompany = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ name: nameSchema }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("name", sql.NVarChar(200), data.name)
      .query(`INSERT INTO dbo.companies (name) VALUES (@name)`);
    return { ok: true };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), name: nameSchema }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .input("name", sql.NVarChar(200), data.name)
      .query(`UPDATE dbo.companies SET name = @name WHERE id = @id`);
    return { ok: true };
  });

/** Deletes the company and (via ON DELETE CASCADE) its certifications. Admin only. */
export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query(`DELETE FROM dbo.companies WHERE id = @id`);
    return { ok: true };
  });
