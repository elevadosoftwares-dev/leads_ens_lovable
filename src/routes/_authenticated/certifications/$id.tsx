import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCertification } from "@/lib/certifications.functions";
import { CertificationForm } from "@/components/CertificationForm";
import type { Certification } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/certifications/$id")({
  head: () => ({
    meta: [
      { title: "Edit Certification — ENS Certification Tracker" },
      {
        name: "description",
        content: "Update certification details, dates, assignments, and documents.",
      },
      { property: "og:title", content: "Edit Certification — ENS Certification Tracker" },
      {
        property: "og:description",
        content: "Update certification details, dates, assignments, and documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditCertification,
});

function EditCertification() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery<Certification | null>({
    queryKey: ["certification", id],
    queryFn: () => getCertification({ data: { id } }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-muted-foreground">This certification no longer exists.</p>;
  return <CertificationForm existing={data} />;
}
