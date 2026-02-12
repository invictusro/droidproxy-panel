import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Phone, PhoneWithPairing } from '../types';

export function usePhones() {
  return useQuery({
    queryKey: ['phones'],
    queryFn: async () => {
      const response = await api.getPhones();
      return response.data.phones as Phone[];
    },
  });
}

export function usePhone(id: string) {
  return useQuery({
    queryKey: ['phones', id],
    queryFn: async () => {
      const response = await api.getPhone(id);
      return response.data.phone as Phone;
    },
    enabled: !!id,
  });
}

export function useCreatePhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; hub_server_id: string }) => {
      const response = await api.createPhone(data);
      return response.data as PhoneWithPairing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phones'] });
    },
  });
}

export function useDeletePhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.deletePhone(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phones'] });
    },
  });
}

export function useRotateIP() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.rotateIP(id);
    },
  });
}

export function useRestartProxy() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.restartProxy(id);
    },
  });
}

export function usePhoneStats(id: string) {
  return useQuery({
    queryKey: ['phones', id, 'stats'],
    queryFn: async () => {
      const response = await api.getPhoneStats(id);
      return response.data.stats;
    },
    enabled: !!id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
