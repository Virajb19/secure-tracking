'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circularsApi, masterDataApi } from './api';
import type { Circular, District, School } from '@/types';

/* =========================
   Circular Queries
========================= */

// Get all circulars
export const useGetCirculars = () => {
  return useQuery<Circular[]>({
    queryKey: ['circulars'],
    queryFn: circularsApi.getAll,
  });
};

// Get single circular by ID
export const useGetCircularById = (circularId?: string) => {
  return useQuery<Circular>({
    queryKey: ['circular', circularId],
    queryFn: () => circularsApi.getById(circularId!),
    enabled: !!circularId,
  });
};

/* =========================
   Create / Mutate Circulars
========================= */

export interface CircularFormValues {
  title: string;
  description?: string;
  issued_by: string;
  issued_date: string;
  effective_date?: string | null;
  school_id?: string | 'all';
}

export const useCreateCircular = (selectedFile?: File | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CircularFormValues) => {
      const payload = {
        title: data.title,
        description: data.description,
        issued_by: data.issued_by,
        issued_date: data.issued_date,
        effective_date: data.effective_date || undefined,
        school_id: data.school_id !== 'all' ? data.school_id : undefined,
      };

      return circularsApi.create(payload, selectedFile || undefined);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
    },
  });
};

/* =========================
   Master Data (Shared)
========================= */

// Districts
export const useGetDistricts = () => {
  return useQuery<District[]>({
    queryKey: ['districts'],
    queryFn: masterDataApi.getDistricts,
  });
};

// Schools (optionally filtered by district)
export const useGetSchools = (districtId?: string) => {
  return useQuery<School[]>({
    queryKey: ['schools', districtId],
    queryFn: () => masterDataApi.getSchools(districtId),
    enabled: !!districtId && districtId !== 'all',
  });
};
