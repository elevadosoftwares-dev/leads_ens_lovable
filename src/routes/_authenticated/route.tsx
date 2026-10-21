import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";
import { sessionQueryKey } from "@/lib/session";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery({
      queryKey: sessionQueryKey,
      queryFn: () => getSession(),
      staleTime: 30_000,
    });
    if (!session.userId) throw redirect({ to: "/auth" });
    return { session };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
