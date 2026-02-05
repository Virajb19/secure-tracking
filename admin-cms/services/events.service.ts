'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { eventsApi, EventWithStats, EventDetails, InvitableUser, CreateEventPayload, EventFilterParams, EventsResponse } from './api';

/* =========================
   Event Queries
========================= */

// Get all events with stats (Admin) - supports filtering and pagination
export const useGetEvents = (filters?: EventFilterParams, limit = 20, offset = 0) => {
  return useQuery<EventsResponse>({
    queryKey: ['events', filters, limit, offset],
    queryFn: () => eventsApi.getAll(filters, limit, offset),
    refetchOnMount: 'always',
  });
};

// Get all events with infinite query for pagination
export const useGetEventsInfinite = (filters?: EventFilterParams, pageSize = 20) => {
  return useInfiniteQuery<EventsResponse>({
    queryKey: ['events-infinite', filters],
    queryFn: ({ pageParam = 0 }) => eventsApi.getAll(filters, pageSize, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    refetchOnMount: 'always',
  });
};

// Get single event by ID with full details
export const useGetEventById = (eventId?: string) => {
  return useQuery<EventDetails>({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId!),
    enabled: !!eventId,
  });
};

// Get users available to invite
export const useGetInvitableUsers = (filters?: {
  role?: string;
  district_id?: string;
  school_id?: string;
  exclude_event_id?: string;
}) => {
  return useQuery<InvitableUser[]>({
    queryKey: ['invitable-users', filters],
    queryFn: () => eventsApi.getInvitableUsers(filters),
  });
};

/* =========================
   Event Mutations
========================= */

// Create event
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, flyer }: { data: CreateEventPayload; flyer?: File }) => {
      return eventsApi.create(data, flyer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

// Update event
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      data, 
      flyer 
    }: { 
      eventId: string; 
      data: Partial<CreateEventPayload>; 
      flyer?: File;
    }) => {
      return eventsApi.update(eventId, data, flyer);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
};

// Delete event
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['delete-event'],
    mutationFn: async (eventId: string) => {
      return eventsApi.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events-infinite'], exact: false });
    },
    onError: (error: any) => {
      throw new Error(error?.response?.data?.message || 'Failed to delete event');
    }
  });
};

// Invite users to event
export const useInviteUsersToEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userIds }: { eventId: string; userIds: string[] }) => {
      return eventsApi.inviteUsers(eventId, userIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
};
