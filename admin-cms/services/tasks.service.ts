// tasks.service.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "./api";
import type { CreateTaskDto } from "@/types";

/* ------------------------------ Queries ------------------------------ */

export const useGetTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getAll,
  });
};

export const useGetTaskById = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => tasksApi.getById(taskId),
    enabled: !!taskId,
  });
};

export const useGetTaskEvents = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId, "events"],
    queryFn: () => tasksApi.getTaskEvents(taskId),
    enabled: !!taskId,
  });
};

/* -------------------------------------------------------------------------- */
/*                                 MUTATIONS                                  */
/* -------------------------------------------------------------------------- */

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDto) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
