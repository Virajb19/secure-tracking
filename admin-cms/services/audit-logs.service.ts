"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { auditLogsApi, AuditLogsResponse } from "./api";

export const useGetAuditLogs = (limit = 100, offset = 0) => {
  return useQuery({
    queryKey: ["auditLogs", limit, offset],
    queryFn: () => auditLogsApi.getAll(limit, offset),
  })
}

export const useGetAuditLogsInfinite = (pageSize = 50) => {
  return useInfiniteQuery<AuditLogsResponse>({
    queryKey: ['auditLogs'],
    queryFn: ({ pageParam = 0 }) => auditLogsApi.getAll(pageSize, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
  });
}
