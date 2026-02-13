"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { usersApi, masterDataApi, adminManageApi, UserFilterParams, PaginatedSchoolsResponse } from "./api";
import { Subject } from "@/types";

export const useGetUsers = (filters?: UserFilterParams) => {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => usersApi.getAll(filters),
    placeholderData: keepPreviousData,
  })
}

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersApi.toggleStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export const useApproveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status, rejectionReason }: {
      userId: string;
      status: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
    }) => usersApi.approveUser(userId, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export const useResetDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.resetDevice(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export const useGetDistricts = () => {
  return useQuery({
    queryKey: ["districts"],
    queryFn: masterDataApi.getDistricts,
  });
}

export const useGetSchools = (districtId?: string) => {
  return useQuery({
    queryKey: ["schools", districtId],
    queryFn: () => masterDataApi.getSchools(districtId),
  });
}

export const useGetSchoolsInfinite = (params: {
  pageSize?: number;
  districtId?: string;
  search?: string;
} = {}) => {
  const { pageSize = 50, districtId, search } = params;
  return useInfiniteQuery<PaginatedSchoolsResponse>({
    queryKey: ['schools-paginated', districtId, search],
    queryFn: ({ pageParam = 0 }) =>
      masterDataApi.getSchoolsPaginated({
        limit: pageSize,
        offset: pageParam as number,
        districtId,
        search: search || undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    maxPages: 5,
  });
}

export const useGetClasses = () => {
  return useQuery({
    queryKey: ["classes"],
    queryFn: masterDataApi.getClasses,
  });
}

export const useGetSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: () => masterDataApi.getSubjects(),
  });
}

// ========================================
// SUBJECTS DETAILED (for management page)
// ========================================

export const useGetSubjectsDetailed = (classLevel?: number) => {
  return useQuery({
    queryKey: ["subjects-detailed", classLevel],
    queryFn: () => masterDataApi.getSubjectsDetailed(classLevel),
  });
}

// ========================================
// SCHOOL MANAGEMENT HOOKS
// ========================================

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; registration_code: string; district_id: string }) =>
      adminManageApi.createSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
    },
  });
}

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; registration_code?: string; district_id?: string } }) =>
      adminManageApi.updateSchool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
    },
  });
}

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminManageApi.deleteSchool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
    },
  });
}

// ========================================
// SUBJECT MANAGEMENT HOOKS
// ========================================

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; class_level: number }) =>
      adminManageApi.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useCreateSubjectBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; class_levels: number[] }) =>
      adminManageApi.createSubjectBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; class_level?: number; is_active?: boolean } }) =>
      adminManageApi.updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminManageApi.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}