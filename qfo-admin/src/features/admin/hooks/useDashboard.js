// src/features/admin/hooks/useDashboard.js
import { useQuery } from "@tanstack/react-query";
import { fetchDashboard, adaptDashboard } from "../api/dashboard.api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const payload = await fetchDashboard();
      return adaptDashboard(payload); // returns { overview, charts, recentSubscriptions }
    },
    staleTime: 60_000,
    retry: 1,
  });
}
