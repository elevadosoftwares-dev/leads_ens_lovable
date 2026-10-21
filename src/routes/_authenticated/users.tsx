import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useProfiles, useRoles } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { adminCreateUser, adminDeleteUser, adminSetUserRole } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Manage Users — ENS Certification Tracker" },
      { name: "description", content: "Manage ENS users and administrator access." },
      { property: "og:title", content: "Manage Users — ENS Certification Tracker" },
      { property: "og:description", content: "Manage ENS users and administrator access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.role === "admin";
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();

  const createUser = useServerFn(adminCreateUser);
  const setRole = useServerFn(adminSetUserRole);
  const deleteUser = useServerFn(adminDeleteUser);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleValue] = useState<"admin" | "user">("user");

  const roleByUser = new Map(roles.map((r) => [r.user_id, r.role]));
  const refresh = () => qc.invalidateQueries();

  const create = useMutation({
    mutationFn: () => createUser({ data: { fullName, email, password, role } }),
    onSuccess: () => {
      toast.success("User created");
      setFullName("");
      setEmail("");
      setPassword("");
      setRoleValue("user");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "user" }) => setRole({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("User removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="panel">
          <div className="panel-header">Add User</div>
          <form
            className="grid gap-4 p-6 md:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div>
              <label className="field-label" htmlFor="u-name">
                Full Name *
              </label>
              <Input
                id="u-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="u-email">
                Email *
              </label>
              <Input
                id="u-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="u-pass">
                Temporary Password *
              </label>
              <Input
                id="u-pass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="u-role">
                Role *
              </label>
              <select
                id="u-role"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={role}
                onChange={(e) => setRoleValue(e.target.value as "admin" | "user")}
              >
                <option value="user">User (view &amp; update)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={create.isPending}>
                <Plus className="size-4" /> Add User
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">Manage User</div>
        <div className="overflow-x-auto p-6">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary text-left text-xs font-bold uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{p.full_name || "—"}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                        value={roleByUser.get(p.id) ?? "user"}
                        onChange={(e) =>
                          changeRole.mutate({
                            userId: p.id,
                            role: e.target.value as "admin" | "user",
                          })
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="capitalize">{roleByUser.get(p.id) ?? "user"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && p.id !== session?.userId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Remove ${p.email}?`)) remove.mutate(p.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Only administrators can add, change roles for, or remove users.
        </p>
      )}
    </div>
  );
}
