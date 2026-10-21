import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export interface UserRole {
  user_id: string;
  role: "admin" | "user";
}

export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Profile[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<Profile>(
      `SELECT id, full_name, email FROM dbo.users ORDER BY email`,
    );
    return recordset.map((p) => ({ ...p, id: p.id.toLowerCase() }));
  });

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<UserRole[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<{ id: string; role: UserRole["role"] }>(
      `SELECT id, role FROM dbo.users`,
    );
    return recordset.map((r) => ({ user_id: r.id.toLowerCase(), role: r.role }));
  });

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  role: z.enum(["admin", "user"]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => createUserSchema.parse(d))
  .handler(async ({ data }) => {
    const { request, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    try {
      await req
        .input("email", sql.NVarChar(320), data.email)
        .input("full_name", sql.NVarChar(200), data.fullName)
        .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
        .input("role", sql.NVarChar(10), data.role)
        .query(
          `INSERT INTO dbo.users (email, full_name, password_hash, role)
           VALUES (@email, @full_name, @password_hash, @role)`,
        );
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new Error("A user with this email address has already been registered");
      throw error;
    }
    return { ok: true };
  });

const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => roleSchema.parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    // Demoting is refused when it would leave no administrator; the lock hints make the
    // admin count and the update atomic.
    const { rowsAffected } = await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .input("role", sql.NVarChar(10), data.role)
      .query(
        `UPDATE dbo.users SET role = @role
          WHERE id = @id
            AND (@role = N'admin'
                 OR role <> N'admin'
                 OR (SELECT COUNT(*) FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE role = N'admin') > 1)`,
      );
    if (!rowsAffected[0]) throw new Error("There must be at least one administrator.");
    return { ok: true };
  });

const deleteSchema = z.object({ userId: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId.toLowerCase() === context.user.userId)
      throw new Error("You cannot remove your own account.");
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    // Certifications keep their history but lose the reference, as before (ON DELETE SET NULL).
    await req.input("id", sql.UniqueIdentifier, data.userId).query(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
         UPDATE dbo.certifications SET assigned_to = NULL WHERE assigned_to = @id;
         UPDATE dbo.certifications SET corroborated_by = NULL WHERE corroborated_by = @id;
         UPDATE dbo.certifications SET created_by = NULL WHERE created_by = @id;
         DELETE FROM dbo.users WHERE id = @id;
       COMMIT TRANSACTION;`,
    );
    return { ok: true };
  });
