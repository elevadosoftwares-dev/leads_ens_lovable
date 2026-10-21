import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "ENS — Certification Expiry Notification System" },
      {
        name: "description",
        content:
          "Track certification expiry dates across all your companies and get reminder emails two months and one month before they expire.",
      },
      { property: "og:title", content: "ENS — Certification Expiry Notification System" },
      {
        property: "og:description",
        content:
          "Track certification expiry dates across all your companies and get reminder emails before they expire.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
