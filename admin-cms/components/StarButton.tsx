'use client';

import { Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userStarsApi } from '@/services/paper-setter.service';
import { motion } from 'framer-motion';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface StarButtonProps {
  userId: string;
  isStarred: boolean;
}

export function StarButton({ userId, isStarred }: StarButtonProps) {
  const queryClient = useQueryClient();

  // Optimistic update mutation
  const toggleStarMutation = useMutation({
    mutationFn: async () => {
      const response = await userStarsApi.toggleStar(userId);
      return response;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['starred-users'] });

      const previousStarredIds = queryClient.getQueryData<string[]>(['starred-users']) || [];

      const newIsStarred = !isStarred;
      queryClient.setQueryData<string[]>(['starred-users'], (old = []) => {
          if (!Array.isArray(old)) return old; 

          return isStarred ? old.filter(id => id !== userId) : [...old, userId]});

          return { previousStarredIds, newIsStarred };
    },
    onError: (error, _, context) => {
      if (context?.previousStarredIds) {
        queryClient.setQueryData(['starred-users'], context.previousStarredIds);
      }
      showErrorToast('Failed to update favorite status. Please try again.');
      console.error('Failed to toggle star:', error);
    },
    onSuccess: (_, __, context) => {
      if (context?.newIsStarred) {
        showSuccessToast('User added to favorites!', 3000);
      } else {
        showSuccessToast('User removed from favorites.', 3000);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['starred-users'] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarMutation.mutate();
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={toggleStarMutation.isPending}
      className={`p-2 rounded-lg transition-all ${
        isStarred
          ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
          : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
      }`}
      title={isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
      whileTap={{ scale: 0.9 }}
    >
      <Star 
        className={`h-5 w-5 transition-all ${
          isStarred ? 'fill-current' : ''
        }`} 
      />
    </motion.button>
  );
}
