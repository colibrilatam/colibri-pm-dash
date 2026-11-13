import { queryOptions } from "@tanstack/react-query";
import { loadDashboard } from "./data-adapter";

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: loadDashboard,
  staleTime: 60_000,
  refetchInterval: 10 * 60_000,
  refetchIntervalInBackground: true,
});
