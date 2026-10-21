import { createFileRoute } from "@tanstack/react-router";
import { CertificationForm } from "@/components/CertificationForm";

export const Route = createFileRoute("/_authenticated/certifications/new")({
  head: () => ({
    meta: [
      { title: "Add Certification — ENS Certification Tracker" },
      { name: "description", content: "Add a company certification, expiry date, and supporting document." },
      { property: "og:title", content: "Add Certification — ENS Certification Tracker" },
      { property: "og:description", content: "Add a company certification, expiry date, and supporting document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CertificationForm />,
});
