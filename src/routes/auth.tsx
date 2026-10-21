import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { bootstrapFirstAdmin, isSetupRequired, signIn as signInFn } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ENS Certification Tracker" },
      {
        name: "description",
        content: "Sign in to manage company certifications and expiry reminders.",
      },
      { property: "og:title", content: "Sign in — ENS Certification Tracker" },
      {
        property: "og:description",
        content: "Sign in to manage company certifications and expiry reminders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkSetup = useServerFn(isSetupRequired);
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const login = useServerFn(signInFn);

  const { data: setup } = useQuery({
    queryKey: ["setup-required"],
    queryFn: () => checkSetup(),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const signIn = useMutation({
    mutationFn: () => login({ data: { email, password } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAdmin = useMutation({
    mutationFn: () => bootstrap({ data: { email, password, fullName } }),
    onSuccess: async () => {
      toast.success("Administrator account created. Signing you in…");
      try {
        await login({ data: { email, password } });
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstRun = setup?.setupRequired === true;
  const busy = signIn.isPending || createAdmin.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-sidebar-foreground">
          <ShieldCheck className="mx-auto mb-3 size-10 text-sidebar-primary" />
          <h1 className="text-2xl font-extrabold tracking-[0.2em] text-sidebar-primary">ENS</h1>
          <p className="text-sm text-sidebar-foreground/70">Expiry Notification System</p>
        </div>

        <div className="panel">
          <div className="panel-header">{firstRun ? "Create administrator" : "Sign in"}</div>
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (firstRun) createAdmin.mutate();
              else signIn.mutate();
            }}
          >
            {firstRun && (
              <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                No accounts exist yet. The first account you create becomes the administrator.
              </p>
            )}

            {firstRun && (
              <div>
                <label className="field-label" htmlFor="fullName">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : firstRun ? "Create account" : "Sign in"}
            </Button>

            {!firstRun && (
              <p className="text-center text-xs text-muted-foreground">
                New accounts are created by an administrator from the Manage User page.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
