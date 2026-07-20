import { queryOptions } from "@tanstack/react-query";
import { loadDashboard } from "./data-adapter";

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: loadDashboard,
  staleTime: 30_000,
});
