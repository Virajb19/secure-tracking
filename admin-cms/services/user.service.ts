"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, masterDataApi, UserFilterParams } from "./api";

export const useGetUsers = (filters?: UserFilterParams) => {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => usersApi.getAll(filters),
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

export const useGetClasses = () => {
  return useQuery({
    queryKey: ["classes"],
    queryFn: masterDataApi.getClasses,
  });
}

export const useGetSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: masterDataApi.getSubjects,
  });
}