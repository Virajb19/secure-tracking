"use client";

import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "./api";

export const useGetAuditLogs = (limit = 100, offset = 0) => {
  return useQuery({
    queryKey: ["auditLogs", limit, offset],
    queryFn: () => auditLogsApi.getAll(limit, offset),
  })
}
