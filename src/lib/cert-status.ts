export type CertStatus = "expired" | "critical" | "warning" | "valid";

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function certStatus(expiry: string): CertStatus {
  const d = daysUntil(expiry);
  if (d < 0) return "expired";
  if (d <= 30) return "critical";
  if (d <= 60) return "warning";
  return "valid";
}

export const statusLabel: Record<CertStatus, string> = {
  expired: "Expired",
  critical: "Expires within 1 month",
  warning: "Expires within 2 months",
  valid: "Valid",
};

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
