import { useQuery } from "@tanstack/react-query";
import { listCompanies, type Company } from "@/lib/companies.functions";
import { listCertifications, type Certification } from "@/lib/certifications.functions";
import { listProfiles, listRoles, type Profile, type UserRole } from "@/lib/users.functions";

export type { Company, Certification, Profile };

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
  });
}

export function useProfiles() {
  return useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => listProfiles(),
  });
}

export function useCertifications() {
  return useQuery<Certification[]>({
    queryKey: ["certifications"],
    queryFn: () => listCertifications(),
  });
}

export function useRoles() {
  return useQuery<UserRole[]>({
    queryKey: ["user_roles"],
    queryFn: () => listRoles(),
  });
}

export function personLabel(p?: Profile | null) {
  if (!p) return "—";
  return p.email || p.full_name || "—";
}
